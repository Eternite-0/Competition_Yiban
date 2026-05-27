import { createBrowserRouter, Navigate } from 'react-router-dom';
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
    ],
  },
  {
    path: '/teacher',
    element: <RequireAuth role="teacher"><Layout /></RequireAuth>,
    children: [
      { index: true, element: <TeacherHome /> },
      { path: 'college-overview', element: <CollegeOverview /> },
      { path: 'competitions', element: <CompetitionsHub /> },
      { path: 'audit', element: <SubmissionAudit /> },
      { path: 'student-competitions', element: <TeacherStudentCompetitions /> },
      { path: 'student-growth', element: <TeacherStudentGrowth /> },
      { path: 'student-detail', element: <StudentDetail /> },
    ],
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
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
