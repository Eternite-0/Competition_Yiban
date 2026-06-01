import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { listContainer, listItem, pageTransition } from '../../lib/motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';

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

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({ total: 0, students: 0, teachers: 0, admins: 0 });
  const { isOpen, title, message, variant, confirm, close } = useConfirmModal();

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
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
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

  const handleDelete = async (user: UserRecord) => {
    const confirmed = await confirm({
      title: '删除用户',
      message: `确定要删除用户「${user.realName || user.username}」吗？此操作不可恢复。`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (!confirmed) return;
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
            whileHover={{ scale: 1.02, y: -2 }}
            className="stat-tile p-lg flex flex-col gap-2 cursor-default"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-muted-80">{m.label}</span>
              <span className="material-symbols-outlined text-[18px] text-primary">{m.icon}</span>
            </div>
            <span className="font-display font-medium text-[22px] leading-none tabular-nums text-ink">
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
            name="userKeyword"
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
          name="userRole"
          className="input-glass h-9 min-w-[120px] text-[14px]"
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
          name="userCollege"
          className="input-glass h-9 w-full text-[14px] md:w-[180px]"
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
              <tr className="bg-canvas-parchment text-[11px] text-ink-muted-48 border-b border-hairline">
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
            <motion.tbody className="text-[13px]" variants={listContainer} initial="hidden" animate="visible">
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
                  <motion.tr
                    key={user.id}
                    variants={listItem}
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
                  </motion.tr>
                ))
              )}
            </motion.tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-md py-3 border-t border-hairline flex items-center justify-between">
          <span className="text-[12px] text-ink-muted-48">
            共 <span className="text-ink font-medium tabular-nums">{total}</span> 条
          </span>
          <Pagination current={currentPage} total={total} pageSize={pageSize} onChange={setCurrentPage} />
        </div>
      </section>

      <ConfirmModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={() => {}}
        title={title}
        message={message}
        variant={variant}
      />
    </div>
  );
}
