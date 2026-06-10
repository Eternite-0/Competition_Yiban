import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import { CardSkeleton } from '../../components/Skeleton';
import ErrorState from '../../components/ErrorState';
import { listContainer, listItem, pageVariants } from '../../lib/motion';

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

type TabFilter = '全部' | '待完善' | '已提交' | '审核中' | '已通过' | '退回补充' | '已驳回';

const STATUS_CHIP: Record<string, { label: string; chip: string }> = {
  '待完善': { label: '待完善', chip: 'chip chip-warning' },
  '已提交': { label: '已提交', chip: 'chip' },
  '审核中': { label: '审核中', chip: 'chip chip-warning' },
  '审核通过': { label: '已通过', chip: 'chip chip-success' },
  '退回补充': { label: '需补充', chip: 'chip chip-warning' },
  '审核驳回': { label: '已驳回', chip: 'chip chip-error' },
};

const TABS: TabFilter[] = ['全部', '待完善', '已提交', '审核中', '已通过', '退回补充', '已驳回'];

function tabMatches(tab: TabFilter, status: string): boolean {
  if (tab === '全部') return true;
  if (tab === '已通过') return status === '审核通过';
  if (tab === '退回补充') return status === '退回补充';
  if (tab === '已驳回') return status === '审核驳回';
  return tab === status;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getAction(reg: Registration) {
  switch (reg.status) {
    case '待完善':
      return { label: '上传成果', icon: 'upload_file', primary: true, path: `/student/upload/${reg.id}` };
    case '退回补充':
      return { label: '补充材料', icon: 'assignment_return', primary: true, path: `/student/upload/${reg.id}` };
    case '审核驳回':
      return { label: '查看原因', icon: 'info', primary: false, path: `/student/upload/${reg.id}` };
    case '审核通过':
      return { label: '查看成长档案', icon: 'trending_up', primary: false, path: '/student/growth' };
    default:
      return { label: '查看材料', icon: 'visibility', primary: false, path: `/student/upload/${reg.id}` };
  }
}

function getMaterialState(status: string) {
  if (status === '待完善') return '待提交成果';
  if (status === '退回补充') return '需补充材料';
  if (status === '审核中') return '材料审核中';
  if (status === '已提交') return '等待报名审核';
  if (status === '审核驳回') return '审核未通过';
  if (status === '审核通过') return '已通过';
  return status || '—';
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
  const todoRegistrations = registrations.filter((r) => r.status === '待完善' || r.status === '退回补充');
  const pendingCount = todoRegistrations.length;

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <PageHero eyebrow="Registrations" title="我的报名" description="管理并查看您参与的所有赛事及活动进度。" contentClassName="max-w-2xl" />

      <div className="flex flex-col gap-4">
        <div className="order-2 flex flex-col gap-4">
          <div className="flex gap-1 p-1 bg-primary/6 rounded-pill w-fit overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-pill text-[13px] whitespace-nowrap transition-all ${activeTab === tab ? 'bg-canvas text-ink font-semibold shadow-sm' : 'text-ink-muted-80 hover:text-ink'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="flex flex-col gap-4">{Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)}</div>
            ) : error ? (
              <ErrorState message={error} onRetry={() => window.location.reload()} />
            ) : filtered.length === 0 ? (
              <ErrorState variant="not-found" title="暂无报名记录" message={activeTab !== '全部' ? '当前筛选条件下没有报名记录' : '您还没有报名任何赛事'} />
            ) : (
              <motion.div variants={listContainer} initial="hidden" animate="visible" className="flex flex-col gap-4">
                {filtered.map((reg) => {
                  const statusInfo = STATUS_CHIP[reg.status] || { label: reg.status || '未知', chip: 'chip' };
                  const compName = reg.competitionName || `赛事 #${reg.competitionId}`;
                  const action = getAction(reg);
                  const isAttention = reg.status === '待完善' || reg.status === '退回补充';

                  return (
                    <motion.div key={reg.id} variants={listItem} className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-[19px] font-semibold tracking-tight text-ink mb-1">{compName}</h3>
                          <p className="text-[12px] text-ink-muted-48 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>报名时间 · {formatDate(reg.submitDate)}</p>
                        </div>
                        <span className={statusInfo.chip}>{statusInfo.label}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm rounded-md bg-canvas-parchment p-3 border border-hairline mb-md">
                        <Field label="团队状态" icon="groups" tone="primary" value={reg.teamName ? `已组队 · ${reg.teamName}` : '单人报名'} />
                        <Field label="参赛赛道" icon="flag" tone="primary" value={reg.track || '未选择'} />
                        <Field label="材料状态" icon={isAttention ? 'warning' : 'check_circle'} tone={isAttention ? 'warning' : reg.status === '审核驳回' ? 'error' : 'success'} value={getMaterialState(reg.status)} />
                        <Field label="报名日期" icon="event" tone="primary" value={formatDate(reg.submitDate)} />
                      </div>

                      {(reg.status === '审核驳回' || reg.status === '退回补充') && reg.reviewNote && (() => {
                        const isReturn = reg.status === '退回补充' || reg.reviewNote.startsWith('【退回补充】');
                        const displayNote = reg.reviewNote.replace('【退回补充】', '');
                        return (
                          <div className={`rounded-md p-3 mb-md ${isReturn ? 'bg-warning/5 border border-warning/15' : 'bg-error/5 border border-error/15'}`}>
                            <div className="flex items-start gap-2">
                              <span className={`material-symbols-outlined text-[16px] mt-0.5 shrink-0 ${isReturn ? 'text-warning' : 'text-error'}`}>{isReturn ? 'assignment_return' : 'info'}</span>
                              <div>
                                <p className={`text-[12px] font-medium mb-0.5 ${isReturn ? 'text-warning' : 'text-error'}`}>{isReturn ? '需要补充材料' : '驳回原因'}</p>
                                <p className="text-[13px] text-ink">{displayNote}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
                        <motion.button whileTap={{ scale: 0.97 }} className="btn-secondary !py-2 !text-[13px]" onClick={() => navigate(`/student/competitions/${reg.competitionId}`)}>查看赛事</motion.button>
                        <motion.button whileTap={{ scale: 0.97 }} className={`${action.primary ? 'btn-primary' : 'btn-secondary'} !py-2 !text-[13px]`} onClick={() => navigate(action.path)}>
                          <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
                          {action.label}
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

        <aside className="order-1 flex flex-col gap-4">
          {pendingCount > 0 && (
            <div className="order-2 bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-primary">task_alt</span>我的待办</h3>
                <span className="chip chip-warning tabular-nums">{pendingCount}</span>
              </div>
              <ul className="flex flex-col">
                {todoRegistrations.map((r) => {
                  const compName = r.competitionName || `赛事 #${r.competitionId}`;
                  const isReturn = r.status === '退回补充';
                  return (
                    <li key={r.id} className="flex items-start gap-3 py-2.5 border-b border-hairline last:border-0 group cursor-pointer" onClick={() => navigate(`/student/upload/${r.id}`)}>
                      <div className="mt-0.5 w-4 h-4 rounded-full border border-primary/20 group-hover:border-primary transition" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink group-hover:text-primary transition truncate">{isReturn ? '补充' : '上传'}「{compName.substring(0, 12)}…」材料</p>
                        <p className="text-[11px] text-primary mt-0.5 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">timer</span>{isReturn ? '需补充' : '待处理'}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="order-1">
            <h3 className="sr-only"><span className="material-symbols-outlined text-[18px] text-primary">insights</span>报名统计</h3>
            <motion.div variants={listContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
              <motion.div variants={listItem}><StatBlock label="累计报名" value={registrations.length} tone="primary" /></motion.div>
              <motion.div variants={listItem}><StatBlock label="待处理" value={pendingCount} tone="warning" /></motion.div>
              <motion.div variants={listItem}><StatBlock label="审核中" value={registrations.filter((r) => r.status === '审核中' || r.status === '已提交').length} tone="warning" /></motion.div>
              <motion.div variants={listItem}><StatBlock label="已通过" value={registrations.filter((r) => r.status === '审核通过').length} tone="success" /></motion.div>
            </motion.div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function Field({ label, icon, tone, value }: { label: string; icon: string; tone: 'primary' | 'success' | 'warning' | 'error'; value: string }) {
  const toneClass = { primary: 'text-primary', success: 'text-success', warning: 'text-warning', error: 'text-error' }[tone];
  return (
    <div>
      <p className="text-[11px] text-ink-muted-48 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[13px] text-ink flex items-center gap-1.5"><span className={`material-symbols-outlined text-[15px] ${toneClass}`}>{icon}</span>{value}</p>
    </div>
  );
}

function StatBlock({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'success' | 'warning' | 'error' }) {
  const toneClass = { primary: 'text-primary', success: 'text-success', warning: 'text-warning', error: 'text-error' }[tone];
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-medium leading-none tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
