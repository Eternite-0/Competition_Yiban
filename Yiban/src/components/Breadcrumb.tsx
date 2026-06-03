import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';

interface BreadcrumbItem {
  label: string;
  path: string;
}

// 路径到中文名称的映射
const pathNameMap: Record<string, string> = {
  student: '学生端',
  teacher: '教师端',
  admin: '管理端',
  competitions: '赛事大厅',
  teams: '组队招募',
  registrations: '我的报名',
  workbench: '报名工作台',
  upload: '成果上传',
  growth: '成长档案',
  achievements: '成果管理',
  calendar: '赛事日历',
  works: '优秀作品',
  progress: '我的进度',
  'college-overview': '学院总览',
  audit: '成果审核',
  'student-competitions': '学生赛事',
  'student-growth': '学生成长',
  'student-detail': '学生详情',
  'student-compare': '学生对比',
  publish: '发布赛事',
  users: '用户管理',
  announcements: '公告管理',
  majors: '专业管理',
  classes: '班级管理',
  roster: '花名册',
  'registration-audit': '报名审核',
};

export default function Breadcrumb() {
  const location = useLocation();
  useStore((s) => s.currentUser); // 保持 store 订阅

  // 生成面包屑项
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter((x) => x);

    // 如果是根路径或登录/注册页面，不显示面包屑
    if (pathnames.length === 0 || ['login', 'register', 'terms'].includes(pathnames[0])) {
      return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [];

    // 添加首页
    const role = pathnames[0];
    if (['student', 'teacher', 'admin'].includes(role)) {
      breadcrumbs.push({
        label: pathNameMap[role] || role,
        path: `/${role}`,
      });
    }

    // 添加子路径
    let currentPath = '';
    for (let i = 0; i < pathnames.length; i++) {
      const path = pathnames[i];
      currentPath += `/${path}`;

      // 跳过角色根路径（已经添加过）
      if (i === 0 && ['student', 'teacher', 'admin'].includes(path)) {
        continue;
      }

      // 获取路径名称
      const label = pathNameMap[path] || path;

      breadcrumbs.push({
        label,
        path: currentPath,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // 如果只有一个面包屑项（首页），不显示
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-[13px] text-ink-muted-48 mb-4">
      {breadcrumbs.map((item, index) => (
        <span key={item.path} className="flex items-center gap-2">
          {index > 0 && (
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          )}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-ink font-medium">{item.label}</span>
          ) : (
            <Link
              to={item.path}
              className="hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
