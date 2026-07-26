import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ErrorState from '../../components/ErrorState';

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
  待完善: { label: '待完善', chip: 'chip chip-warning' },
  已提交: { label: '已提交', chip: 'chip' },
  审核中: { label: '审核中', chip: 'chip chip-warning' },
  审核通过: { label: '已通过', chip: 'chip chip-success' },
  退回补充: { label: '需补充', chip: 'chip chip-warning' },
  审核驳回: { label: '已驳回', chip: 'chip chip-error' },
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
      return { label: '上传成果', primary: true, path: `/student/upload/${reg.id}` };
    case '退回补充':
      return { label: '补充材料', primary: true, path: `/student/upload/${reg.id}` };
    case '审核驳回':
      return { label: '查看原因', primary: false, path: `/student/upload/${reg.id}` };
    case '审核通过':
      return { label: '成果档案', primary: false, path: '/student/growth' };
    default:
      return { label: '查看材料', primary: false, path: `/student/upload/${reg.id}` };
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
        setRegistrations(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || '获取报名列表失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = registrations.filter((r) => tabMatches(activeTab, r.status));
  const pendingCount = registrations.filter((r) => r.status === '待完善' || r.status === '退回补充').length;
  const reviewingCount = registrations.filter((r) => r.status === '审核中' || r.status === '已提交').length;
  const passedCount = registrations.filter((r) => r.status === '审核通过').length;

  return (
    <div className="page-stack">
      <PageHero
        eyebrow="个人竞赛工作区"
        title="我的赛事"
        description="每场赛事集中展示报名、组队、材料、审核与成果状态。"
      />

      <section className="metric-row">
        <div className="metric-item">
          <div className="metric-item-label">累计报名</div>
          <div className="metric-item-value">{registrations.length}</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">待处理</div>
          <div className="metric-item-value">{pendingCount}</div>
          <div className="metric-item-hint">{pendingCount ? '请尽快处理' : '暂无待办'}</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">审核中</div>
          <div className="metric-item-value">{reviewingCount}</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">已通过</div>
          <div className="metric-item-value">{passedCount}</div>
        </div>
      </section>

      <div className="filter-strip">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`chip ${activeTab === tab ? 'chip-primary' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-footnote text-placeholder">加载中…</p>
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-footnote text-placeholder">
          {activeTab !== '全部' ? '当前筛选无记录' : '还没有报名，去活动大厅看看'}
        </p>
      ) : (
        <div className="flat-list">
          {filtered.map((reg) => {
            const statusInfo = STATUS_CHIP[reg.status] || { label: reg.status || '未知', chip: 'chip' };
            const compName = reg.competitionName || `赛事 #${reg.competitionId}`;
            const action = getAction(reg);
            const note =
              (reg.status === '审核驳回' || reg.status === '退回补充') && reg.reviewNote
                ? reg.reviewNote.replace('【退回补充】', '')
                : null;

            return (
              <div key={reg.id} className="flat-row !items-start gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="text-left text-subhead font-medium text-ink hover:text-primary"
                      onClick={() => navigate(`/student/registrations/workbench/${reg.competitionId}`)}
                    >
                      {compName}
                    </button>
                    <span className={statusInfo.chip}>{statusInfo.label}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-caption text-placeholder">
                    <span>{reg.teamName ? `队伍 ${reg.teamName}` : '单人'}</span>
                    <span>{reg.track || '未选赛道'}</span>
                    <span>{getMaterialState(reg.status)}</span>
                    <span>报名 {formatDate(reg.submitDate)}</span>
                  </div>
                  {note ? (
                    <p className="mt-2 text-caption leading-relaxed text-warning">备注：{note}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="btn-secondary !h-9"
                    onClick={() => navigate(`/student/competitions/${reg.competitionId}`)}
                  >
                    赛事
                  </button>
                  <button
                    type="button"
                    className={action.primary ? 'btn-primary !h-9' : 'btn-secondary !h-9'}
                    onClick={() => navigate(action.path)}
                  >
                    {action.label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
