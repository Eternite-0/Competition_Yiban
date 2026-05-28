import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';

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

  // 获取学生的报名列表，用于标记已报名的赛事
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
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Competitions"
        title="赛事大厅"
        description="按级别、分类和报名状态筛选校内外赛事，快速找到适合报名或维护的项目。"
        className="!rounded-lg !border-0 shadow-sm"
        contentClassName="max-w-3xl"
        actions={
          <div className="hidden sm:grid grid-cols-2 gap-2 min-w-[220px]">
            <SummaryMetric label="当前结果" value={total} />
            <SummaryMetric label="报名中" value={publishedCount} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-lg items-start">
        {/* Category rail */}
        <aside className="bg-canvas border border-black/5 rounded-lg p-sm h-fit lg:sticky lg:top-[68px] shadow-sm">
          <div className="px-sm py-sm border-b border-hairline mb-1">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-ink-muted-48">分类筛选</p>
            <p className="text-[12px] text-ink-muted-48 mt-1">按赛事方向收拢列表</p>
          </div>
          <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => { setSelectedCategory(cat.value); setPage(1); }}
                className={`min-w-fit lg:min-w-0 flex items-center justify-between gap-3 px-sm py-2.5 rounded-md text-[13px] transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-[#eef6ff] text-primary font-semibold'
                    : 'text-ink-muted-80 hover:bg-canvas-parchment hover:text-ink'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px]">
                    {cat.value ? CATEGORY_ICON[cat.value] : 'apps'}
                  </span>
                  {cat.label}
                </span>
                <span className="text-[11px] tabular-nums text-ink-muted-48">
                  {cat.value ? categoryCounts[cat.value] || 0 : total}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="flex flex-col gap-md min-w-0">
          {/* Filter bar */}
          <div className="bg-canvas border border-black/5 rounded-lg px-md py-3 shadow-sm flex flex-col xl:flex-row xl:items-center gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                options={LEVELS}
                value={selectedLevel}
                onChange={(v) => { setSelectedLevel(v); setPage(1); }}
              />
              <Segmented
                options={STATUSES}
                value={selectedStatus}
                onChange={(v) => { setSelectedStatus(v); setPage(1); }}
              />
            </div>
            <div className="flex-1 hidden xl:block" />
            <div className="relative w-full md:w-[280px]">
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

          {/* Grid */}
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
          ) : competitions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-section gap-2 text-ink-muted-48">
              <span className="material-symbols-outlined text-[32px]">search_off</span>
              <span className="text-[14px]">暂无符合条件的赛事</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
              {competitions.map((comp, i) => (
                <motion.div
                  key={comp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.35 }}
                  className="h-full"
                >
                  <CompetitionCard comp={comp} navigate={navigate} isAdmin={isAdmin} isRegistered={registeredCompIds.has(String(comp.id))} />
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {competitions.length > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-1 pt-md">
              <button
                className="w-9 h-9 grid place-items-center rounded-full hover:bg-primary/6 text-ink-muted-48 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => idx + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 grid place-items-center rounded-full text-[14px] tabular-nums transition ${
                    n === page ? 'bg-primary text-on-primary font-semibold' : 'text-ink hover:bg-primary/6'
                  }`}
                >
                  {n}
                </button>
              ))}
              {totalPages > 5 && <span className="text-ink-muted-48 px-2">…</span>}
              <button
                className="w-9 h-9 grid place-items-center rounded-full hover:bg-primary/6 text-ink-muted-80 disabled:opacity-40"
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
    <div className="rounded-lg bg-canvas-parchment/70 border border-black/5 px-4 py-3">
      <div className="text-[22px] font-semibold leading-none tabular-nums text-ink">{value}</div>
      <div className="mt-1 text-[11px] text-ink-muted-48">{label}</div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center p-1 bg-canvas-parchment rounded-full border border-black/5">
      {options.map((o) => (
        <button
          key={o.label}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-all ${
            value === o.value
              ? 'bg-canvas text-ink font-semibold shadow-sm'
              : 'text-ink-muted-80 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CompetitionCard({ comp, navigate, isAdmin, isRegistered }: { comp: BackendCompetition; navigate: ReturnType<typeof useNavigate>; isAdmin: boolean; isRegistered: boolean }) {
  const remainingDays = daysUntil(comp.endTime);
  const isClosingSoon = remainingDays !== null && remainingDays >= 0 && remainingDays <= 7;
  const tagList = [
    comp.level,
    statusLabel(comp.status),
    ...(Array.isArray(comp.tracks) ? comp.tracks.slice(0, 1) : []),
  ].filter(Boolean);

  return (
    <article className="group bg-canvas border border-black/6 rounded-lg overflow-hidden flex flex-col h-full shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20">
      {/* Cover */}
      <div className="aspect-[16/9] relative overflow-hidden bg-[#edf2f7]">
        {comp.coverUrl && (
          <img
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            src={comp.coverUrl}
            alt={comp.name}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'grid';
            }}
          />
        )}
        <div className="w-full h-full bg-[#f2f5f8] grid place-items-center" style={comp.coverUrl ? { display: 'none' } : undefined}>
          <div className="w-14 h-14 rounded-full bg-canvas grid place-items-center shadow-sm">
            <span className="material-symbols-outlined text-[30px] text-primary">emoji_events</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/28 to-transparent pointer-events-none" />
      </div>

      {/* Body */}
      <div className="p-lg flex flex-col flex-1">
        <div className="flex flex-wrap gap-1.5 mb-3">
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

        <h4 className="text-[17px] font-semibold leading-snug text-ink line-clamp-2 min-h-[46px] mb-3">
          {comp.name}
        </h4>

        <div className="grid grid-cols-2 gap-2 mb-md">
          <InfoPill icon="calendar_today" label="报名截止" value={formatDate(comp.endTime)} tone={isClosingSoon ? 'warn' : 'default'} />
          <InfoPill icon="groups" label="团队人数" value={`最多 ${comp.maxTeamSize ?? '—'} 人`} />
        </div>

        <div className="rounded-md bg-canvas-parchment/70 border border-black/5 p-3 mb-md">
          <div className="flex items-start gap-2 text-[13px] text-ink-muted-80">
            <span className="material-symbols-outlined text-[16px] text-ink-muted-48 mt-0.5">
              {CATEGORY_ICON[comp.category] || 'category'}
            </span>
            <div className="min-w-0">
              <div className="text-ink font-medium truncate">{CATEGORY_LABEL[comp.category] ?? (comp.category || '未分类')}</div>
              <div className="mt-1 text-[12px] text-ink-muted-48 line-clamp-1">
                {comp.content ? comp.content.replace(/<[^>]+>/g, '') : '查看赛事详情、报名时间与参赛要求'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[12px] text-ink-muted-48 mb-md pt-3 border-t border-hairline">
          <TimelinePoint icon="event" value={formatDate(comp.startTime)} />
          <span className="h-px flex-1 mx-3 bg-hairline" />
          <TimelinePoint icon="flag" value={formatDate(comp.competitionStart)} />
        </div>

        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => navigate(isAdmin ? `/admin/publish/${comp.id}` : `/student/competitions/${comp.id}`)}
            className="btn-secondary flex-1 !py-2 !text-[13px]"
          >
            {isAdmin ? '编辑' : '详情'}
          </button>
          {!isAdmin && (
            isRegistered ? (
              <button
                onClick={() => navigate('/student/registrations')}
                className="btn-primary flex-1 !py-2 !text-[13px]"
              >
                已报名
              </button>
            ) : (
              <button
                onClick={() => navigate(`/student/registrations/workbench/${comp.id}`)}
                className="btn-primary flex-1 !py-2 !text-[13px]"
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

function InfoPill({ icon, label, value, tone = 'default' }: { icon: string; label: string; value: string; tone?: 'default' | 'warn' }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${tone === 'warn' ? 'bg-[#fff7ed] border-[#fed7aa]' : 'bg-canvas border-black/5'}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-ink-muted-48">
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-[12px] font-medium text-ink truncate">{value}</div>
    </div>
  );
}

function TimelinePoint({ icon, value }: { icon: string; value: string }) {
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {value}
    </span>
  );
}
