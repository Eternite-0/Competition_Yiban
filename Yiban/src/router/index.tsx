import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from '../components/Layout';
import LoginPage from '../pages/LoginPage';
import { useStore } from '../store/useStore';

// Student pages
import StudentHome from '../pages/student/StudentHome';
import CompetitionsHub from '../pages/student/CompetitionsHub';
import CompetitionDetail from '../pages/student/CompetitionDetail';
import TeamRecruitment from '../pages/student/TeamRecruitment';
import MyRegistrations from '../pages/student/MyRegistrations';
import RegistrationWorkbench from '../pages/student/RegistrationWorkbench';
import SubmissionUpload from '../pages/student/SubmissionUpload';
import StudentGrowth from '../pages/student/StudentGrowth';
import AchievementUpload from '../pages/student/AchievementUpload';
import CompetitionCalendar from '../pages/student/CompetitionCalendar';
import StudentExcellentWorks from '../pages/student/ExcellentWorks';

// Teacher pages
import TeacherHome from '../pages/teacher/TeacherHome';
import SubmissionAudit from '../pages/teacher/SubmissionAudit';
import TeacherStudentCompetitions from '../pages/teacher/TeacherStudentCompetitions';
import TeacherStudentGrowth from '../pages/teacher/TeacherStudentGrowth';
import CollegeOverview from '../pages/teacher/CollegeOverview';
import StudentDetail from '../pages/teacher/StudentDetail';
import StudentCompare from '../pages/teacher/StudentCompare';

// Admin pages
import AdminHome from '../pages/admin/AdminHome';
import CompetitionPublish from '../pages/admin/CompetitionPublish';
import ExcellentWorks from '../pages/admin/ExcellentWorks';
import UserManagement from '../pages/admin/UserManagement';

function RequireAuth({ role, children }: { role?: string | string[]; children: ReactNode }) {
  const currentUser = useStore((s) => s.currentUser);
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;
  const allowedRoles = Array.isArray(role) ? role : role ? [role] : [];
  if (allowedRoles.length > 0 && currentUser && !allowedRoles.includes(currentUser.role)) {
    const target = currentUser.role === 'counselor' ? '/teacher' : `/${currentUser.role}`;
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}

function CounselorRedirect() {
  const location = useLocation();
  const target = `${location.pathname.replace(/^\/counselor/, '/teacher')}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  {
    path: '/student',
    element: <RequireAuth role="student"><Layout /></RequireAuth>,
    children: [
      { index: true, element: <StudentHome /> },
      { path: 'competitions', element: <CompetitionsHub /> },
      { path: 'competitions/:id', element: <CompetitionDetail /> },
      { path: 'teams', element: <TeamRecruitment /> },
      { path: 'registrations', element: <MyRegistrations /> },
      { path: 'registrations/workbench/:competitionId', element: <RegistrationWorkbench /> },
      { path: 'upload/:registrationId', element: <SubmissionUpload /> },
      { path: 'growth', element: <StudentGrowth /> },
      { path: 'achievements/upload', element: <AchievementUpload /> },
      { path: 'calendar', element: <CompetitionCalendar /> },
      { path: 'works', element: <StudentExcellentWorks /> },
    ],
  },
  {
    path: '/teacher',
    element: <RequireAuth role={['teacher', 'counselor']}><Layout /></RequireAuth>,
    children: [
      { index: true, element: <TeacherHome /> },
      { path: 'college-overview', element: <CollegeOverview /> },
      { path: 'competitions', element: <CompetitionsHub /> },
      { path: 'audit', element: <SubmissionAudit /> },
      { path: 'student-competitions', element: <TeacherStudentCompetitions /> },
      { path: 'student-growth', element: <TeacherStudentGrowth /> },
      { path: 'student-detail', element: <StudentDetail /> },
      { path: 'student-compare', element: <StudentCompare /> },
    ],
  },
  {
    path: '/counselor/*',
    element: <CounselorRedirect />,
  },
  {
    path: '/admin',
    element: <RequireAuth role="admin"><Layout /></RequireAuth>,
    children: [
      { index: true, element: <AdminHome /> },
      { path: 'competitions', element: <CompetitionsHub /> },
      { path: 'publish', element: <CompetitionPublish /> },
      { path: 'publish/:id', element: <CompetitionPublish /> },
      { path: 'works', element: <ExcellentWorks /> },
      { path: 'audit', element: <SubmissionAudit /> },
      { path: 'users', element: <UserManagement /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
