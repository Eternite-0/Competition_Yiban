import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';

interface DashboardStats {
  totalStudents?: number;
  totalRegistrations?: number;
  pendingReviews?: number;
  activeCoefficient?: number;
  recentActivities?: Array<{ studentName: string; class?: string; submitDate?: string; status?: string }>;
}

interface PendingItem {
  id: string;
  studentLabel: string;
  competitionLabel: string;
  submitDate: string;
  status: string;
}

export default function TeacherHome() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);

  const [stats, setStats] = useState<DashboardStats>({});
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [dash, pendingPage] = await Promise.all([
          apiClient.get('/teacher/dashboard').catch((e) => {
            console.error('dashboard failed', e);
            return {} as DashboardStats;
          }),
          apiClient.get('/registration/pending', { params: { current: 1, size: 5 } }).catch((e) => {
            console.error('pending failed', e);
            return { records: [] } as any;
          }),
        ]);
        if (cancelled) return;
        setStats((dash as DashboardStats) || {});
        const records: any[] = Array.isArray(pendingPage) ? pendingPage : pendingPage?.records ?? [];
        setPending(
          records.map((r: any) => ({
            id: String(r.id ?? r.registrationId),
            studentLabel: r.studentName ?? (r.studentId != null ? `学号 ${r.studentId}` : '未知学生'),
            competitionLabel: r.competitionTitle ?? (r.competitionId != null ? `赛事 #${r.competitionId}` : '未知赛事'),
            submitDate: r.submitDate ?? r.uploadDate ?? '',
            status: r.status ?? '待审核',
          }))
        );
      } catch (e: any) {
        toast.error(e?.message || '加载概览失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = [
    { label: '待审核数', value: String(stats.pendingReviews ?? 0), suffix: '', icon: 'pending_actions' },
    { label: '参赛学生数', value: String(stats.totalStudents ?? 0), suffix: '人', icon: 'group' },
    { label: '赛事参与人次', value: String(stats.totalRegistrations ?? 0), suffix: '', icon: 'event' },
    { label: '人均参赛', value: String(stats.activeCoefficient ?? 0), suffix: '次', icon: 'trending_up' },
  ];

  return (
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow={currentUser?.department || '教师工作台'}
        title="年级总览"
        description={`欢迎回来，${currentUser?.name ?? '老师'}。`}
        actions={(
          <>
            <button className="btn-secondary" onClick={() => navigate('/teacher/audit')}>
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              前往审核
            </button>
            <button className="btn-primary" onClick={() => navigate('/teacher/student-competitions')}>
              <span className="material-symbols-outlined text-[18px]">groups</span>
              学生动态
            </button>
          </>
        )}
      />

      {/* Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="glass p-lg flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-muted-80">{m.label}</span>
              <span className="material-symbols-outlined text-[18px] text-primary">{m.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-semibold text-[34px] leading-none tabular-nums text-ink">{m.value}</span>
              <span className="text-[12px] text-ink-muted-48">{m.suffix}</span>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Pending + Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Pending list */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="lg:col-span-7 glass p-xl"
        >
          <div className="flex items-center justify-between mb-lg">
            <h3 className="text-[19px] font-semibold tracking-tight text-ink">待审核报名</h3>
            <button
              onClick={() => navigate('/teacher/audit')}
              className="text-[12px] text-primary hover:text-primary-focus font-medium"
            >
              查看全部 →
            </button>
          </div>
          {loading ? (
            <div className="py-10 grid place-items-center text-ink-muted-48">
              <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
            </div>
          ) : pending.length === 0 ? (
            <div className="py-10 grid place-items-center text-ink-muted-48 gap-2">
              <span className="material-symbols-outlined text-[32px] opacity-40">inbox</span>
              <p className="text-[13px]">暂无待审核</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-3 border-b border-hairline last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-canvas-parchment text-ink-muted-80 grid place-items-center font-semibold text-[12px] shrink-0">
                      {p.studentLabel[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-ink truncate">{p.studentLabel}</div>
                      <div className="text-[12px] text-ink-muted-48 truncate">{p.competitionLabel} · {p.submitDate ? new Date(p.submitDate).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/teacher/audit')}
                    className="chip chip-warning shrink-0 ml-3"
                  >
                    {p.status}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="lg:col-span-5 glass p-xl flex flex-col"
        >
          <div className="flex items-center justify-between mb-lg">
            <h3 className="text-[19px] font-semibold tracking-tight text-ink">近期动态</h3>
            <button
              onClick={() => navigate('/teacher/student-competitions')}
              className="text-[12px] text-primary hover:text-primary-focus font-medium"
            >
              查看学生 →
            </button>
          </div>
          {(stats.recentActivities ?? []).length === 0 ? (
            <div className="py-10 grid place-items-center text-ink-muted-48 gap-2">
              <span className="material-symbols-outlined text-[32px] opacity-40">history</span>
              <p className="text-[13px]">暂无活动</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {(stats.recentActivities ?? []).map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="flex items-center justify-between py-3 border-b border-hairline last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-canvas-parchment text-ink-muted-80 grid place-items-center font-semibold text-[12px] shrink-0">
                      {(a.studentName || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-ink truncate">{a.studentName || '未知'}</div>
                      <div className="text-[12px] text-ink-muted-48 truncate">
                        {a.class || ''}{a.class ? ' · ' : ''}{a.submitDate ? new Date(a.submitDate).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>
                  <span className="chip shrink-0 ml-3">{a.status || '—'}</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
