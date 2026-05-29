import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import { listContainer, listItem, softSpring } from '../../lib/motion';

type BackendCompetition = {
  id: number | string;
  name: string;
  level: string;
  category: string;
  status: string;
  startTime?: string;
  endTime?: string;
  competitionStart?: string;
  competitionEnd?: string;
  maxTeamSize?: number;
  coverUrl?: string;
  content?: string;
  tags?: string[];
  tracks?: string[];
};

const LEVELS: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '国家级', value: '国家级' },
  { label: '省级', value: '省级' },
  { label: '校级', value: '校级' },
];

const CATEGORIES: { label: string; value: string }[] = [
  { label: '全部赛事', value: '' },
  { label: '科技创新 (A)', value: 'A' },
  { label: '商业创业 (B)', value: 'B' },
  { label: '文化艺术 (C)', value: 'C' },
];

const CATEGORY_LABEL: Record<string, string> = { A: '科技创新', B: '商业创业', C: '文化艺术' };
const CATEGORY_ICON: Record<string, string> = { A: 'psychology', B: 'business_center', C: 'palette' };

const STATUSES: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '报名中', value: 'published' },
  { label: '已结束', value: 'closed' },
];

function statusChip(status: string) {
  switch (status) {
    case 'published': return 'chip chip-success';
    case 'draft': return 'chip chip-warning';
    case 'closed': return 'chip';
    default: return 'chip';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'published': return '报名中';
    case 'draft': return '未发布';
    case 'closed': return '已结束';
    default: return status || '未知';
  }
}

function levelChip(level: string) {
  switch (level) {
    case '国家级': return 'chip chip-primary';
    case '省级': return 'chip chip-warning';
    case '校级': return 'chip';
    default: return 'chip';
  }
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntil(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

export default function CompetitionsHub() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const isStudent = currentUser?.role === 'student';
  const defaultStatus = isAdmin ? '' : 'published';
  const [competitions, setCompetitions] = useState<BackendCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(defaultStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [registeredCompIds, setRegisteredCompIds] = useState<Set<string>>(new Set());
  const pageSize = 9;

  useEffect(() => {
    setSelectedStatus(isAdmin ? '' : 'published');
    setPage(1);
  }, [isAdmin]);

  useEffect(() => {
    if (!isStudent) return;
    const fetchRegistrations = async () => {
      try {
        const regs: any = await apiClient.get('/registration/my');
        const list = Array.isArray(regs) ? regs : [];
        const activeStatuses = ['待完善', '已提交', '审核中', '审核通过'];
        const ids = new Set<string>(
          list
            .filter((r: any) => activeStatuses.includes(r.status))
            .map((r: any) => String(r.competitionId))
        );
        setRegisteredCompIds(ids);
      } catch {
        // ignore
      }
    };
    fetchRegistrations();
  }, [isStudent]);

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, any> = { current: page, size: pageSize };
        if (searchQuery) params.keyword = searchQuery;
        if (selectedLevel) params.level = selectedLevel;
        if (selectedCategory) params.category = selectedCategory;
        if (selectedStatus) params.status = selectedStatus;
        else if (!isAdmin) params.status = 'published';
        const data: any = await apiClient.get('/competition/list', { params });
        const records: BackendCompetition[] = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
        setCompetitions(records);
        setTotal(typeof data?.total === 'number' ? data.total : records.length);
      } catch (err: any) {
        setError(err.message || '获取赛事列表失败');
        setCompetitions([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    fetchCompetitions();
  }, [page, selectedLevel, selectedCategory, selectedStatus, searchQuery, isAdmin]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { '': total };
    competitions.forEach((comp) => {
      counts[comp.category] = (counts[comp.category] || 0) + 1;
    });
    return counts;
  }, [competitions, total]);
  const publishedCount = competitions.filter((c) => c.status === 'published').length;

  return (
    <div className="flex flex-col gap-lg py-1">
      <PageHero
        eyebrow="Competitions"
        title="赛事大厅"
        description="按级别、分类和报名状态筛选校内外赛事。"
        contentClassName="max-w-3xl"
        actions={
          <div className="grid min-w-[220px] grid-cols-2 gap-2">
            <SummaryMetric label="当前结果" value={total} />
            <SummaryMetric label="报名中" value={publishedCount} />
          </div>
        }
      />

      <div className="grid grid-cols-1 items-start gap-lg lg:grid-cols-[204px_minmax(0,1fr)]">
        <aside className="app-panel-soft h-fit p-2 lg:sticky lg:top-[68px]">
          <div className="px-2.5 py-2">
            <p className="text-[11px] font-semibold uppercase text-ink-muted-48">分类筛选</p>
            <p className="mt-1 text-[12px] text-ink-muted-48">按赛事方向收拢列表</p>
          </div>
          <div className="flex flex-row gap-1 overflow-x-auto no-scrollbar lg:flex-col">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.value;
              return (
                <button
                  key={cat.label}
                  onClick={() => { setSelectedCategory(cat.value); setPage(1); }}
                  className={`relative flex min-w-fit items-center justify-between gap-3 overflow-hidden rounded-sm px-3 py-2.5 text-[13px] transition lg:min-w-0 ${
                    active ? 'text-ink' : 'text-ink-muted-80 hover:text-ink'
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="competition-category-active"
                      className="absolute inset-0 rounded-sm border border-white/80 bg-white/[0.82] shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)]"
                      transition={softSpring}
                    />
                  ) : (
                    <span className="absolute inset-0 rounded-sm opacity-0 transition hover:bg-white/[0.56] hover:opacity-100" />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[17px] ${active ? 'icon-fill text-primary' : 'text-ink-muted-48'}`}>
                      {cat.value ? CATEGORY_ICON[cat.value] : 'apps'}
                    </span>
                    {cat.label}
                  </span>
                  <span className="relative z-10 text-[11px] tabular-nums text-ink-muted-48">
                    {cat.value ? categoryCounts[cat.value] || 0 : total}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex min-w-0 flex-col gap-md">
          <div className="app-command-bar flex flex-col gap-3 px-md py-3 xl:flex-row xl:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                id="level"
                options={LEVELS}
                value={selectedLevel}
                onChange={(v) => { setSelectedLevel(v); setPage(1); }}
              />
              <Segmented
                id="status"
                options={STATUSES}
                value={selectedStatus}
                onChange={(v) => { setSelectedStatus(v); setPage(1); }}
              />
            </div>
            <div className="hidden flex-1 xl:block" />
            <div className="relative w-full md:w-[300px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">
                search
              </span>
              <input
                className="input-glass h-9 pl-9 text-[14px] !rounded-pill"
                placeholder="搜索赛事名称"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-section text-ink-muted-48">
              <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
              <span className="text-[14px]">加载中…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-section text-primary">
              <span className="material-symbols-outlined text-[32px]">error_outline</span>
              <span className="text-[14px]">{error}</span>
            </div>
          ) : competitions.length === 0 ? (
            <div className="app-panel flex flex-col items-center justify-center gap-2 py-section text-ink-muted-48">
              <span className="material-symbols-outlined text-[32px]">search_off</span>
              <span className="text-[14px]">暂无符合条件的赛事</span>
            </div>
          ) : (
            <motion.div
              layout
              variants={listContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-3"
            >
              {competitions.map((comp) => (
                <motion.div key={comp.id} layout variants={listItem} className="h-full">
                  <CompetitionCard
                    comp={comp}
                    navigate={navigate}
                    isAdmin={isAdmin}
                    isRegistered={registeredCompIds.has(String(comp.id))}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {competitions.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-md">
              <button
                className="icon-button !h-9 !w-9 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => idx + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`grid h-9 w-9 place-items-center rounded-full text-[14px] tabular-nums transition ${
                    n === page ? 'bg-primary font-semibold text-on-primary' : 'text-ink hover:bg-primary/[0.06]'
                  }`}
                >
                  {n}
                </button>
              ))}
              {totalPages > 5 && <span className="px-2 text-ink-muted-48">…</span>}
              <button
                className="icon-button !h-9 !w-9 disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-white/80 bg-white/[0.7] px-4 py-3">
      <div className="text-[22px] font-semibold leading-none tabular-nums text-ink">{value}</div>
      <div className="mt-1 text-[11px] text-ink-muted-48">{label}</div>
    </div>
  );
}

function Segmented({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-pill border border-white/80 bg-surface-chip p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.label}
            onClick={() => onChange(o.value)}
            className={`relative overflow-hidden rounded-pill px-3 py-1.5 text-[13px] transition ${
              active ? 'text-ink' : 'text-ink-muted-80 hover:text-ink'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                className="absolute inset-0 rounded-pill bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)]"
                transition={softSpring}
              />
            )}
            <span className={`relative z-10 whitespace-nowrap ${active ? 'font-semibold' : ''}`}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CompetitionCard({
  comp,
  navigate,
  isAdmin,
  isRegistered,
}: {
  comp: BackendCompetition;
  navigate: ReturnType<typeof useNavigate>;
  isAdmin: boolean;
  isRegistered: boolean;
}) {
  const remainingDays = daysUntil(comp.endTime);
  const isClosingSoon = remainingDays !== null && remainingDays >= 0 && remainingDays <= 7;
  const tagList = [
    comp.level,
    statusLabel(comp.status),
    ...(Array.isArray(comp.tracks) ? comp.tracks.slice(0, 1) : []),
  ].filter(Boolean);
  const content = comp.content ? comp.content.replace(/<[^>]+>/g, '') : '查看赛事详情、报名时间与参赛要求';

  return (
    <article className="app-panel group flex h-full flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_22px_56px_-36px_rgba(15,23,42,0.52)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-tile-2">
        {comp.coverUrl && (
          <img
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
            src={comp.coverUrl}
            alt={comp.name}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'grid';
            }}
          />
        )}
        <div className="grid h-full w-full place-items-center bg-surface-tile-1" style={comp.coverUrl ? { display: 'none' } : undefined}>
          <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-white shadow-[0_14px_36px_-28px_rgba(15,23,42,0.6)]">
            <span className="material-symbols-outlined text-[28px] text-primary">emoji_events</span>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/[0.24] to-transparent" />
        {isClosingSoon && (
          <span className="absolute right-3 top-3 rounded-pill bg-white/[0.88] px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur-md">
            {remainingDays === 0 ? '今日截止' : `${remainingDays} 天截止`}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-md">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tagList.map((tag) => (
            <span
              key={tag}
              className={
                tag === comp.level
                  ? levelChip(comp.level)
                  : tag === statusLabel(comp.status)
                    ? statusChip(comp.status)
                    : 'chip'
              }
            >
              {tag}
            </span>
          ))}
        </div>

        <h4 className="mb-2 min-h-[44px] text-[16px] font-semibold leading-snug text-ink line-clamp-2">
          {comp.name}
        </h4>
        <p className="mb-md line-clamp-2 text-[12px] leading-relaxed text-ink-muted-48">
          {content}
        </p>

        <div className="mb-md grid grid-cols-2 gap-x-3 gap-y-2 border-y border-hairline/80 py-3 text-[12px]">
          <MetaItem icon="calendar_today" label="报名截止" value={formatDate(comp.endTime)} strong={isClosingSoon} />
          <MetaItem icon="groups" label="团队人数" value={`最多 ${comp.maxTeamSize ?? '—'} 人`} />
          <MetaItem icon={CATEGORY_ICON[comp.category] || 'category'} label="赛事方向" value={CATEGORY_LABEL[comp.category] ?? (comp.category || '未分类')} />
          <MetaItem icon="flag" label="开赛时间" value={formatDate(comp.competitionStart)} />
        </div>

        <div className="mt-auto flex gap-2">
          <button
            onClick={() => navigate(isAdmin ? `/admin/publish/${comp.id}` : `/student/competitions/${comp.id}`)}
            className="btn-secondary flex-1 !min-h-10 !py-2 !text-[13px]"
          >
            {isAdmin ? '编辑' : '详情'}
          </button>
          {!isAdmin && (
            isRegistered ? (
              <button
                onClick={() => navigate('/student/registrations')}
                className="btn-primary flex-1 !min-h-10 !py-2 !text-[13px]"
              >
                已报名
              </button>
            ) : (
              <button
                onClick={() => navigate(`/student/registrations/workbench/${comp.id}`)}
                className="btn-primary flex-1 !min-h-10 !py-2 !text-[13px]"
              >
                立即报名
              </button>
            )
          )}
        </div>
      </div>
    </article>
  );
}

function MetaItem({
  icon,
  label,
  value,
  strong = false,
}: {
  icon: string;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-muted-48">
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
        {label}
      </div>
      <div className={`mt-0.5 truncate font-medium ${strong ? 'text-primary' : 'text-ink'}`}>{value}</div>
    </div>
  );
}
