import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
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
    { label: '用户总数', value: stats.total, icon: 'group', hint: '全部账号' },
    { label: '学生', value: stats.students, icon: 'school', hint: '学生角色' },
    { label: '教师', value: stats.teachers, icon: 'person', hint: '教师角色' },
    { label: '管理员', value: stats.admins, icon: 'admin_panel_settings', hint: '管理角色' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="管理端"
        title="用户管理"
        description="查看和管理平台所有用户。"
      />

      <div className="stat-grid">
        {metrics.map((m) => (
          <div key={m.label} className="stat-card">
            <div className="stat-card-label">{m.label}</div>
            <div className="stat-card-value">{loading ? '—' : m.value}</div>
            <div className="stat-card-hint">
              <span className="material-symbols-outlined align-middle text-[14px] text-placeholder">{m.icon}</span>
              {' '}{m.hint}
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar" role="search">
        <div className="relative w-full md:w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-placeholder">
            search
          </span>
          <input
            name="userKeyword"
            className="input-glass h-9 pl-9 text-footnote"
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
          className="input-glass h-9 min-w-[120px] text-footnote"
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
          className="input-glass h-9 w-full text-footnote md:w-[180px]"
          placeholder="学院筛选"
          value={filterCollege}
          onChange={(e) => {
            setFilterCollege(e.target.value);
            setCurrentPage(1);
          }}
        />
        <div className="flex-1" />
        <button type="button" onClick={resetFilters} className="btn-utility">
          重置筛选
        </button>
      </div>

      <section className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">用户列表</h2>
          <span className="chip tabular-nums">{total} 条</span>
        </div>
        <div className="data-table-wrap !rounded-none !border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>姓名</th>
                <th>角色</th>
                <th>学院</th>
                <th>专业</th>
                <th>班级</th>
                <th>年级</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-panel py-12">
                      <span className="material-symbols-outlined">
                        {loading ? 'progress_activity' : 'search_off'}
                      </span>
                      <p className="text-footnote">{loading ? '加载中…' : '暂无用户数据'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="max-w-[180px] truncate font-medium">{user.username}</td>
                    <td className="text-body-muted">{user.realName || '—'}</td>
                    <td>
                      <span className={roleChip[user.role] || 'chip'}>{roleLabel[user.role] || user.role}</span>
                    </td>
                    <td className="max-w-[180px] truncate text-body-muted">{user.college || '—'}</td>
                    <td className="max-w-[150px] truncate text-body-muted">{user.major || '—'}</td>
                    <td className="text-placeholder">{user.className || '—'}</td>
                    <td className="tabular-nums text-placeholder">{user.grade || '—'}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        className="icon-button text-error hover:text-error"
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
        <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
          <span className="text-caption text-placeholder">
            共 <span className="font-medium tabular-nums text-ink">{total}</span> 条
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
