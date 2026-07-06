import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { listActivityCategories } from '../../api/activityCategories';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import Pagination from '../../components/Pagination';
import { CardSkeleton } from '../../components/Skeleton';
import ErrorState from '../../components/ErrorState';
import LazyImage from '../../components/LazyImage';
import { listContainer, listItem, pageTransition, softSpring } from '../../lib/motion';
import type { ActivityCategory, ActivityType } from '../../types';

type HubItem = {
  id: number | string;
  type: ActivityType;
  name: string;
  level?: string;
  category?: string;
  status: string;
  startTime?: string;
  endTime?: string;
  activityStart?: string;
  activityEnd?: string;
  maxTeamSize?: number;
  maxParticipants?: number;
  coverUrl?: string;
  content?: string;
  tags?: string[];
  tracks?: string[];
  location?: string;
  serviceHours?: number;
};

const LEVELS: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '国家级', value: '国家级' },
  { label: '省级', value: '省级' },
  { label: '校级', value: '校级' },
  { label: '院级', value: '院级' },
];

const ACTIVITY_TYPES: { label: string; value: ActivityType; icon: string }[] = [
  { label: '竞赛赛事', value: 'competition', icon: 'emoji_events' },
  { label: '志愿服务', value: 'volunteer', icon: 'volunteer_activism' },
  { label: '文体活动', value: 'culture_sports', icon: 'sports_soccer' },
  { label: '其他活动', value: 'other', icon: 'event_available' },
];

const STATUSES: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '报名中', value: 'published' },
  { label: '已结束', value: 'closed' },
  { label: '草稿', value: 'draft' },
];

const typeLabel: Record<ActivityType, string> = {
  competition: '竞赛',
  volunteer: '志愿',
  culture_sports: '文体',
  other: '活动',
};

const typeFallbackIcon: Record<ActivityType, string> = {
  competition: 'emoji_events',
  volunteer: 'volunteer_activism',
  culture_sports: 'sports_soccer',
  other: 'event_available',
};

function statusChip(status: string) {
  switch (status) {
    case 'published': return 'chip chip-success';
    case 'draft': return 'chip chip-warning';
    case 'closed': return 'chip chip-closed';
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

function levelChip(level?: string) {
  switch (level) {
    case '国家级': return 'chip chip-national';
    case '省级': return 'chip chip-province';
    case '校级': return 'chip chip-school';
    case '院级': return 'chip chip-school';
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

function stripHtml(value?: string) {
  return value ? value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

export default function CompetitionsHub() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const isStudent = currentUser?.role === 'student';
  const defaultStatus = isAdmin ? '' : 'published';
  const [items, setItems] = useState<HubItem[]>([]);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ActivityType>('competition');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(defaultStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [registeredCompIds, setRegisteredCompIds] = useState<Set<string>>(new Set());
  const [participatedActivityIds, setParticipatedActivityIds] = useState<Set<string>>(new Set());
  const pageSize = 12;

  useEffect(() => {
    setSelectedStatus(isAdmin ? '' : 'published');
    setPage(1);
  }, [isAdmin]);

  useEffect(() => {
    setSelectedCategory('');
    setPage(1);
    let cancelled = false;
    listActivityCategories(selectedType)
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedType]);

  useEffect(() => {
    if (!isStudent) return;
    const fetchMine = async () => {
      try {
        const regs: any = await apiClient.get('/registration/my');
        const list = Array.isArray(regs) ? regs : [];
        const activeStatuses = ['待完善', '已提交', '审核中', '审核通过', '退回补充'];
        setRegisteredCompIds(new Set(
          list
            .filter((r: any) => activeStatuses.includes(r.status))
            .map((r: any) => String(r.competitionId))
        ));
      } catch (err) {
        console.error(err);
      }

      try {
        const parts: any = await apiClient.get('/me/participations', { params: { current: 1, size: 200 } });
        const records = Array.isArray(parts?.records) ? parts.records : Array.isArray(parts) ? parts : [];
        const activeStatuses = ['submitted', 'in_review', 'approved', 'returned'];
        setParticipatedActivityIds(new Set(
          records
            .filter((p: any) => activeStatuses.includes(p.status))
            .map((p: any) => String(p.activityId))
        ));
      } catch (err) {
        console.error(err);
      }
    };
    fetchMine();
  }, [isStudent]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, any> = { current: page, size: pageSize };
        if (searchQuery) params.keyword = searchQuery;
        if (selectedCategory) params.category = selectedCategory;
        if (selectedStatus) params.status = selectedStatus;
        else if (!isAdmin) params.status = 'published';

        if (selectedType === 'competition') {
          if (selectedLevel) params.level = selectedLevel;
          const data: any = await apiClient.get('/competition/list', { params });
          const records = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
          setItems(records.map((comp: any) => ({
            id: comp.id,
            type: 'competition' as ActivityType,
            name: comp.name,
            level: comp.level,
            category: comp.category,
            status: comp.status,
            startTime: comp.startTime,
            endTime: comp.endTime,
            activityStart: comp.competitionStart,
            activityEnd: comp.competitionEnd,
            maxTeamSize: comp.maxTeamSize,
            coverUrl: comp.coverUrl,
            content: comp.content,
            tags: comp.tags,
            tracks: comp.tracks,
          })));
          setTotal(typeof data?.total === 'number' ? data.total : records.length);
        } else {
          params.type = selectedType;
          if (selectedLevel) params.level = selectedLevel;
          const data: any = await apiClient.get('/activities', { params });
          const records = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
          setItems(records.map((activity: any) => ({
            id: activity.id,
            type: activity.type,
            name: activity.title,
            level: activity.level,
            category: activity.category,
            status: activity.status,
            startTime: activity.startTime,
            endTime: activity.endTime,
            activityStart: activity.activityStart,
            activityEnd: activity.activityEnd,
            maxTeamSize: activity.maxTeamSize,
            maxParticipants: activity.maxParticipants,
            coverUrl: activity.coverUrl,
            content: activity.content,
            tags: activity.tags,
            tracks: activity.tracks,
            location: activity.location,
            serviceHours: activity.serviceHours,
          })));
          setTotal(typeof data?.total === 'number' ? data.total : records.length);
        }
      } catch (err: any) {
        setError(err.message || '获取活动列表失败');
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [page, selectedType, selectedLevel, selectedCategory, selectedStatus, searchQuery, isAdmin]);

  const categoryMap = useMemo(() => {
    const map: Record<string, ActivityCategory> = {};
    categories.forEach((cat) => {
      map[cat.code] = cat;
    });
    return map;
  }, [categories]);

  const categoryOptions = useMemo(() => [
    { label: selectedType === 'competition' ? '全部赛事' : '全部活动', value: '', icon: 'apps' },
    ...categories.map((cat) => ({ label: cat.name, value: cat.code, icon: cat.icon || 'category' })),
  ], [categories, selectedType]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { '': total };
    items.forEach((item) => {
      if (item.category) counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items, total]);
  const publishedCount = items.filter((c) => c.status === 'published').length;
  const activeCategoryName = selectedCategory
    ? categoryMap[selectedCategory]?.name || selectedCategory
    : selectedType === 'competition'
      ? '全部赛事'
      : '全部活动';
  const activeTypeLabel = ACTIVITY_TYPES.find((type) => type.value === selectedType)?.label || typeLabel[selectedType];

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        eyebrow="活动大厅"
        title="活动大厅"
        description="集中浏览赛事、志愿服务、文体活动与其他活动，按分类、级别和状态快速收拢结果。"
        contentClassName="max-w-3xl"
        actions={(
          <div className="grid min-w-[220px] grid-cols-2 gap-2">
            <SummaryMetric label="当前结果" value={total} />
            <SummaryMetric label="报名中" value={publishedCount} />
          </div>
        )}
      />

      <section className="app-command-bar flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <FilterGroup label="活动类型">
            <Segmented
              id="type"
              options={ACTIVITY_TYPES}
              value={selectedType}
              onChange={(v) => { setSelectedType(v as ActivityType); setPage(1); }}
            />
          </FilterGroup>

          <div className="relative w-full md:max-w-[340px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">search</span>
            <input
              className="input-glass h-9 pl-9 text-[14px]"
              placeholder={`搜索${typeLabel[selectedType]}名称`}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <FilterGroup label="级别">
            <Segmented
              id="level"
              options={LEVELS}
              value={selectedLevel}
              onChange={(v) => { setSelectedLevel(v); setPage(1); }}
            />
          </FilterGroup>
          <FilterGroup label="状态">
            <Segmented
              id="status"
              options={isAdmin ? STATUSES : STATUSES.filter((s) => s.value !== 'draft')}
              value={selectedStatus}
              onChange={(v) => { setSelectedStatus(v); setPage(1); }}
            />
          </FilterGroup>
        </div>

        <div className="flex min-w-0 items-center gap-2 border-t border-hairline pt-3">
          <span className="shrink-0 text-[12px] text-body-subtle">分类</span>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categoryOptions.map((cat) => (
              <CategoryButton
                key={cat.value || 'all'}
                option={cat}
                active={selectedCategory === cat.value}
                count={cat.value ? categoryCounts[cat.value] || 0 : total}
                onClick={() => { setSelectedCategory(cat.value); setPage(1); }}
              />
            ))}
          </div>
          <span className="hidden shrink-0 text-[12px] tabular-nums text-placeholder sm:inline">
            {Math.max(categoryOptions.length - 1, 0)} 个分类
          </span>
        </div>
      </section>

      <main className="flex min-w-0 flex-col gap-md">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-medium text-ink">{activeCategoryName}</h2>
            <p className="text-[13px] text-body-subtle">
              {activeTypeLabel} · {total} 个结果
            </p>
          </div>
          <p className="text-[12px] text-placeholder">
            每页 {pageSize} 项
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setError(null);
              setPage(1);
            }}
          />
        ) : items.length === 0 ? (
          <ErrorState
            variant="not-found"
            title="暂无活动"
            message={searchQuery ? '没有找到匹配的活动，请尝试其他关键词' : '暂无符合条件的活动'}
          />
        ) : (
          <motion.div
            layout
            variants={listContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
          >
            {items.map((item) => (
              <motion.div
                key={`${item.type}-${item.id}`}
                layout
                variants={listItem}
                whileHover={{ y: -2 }}
                transition={pageTransition}
                className="h-full min-w-0"
              >
                <ActivityCard
                  item={item}
                  category={item.category ? categoryMap[item.category] : undefined}
                  navigate={navigate}
                  isAdmin={isAdmin}
                  isRegistered={item.type === 'competition' ? registeredCompIds.has(String(item.id)) : participatedActivityIds.has(String(item.id))}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {items.length > 0 && (
          <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
        )}
      </main>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-hairline bg-canvas px-4 py-3">
      <div className="text-[22px] font-medium leading-none tabular-nums text-ink">{value}</div>
      <div className="mt-1 text-[12px] text-body-subtle">{label}</div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
      <span className="shrink-0 text-[12px] text-body-subtle">{label}</span>
      {children}
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
  options: { label: string; value: string; icon?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-sm border border-hairline bg-canvas-parchment p-1 no-scrollbar">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value || o.label}
            onClick={() => onChange(o.value)}
            className={`relative shrink-0 overflow-hidden rounded-sm px-3 py-1.5 text-[13px] transition ${
              active ? 'text-ink' : 'text-ink-muted-80 hover:text-ink'
            }`}
          >
            {active && (
              <motion.span layoutId={`segmented-${id}`} className="absolute inset-0 rounded-sm bg-canvas" transition={softSpring} />
            )}
            <span className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap ${active ? 'font-semibold' : ''}`}>
              {o.icon && <span className="material-symbols-outlined text-[16px]">{o.icon}</span>}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CategoryButton({
  option,
  active,
  count,
  onClick,
}: {
  option: { label: string; value: string; icon?: string };
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex shrink-0 items-center gap-2 rounded-sm border px-3 py-2 text-[13px] transition-colors ${
        active
          ? 'border-primary/20 bg-primary-soft text-primary'
          : 'border-hairline bg-canvas text-body-muted hover:border-border-emphasis hover:text-ink'
      }`}
    >
      {active && (
        <motion.span layoutId="activity-category-active" className="absolute inset-0 rounded-sm bg-primary-soft" transition={softSpring} />
      )}
      <span className="relative z-10 flex min-w-0 items-center gap-2">
        <span className={`material-symbols-outlined text-[17px] ${active ? 'icon-fill text-primary' : 'text-placeholder'}`}>
          {option.icon || 'category'}
        </span>
        <span className="max-w-[8rem] truncate whitespace-nowrap">{option.label}</span>
      </span>
      <span className="relative z-10 rounded-xs bg-surface-chip px-1.5 text-[12px] tabular-nums text-body-subtle">
        {count}
      </span>
    </button>
  );
}

function ActivityCard({
  item,
  category,
  navigate,
  isAdmin,
  isRegistered,
}: {
  item: HubItem;
  category?: ActivityCategory;
  navigate: ReturnType<typeof useNavigate>;
  isAdmin: boolean;
  isRegistered: boolean;
}) {
  const remainingDays = daysUntil(item.endTime);
  const isClosingSoon = remainingDays !== null && remainingDays >= 0 && remainingDays <= 7;
  const categoryName = category?.name || item.category || '未分类';
  const categoryIcon = category?.icon || typeFallbackIcon[item.type];
  const content = stripHtml(item.content) || `查看${typeLabel[item.type]}详情、报名时间与参与要求`;
  const actionLabel = item.type === 'competition' ? '立即报名' : '申请参加';
  const primaryTimeLabel = item.type === 'competition' ? '报名截止' : '申请截止';
  const capacityLabel = item.type === 'competition' ? '团队人数' : '参与上限';
  const capacityValue = item.type === 'competition'
    ? `最多 ${item.maxTeamSize ?? '—'} 人`
    : item.maxParticipants
      ? `${item.maxParticipants} 人`
      : '不限';
  const placeOrStartLabel = item.type === 'volunteer' ? '服务地点' : '开始时间';
  const placeOrStartValue = item.type === 'volunteer' ? (item.location || '待定') : formatDate(item.activityStart);

  const handlePrimary = async () => {
    if (isAdmin) {
      navigate(item.type === 'competition' ? `/admin/publish/${item.id}` : `/admin/publish/activity/${item.id}`);
      return;
    }
    if (isRegistered) {
      navigate(item.type === 'competition' ? '/student/registrations' : '/student/progress');
      return;
    }
    if (item.type === 'competition') {
      navigate(`/student/registrations/workbench/${item.id}`);
      return;
    }
    try {
      await apiClient.post(`/activities/${item.id}/participations`, {
        track: item.tracks?.[0] || '',
        memberStudentIds: [],
        metadata: {},
      });
      toast.success('参与申请已提交');
      navigate('/student/progress');
    } catch (err: any) {
      toast.error(err?.message || '提交申请失败');
    }
  };

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-sm border border-hairline bg-canvas p-4 transition-all hover:border-border-emphasis hover:shadow-card-hover">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-surface-tile-2 ring-1 ring-hairline">
          <LazyImage
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            src={item.coverUrl}
            alt={item.name}
            fallbackIcon={typeFallbackIcon[item.type]}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={statusChip(item.status)}>{statusLabel(item.status)}</span>
            <span className="chip chip-primary">{typeLabel[item.type]}</span>
            {item.level ? <span className={levelChip(item.level)}>{item.level}</span> : null}
          </div>
          <h4 className="mt-2 min-h-[42px] text-[15px] font-medium leading-[1.4] text-ink line-clamp-2">{item.name}</h4>
        </div>
      </div>

      <p className="mt-3 min-h-[38px] text-[12px] leading-[1.55] text-body-subtle line-clamp-2">{content}</p>

      {isClosingSoon ? (
        <div className="mt-3 rounded-sm border border-hairline bg-primary-soft px-3 py-2 text-[12px] text-primary">
          {remainingDays === 0 ? '今天截止报名' : `距离报名截止还有 ${remainingDays} 天`}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-sm bg-canvas-parchment p-3 text-xs text-body-subtle">
        <MetaItem icon="calendar_today" label={primaryTimeLabel} value={formatDate(item.endTime)} strong={isClosingSoon} />
        <MetaItem icon={item.type === 'competition' ? 'groups' : 'person_add'} label={capacityLabel} value={capacityValue} />
        <MetaItem icon={categoryIcon} label="分类" value={categoryName} />
        <MetaItem icon={item.type === 'volunteer' ? 'place' : 'flag'} label={placeOrStartLabel} value={placeOrStartValue} />
      </div>

      {Array.isArray(item.tracks) && item.tracks[0] ? (
        <div className="mt-3 min-w-0 truncate text-[12px] text-placeholder">
          {item.tracks[0]}
        </div>
      ) : null}

      <div className="mt-auto flex gap-2 border-t border-hairline pt-3">
          {item.type === 'competition' ? (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(isAdmin ? `/admin/publish/${item.id}` : `/student/competitions/${item.id}`)}
                className="btn-secondary min-w-0 flex-1 !min-h-9 !py-2 !text-[13px]"
              >
                {isAdmin ? '编辑' : '详情'}
              </motion.button>
              {!isAdmin && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={handlePrimary} className="btn-primary min-w-0 flex-1 !min-h-9 !py-2 !text-[13px]">
                  {isRegistered ? '已报名' : actionLabel}
                </motion.button>
              )}
            </>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }} onClick={handlePrimary} className="btn-primary min-w-0 flex-1 !min-h-9 !py-2 !text-[13px]">
              {isAdmin ? '编辑活动' : isRegistered ? '查看进度' : actionLabel}
            </motion.button>
          )}
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
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
        {label}
      </div>
      <div className={`mt-0.5 truncate font-medium ${strong ? 'text-blue-600' : 'text-slate-700'}`}>{value}</div>
    </div>
  );
}
