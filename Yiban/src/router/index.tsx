import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import Layout from '../components/Layout';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import TermsPage from '../pages/TermsPage';
import { useStore } from '../store/useStore';

// Shared pages (lazy loaded)
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));

// Student pages (lazy loaded)
const StudentHome = lazy(() => import('../pages/student/StudentHome'));
const CompetitionsHub = lazy(() => import('../pages/student/CompetitionsHub'));
const CompetitionDetail = lazy(() => import('../pages/student/CompetitionDetail'));
const TeamRecruitment = lazy(() => import('../pages/student/TeamRecruitment'));
const MyRegistrations = lazy(() => import('../pages/student/MyRegistrations'));
const RegistrationWorkbench = lazy(() => import('../pages/student/RegistrationWorkbench'));
const SubmissionUpload = lazy(() => import('../pages/student/SubmissionUpload'));
const StudentGrowth = lazy(() => import('../pages/student/StudentGrowth'));
const StudentAcademic = lazy(() => import('../pages/student/StudentAcademic'));
const AchievementUpload = lazy(() => import('../pages/student/AchievementUpload'));
const CompetitionCalendar = lazy(() => import('../pages/student/CompetitionCalendar'));
const StudentExcellentWorks = lazy(() => import('../pages/student/ExcellentWorks'));
const MyProgress = lazy(() => import('../pages/student/MyProgress'));

// Teacher pages (lazy loaded)
const TeacherHome = lazy(() => import('../pages/teacher/TeacherHome'));
const SubmissionAudit = lazy(() => import('../pages/teacher/SubmissionAudit'));
const TeacherStudentCompetitions = lazy(() => import('../pages/teacher/TeacherStudentCompetitions'));
const TeacherStudentGrowth = lazy(() => import('../pages/teacher/TeacherStudentGrowth'));
const CollegeOverview = lazy(() => import('../pages/teacher/CollegeOverview'));
const AcademicWarning = lazy(() => import('../pages/teacher/AcademicWarning'));
const StudentDetail = lazy(() => import('../pages/teacher/StudentDetail'));
const StudentCompare = lazy(() => import('../pages/teacher/StudentCompare'));

// Admin pages (lazy loaded)
const AdminHome = lazy(() => import('../pages/admin/AdminHome'));
const CompetitionPublish = lazy(() => import('../pages/admin/CompetitionPublish'));
const ExcellentWorks = lazy(() => import('../pages/admin/ExcellentWorks'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const AnnouncementManagement = lazy(() => import('../pages/admin/AnnouncementManagement'));
const MajorManagement = lazy(() => import('../pages/admin/MajorManagement'));
const ClassManagement = lazy(() => import('../pages/admin/ClassManagement'));
const StudentRosterManagement = lazy(() => import('../pages/admin/StudentRosterManagement'));
const RegistrationAudit = lazy(() => import('../pages/admin/RegistrationAudit'));
const DraftsBox = lazy(() => import('../pages/admin/DraftsBox'));
const CompetitionSourceManagement = lazy(() => import('../pages/admin/CompetitionSourceManagement'));

// Loading fallback for lazy routes
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-ink-muted">加载中...</span>
      </div>
    </div>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function RequireAuth({ role, children }: { role?: string; children: ReactNode }) {
  const currentUser = useStore((s) => s.currentUser);
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;
  if (role && currentUser && currentUser.role !== role) {
    return <Navigate to={`/${currentUser.role}`} replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/terms', element: <TermsPage /> },
  {
    path: '/student',
    element: <RequireAuth role="student"><Layout /></RequireAuth>,
    children: [
      { index: true, element: <LazyPage><StudentHome /></LazyPage> },
      { path: 'notifications', element: <LazyPage><NotificationsPage /></LazyPage> },
      { path: 'competitions', element: <LazyPage><CompetitionsHub /></LazyPage> },
      { path: 'competitions/:id', element: <LazyPage><CompetitionDetail /></LazyPage> },
      { path: 'teams', element: <LazyPage><TeamRecruitment /></LazyPage> },
      { path: 'registrations', element: <LazyPage><MyRegistrations /></LazyPage> },
      { path: 'registrations/workbench/:competitionId', element: <LazyPage><RegistrationWorkbench /></LazyPage> },
      { path: 'upload/:registrationId', element: <LazyPage><SubmissionUpload /></LazyPage> },
      { path: 'growth', element: <LazyPage><StudentGrowth /></LazyPage> },
      { path: 'academic', element: <LazyPage><StudentAcademic /></LazyPage> },
      { path: 'achievements/upload', element: <LazyPage><AchievementUpload /></LazyPage> },
      { path: 'calendar', element: <LazyPage><CompetitionCalendar /></LazyPage> },
      { path: 'works', element: <LazyPage><StudentExcellentWorks /></LazyPage> },
      { path: 'progress', element: <LazyPage><MyProgress /></LazyPage> },
    ],
  },
  {
    path: '/teacher',
    element: <RequireAuth role="teacher"><Layout /></RequireAuth>,
    children: [
      { index: true, element: <LazyPage><TeacherHome /></LazyPage> },
      { path: 'notifications', element: <LazyPage><NotificationsPage /></LazyPage> },
      { path: 'college-overview', element: <LazyPage><CollegeOverview /></LazyPage> },
      { path: 'academic-warning', element: <LazyPage><AcademicWarning /></LazyPage> },
      { path: 'competitions', element: <LazyPage><CompetitionsHub /></LazyPage> },
      { path: 'audit', element: <LazyPage><SubmissionAudit /></LazyPage> },
      { path: 'student-competitions', element: <LazyPage><TeacherStudentCompetitions /></LazyPage> },
      { path: 'student-growth', element: <LazyPage><TeacherStudentGrowth /></LazyPage> },
      { path: 'student-detail', element: <LazyPage><StudentDetail /></LazyPage> },
      { path: 'student-compare', element: <LazyPage><StudentCompare /></LazyPage> },
    ],
  },
  {
    path: '/admin',
    element: <RequireAuth role="admin"><Layout /></RequireAuth>,
    children: [
      { index: true, element: <LazyPage><AdminHome /></LazyPage> },
      { path: 'notifications', element: <LazyPage><NotificationsPage /></LazyPage> },
      { path: 'competitions', element: <LazyPage><CompetitionsHub /></LazyPage> },
      { path: 'publish', element: <LazyPage><CompetitionPublish /></LazyPage> },
      { path: 'publish/:id', element: <LazyPage><CompetitionPublish /></LazyPage> },
      { path: 'publish/activity/:activityId', element: <LazyPage><CompetitionPublish /></LazyPage> },
      { path: 'ai-import', element: <Navigate to="/admin/publish" replace /> },
      { path: 'ai-drafts', element: <Navigate to="/admin/drafts" replace /> },
      { path: 'drafts', element: <LazyPage><DraftsBox /></LazyPage> },
      { path: 'competition-sources', element: <LazyPage><CompetitionSourceManagement /></LazyPage> },
      { path: 'works', element: <LazyPage><ExcellentWorks /></LazyPage> },
      { path: 'audit', element: <LazyPage><SubmissionAudit /></LazyPage> },
      { path: 'users', element: <LazyPage><UserManagement /></LazyPage> },
      { path: 'announcements', element: <LazyPage><AnnouncementManagement /></LazyPage> },
      { path: 'majors', element: <LazyPage><MajorManagement /></LazyPage> },
      { path: 'classes', element: <LazyPage><ClassManagement /></LazyPage> },
      { path: 'roster', element: <LazyPage><StudentRosterManagement /></LazyPage> },
      { path: 'registration-audit', element: <LazyPage><RegistrationAudit /></LazyPage> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
