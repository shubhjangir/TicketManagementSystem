from rest_framework import serializers

from .models import Department, Office, Floor, Issue, UserProfile, Ticket, TicketEvent


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name']


class FloorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        fields = ['id', 'name', 'office']


class OfficeSerializer(serializers.ModelSerializer):
    floors = FloorSerializer(many=True, read_only=True)

    class Meta:
        model = Office
        fields = ['id', 'name', 'has_multiple_floors', 'floors']


class IssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = ['id', 'name', 'is_quick_issue', 'default_department']


class UserProfileSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'name', 'role', 'role_display', 'department']


class TicketEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketEvent
        fields = [
            'id', 'event_type', 'actor', 'actor_name', 'actor_label',
            'from_value', 'to_value', 'comment_text', 'created_at',
        ]

    def get_actor_name(self, obj):
        return obj.actor.name if obj.actor else (obj.actor_label or 'System')


class TicketListSerializer(serializers.ModelSerializer):
    issues = IssueSerializer(many=True, read_only=True)
    floors = FloorSerializer(many=True, read_only=True)
    office_name = serializers.CharField(source='office.name', read_only=True)
    current_department_name = serializers.CharField(source='current_department.name', read_only=True)
    assigned_technician_name = serializers.CharField(source='assigned_technician.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'title', 'description', 'status', 'status_display',
            'office', 'office_name', 'floors', 'issues',
            'created_by', 'created_by_name',
            'current_department', 'current_department_name',
            'assigned_technician', 'assigned_technician_name',
            'created_at', 'updated_at',
        ]


class TicketDetailSerializer(TicketListSerializer):
    events = TicketEventSerializer(many=True, read_only=True)

    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + ['events']


class TicketCreateSerializer(serializers.ModelSerializer):
    issue_ids = serializers.PrimaryKeyRelatedField(
        source='issues', many=True, queryset=Issue.objects.all()
    )
    floor_ids = serializers.PrimaryKeyRelatedField(
        source='floors', many=True, queryset=Floor.objects.all(), required=False
    )

    class Meta:
        model = Ticket
        fields = ['office', 'issue_ids', 'floor_ids', 'description', 'created_by']

    def validate(self, data):
        errors = {}
        office = data.get('office')
        floors = data.get('floors')
        issues = data.get('issues')

        # Business rule: an office with multiple floors requires at least one floor.
        if office and office.has_multiple_floors and not floors:
            errors['floor_ids'] = (
                'This office has multiple floors — please select at least one floor.'
            )
        if not issues:
            errors['issue_ids'] = 'At least one issue must be selected.'

        if errors:
            raise serializers.ValidationError(errors)
        return data
