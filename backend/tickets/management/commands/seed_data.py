import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from tickets.models import Department, Office, Floor, Issue, UserProfile, Ticket, TicketEvent


class Command(BaseCommand):
    help = 'Seeds the database with sample departments, offices, issues, users and tickets.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tickets', type=int, default=28,
            help='How many sample tickets to create (default 28, enough for a few pages).'
        )

    def handle(self, *args, **options):
        n_tickets = options['tickets']

        self.stdout.write('Clearing existing data...')
        TicketEvent.objects.all().delete()
        Ticket.objects.all().delete()
        Issue.objects.all().delete()
        Floor.objects.all().delete()
        Office.objects.all().delete()
        UserProfile.objects.all().delete()
        Department.objects.all().delete()

        self.stdout.write('Creating departments...')
        facilities = Department.objects.create(name='Facilities')
        it = Department.objects.create(name='IT')
        housekeeping = Department.objects.create(name='Housekeeping')

        self.stdout.write('Creating offices and floors...')
        harness = Office.objects.create(name='Harness-1317', has_multiple_floors=True)
        floors = [Floor.objects.create(office=harness, name=n) for n in ['1F', '2F', '3F', '4F']]
        single = Office.objects.create(name='Koramangala Annex', has_multiple_floors=False)

        self.stdout.write('Creating issues...')
        issues_data = [
            ('AC not cooling', True, facilities),
            ('Internet not working', True, it),
            ('Pantry not cleaned', True, housekeeping),
            ('Lights flickering', True, facilities),
            ('Printer not working', False, it),
            ('Washroom needs cleaning', False, housekeeping),
            ('Chair/desk broken', False, facilities),
            ('Wi-Fi password issue', False, it),
        ]
        issues = [
            Issue.objects.create(name=name, is_quick_issue=quick, default_department=dept)
            for name, quick, dept in issues_data
        ]

        self.stdout.write('Creating users...')
        clients = [
            UserProfile.objects.create(name=n, role=UserProfile.ROLE_CLIENT)
            for n in ['Chaitanya M', 'Ritika Sharma', 'Arjun Nair']
        ]
        dept_pocs = [
            UserProfile.objects.create(name='Dhananjaya Murthy', role=UserProfile.ROLE_DEPT_POC, department=facilities),
            UserProfile.objects.create(name='Sneha Rao', role=UserProfile.ROLE_DEPT_POC, department=it),
            UserProfile.objects.create(name='Vikram Singh', role=UserProfile.ROLE_DEPT_POC, department=housekeeping),
        ]
        technicians = [
            UserProfile.objects.create(name='Prakash Kumar', role=UserProfile.ROLE_TECHNICIAN, department=facilities),
            UserProfile.objects.create(name='Manoj Verma', role=UserProfile.ROLE_TECHNICIAN, department=it),
            UserProfile.objects.create(name='Suresh Babu', role=UserProfile.ROLE_TECHNICIAN, department=housekeeping),
        ]

        self.stdout.write(f'Creating {n_tickets} sample tickets...')
        descriptions = [
            'The air conditioning units on floors 2 and 3 have stopped cooling effectively since '
            'this morning. Multiple clients are complaining about uncomfortable temperatures. The '
            'units appear to be running but producing warm air. Last service was 4 months ago. '
            'Clients on Floor 3 (server room side cabin) are affected most severely.',
            'Internet connection keeps dropping every few minutes across the second floor. '
            'This is impacting client calls.',
            'Pantry area on 1F has not been cleaned since yesterday evening, dishes are piling up.',
            'Conference room lights on 3F flicker intermittently, especially during video calls.',
        ]

        statuses_cycle = [
            Ticket.STATUS_PENDING_DEPT_ASSIGNMENT,
            Ticket.STATUS_PENDING_TECH_ASSIGNMENT,
            Ticket.STATUS_PENDING_TECH_ASSESSMENT,
            Ticket.STATUS_PENDING_POC_REVIEW,
            Ticket.STATUS_RESOLVED_FULL,
            Ticket.STATUS_RESOLVED_PARTIAL,
        ]

        for i in range(n_tickets):
            office = harness if i % 3 != 0 else single
            client = random.choice(clients)
            issue = issues[i % len(issues)]
            ticket = Ticket.objects.create(
                title=issue.name,
                description=random.choice(descriptions),
                office=office,
                status=Ticket.STATUS_PENDING_DEPT_ASSIGNMENT,
                created_by=client,
            )
            ticket.issues.add(issue)
            if office.has_multiple_floors:
                ticket.floors.add(random.choice(floors[:2]), floors[2])

            TicketEvent.objects.create(
                ticket=ticket, actor=client, event_type=TicketEvent.EVENT_CREATED,
                to_value=f'Ticket created by {client.name}',
            )

            target_status = statuses_cycle[i % len(statuses_cycle)]
            dept = issue.default_department
            tech = next((t for t in technicians if t.department_id == (dept.id if dept else None)), technicians[0])

            if target_status != Ticket.STATUS_PENDING_DEPT_ASSIGNMENT and dept:
                ticket.current_department = dept
                ticket.status = Ticket.STATUS_PENDING_TECH_ASSIGNMENT
                ticket.save()
                TicketEvent.objects.create(
                    ticket=ticket, actor=None, actor_label='System',
                    event_type=TicketEvent.EVENT_AUTO_ASSIGNED,
                    from_value='Unassigned', to_value=dept.name,
                )

            if target_status in (
                Ticket.STATUS_PENDING_TECH_ASSESSMENT, Ticket.STATUS_PENDING_POC_REVIEW,
                Ticket.STATUS_RESOLVED_FULL, Ticket.STATUS_RESOLVED_PARTIAL,
            ):
                dept_poc = next((p for p in dept_pocs if p.department_id == (dept.id if dept else None)), dept_pocs[0])
                ticket.assigned_technician = tech
                ticket.status = Ticket.STATUS_PENDING_TECH_ASSESSMENT
                ticket.save()
                TicketEvent.objects.create(
                    ticket=ticket, actor=dept_poc, event_type=TicketEvent.EVENT_ASSIGNED_TECHNICIAN,
                    from_value='Unassigned', to_value=tech.name,
                )

            if target_status in (
                Ticket.STATUS_PENDING_POC_REVIEW, Ticket.STATUS_RESOLVED_FULL, Ticket.STATUS_RESOLVED_PARTIAL,
            ):
                ticket.status = Ticket.STATUS_PENDING_POC_REVIEW
                ticket.save()
                TicketEvent.objects.create(
                    ticket=ticket, actor=tech, event_type=TicketEvent.EVENT_STATUS_CHANGED,
                    from_value='Pending Technician Assessment', to_value='Pending Department POC Review',
                )

            if target_status in (Ticket.STATUS_RESOLVED_FULL, Ticket.STATUS_RESOLVED_PARTIAL):
                ticket.status = target_status
                ticket.save()
                TicketEvent.objects.create(
                    ticket=ticket, actor=client, event_type=TicketEvent.EVENT_RESOLVED,
                    from_value='Pending Department POC Review', to_value=ticket.get_status_display(),
                )

        self.stdout.write(self.style.SUCCESS(
            f'Done. Created {n_tickets} tickets, {Department.objects.count()} departments, '
            f'{UserProfile.objects.count()} users.'
        ))
