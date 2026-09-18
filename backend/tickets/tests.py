from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Department, Office, Floor, Issue, UserProfile, Ticket, TicketEvent


class TicketCreationValidationTests(APITestCase):
    """Covers the server-side business rule: an office with multiple floors requires a floor."""

    def setUp(self):
        self.department = Department.objects.create(name='Facilities')
        self.office = Office.objects.create(name='Harness-1317', has_multiple_floors=True)
        self.floor = Floor.objects.create(office=self.office, name='2F')
        self.issue = Issue.objects.create(name='AC not cooling', default_department=self.department)
        self.client_user = UserProfile.objects.create(name='Chaitanya M', role=UserProfile.ROLE_CLIENT)

    def test_create_ticket_without_floor_on_multi_floor_office_fails(self):
        url = reverse('ticket-list')
        payload = {
            'office': self.office.id,
            'issue_ids': [self.issue.id],
            'created_by': self.client_user.id,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('floor_ids', response.data)
        self.assertEqual(Ticket.objects.count(), 0)

    def test_create_ticket_with_floor_succeeds_and_auto_assigns_department(self):
        url = reverse('ticket-list')
        payload = {
            'office': self.office.id,
            'issue_ids': [self.issue.id],
            'floor_ids': [self.floor.id],
            'created_by': self.client_user.id,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ticket = Ticket.objects.get()
        self.assertEqual(ticket.status, Ticket.STATUS_PENDING_TECH_ASSIGNMENT)
        self.assertEqual(ticket.current_department, self.department)
        # created + auto_assigned events should both exist
        self.assertEqual(ticket.events.count(), 2)


class TicketAssignmentTransitionTests(APITestCase):
    """Covers the assign_worker action and the resulting audit-trail (TicketEvent) creation."""

    def setUp(self):
        self.department = Department.objects.create(name='IT')
        self.office = Office.objects.create(name='Koramangala Annex', has_multiple_floors=False)
        self.issue = Issue.objects.create(name='Internet not working', default_department=self.department)
        self.client_user = UserProfile.objects.create(name='Ritika Sharma', role=UserProfile.ROLE_CLIENT)
        self.dept_poc = UserProfile.objects.create(
            name='Sneha Rao', role=UserProfile.ROLE_DEPT_POC, department=self.department
        )
        self.technician = UserProfile.objects.create(
            name='Manoj Verma', role=UserProfile.ROLE_TECHNICIAN, department=self.department
        )
        self.ticket = Ticket.objects.create(
            title='Internet not working', office=self.office, created_by=self.client_user,
            current_department=self.department, status=Ticket.STATUS_PENDING_TECH_ASSIGNMENT,
        )
        self.ticket.issues.add(self.issue)

    def test_assign_worker_transitions_status_and_logs_event(self):
        url = reverse('ticket-assign-worker', kwargs={'pk': self.ticket.pk})
        response = self.client.post(
            url, {'worker_id': self.technician.id, 'actor_id': self.dept_poc.id}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, Ticket.STATUS_PENDING_TECH_ASSESSMENT)
        self.assertEqual(self.ticket.assigned_technician, self.technician)
        self.assertTrue(
            self.ticket.events.filter(event_type=TicketEvent.EVENT_ASSIGNED_TECHNICIAN).exists()
        )

    def test_assign_worker_rejects_non_technician(self):
        url = reverse('ticket-assign-worker', kwargs={'pk': self.ticket.pk})
        response = self.client.post(
            url, {'worker_id': self.dept_poc.id, 'actor_id': self.dept_poc.id}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_assigned_technician_can_submit_assessment(self):
        self.ticket.assigned_technician = self.technician
        self.ticket.status = Ticket.STATUS_PENDING_TECH_ASSESSMENT
        self.ticket.save()

        other_tech = UserProfile.objects.create(
            name='Suresh Babu', role=UserProfile.ROLE_TECHNICIAN, department=self.department
        )
        url = reverse('ticket-submit-assessment', kwargs={'pk': self.ticket.pk})
        response = self.client.post(
            url, {'result': 'full', 'actor_id': other_tech.id}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
