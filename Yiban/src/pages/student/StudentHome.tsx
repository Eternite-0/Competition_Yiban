import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { useStore as useAuthStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import Skeleton from '../../components/Skeleton';
import { studentJourney } from '../../config/navigation';

type Competition = {
  id: number | string;
  name: string;
  level: string;
  category: string;
  status: string;
  endTime?: string;
};

type Registration = {
  id: number | string;
  competitionId: number | string;
  teamName?: string;
  status: string;
  submitDate?: string;
  competitionName?: string;
};

type ComprehensiveScore = {
  academicYear?: string;
  major?: string;
  comprehensiveRank?: number;
  comprehensiveRankPercent?: number | string;
  rankTotal?: number;
  rankScope?: string;
};

function formatRank(score: ComprehensiveScore | null) {
  if (!score?.comprehensiveRank) return '暂无';
  return score.rankTotal
    ? `${score.comprehensiveRank}/${score.rankTotal}`
    : String(score.comprehensiveRank);
}

function formatPercent(value?: number | string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '暂无';
  const percent = n > 1 ? n : n * 100;
  return `${percent.toFixed(1)}%`;
}

export default function StudentHome() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const now = new Date();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [comprehensive, setComprehensive] = useState<ComprehensiveScore | null>(null);
  const [comprehensiveMode, setComprehensiveMode] = useState<'rank' | 'percent'>('rank');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const compPage: any = await apiClient.get('/competition/list', {
          params: { current: 1, size: 8, status: 'published' },
        });
        setCompetitions(Array.isArray(compPage?.records) ? compPage.records : []);
      } catch (err: any) {
        toast.error(err.message || '加载赛事列表失败');
      }
      try {
        const regs: any = await apiClient.get('/registration/my');
        setRegistrations(Array.isArray(regs) ? regs : []);
      } catch (err: any) {
        toast.error(err.message || '加载报名信息失败');
      }
      try {
        const annPage: any = await apiClient.get('/announcement/list', {
          params: { current: 1, size: 4 },
        });
        setAnnouncements(Array.isArray(annPage?.records) ? annPage.records : []);
      } catch (err) {
        console.error(err);
      }
      try {
        const score: any = await apiClient.get('/growth/comprehensive');
        setComprehensive(score ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const registeredCount = registrations.length;
  const pendingSubmissions = registrations.filter((r) => r.status === '待完善' || r.status === '退回补充').length;
  const reviewingSubmissions = registrations.filter((r) => r.status === '审核中' || r.status === '已提交').length;
  const passedCount = registrations.filter((r) => r.status === '审核通过').length;
  const hotEvents = competitions.slice(0, 6);
  const todos = registrations
    .filter((r) => ['待完善', '退回补充', '审核中', '已提交'].includes(r.status))
    .slice(0, 5);
  const todayLabel = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;

  if (loading) {
    return (
      <div className="page-stack">
        <PageHero title={`欢迎回来，${currentUser?.name ?? '同学'}`} description="加载中…" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHero
        eyebrow={todayLabel}
        title={`欢迎回来，${currentUser?.name ?? '同学'}`}
        description="从发现活动到报名材料、进度与成长，在这里看清下一步。"
        actions={(
          <button type="button" onClick={() => navigate('/student/competitions')} className="btn-primary">
            去活动大厅
          </button>
        )}
      />

      {/* 流程：胶囊步骤，非卡片网格 */}
      <section className="page-section" aria-label="参赛主流程">
        <div className="journey-steps">
          {studentJourney.map((step, idx) => (
            <div key={step.path} className="contents">
              <button type="button" className="journey-step" onClick={() => navigate(step.path)}>
                <span className="journey-step-num">{step.step}</span>
                {step.label}
              </button>
              {idx < studentJourney.length - 1 ? (
                <span className="journey-sep material-symbols-outlined">chevron_right</span>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* 指标：横条分隔，非四卡片 */}
      <section className="metric-row" aria-label="数据概览">
        <div className="metric-item">
          <div className="metric-item-label">可报名</div>
          <div className="metric-item-value">{competitions.length}</div>
          <div className="metric-item-hint">近期开放</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">已报名</div>
          <div className="metric-item-value">{registeredCount}</div>
          <div className="metric-item-hint">全部记录</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">待处理</div>
          <div className="metric-item-value">{pendingSubmissions}</div>
          <div className="metric-item-hint">{pendingSubmissions ? '请尽快补材料' : '暂无待办'}</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">审核中</div>
          <div className="metric-item-value">{reviewingSubmissions}</div>
          <div className="metric-item-hint">已通过 {passedCount}</div>
        </div>
        <button
          type="button"
          className="metric-item text-left transition-colors hover:bg-hover-overlay"
          onClick={() => setComprehensiveMode((m) => (m === 'rank' ? 'percent' : 'rank'))}
          title="点击切换排名/百分位"
        >
          <div className="metric-item-label">综测{comprehensiveMode === 'rank' ? '排名' : '百分位'}</div>
          <div className="metric-item-value text-[20px]">
            {comprehensiveMode === 'rank'
              ? formatRank(comprehensive)
              : formatPercent(comprehensive?.comprehensiveRankPercent)}
          </div>
          <div className="metric-item-hint">
            {comprehensive?.rankScope || comprehensive?.major || '本专业'} · 点击切换
          </div>
        </button>
      </section>

      {/* 待办列表 */}
      <section className="page-section">
        <div className="page-section-head">
          <h2 className="page-section-title">需要处理</h2>
          <button
            type="button"
            className="page-section-extra hover:text-primary"
            onClick={() => navigate('/student/registrations')}
          >
            全部报名
          </button>
        </div>
        {todos.length === 0 ? (
          <p className="py-6 text-[13.5px] text-placeholder">
            暂无待办。去活动大厅看看有没有适合的赛事吧。
          </p>
        ) : (
          <div className="flat-list">
            {todos.map((r) => (
              <button
                key={r.id}
                type="button"
                className="flat-row flat-row-clickable"
                onClick={() => navigate(`/student/registrations/workbench/${r.competitionId}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-ink">
                    {r.competitionName || r.teamName || `报名 #${r.id}`}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-placeholder">
                    {r.submitDate ? `提交于 ${String(r.submitDate).slice(0, 10)}` : '点击进入工作台'}
                  </div>
                </div>
                <span className="chip shrink-0">{r.status}</span>
                <span className="material-symbols-outlined text-[18px] text-placeholder">chevron_right</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 推荐赛事 + 公告：两列扁平列表 */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="page-section">
          <div className="page-section-head">
            <h2 className="page-section-title">推荐活动</h2>
            <button
              type="button"
              className="page-section-extra hover:text-primary"
              onClick={() => navigate('/student/competitions')}
            >
              活动大厅
            </button>
          </div>
          {hotEvents.length === 0 ? (
            <p className="py-6 text-[13.5px] text-placeholder">暂无可报名活动</p>
          ) : (
            <div className="flat-list">
              {hotEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="flat-row flat-row-clickable"
                  onClick={() => navigate(`/student/competitions/${event.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-ink">{event.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-placeholder">
                      <span>{event.level || '级别待定'}</span>
                      <span>·</span>
                      <span>{event.category || '未分类'}</span>
                      {event.endTime ? (
                        <>
                          <span>·</span>
                          <span>截止 {String(event.endTime).slice(0, 10)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-placeholder">chevron_right</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="page-section">
          <div className="page-section-head">
            <h2 className="page-section-title">公告</h2>
          </div>
          {announcements.length === 0 ? (
            <p className="py-6 text-[13.5px] text-placeholder">暂无公告</p>
          ) : (
            <div className="flat-list">
              {announcements.map((a: any) => (
                <div key={a.id} className="flat-row items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-medium text-ink">{a.title}</span>
                      {a.isPinned ? <span className="chip chip-warning !py-0">置顶</span> : null}
                    </div>
                    {a.content ? (
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-body-subtle">
                        {a.content}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[12px] text-placeholder">
                    {a.createTime ? new Date(a.createTime).toLocaleDateString('zh-CN') : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

    </div>
  );
}
