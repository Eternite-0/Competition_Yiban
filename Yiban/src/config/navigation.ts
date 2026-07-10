/**
 * 全站导航与命名唯一来源。
 * Sidebar / Header / Breadcrumb 都必须读这里，禁止各自维护中文名。
 */

export type AppRole = 'student' | 'teacher' | 'admin';

export interface NavItem {
  type?: 'item';
  icon: string;
  /** 侧栏与顶栏统一显示名 */
  label: string;
  path: string;
  /** 可选：侧栏次要说明 */
  hint?: string;
}

export interface NavGroup {
  type: 'group';
  label: string;
}

export type NavEntry = NavItem | NavGroup;

/** 角色根路径标题 */
export const roleHomeLabel: Record<AppRole, string> = {
  student: '工作台',
  teacher: '工作台',
  admin: '工作台',
};

export const roleSectionLabel: Record<AppRole, string> = {
  student: '学生端',
  teacher: '教师端',
  admin: '管理端',
};

/**
 * 学生：按「发现 → 参赛 → 成长」主流程分组，减少平铺感。
 * 上传成果从主导航下沉：从「我的参赛」进入，避免与报名工作台抢入口。
 */
export const studentNav: NavEntry[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/student', hint: '总览待办与焦点' },
  { type: 'group', label: '发现活动' },
  { icon: 'emoji_events', label: '活动大厅', path: '/student/competitions', hint: '浏览并报名' },
  { icon: 'calendar_month', label: '赛事日历', path: '/student/calendar', hint: '按时间查看' },
  { icon: 'group_add', label: '组队招募', path: '/student/teams', hint: '找队友' },
  { icon: 'workspace_premium', label: '光荣榜', path: '/student/works', hint: '优秀作品' },
  { type: 'group', label: '我的参赛' },
  { icon: 'assignment_ind', label: '报名与材料', path: '/student/registrations', hint: '报名状态与工作台' },
  { icon: 'timeline', label: '进度跟踪', path: '/student/progress', hint: '全流程进度' },
  { icon: 'insights', label: '成长画像', path: '/student/growth', hint: '能力与综测' },
];

/** 教师：审核与学情为主，活动大厅为辅 */
export const teacherNav: NavEntry[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/teacher', hint: '学院态势' },
  { type: 'group', label: '审核与学情' },
  { icon: 'fact_check', label: '审核中心', path: '/teacher/audit', hint: '报名/成果审核' },
  { icon: 'analytics', label: '学院总览', path: '/teacher/college-overview', hint: '数据概览' },
  { icon: 'school', label: '学生看板', path: '/teacher/student-competitions', hint: '参赛明细' },
  { icon: 'trending_up', label: '学情分析', path: '/teacher/student-growth', hint: '成长对比' },
  { type: 'group', label: '活动' },
  { icon: 'emoji_events', label: '活动大厅', path: '/teacher/competitions', hint: '查看活动' },
];

/** 管理端：运营 → 审核 → 基础数据 */
export const adminNav: NavEntry[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/admin', hint: '运营总览' },
  { type: 'group', label: '活动运营' },
  { icon: 'emoji_events', label: '活动管理', path: '/admin/competitions', hint: '列表与上下架' },
  { icon: 'add_circle', label: '发布活动', path: '/admin/publish', hint: '新建/编辑' },
  { icon: 'draft', label: '草稿箱', path: '/admin/drafts', hint: '未发布内容' },
  { icon: 'travel_explore', label: '赛事来源', path: '/admin/competition-sources', hint: '外部来源' },
  { icon: 'campaign', label: '公告管理', path: '/admin/announcements', hint: '系统公告' },
  { type: 'group', label: '审核与成果' },
  { icon: 'fact_check', label: '统一审核', path: '/admin/audit', hint: '待办审核' },
  { icon: 'how_to_reg', label: '教师注册审核', path: '/admin/registration-audit', hint: '账号开通' },
  { icon: 'auto_awesome', label: '优秀作品库', path: '/admin/works', hint: '成果展示' },
  { type: 'group', label: '组织与用户' },
  { icon: 'manage_accounts', label: '用户管理', path: '/admin/users' },
  { icon: 'group', label: '花名册', path: '/admin/roster' },
  { icon: 'school', label: '专业管理', path: '/admin/majors' },
  { icon: 'class', label: '班级管理', path: '/admin/classes' },
];

export const navByRole: Record<AppRole, NavEntry[]> = {
  student: studentNav,
  teacher: teacherNav,
  admin: adminNav,
};

/** 路径片段 / 完整路径 → 统一中文名（面包屑 + 顶栏） */
const pathLabelEntries: Array<[string, string]> = [
  // 完整路径优先
  ['/student', '工作台'],
  ['/student/competitions', '活动大厅'],
  ['/student/calendar', '赛事日历'],
  ['/student/teams', '组队招募'],
  ['/student/works', '光荣榜'],
  ['/student/registrations', '报名与材料'],
  ['/student/progress', '进度跟踪'],
  ['/student/growth', '成长画像'],
  ['/student/achievements/upload', '上传成果'],
  ['/student/notifications', '消息中心'],
  ['/teacher', '工作台'],
  ['/teacher/college-overview', '学院总览'],
  ['/teacher/competitions', '活动大厅'],
  ['/teacher/audit', '审核中心'],
  ['/teacher/student-competitions', '学生看板'],
  ['/teacher/student-growth', '学情分析'],
  ['/teacher/student-detail', '学生详情'],
  ['/teacher/student-compare', '学生对比'],
  ['/teacher/notifications', '消息中心'],
  ['/admin', '工作台'],
  ['/admin/competitions', '活动管理'],
  ['/admin/publish', '发布活动'],
  ['/admin/drafts', '草稿箱'],
  ['/admin/competition-sources', '赛事来源'],
  ['/admin/announcements', '公告管理'],
  ['/admin/audit', '统一审核'],
  ['/admin/registration-audit', '教师注册审核'],
  ['/admin/works', '优秀作品库'],
  ['/admin/users', '用户管理'],
  ['/admin/roster', '花名册'],
  ['/admin/majors', '专业管理'],
  ['/admin/classes', '班级管理'],
  ['/admin/notifications', '消息中心'],
  // 片段
  ['student', '学生端'],
  ['teacher', '教师端'],
  ['admin', '管理端'],
  ['competitions', '活动大厅'],
  ['teams', '组队招募'],
  ['registrations', '报名与材料'],
  ['workbench', '报名工作台'],
  ['upload', '提交作品'],
  ['growth', '成长画像'],
  ['achievements', '成果'],
  ['calendar', '赛事日历'],
  ['works', '光荣榜'],
  ['progress', '进度跟踪'],
  ['college-overview', '学院总览'],
  ['audit', '审核中心'],
  ['student-competitions', '学生看板'],
  ['student-growth', '学情分析'],
  ['student-detail', '学生详情'],
  ['student-compare', '学生对比'],
  ['publish', '发布活动'],
  ['activity', '通用活动'],
  ['users', '用户管理'],
  ['announcements', '公告管理'],
  ['majors', '专业管理'],
  ['classes', '班级管理'],
  ['roster', '花名册'],
  ['registration-audit', '教师注册审核'],
  ['drafts', '草稿箱'],
  ['competition-sources', '赛事来源'],
  ['notifications', '消息中心'],
];

const pathLabelMap = new Map(pathLabelEntries);

export function labelForPath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (pathLabelMap.has(clean)) return pathLabelMap.get(clean)!;

  // 动态详情
  if (/^\/student\/competitions\/[^/]+$/.test(clean)) return '活动详情';
  if (/^\/student\/registrations\/workbench\/[^/]+$/.test(clean)) return '报名工作台';
  if (/^\/student\/upload\/[^/]+$/.test(clean)) return '提交作品';
  if (/^\/admin\/publish\/activity\/[^/]+$/.test(clean)) return '编辑活动';
  if (/^\/admin\/publish\/[^/]+$/.test(clean)) return '编辑活动';

  const last = clean.split('/').filter(Boolean).pop() || '';
  return pathLabelMap.get(last) || last || '易赛通';
}

export function labelForSegment(segment: string): string {
  return pathLabelMap.get(segment) || segment;
}

export function isNavGroup(item: NavEntry): item is NavGroup {
  return item.type === 'group';
}

/** 学生主流程：用于工作台与相关页串联 */
export const studentJourney = [
  { step: 1, label: '发现活动', path: '/student/competitions', desc: '在活动大厅找到适合的赛事' },
  { step: 2, label: '报名参赛', path: '/student/registrations', desc: '提交报名并完善材料' },
  { step: 3, label: '跟踪进度', path: '/student/progress', desc: '查看审核与赛事节点' },
  { step: 4, label: '沉淀成长', path: '/student/growth', desc: '更新成长画像与综测' },
] as const;

/** 页面间关联推荐（「接下来可以」） */
export const relatedLinks: Record<string, Array<{ label: string; path: string; desc?: string }>> = {
  '/student': [
    { label: '活动大厅', path: '/student/competitions', desc: '去报名' },
    { label: '报名与材料', path: '/student/registrations', desc: '处理待办' },
    { label: '进度跟踪', path: '/student/progress', desc: '看状态' },
  ],
  '/student/competitions': [
    { label: '组队招募', path: '/student/teams', desc: '找队友' },
    { label: '赛事日历', path: '/student/calendar', desc: '看截止' },
    { label: '报名与材料', path: '/student/registrations', desc: '我的报名' },
  ],
  '/student/registrations': [
    { label: '进度跟踪', path: '/student/progress', desc: '全流程' },
    { label: '活动大厅', path: '/student/competitions', desc: '继续报名' },
    { label: '成长画像', path: '/student/growth', desc: '能力沉淀' },
  ],
  '/student/progress': [
    { label: '报名与材料', path: '/student/registrations', desc: '补材料' },
    { label: '成长画像', path: '/student/growth', desc: '看画像' },
  ],
  '/student/growth': [
    { label: '光荣榜', path: '/student/works', desc: '优秀作品' },
    { label: '进度跟踪', path: '/student/progress', desc: '参赛进度' },
  ],
  '/teacher': [
    { label: '审核中心', path: '/teacher/audit', desc: '处理待审' },
    { label: '学生看板', path: '/teacher/student-competitions', desc: '看明细' },
    { label: '学情分析', path: '/teacher/student-growth', desc: '看成长' },
  ],
  '/admin': [
    { label: '统一审核', path: '/admin/audit', desc: '待办' },
    { label: '发布活动', path: '/admin/publish', desc: '新建' },
    { label: '活动管理', path: '/admin/competitions', desc: '列表' },
  ],
};
