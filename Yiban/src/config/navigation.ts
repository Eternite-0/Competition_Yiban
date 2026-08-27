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
  student: '首页',
  teacher: '工作台',
  admin: '工作台',
};

export const roleSectionLabel: Record<AppRole, string> = {
  student: '学生端',
  teacher: '教师端',
  admin: '管理端',
};

/** 学生：核心流程保持分组，日历、组队与自定义成果上传始终可见。 */
export const studentNav: NavEntry[] = [
  { icon: 'space_dashboard', label: '首页', path: '/student', hint: '待办与临期赛事' },
  { icon: 'auto_awesome', label: 'AI 智能工作台', path: '/student/ai', hint: '赛事推荐、材料预检与智能组队' },
  { type: 'group', label: '发现赛事' },
  { icon: 'emoji_events', label: '竞赛中心', path: '/student/competitions', hint: '浏览并报名赛事' },
  { icon: 'calendar_month', label: '赛事日历', path: '/student/calendar', hint: '查看报名与比赛时间' },
  { icon: 'group_add', label: '组队招募', path: '/student/teams', hint: '寻找队友与招募成员' },
  { icon: 'workspace_premium', label: '优秀成果', path: '/student/works', hint: '查看优秀作品与获奖成果' },
  { type: 'group', label: '我的参赛' },
  { icon: 'assignment_ind', label: '我的赛事', path: '/student/registrations', hint: '报名、材料与进度' },
  { icon: 'timeline', label: '进度跟踪', path: '/student/progress', hint: '查看赛事阶段与待办' },
  { type: 'group', label: '学业中心' },
  { icon: 'school', label: '学业中心', path: '/student/academic', hint: '成绩、课表与考试安排' },
  { type: 'group', label: '成果与成长' },
  { icon: 'upload_file', label: '成果上传', path: '/student/achievements/upload', hint: '上传自定义成果与获奖证明' },
  { icon: 'insights', label: '成果档案', path: '/student/growth', hint: '成果、荣誉与成长' },
];

/** 教师：审核与学情为主，活动大厅为辅 */
export const teacherNav: NavEntry[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/teacher', hint: '学院态势' },
  { icon: 'auto_awesome', label: 'AI 待办驾驶舱', path: '/teacher/ai', hint: '今日审核与预警优先级' },
  { type: 'group', label: '审核与指导' },
  { icon: 'fact_check', label: '审核中心', path: '/teacher/audit', hint: '报名/成果审核' },
  { type: 'group', label: '学生管理' },
  { icon: 'analytics', label: '学院总览', path: '/teacher/college-overview', hint: '学院参赛数据概览' },
  { icon: 'school', label: '学生看板', path: '/teacher/student-competitions', hint: '学生参赛明细' },
  { icon: 'trending_up', label: '学情分析', path: '/teacher/student-growth', hint: '学生成长与能力对比' },
  { type: 'group', label: '赛事服务' },
  { icon: 'emoji_events', label: '赛事大厅', path: '/teacher/competitions', hint: '查看平台赛事' },
];

/** 管理端：运营 → 审核 → 基础数据 */
export const adminNav: NavEntry[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/admin', hint: '运营总览' },
  { icon: 'auto_awesome', label: 'AI 数据助手', path: '/admin/ai', hint: '赛事运行简报与异常建议' },
  { type: 'group', label: '赛事运营' },
  { icon: 'emoji_events', label: '赛事管理', path: '/admin/competitions', hint: '赛事列表与上下架' },
  { icon: 'add_circle', label: '创建赛事', path: '/admin/publish', hint: '手动创建或 AI 导入' },
  { icon: 'draft', label: '草稿箱', path: '/admin/drafts', hint: '未发布与 AI 草稿' },
  { icon: 'travel_explore', label: '赛事来源', path: '/admin/competition-sources', hint: '外部来源与采集' },
  { icon: 'campaign', label: '公告管理', path: '/admin/announcements', hint: '系统与赛事公告' },
  { type: 'group', label: '审核与成果' },
  { icon: 'fact_check', label: '统一审核', path: '/admin/audit', hint: '报名、成果与证明审核' },
  { icon: 'how_to_reg', label: '教师注册审核', path: '/admin/registration-audit', hint: '教师账号开通' },
  { icon: 'auto_awesome', label: '优秀作品库', path: '/admin/works', hint: '优秀成果展示' },
  { type: 'group', label: '组织与用户' },
  { icon: 'manage_accounts', label: '用户管理', path: '/admin/users', hint: '平台用户账号' },
  { icon: 'group', label: '学生花名册', path: '/admin/roster', hint: '学生名册与账号同步' },
  { icon: 'school', label: '专业管理', path: '/admin/majors', hint: '学院专业配置' },
  { icon: 'class', label: '班级管理', path: '/admin/classes', hint: '班级基础数据' },
];

/** 移动端只显示最核心的四到五个入口，其他功能由工作区标签和抽屉导航承接。 */
export const mobileNavByRole: Record<AppRole, NavItem[]> = {
  student: [
    { icon: 'space_dashboard', label: '首页', path: '/student' },
    { icon: 'auto_awesome', label: 'AI 工作台', path: '/student/ai' },
    { icon: 'emoji_events', label: '竞赛中心', path: '/student/competitions' },
    { icon: 'assignment_ind', label: '我的赛事', path: '/student/registrations' },
    { icon: 'insights', label: '成果档案', path: '/student/growth' },
  ],
  teacher: [
    { icon: 'space_dashboard', label: '工作台', path: '/teacher' },
    { icon: 'auto_awesome', label: 'AI 驾驶舱', path: '/teacher/ai' },
    { icon: 'fact_check', label: '审核中心', path: '/teacher/audit' },
    { icon: 'school', label: '学生看板', path: '/teacher/student-competitions' },
    { icon: 'analytics', label: '学院总览', path: '/teacher/college-overview' },
    { icon: 'health_and_safety', label: '学业预警', path: '/teacher/academic-warning' },
  ],
  admin: [
    { icon: 'space_dashboard', label: '工作台', path: '/admin' },
    { icon: 'auto_awesome', label: 'AI 助手', path: '/admin/ai' },
    { icon: 'emoji_events', label: '赛事运营', path: '/admin/competitions' },
    { icon: 'fact_check', label: '审核中心', path: '/admin/audit' },
    { icon: 'auto_awesome', label: '成果展示', path: '/admin/works' },
    { icon: 'manage_accounts', label: '组织管理', path: '/admin/users' },
  ],
};

export interface WorkspaceTab {
  label: string;
  path: string;
  icon?: string;
}

export interface WorkspaceGroup {
  label: string;
  paths: string[];
  tabs: WorkspaceTab[];
}

/** 一级导航保持克制，原有功能通过工作区二级导航完整保留。 */
export const workspaceGroupsByRole: Record<AppRole, WorkspaceGroup[]> = {
  student: [
    {
      label: '竞赛中心',
      paths: ['/student/competitions', '/student/calendar', '/student/teams', '/student/works'],
      tabs: [
        { label: '赛事大厅', path: '/student/competitions', icon: 'emoji_events' },
        { label: '赛事日历', path: '/student/calendar', icon: 'calendar_month' },
        { label: '组队招募', path: '/student/teams', icon: 'group_add' },
        { label: '优秀成果', path: '/student/works', icon: 'workspace_premium' },
      ],
    },
    {
      label: '我的赛事',
      paths: ['/student/registrations', '/student/progress', '/student/upload'],
      tabs: [
        { label: '报名与材料', path: '/student/registrations', icon: 'assignment_ind' },
        { label: '进度跟踪', path: '/student/progress', icon: 'timeline' },
      ],
    },
    {
      label: '学业中心',
      paths: ['/student/academic'],
      tabs: [{ label: '学业总览', path: '/student/academic', icon: 'school' }],
    },
    {
      label: '成果档案',
      paths: ['/student/growth', '/student/achievements'],
      tabs: [
        { label: '成长概览', path: '/student/growth', icon: 'insights' },
        { label: '成果上传', path: '/student/achievements/upload', icon: 'upload_file' },
      ],
    },
  ],
  teacher: [
    {
      label: '学生竞赛',
      paths: ['/teacher/student-competitions', '/teacher/student-growth', '/teacher/student-detail', '/teacher/student-compare'],
      tabs: [
        { label: '参赛学生', path: '/teacher/student-competitions', icon: 'school' },
        { label: '成长分析', path: '/teacher/student-growth', icon: 'trending_up' },
      ],
    },
    {
      label: '学生学业',
      paths: ['/teacher/academic-warning'],
      tabs: [{ label: '学业预警', path: '/teacher/academic-warning', icon: 'health_and_safety' }],
    },
  ],
  admin: [
    {
      label: '赛事运营',
      paths: ['/admin/competitions', '/admin/publish', '/admin/drafts', '/admin/competition-sources', '/admin/announcements'],
      tabs: [
        { label: '全部赛事', path: '/admin/competitions', icon: 'emoji_events' },
        { label: '创建赛事', path: '/admin/publish', icon: 'add_circle' },
        { label: '草稿箱', path: '/admin/drafts', icon: 'draft' },
        { label: '赛事来源', path: '/admin/competition-sources', icon: 'travel_explore' },
        { label: '公告', path: '/admin/announcements', icon: 'campaign' },
      ],
    },
    {
      label: '审核中心',
      paths: ['/admin/audit', '/admin/registration-audit'],
      tabs: [
        { label: '业务审核', path: '/admin/audit', icon: 'fact_check' },
        { label: '教师注册', path: '/admin/registration-audit', icon: 'how_to_reg' },
      ],
    },
    {
      label: '组织管理',
      paths: ['/admin/users', '/admin/roster', '/admin/majors', '/admin/classes'],
      tabs: [
        { label: '用户', path: '/admin/users', icon: 'manage_accounts' },
        { label: '学生名册', path: '/admin/roster', icon: 'group' },
        { label: '专业', path: '/admin/majors', icon: 'school' },
        { label: '班级', path: '/admin/classes', icon: 'class' },
      ],
    },
  ],
};

export const navByRole: Record<AppRole, NavEntry[]> = {
  student: studentNav,
  teacher: teacherNav,
  admin: adminNav,
};

/** 路径片段 / 完整路径 → 统一中文名（面包屑 + 顶栏） */
const pathLabelEntries: Array<[string, string]> = [
  // 完整路径优先
  ['/student', '首页'],
  ['/student/ai', 'AI 智能工作台'],
  ['/student/competitions', '竞赛中心'],
  ['/student/calendar', '赛事日历'],
  ['/student/teams', '组队招募'],
  ['/student/works', '光荣榜'],
  ['/student/registrations', '我的赛事'],
  ['/student/progress', '进度跟踪'],
  ['/student/academic', '学业中心'],
  ['/student/growth', '成果档案'],
  ['/student/achievements/upload', '上传成果'],
  ['/student/notifications', '消息中心'],
  ['/teacher', '工作台'],
  ['/teacher/ai', 'AI 待办驾驶舱'],
  ['/teacher/college-overview', '学院总览'],
  ['/teacher/academic-warning', '学业预警'],
  ['/teacher/competitions', '活动大厅'],
  ['/teacher/audit', '审核中心'],
  ['/teacher/student-competitions', '学生看板'],
  ['/teacher/student-growth', '学情分析'],
  ['/teacher/student-detail', '学生详情'],
  ['/teacher/student-compare', '学生对比'],
  ['/teacher/notifications', '消息中心'],
  ['/admin', '工作台'],
  ['/admin/ai', 'AI 数据助手'],
  ['/admin/competitions', '赛事运营'],
  ['/admin/publish', '创建赛事'],
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
  ['competitions', '竞赛中心'],
  ['teams', '组队招募'],
  ['registrations', '我的赛事'],
  ['workbench', '报名工作台'],
  ['upload', '提交作品'],
  ['growth', '成果档案'],
  ['achievements', '成果'],
  ['calendar', '赛事日历'],
  ['works', '光荣榜'],
  ['progress', '进度跟踪'],
  ['academic', '学业中心'],
  ['college-overview', '学院总览'],
  ['academic-warning', '学业预警'],
  ['audit', '审核中心'],
  ['student-competitions', '学生看板'],
  ['student-growth', '学情分析'],
  ['student-detail', '学生详情'],
  ['student-compare', '学生对比'],
  ['publish', '创建赛事'],
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
  if (/^\/student\/competitions\/[^/]+$/.test(clean)) return '赛事详情';
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
  { step: 1, label: '发现赛事', path: '/student/competitions', desc: '找到适合自己的校园赛事' },
  { step: 2, label: '报名组队', path: '/student/registrations', desc: '填写报名信息并完成组队' },
  { step: 3, label: '材料与审核', path: '/student/progress', desc: '提交材料并跟踪审核节点' },
  { step: 4, label: '成果归档', path: '/student/growth', desc: '沉淀作品、荣誉和成长记录' },
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
