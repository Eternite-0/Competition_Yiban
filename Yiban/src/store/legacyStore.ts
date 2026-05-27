import type { Competition, Registration, Submission, StudentGrowth, TeamPost } from '../types';

export const competitions: Competition[] = [
  { id: 'c1', title: '第十五届全国大学生服务外包创新创业大赛', level: '国家级', category: 'A', status: '报名中', organizer: '教育部高等教育司', deadline: '2024-05-20', description: '...', views: 1200, teams: 156, tags: ['IT/计算机', '创新创业'] },
  { id: 'c2', title: '"蓝桥杯"全国软件和信息技术专业人才大赛', level: '省级', category: 'B', status: '报名中', organizer: '工业和信息化部人才交流中心', deadline: '2024-04-15', description: '...', views: 3500, teams: 420, tags: ['IT/计算机'] },
];

export const registrations: Registration[] = [
  { id: 'r1', competitionId: 'c2', competitionTitle: '"蓝桥杯"', studentId: 's1', studentName: '卢同学', status: '待审核', submitDate: '2024-03-10', teamName: '码上飞' },
];

export const submissions: Submission[] = [
  { id: 'sub1', registrationId: 'r1', studentName: '卢同学', competitionTitle: '蓝桥杯', fileName: '蓝桥杯参赛作品.zip', fileSize: 15728640, uploadDate: '2024-03-12', status: '待审核' },
];

export const studentsGrowth: StudentGrowth[] = [
  { studentId: 's1', studentName: '卢同学', radar: [], totalCompetitions: 4, awards: 2, completionRate: 85 },
];

export const teamPosts: TeamPost[] = [
  { id: 't1', authorName: '李同学', authorDept: '计科21级', competitionTitle: '蓝桥杯', content: '...', rolesNeeded: '前端开发', date: '2024-03-10' },
];

const state = {
  competitions,
  registrations,
  submissions,
  studentsGrowth,
  teamPosts,
};

export const useStore = (selector?: (state: any) => any) => {
  if (selector) return selector(state);
  return state;
};
