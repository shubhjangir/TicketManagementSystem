from django.db import models


class Department(models.Model):
    """A department that can own tickets and have technicians (e.g. Facilities, IT)."""
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Office(models.Model):
    """A client office/site. Whether it has multiple floors changes the create-ticket form."""
    name = models.CharField(max_length=100)
    has_multiple_floors = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Floor(models.Model):
    office = models.ForeignKey(Office, related_name='floors', on_delete=models.CASCADE)
    name = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.name} ({self.office.name})"


class Issue(models.Model):
    """The issue catalog used for the 'Quick Issues' chips and the search/autocomplete field."""
    name = models.CharField(max_length=150, unique=True)
    is_quick_issue = models.BooleanField(
        default=False, help_text="Shown as a one-tap chip on the create-ticket form."
    )
    default_department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.SET_NULL,
        help_text="Department a ticket auto-routes to when this issue is selected.",
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    """A lightweight user record. No auth is implemented (not required by the brief);
    the frontend lets you pick 'who you are acting as' from these records."""

    ROLE_CLIENT = 'client'
    ROLE_DEPT_POC = 'department_poc'
    ROLE_TECHNICIAN = 'technician'
    ROLE_CHOICES = [
        (ROLE_CLIENT, 'Client'),
        (ROLE_DEPT_POC, 'Department POC'),
        (ROLE_TECHNICIAN, 'Technician'),
    ]

    name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.SET_NULL, related_name='members'
    )

    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"


class Ticket(models.Model):
    STATUS_PENDING_DEPT_ASSIGNMENT = 'pending_dept_assignment'
    STATUS_PENDING_TECH_ASSIGNMENT = 'pending_technician_assignment'
    STATUS_PENDING_TECH_ASSESSMENT = 'pending_technician_assessment'
    STATUS_PENDING_POC_REVIEW = 'pending_dept_poc_review'
    STATUS_RESOLVED_FULL = 'resolved_full'
    STATUS_RESOLVED_PARTIAL = 'resolved_partial'
    STATUS_CLOSED = 'closed'

    STATUS_CHOICES = [
        (STATUS_PENDING_DEPT_ASSIGNMENT, 'Pending Department Assignment'),
        (STATUS_PENDING_TECH_ASSIGNMENT, 'Pending Technician Assignment'),
        (STATUS_PENDING_TECH_ASSESSMENT, 'Pending Technician Assessment'),
        (STATUS_PENDING_POC_REVIEW, 'Pending Department POC Review'),
        (STATUS_RESOLVED_FULL, 'Resolved (Full)'),
        (STATUS_RESOLVED_PARTIAL, 'Resolved (Partial)'),
        (STATUS_CLOSED, 'Closed'),
    ]

    OPEN_STATUSES = [
        STATUS_PENDING_DEPT_ASSIGNMENT,
        STATUS_PENDING_TECH_ASSIGNMENT,
        STATUS_PENDING_TECH_ASSESSMENT,
        STATUS_PENDING_POC_REVIEW,
    ]
    CLOSED_STATUSES = [STATUS_RESOLVED_FULL, STATUS_RESOLVED_PARTIAL, STATUS_CLOSED]

    ticket_number = models.CharField(max_length=20, unique=True, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    office = models.ForeignKey(Office, on_delete=models.PROTECT, related_name='tickets')
    floors = models.ManyToManyField(Floor, blank=True, related_name='tickets')
    issues = models.ManyToManyField(Issue, related_name='tickets')

    status = models.CharField(
        max_length=40, choices=STATUS_CHOICES, default=STATUS_PENDING_DEPT_ASSIGNMENT
    )

    created_by = models.ForeignKey(UserProfile, on_delete=models.PROTECT, related_name='created_tickets')
    current_department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.SET_NULL, related_name='tickets'
    )
    assigned_technician = models.ForeignKey(
        UserProfile, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_tickets'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            last = Ticket.objects.order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            self.ticket_number = f"TKT-{1000 + next_num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.ticket_number


class TicketEvent(models.Model):
    """Append-only activity log entry. One Ticket has many TicketEvents (1:N relationship) —
    this both models the audit trail shown in the wireframe's Activity panel and satisfies the
    'meaningful relationship between entities' requirement."""

    EVENT_CREATED = 'created'
    EVENT_AUTO_ASSIGNED = 'auto_assigned'
    EVENT_ASSIGNED_TECHNICIAN = 'assigned_technician'
    EVENT_DEPARTMENT_CHANGED = 'department_changed'
    EVENT_STATUS_CHANGED = 'status_changed'
    EVENT_COMMENT = 'comment'
    EVENT_RESOLVED = 'resolved'

    EVENT_TYPES = [
        (EVENT_CREATED, 'Created'),
        (EVENT_AUTO_ASSIGNED, 'Auto Assigned'),
        (EVENT_ASSIGNED_TECHNICIAN, 'Assigned Technician'),
        (EVENT_DEPARTMENT_CHANGED, 'Department Changed'),
        (EVENT_STATUS_CHANGED, 'Status Changed'),
        (EVENT_COMMENT, 'Comment'),
        (EVENT_RESOLVED, 'Resolved'),
    ]

    ticket = models.ForeignKey(Ticket, related_name='events', on_delete=models.CASCADE)
    actor = models.ForeignKey(UserProfile, null=True, blank=True, on_delete=models.SET_NULL)
    actor_label = models.CharField(
        max_length=100, blank=True, help_text="Used when there's no actor, e.g. 'System'."
    )
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    from_value = models.CharField(max_length=150, blank=True)
    to_value = models.CharField(max_length=150, blank=True)
    comment_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.ticket.ticket_number}: {self.event_type}"
