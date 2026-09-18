from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, OfficeViewSet, FloorViewSet, IssueViewSet,
    UserProfileViewSet, TicketViewSet,
)

router = DefaultRouter()
router.register('departments', DepartmentViewSet, basename='department')
router.register('offices', OfficeViewSet, basename='office')
router.register('floors', FloorViewSet, basename='floor')
router.register('issues', IssueViewSet, basename='issue')
router.register('users', UserProfileViewSet, basename='userprofile')
router.register('tickets', TicketViewSet, basename='ticket')

urlpatterns = router.urls
