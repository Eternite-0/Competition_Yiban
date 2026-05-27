import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';

type Registration = {
  id: number | string;
  competitionId: number | string;
  competitionName?: string;
  competitionLevel?: string;
  competitionCategory?: string;
  studentId: number | string;
  teamName?: string;
  track?: string;
  status: string;
  submitDate?: string;
  reviewNote?: string;
  approved?: boolean;
};

// Backend statuses: 待完善 / 已提交 / 审核中 / 审核通过 / 审核驳回
type TabFilter = '全部' | '待完善' | '已提交' | '审核中' | '已通过' | '已驳回';

const STATUS_CHIP: Record<string, { label: string; chip: string }> = {
  '待完善': { label: '待完善', chip: 'chip chip-warning' },
  '已提交': { label: '已提交', chip: 'chip' },
  '审核中': { label: '审核中', chip: 'chip chip-warning' },
  '审核通过': { label: '已通过', chip: 'chip chip-success' },
  '审核驳回': { label: '已驳回', chip: 'chip chip-error' },
};

const TABS: TabFilter[] = ['全部', '待完善', '已提交', '审核中', '已通过', '已驳回'];

function tabMatches(tab: TabFilter, status: string): boolean {
  if (tab === '全部') return true;
  if (tab === '已通过') return status === '审核通过';
  if (tab === '已驳回') return status === '审核驳回';
  return tab === status;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MyRegistrations() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('全部');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data: any = await apiClient.get('/registration/my');
        const list: Registration[] = Array.isArray(data) ? data : [];
        setRegistrations(list);
      } catch (err: any) {
        setError(err.message || '获取报名列表失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = registrations.filter((r) => tabMatches(activeTab, r.status));
  const pendingCount = registrations.filter((r) => r.status === '待完善').length;

  return (
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Registrations"
        title="我的报名"
        description="管理并查看您参与的所有赛事及活动进度。"
        contentClassName="max-w-2xl"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Main */}
        <div className="lg:col-span-8 flex flex-col gap-md">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-primary/6 rounded-pill w-fit overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-pill text-[13px] whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? 'bg-canvas text-ink font-semibold shadow-sm'
                    : 'text-ink-muted-80 hover:text-ink'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-md">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-section gap-2 text-ink-muted-48">
                <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
                <span className="text-[14px]">加载中…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-section gap-2 text-primary">
                <span className="material-symbols-outlined text-[32px]">error_outline</span>
                <span className="text-[14px]">{error}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-section gap-2 text-ink-muted-48">
                <span className="material-symbols-outlined text-[32px]">inbox</span>
                <span className="text-[14px]">暂无报名记录</span>
              </div>
            ) : (
              filtered.map((reg, i) => {
                const isReturnForSupplement = reg.status === '审核驳回' && reg.reviewNote?.startsWith('【退回补充】');
                const statusInfo = isReturnForSupplement
                  ? { label: '需补充', chip: 'chip chip-warning' }
                  : STATUS_CHIP[reg.status] || { label: reg.status || '未知', chip: 'chip' };
                const isPendingCompletion = reg.status === '待完善';
                const compName = reg.competitionName || `赛事 #${reg.competitionId}`;

                return (
                  <motion.div
                    key={reg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.35 }}
                    className="glass p-lg"
                  >
                    <div className="flex justify-between items-start mb-md">
                      <div>
                        <h3 className="text-[19px] font-semibold tracking-tight text-ink mb-1">{compName}</h3>
                        <p className="text-[12px] text-ink-muted-48 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          报名时间 · {formatDate(reg.submitDate)}
                        </p>
                      </div>
                      <span className={statusInfo.chip}>{statusInfo.label}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md bg-canvas-parchment p-3 border border-hairline mb-md">
                      <Field
                        label="团队状态"
                        icon="groups"
                        tone="primary"
                        value={reg.teamName ? `已组队 · ${reg.teamName}` : '单人报名'}
                      />
                      <Field
                        label="参赛赛道"
                        icon="flag"
                        tone="primary"
                        value={reg.track || '未选择'}
                      />
                      <Field
                        label="材料状态"
                        icon={isPendingCompletion ? 'warning' : 'check_circle'}
                        tone={isPendingCompletion ? 'warning' : 'success'}
                        value={isPendingCompletion ? '待提交成果' : '已齐备'}
                      />
                      <Field
                        label="报名日期"
                        icon="event"
                        tone="primary"
                        value={formatDate(reg.submitDate)}
                      />
                    </div>

                    {reg.status === '审核驳回' && reg.reviewNote && (() => {
                      const isReturn = reg.reviewNote.startsWith('【退回补充】');
                      const displayNote = isReturn ? reg.reviewNote.replace('【退回补充】', '') : reg.reviewNote;
                      return (
                        <div className={`rounded-md p-3 mb-md ${isReturn ? 'bg-warning/5 border border-warning/15' : 'bg-error/5 border border-error/15'}`}>
                          <div className="flex items-start gap-2">
                            <span className={`material-symbols-outlined text-[16px] mt-0.5 shrink-0 ${isReturn ? 'text-warning' : 'text-error'}`}>
                              {isReturn ? 'assignment_return' : 'info'}
                            </span>
                            <div>
                              <p className={`text-[12px] font-medium mb-0.5 ${isReturn ? 'text-warning' : 'text-error'}`}>
                                {isReturn ? '需要补充材料' : '驳回原因'}
                              </p>
                              <p className="text-[13px] text-ink">{displayNote}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
                      <button
                        className="btn-secondary !py-2 !text-[13px]"
                        onClick={() => navigate(`/student/competitions/${reg.competitionId}`)}
                      >
                        查看赛事
                      </button>
                      {isPendingCompletion ? (
                        <button
                          className="btn-primary !py-2 !text-[13px]"
                          onClick={() => navigate(`/student/upload/${reg.id}`)}
                        >
                          <span className="material-symbols-outlined text-[16px]">upload_file</span>
                          上传成果
                        </button>
                      ) : reg.status === '审核驳回' ? (
                        <button
                          className="btn-primary !py-2 !text-[13px]"
                          onClick={() => navigate(`/student/upload/${reg.id}`)}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {reg.reviewNote?.startsWith('【退回补充】') ? 'assignment_return' : 'refresh'}
                          </span>
                          {reg.reviewNote?.startsWith('【退回补充】') ? '补充材料' : '重新提交'}
                        </button>
                      ) : (
                        <button
                          className="btn-secondary !py-2 !text-[13px]"
                          onClick={() => navigate(`/student/upload/${reg.id}`)}
                        >
                          查看详情
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-md lg:sticky lg:top-[68px] lg:h-fit">
          {/* Todos */}
          <div className="glass p-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">task_alt</span>
                我的待办
              </h3>
              {pendingCount > 0 && (
                <span className="chip chip-warning tabular-nums">{pendingCount}</span>
              )}
            </div>
            <ul className="flex flex-col">
              {registrations.filter((r) => r.status === '待完善').map((r) => {
                const compName = r.competitionName || `赛事 #${r.competitionId}`;
                return (
                  <li
                    key={r.id}
                    className="flex items-start gap-3 py-2.5 border-b border-hairline last:border-0 group cursor-pointer"
                    onClick={() => navigate(`/student/upload/${r.id}`)}
                  >
                    <div className="mt-0.5 w-4 h-4 rounded-full border border-primary/20 group-hover:border-primary transition" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink group-hover:text-primary transition truncate">
                        上传「{compName.substring(0, 12)}…」成果
                      </p>
                      <p className="text-[11px] text-primary mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">timer</span> 待处理
                      </p>
                    </div>
                  </li>
                );
              })}
              {pendingCount === 0 && (
                <li className="text-center py-4 text-ink-muted-48 text-[12px]">暂无待办事项</li>
              )}
            </ul>
          </div>

          {/* Stats */}
          <div className="glass p-lg">
            <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px] text-primary">insights</span>
              报名统计
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatBlock label="累计报名" value={registrations.length} tone="primary" />
              <StatBlock label="待完善" value={pendingCount} tone="warning" />
              <StatBlock label="审核中" value={registrations.filter((r) => r.status === '审核中' || r.status === '已提交').length} tone="warning" />
              <StatBlock label="已通过" value={registrations.filter((r) => r.status === '审核通过').length} tone="success" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, icon, tone, value }: { label: string; icon: string; tone: 'primary' | 'success' | 'warning' | 'error'; value: string }) {
  const toneClass = {
    primary: 'text-primary',
    success: 'text-primary',
    warning: 'text-ink-muted-80',
    error: 'text-error',
  }[tone];
  return (
    <div>
      <p className="text-[11px] text-ink-muted-48 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[13px] text-ink flex items-center gap-1.5">
        <span className={`material-symbols-outlined text-[15px] ${toneClass}`}>{icon}</span>
        {value}
      </p>
    </div>
  );
}

function StatBlock({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'success' | 'warning' | 'error' }) {
  const toneClass = {
    primary: 'text-primary',
    success: 'text-primary',
    warning: 'text-ink-muted-80',
    error: 'text-error',
  }[tone];
  return (
    <div className="rounded-md border border-hairline bg-canvas p-3">
      <p className="text-[11px] text-ink-muted-48 mb-1">{label}</p>
      <p className={`font-display font-semibold text-[24px] leading-none tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
