import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import CascadeFilter, { type FilterValues } from '../../components/CascadeFilter';

interface MonitorRow {
  id: string;
  studentId: string;
  studentName: string;
  competitionTitle: string;
  teamName?: string;
  status: string;
  submitDate?: string;
}

const statusChip: Record<string, string> = {
  '已报名': 'chip chip-success',
  '已提交': 'chip',
  '待审核': 'chip chip-warning',
  '审核中': 'chip chip-warning',
  '准备中': 'chip chip-warning',
  '待提交成果': 'chip',
  '审核通过': 'chip chip-success',
  '审核驳回': 'chip chip-error',
};

const STATUS_OPTIONS = ['全部', '已提交', '审核中', '审核通过', '审核驳回'];

export default function TeacherStudentCompetitions() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MonitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('全部');
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterValues>({});

  const handleFilterChange = useCallback((f: FilterValues) => {
    setFilters(f);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, any> = { current: 1, size: 50 };
        if (searchQuery.trim()) params.studentName = searchQuery.trim();
        if (selectedStatus !== '全部') params.status = selectedStatus;
        if (filters.college) params.college = filters.college;
        if (filters.grade) params.grade = filters.grade;
        if (filters.major) params.major = filters.major;
        if (filters.className) params.className = filters.className;
        const data: any = await apiClient.get('/teacher/monitor/registrations', { params });
        if (cancelled) return;
        const records: any[] = Array.isArray(data) ? data : data?.records ?? [];
        setRows(
          records.map((r: any) => ({
            id: String(r.id ?? r.registrationId),
            studentId: String(r.studentId ?? ''),
            studentName: r.studentName ?? (r.studentId != null ? `学号 ${r.studentId}` : '未知学生'),
            competitionTitle: r.competitionName ?? r.competitionTitle ?? (r.competitionId != null ? `赛事 #${r.competitionId}` : '未知赛事'),
            teamName: r.teamName,
            status: r.status ?? '—',
            submitDate: r.submitDate,
          }))
        );
        setTotal(typeof data?.total === 'number' ? data.total : records.length);
      } catch (e: any) {
        console.error('monitor failed', e);
        if (!cancelled) toast.error(e?.message || '加载学生赛事失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, selectedStatus, filters]);

  const kpiCards = useMemo(() => {
    const pendingCnt = rows.filter((r) => r.status === '已提交' || r.status === '审核中' || r.status === '待审核').length;
    const approvedCnt = rows.filter((r) => r.status === '审核通过').length;
    const rejectedCnt = rows.filter((r) => r.status === '审核驳回').length;
    return [
      { label: '总记录数', value: String(total || rows.length), icon: 'event' },
      { label: '审核通过', value: String(approvedCnt), icon: 'task_alt' },
      { label: '待审核', value: String(pendingCnt), icon: 'pending_actions', tone: 'warning' as const },
      { label: '已驳回', value: String(rejectedCnt), icon: 'block' },
    ];
  }, [rows, total]);

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Students"
        title="学生赛事动态"
        description="追踪学生赛事参与情况与审核状态。"
      />

      <div className="filter-bar">
        <CascadeFilter onChange={handleFilterChange} />
        <select
          className="input-glass h-9 min-w-[120px] text-footnote"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === '全部' ? '全部状态' : s}</option>
          ))}
        </select>
        <div className="flex-1" />
        <div className="relative w-full md:w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-placeholder">search</span>
          <input
            className="input-glass h-9 pl-9 text-footnote"
            placeholder="搜索学生姓名"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="stat-grid">
        {kpiCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-card-label">{card.label}</div>
            <div className="stat-card-value">{card.value}</div>
            <div className="stat-card-hint">
              <span className="material-symbols-outlined text-[14px] align-middle text-placeholder">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">学生近期参赛动态</h2>
          <span className="text-caption text-placeholder">共 {total || rows.length} 条</span>
        </div>
        <div className="section-card-body tight">
          <div className="data-table-wrap !border-0 !rounded-none">
            <table className="data-table">
              <thead>
                <tr>
                  <th>学生</th>
                  <th>赛事 / 团队</th>
                  <th>提交时间</th>
                  <th>状态</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-panel py-12">
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-panel py-12">
                        <span className="material-symbols-outlined">search_off</span>
                        <p className="text-footnote">暂无匹配的参赛记录</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((reg) => (
                    <tr key={reg.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-md bg-surface-tile-1 text-caption font-medium text-body-muted">
                            {reg.studentName[0]}
                          </div>
                          <div>
                            <div className="text-footnote font-medium text-ink">{reg.studentName}</div>
                            <div className="text-caption-2 text-placeholder">{reg.studentId || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="max-w-[260px] truncate text-ink">{reg.competitionTitle}</div>
                        <div className="text-caption-2 text-placeholder">{reg.teamName || '个人'}</div>
                      </td>
                      <td className="tabular-nums text-body-muted">
                        {reg.submitDate ? new Date(reg.submitDate).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <span className={statusChip[reg.status] || 'chip'}>{reg.status}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/teacher/student-detail?studentId=${reg.studentId}`)}
                            className="text-caption text-body-muted hover:text-ink"
                          >
                            详情
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/teacher/student-growth?studentId=${reg.studentId}`)}
                            className="text-caption text-body-muted hover:text-ink"
                          >
                            成长
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
