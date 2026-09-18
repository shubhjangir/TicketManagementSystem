from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Department, Office, Floor, Issue, UserProfile, Ticket, TicketEvent
from .serializers import (
    DepartmentSerializer, OfficeSerializer, FloorSerializer, IssueSerializer,
    UserProfileSerializer, TicketListSerializer, TicketDetailSerializer,
    TicketCreateSerializer, TicketEventSerializer,
)


class StandardPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


class OfficeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Office.objects.all()
    serializer_class = OfficeSerializer


class FloorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Floor.objects.all()
    serializer_class = FloorSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        office_id = self.request.query_params.get('office')
        if office_id:
            qs = qs.filter(office_id=office_id)
        return qs


class IssueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Issue.objects.all()
    serializer_class = IssueSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        department = self.request.query_params.get('department')
        if role:
            qs = qs.filter(role=role)
        if department:
            qs = qs.filter(department_id=department)
        return qs


class TicketViewSet(viewsets.ModelViewSet):
    """
    list/retrieve/create plus custom actions that implement the wireframe's role-based
    transitions: assign_worker, change_department, submit_assessment, mark_resolved,
    and a nested comments endpoint.
    """
    queryset = Ticket.objects.all().select_related(
        'office', 'created_by', 'current_department', 'assigned_technician'
    ).prefetch_related('issues', 'floors', 'events')
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'ticket_number', 'description']

    def get_serializer_class(self):
        if self.action == 'create':
            return TicketCreateSerializer
        if self.action == 'retrieve':
            return TicketDetailSerializer
        return TicketListSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        tab = self.request.query_params.get('tab', 'open')
        qs = qs.filter(status__in=Ticket.OPEN_STATUSES) if tab == 'open' \
            else qs.filter(status__in=Ticket.CLOSED_STATUSES)

        role = self.request.query_params.get('role')
        user_id = self.request.query_params.get('user_id')
        if role and user_id:
            if role == UserProfile.ROLE_CLIENT:
                qs = qs.filter(created_by_id=user_id)
            elif role == UserProfile.ROLE_DEPT_POC:
                profile = UserProfile.objects.filter(id=user_id).first()
                qs = qs.filter(current_department=profile.department) if profile else qs.none()
            elif role == UserProfile.ROLE_TECHNICIAN:
                qs = qs.filter(assigned_technician_id=user_id)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = self._create_ticket(serializer)
        return Response(TicketDetailSerializer(ticket).data, status=status.HTTP_201_CREATED)

    def _create_ticket(self, serializer):
        issues = list(serializer.validated_data.get('issues', []))
        title = ', '.join(i.name for i in issues) if issues else 'New Ticket'
        ticket = serializer.save(title=title, status=Ticket.STATUS_PENDING_DEPT_ASSIGNMENT)

        client = ticket.created_by
        TicketEvent.objects.create(
            ticket=ticket, actor=client, event_type=TicketEvent.EVENT_CREATED,
            to_value=f'Ticket created by {client.name}',
        )

        # Auto-route to a department if any selected issue maps to one.
        department = next((i.default_department for i in issues if i.default_department), None)
        if department:
            ticket.current_department = department
            ticket.status = Ticket.STATUS_PENDING_TECH_ASSIGNMENT
            ticket.save()
            TicketEvent.objects.create(
                ticket=ticket, actor=None, actor_label='System',
                event_type=TicketEvent.EVENT_AUTO_ASSIGNED,
                from_value='Unassigned', to_value=department.name,
            )
        return ticket

    @action(detail=True, methods=['post'])
    def assign_worker(self, request, pk=None):
        """Department POC assigns a technician. Ticket must be pending technician assignment."""
        ticket = self.get_object()
        worker_id = request.data.get('worker_id')
        actor = UserProfile.objects.filter(id=request.data.get('actor_id')).first()

        if not worker_id:
            return Response({'worker_id': 'This field is required.'}, status=400)
        if ticket.status != Ticket.STATUS_PENDING_TECH_ASSIGNMENT:
            return Response(
                {'detail': 'Ticket is not pending technician assignment.'}, status=400
            )
        worker = UserProfile.objects.filter(id=worker_id, role=UserProfile.ROLE_TECHNICIAN).first()
        if not worker:
            return Response({'worker_id': 'Invalid technician.'}, status=400)

        from_val = ticket.assigned_technician.name if ticket.assigned_technician else 'Unassigned'
        ticket.assigned_technician = worker
        ticket.status = Ticket.STATUS_PENDING_TECH_ASSESSMENT
        ticket.save()
        TicketEvent.objects.create(
            ticket=ticket, actor=actor, event_type=TicketEvent.EVENT_ASSIGNED_TECHNICIAN,
            from_value=from_val, to_value=worker.name,
        )
        return Response(TicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def change_department(self, request, pk=None):
        """Department POC routes the ticket to a different department (loses access after)."""
        ticket = self.get_object()
        department_id = request.data.get('department_id')
        actor = UserProfile.objects.filter(id=request.data.get('actor_id')).first()

        if not department_id:
            return Response({'department_id': 'This field is required.'}, status=400)
        department = Department.objects.filter(id=department_id).first()
        if not department:
            return Response({'department_id': 'Invalid department.'}, status=400)

        from_val = ticket.current_department.name if ticket.current_department else 'Unassigned'
        ticket.current_department = department
        ticket.assigned_technician = None
        ticket.status = Ticket.STATUS_PENDING_TECH_ASSIGNMENT
        ticket.save()
        TicketEvent.objects.create(
            ticket=ticket, actor=actor, event_type=TicketEvent.EVENT_DEPARTMENT_CHANGED,
            from_value=from_val, to_value=department.name,
        )
        return Response(TicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def submit_assessment(self, request, pk=None):
        """
        Technician submits one of: full | partial | reassign.
        Business rule: only the technician currently assigned to the ticket may submit.
        """
        ticket = self.get_object()
        result = request.data.get('result')
        comment = (request.data.get('comment') or '').strip()
        actor = UserProfile.objects.filter(id=request.data.get('actor_id')).first()

        if ticket.status != Ticket.STATUS_PENDING_TECH_ASSESSMENT:
            return Response(
                {'detail': 'Ticket is not pending technician assessment.'}, status=400
            )
        if actor and ticket.assigned_technician_id != actor.id:
            return Response(
                {'detail': 'Only the assigned technician can submit an assessment.'}, status=403
            )
        if result not in ('full', 'partial', 'reassign'):
            return Response({'result': 'Must be one of: full, partial, reassign.'}, status=400)

        from_status = ticket.get_status_display()
        ticket.status = Ticket.STATUS_PENDING_POC_REVIEW
        ticket.save()

        TicketEvent.objects.create(
            ticket=ticket, actor=actor, event_type=TicketEvent.EVENT_STATUS_CHANGED,
            from_value=from_status, to_value=ticket.get_status_display(),
        )
        # Record what the technician recommended, so the POC review screen can show it.
        TicketEvent.objects.create(
            ticket=ticket, actor=actor, event_type=TicketEvent.EVENT_STATUS_CHANGED,
            from_value='assessment_result', to_value=result,
        )
        if comment:
            TicketEvent.objects.create(
                ticket=ticket, actor=actor, event_type=TicketEvent.EVENT_COMMENT,
                comment_text=comment,
            )
        return Response(TicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def mark_resolved(self, request, pk=None):
        """Client (or POC) marks the ticket fully/partially resolved."""
        ticket = self.get_object()
        level = request.data.get('level', 'full')
        actor = UserProfile.objects.filter(id=request.data.get('actor_id')).first()

        from_status = ticket.get_status_display()
        ticket.status = Ticket.STATUS_RESOLVED_FULL if level == 'full' else Ticket.STATUS_RESOLVED_PARTIAL
        ticket.save()
        TicketEvent.objects.create(
            ticket=ticket, actor=actor, event_type=TicketEvent.EVENT_RESOLVED,
            from_value=from_status, to_value=ticket.get_status_display(),
        )
        return Response(TicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        ticket = self.get_object()
        if request.method == 'GET':
            events = ticket.events.filter(event_type=TicketEvent.EVENT_COMMENT)
            return Response(TicketEventSerializer(events, many=True).data)

        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'text': 'Comment cannot be empty.'}, status=400)
        actor = UserProfile.objects.filter(id=request.data.get('actor_id')).first()
        event = TicketEvent.objects.create(
            ticket=ticket, actor=actor, event_type=TicketEvent.EVENT_COMMENT, comment_text=text
        )
        return Response(TicketEventSerializer(event).data, status=201)
