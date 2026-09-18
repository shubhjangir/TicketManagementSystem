from django.contrib import admin
from .models import Department, Office, Floor, Issue, UserProfile, Ticket, TicketEvent


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(Office)
class OfficeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'has_multiple_floors']


@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'office']
    list_filter = ['office']


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'is_quick_issue', 'default_department']
    list_filter = ['is_quick_issue', 'default_department']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'role', 'department']
    list_filter = ['role', 'department']


class TicketEventInline(admin.TabularInline):
    model = TicketEvent
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_number', 'title', 'status', 'current_department', 'assigned_technician', 'created_at']
    list_filter = ['status', 'current_department', 'office']
    search_fields = ['ticket_number', 'title']
    inlines = [TicketEventInline]


@admin.register(TicketEvent)
class TicketEventAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'event_type', 'actor', 'actor_label', 'created_at']
    list_filter = ['event_type']
