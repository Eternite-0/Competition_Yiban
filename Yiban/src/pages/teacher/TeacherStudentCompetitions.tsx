import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <div className="py-lg flex flex-col gap-lg">
      {/* Header */}
      <PageHero
        eyebrow="Students"
        title="学生赛事动态"
        description="追踪学生赛事参与情况与审核状态。"
      />

      {/* Filters */}
      <div className="glass-tint flex flex-wrap gap-sm items-center px-md py-3">
        <CascadeFilter onChange={handleFilterChange} />
        <select
          className="h-9 px-3 rounded-pill bg-canvas border border-hairline text-[13px] text-ink focus:outline-none focus:border-primary-focus"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === '全部' ? '全部状态' : s}</option>
          ))}
        </select>
        <div className="flex-1" />
        <div className="relative w-full md:w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">search</span>
          <input
            className="input-glass h-9 pl-9 text-[13px] !rounded-pill"
            placeholder="搜索学生姓名"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            className="glass p-lg flex flex-col gap-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-ink-muted-80">{card.label}</span>
              <span className="material-symbols-outlined text-[18px] text-primary">{card.icon}</span>
            </div>
            <span className="font-display font-semibold text-[34px] leading-none tabular-nums text-ink">{card.value}</span>
          </motion.div>
        ))}
      </section>

      {/* Table */}
      <section className="glass overflow-hidden">
        <div className="p-md border-b border-hairline flex justify-between items-center">
          <h3 className="text-[17px] font-semibold tracking-tight text-ink">学生近期参赛动态</h3>
          <span className="text-[12px] text-ink-muted-48">共 {total || rows.length} 条</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-canvas-parchment text-[11px] uppercase tracking-wider text-ink-muted-48 border-b border-hairline">
                <th className="py-3 px-md font-medium">学生</th>
                <th className="py-3 px-md font-medium">赛事 / 团队</th>
                <th className="py-3 px-md font-medium">提交时间</th>
                <th className="py-3 px-md font-medium">状态</th>
                <th className="py-3 px-md font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-ink-muted-48">
                    <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-ink-muted-48">
                    <span className="material-symbols-outlined text-[36px] block mb-2 opacity-40">search_off</span>
                    <p>暂无匹配的参赛记录</p>
                  </td>
                </tr>
              ) : (
                rows.map((reg) => (
                  <tr key={reg.id} className="border-b border-hairline last:border-0 hover:bg-primary/6 transition">
                    <td className="py-3 px-md">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-canvas-parchment text-ink-muted-80 grid place-items-center font-semibold text-[12px]">
                          {reg.studentName[0]}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-ink">{reg.studentName}</div>
                          <div className="text-[11px] text-ink-muted-48">{reg.studentId || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-md">
                      <div className="text-ink truncate max-w-[260px]">{reg.competitionTitle}</div>
                      <div className="text-[11px] text-ink-muted-48">{reg.teamName || '个人'}</div>
                    </td>
                    <td className="py-3 px-md text-ink-muted-80 tabular-nums">
                      {reg.submitDate ? new Date(reg.submitDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-md">
                      <span className={statusChip[reg.status] || 'chip'}>{reg.status}</span>
                    </td>
                    <td className="py-3 px-md text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => navigate(`/teacher/student-detail?studentId=${reg.studentId}`)}
                          className="text-[12px] text-primary hover:text-primary-focus font-medium"
                        >
                          详情 →
                        </button>
                        <button
                          onClick={() => navigate(`/teacher/student-growth?studentId=${reg.studentId}`)}
                          className="text-[12px] text-primary hover:text-primary-focus font-medium"
                        >
                          成长 →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
