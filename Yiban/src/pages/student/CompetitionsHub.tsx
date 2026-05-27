import { useState, useEffect } from 'react';
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

export default function CompetitionsHub() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';
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
  const pageSize = 9;

  useEffect(() => {
    setSelectedStatus(isAdmin ? '' : 'published');
    setPage(1);
  }, [isAdmin]);

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

  return (
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Discover"
        title="赛事大厅"
        description="国家级、省级、校级三级赛事汇总，按方向与时段精细筛选。"
        contentClassName="max-w-2xl"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-lg">
        {/* Category rail */}
        <aside className="glass-tint p-md h-fit lg:sticky lg:top-[68px]">
          <p className="px-sm pb-sm text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-muted-48">
            分类筛选
          </p>
          <div className="flex flex-col gap-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => { setSelectedCategory(cat.value); setPage(1); }}
                className={`flex justify-between items-center px-sm py-2 rounded-md text-[14px] transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-primary/8 text-primary font-semibold'
                    : 'text-ink-muted-80 hover:bg-primary/6 hover:text-ink'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div className="flex flex-col gap-lg">
          {/* Filter bar */}
          <div className="glass-tint flex flex-wrap items-center gap-sm px-md py-3">
            <Segmented
              options={LEVELS}
              value={selectedLevel}
              onChange={(v) => { setSelectedLevel(v); setPage(1); }}
            />
            <span className="w-px h-5 bg-primary/12" />
            <Segmented
              options={STATUSES}
              value={selectedStatus}
              onChange={(v) => { setSelectedStatus(v); setPage(1); }}
            />
            <div className="flex-1" />
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
                >
                  <CompetitionCard comp={comp} navigate={navigate} isAdmin={isAdmin} />
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
        </div>
      </div>
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
    <div className="inline-flex items-center p-0.5 bg-primary/6 rounded-pill">
      {options.map((o) => (
        <button
          key={o.label}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-pill text-[13px] transition-all ${
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

function CompetitionCard({ comp, navigate, isAdmin }: { comp: BackendCompetition; navigate: ReturnType<typeof useNavigate>; isAdmin: boolean }) {
  return (
    <div className="glass overflow-hidden flex flex-col h-full transition-all hover:border-primary/25">
      {/* Cover */}
      <div className="h-40 relative overflow-hidden">
        {comp.coverUrl ? (
          <img className="w-full h-full object-cover" src={comp.coverUrl} alt={comp.name} />
        ) : (
          <div className="w-full h-full bg-canvas-parchment grid place-items-center">
            <span className="material-symbols-outlined text-[64px] text-primary/70">emoji_events</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={levelChip(comp.level)}>{comp.level}</span>
          <span className={statusChip(comp.status)}>{statusLabel(comp.status)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-lg flex flex-col flex-1">
        <h4 className="text-[17px] font-semibold leading-snug tracking-tight text-ink line-clamp-2 mb-3">
          {comp.name}
        </h4>
        <div className="flex flex-col gap-1.5 text-[13px] text-ink-muted-80 mb-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-ink-muted-48">calendar_today</span>
            <span>截止 {formatDate(comp.endTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-ink-muted-48">category</span>
            <span className="truncate">{CATEGORY_LABEL[comp.category] ?? comp.category} 类 · 最多 {comp.maxTeamSize ?? '—'} 人</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[12px] text-ink-muted-48 mb-md pt-3 border-t border-hairline">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">event</span>
            {formatDate(comp.startTime)}
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">flag</span>
            {formatDate(comp.competitionStart)}
          </span>
        </div>

        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => navigate(isAdmin ? `/admin/publish/${comp.id}` : `/student/competitions/${comp.id}`)}
            className="btn-secondary flex-1 !py-2 !text-[13px]"
          >
            {isAdmin ? '编辑' : '详情'}
          </button>
          {!isAdmin && (
            <button
              onClick={() => navigate(`/student/registrations/workbench/${comp.id}`)}
              className="btn-primary flex-1 !py-2 !text-[13px]"
            >
              立即报名
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
