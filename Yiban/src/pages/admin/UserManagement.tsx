import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';

interface UserRecord {
  id: string | number;
  username: string;
  realName: string;
  role: string;
  college: string;
  major: string;
  className: string;
  grade: string;
}

interface UserStats {
  total: number;
  students: number;
  teachers: number;
  admins: number;
}

interface PageResponse<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

const roleChip: Record<string, string> = {
  student: 'chip chip-success',
  teacher: 'chip chip-primary',
  admin: 'chip chip-error',
};

const roleLabel: Record<string, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
};

const getPageWindow = (current: number, total: number): (number | '...')[] => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, current + 1);
  if (current <= 3) { start = 2; end = 4; }
  if (current >= total - 2) { start = total - 3; end = total - 1; }
  pages.push(1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({ total: 0, students: 0, teachers: 0, admins: 0 });

  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterCollege, setFilterCollege] = useState('');

  // Debounce keyword input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchStats = useCallback(async () => {
    try {
      const data: UserStats | null = await apiClient.get('/admin/users/stats');
      if (data && typeof data.total === 'number') {
        setStats(data);
      }
    } catch {
      /* stats endpoint may not exist yet */
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        current: currentPage,
        size: pageSize,
      };
      if (debouncedKeyword) params.keyword = debouncedKeyword;
      if (filterRole) params.role = filterRole;
      if (filterCollege) params.college = filterCollege;

      const data: PageResponse<UserRecord> | UserRecord[] | null = await apiClient.get(
        '/admin/users',
        { params }
      );
      if (Array.isArray(data)) {
        setUsers(data);
        setTotal(data.length);
      } else if (data && Array.isArray(data.records)) {
        setUsers(data.records);
        setTotal(typeof data.total === 'number' ? data.total : data.records.length);
      } else {
        setUsers([]);
        setTotal(0);
      }
    } catch {
      toast.error('加载用户列表失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedKeyword, filterRole, filterCollege]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDelete = async (user: UserRecord) => {
    if (!window.confirm(`确定要删除用户「${user.realName || user.username}」吗？此操作不可恢复。`)) return;
    try {
      await apiClient.delete(`/admin/users/${user.id}`);
      toast.success('已删除');
      fetchUsers();
      fetchStats();
    } catch (e: any) {
      toast.error(e?.message || '删除失败');
    }
  };

  const resetFilters = () => {
    setKeyword('');
    setFilterRole('');
    setFilterCollege('');
    setCurrentPage(1);
  };

  const metrics = [
    { label: '用户总数', value: stats.total, icon: 'group' },
    { label: '学生', value: stats.students, icon: 'school' },
    { label: '教师', value: stats.teachers, icon: 'person' },
    { label: '管理员', value: stats.admins, icon: 'admin_panel_settings' },
  ];

  return (
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Administration"
        title="用户管理"
        description="查看和管理平台所有用户。"
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            className="glass p-lg flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-muted-80">{m.label}</span>
              <span className="material-symbols-outlined text-[18px] text-primary">{m.icon}</span>
            </div>
            <span className="font-display font-semibold text-[34px] leading-none tabular-nums text-ink">
              {loading ? '—' : m.value}
            </span>
          </motion.div>
        ))}
      </section>

      {/* Filter bar */}
      <div className="glass-tint flex flex-wrap gap-sm items-center px-md py-3" role="search">
        <div className="relative w-full md:w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">
            search
          </span>
          <input
            className="input-glass h-9 pl-9 text-[13px] !rounded-pill"
            placeholder="搜索用户名 / 姓名"
            aria-label="搜索用户名 / 姓名"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <select
          className="h-9 px-3 rounded-pill bg-canvas border border-hairline text-[13px] text-ink focus:outline-none focus:border-primary-focus"
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">全部角色</option>
          <option value="student">学生</option>
          <option value="teacher">教师</option>
          <option value="admin">管理员</option>
        </select>
        <input
          className="h-9 px-3 rounded-pill bg-canvas border border-hairline text-[13px] text-ink focus:outline-none focus:border-primary-focus w-full md:w-[180px]"
          placeholder="学院筛选"
          value={filterCollege}
          onChange={(e) => {
            setFilterCollege(e.target.value);
            setCurrentPage(1);
          }}
        />
        <div className="flex-1" />
        <button
          onClick={resetFilters}
          className="h-9 px-3 rounded-pill text-[12px] text-ink-muted-80 hover:text-ink hover:bg-primary/6 transition"
        >
          重置筛选
        </button>
      </div>

      {/* Table */}
      <section className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-canvas-parchment text-[11px] uppercase tracking-wider text-ink-muted-48 border-b border-hairline">
                <th className="py-3 px-md font-medium">用户名</th>
                <th className="py-3 px-md font-medium">姓名</th>
                <th className="py-3 px-md font-medium">角色</th>
                <th className="py-3 px-md font-medium">学院</th>
                <th className="py-3 px-md font-medium">专业</th>
                <th className="py-3 px-md font-medium">班级</th>
                <th className="py-3 px-md font-medium">年级</th>
                <th className="py-3 px-md font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-ink-muted-48">
                    <span className="material-symbols-outlined text-[36px] block mb-2 opacity-40">
                      {loading ? 'hourglass_top' : 'search_off'}
                    </span>
                    <p>{loading ? '加载中…' : '暂无用户数据'}</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-hairline last:border-0 hover:bg-primary/6 transition"
                  >
                    <td className="py-3 px-md font-medium text-ink truncate max-w-[180px]">{user.username}</td>
                    <td className="py-3 px-md text-ink-muted-80">{user.realName || '—'}</td>
                    <td className="py-3 px-md">
                      <span className={roleChip[user.role] || 'chip'}>{roleLabel[user.role] || user.role}</span>
                    </td>
                    <td className="py-3 px-md text-ink-muted-80 truncate max-w-[180px]">{user.college || '—'}</td>
                    <td className="py-3 px-md text-ink-muted-80 truncate max-w-[150px]">{user.major || '—'}</td>
                    <td className="py-3 px-md text-ink-muted-48">{user.className || '—'}</td>
                    <td className="py-3 px-md text-ink-muted-48 tabular-nums">{user.grade || '—'}</td>
                    <td className="py-3 px-md text-right">
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 rounded-md text-ink-muted-48 hover:text-error hover:bg-error/8 transition"
                        title="删除用户"
                        aria-label="删除用户"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-md py-3 border-t border-hairline flex items-center justify-between">
          <span className="text-[12px] text-ink-muted-48">
            共 <span className="text-ink font-medium tabular-nums">{total}</span> 条
          </span>
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 rounded-pill grid place-items-center text-ink-muted-80 hover:bg-primary/6 disabled:opacity-30 disabled:cursor-not-allowed transition"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            {getPageWindow(currentPage, totalPages).map((page, i) =>
              page === '...' ? (
                <span key={`e${i}`} className="w-8 h-8 grid place-items-center text-[12px] text-ink-muted-48">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-pill text-[12px] font-medium tabular-nums transition ${
                    currentPage === page
                      ? 'bg-primary text-white'
                      : 'text-ink-muted-80 hover:text-ink hover:bg-primary/6'
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              className="w-8 h-8 rounded-pill grid place-items-center text-ink-muted-80 hover:bg-primary/6 disabled:opacity-30 disabled:cursor-not-allowed transition"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
