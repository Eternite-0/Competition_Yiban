import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { listActivityCategories } from '../../api/activityCategories';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import Pagination from '../../components/Pagination';
import ErrorState from '../../components/ErrorState';
import LazyImage from '../../components/LazyImage';
import { displayLevel } from '../../lib/levelDisplay';
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

function statusLabel(status: string) {
  switch (status) {
    case 'published': return '报名中';
    case 'draft': return '未发布';
    case 'closed': return '已结束';
    default: return status || '未知';
  }
}

/** 等级徽章色调（正文区常显，不依赖封面对比度） */
function levelBadgeTone(level?: string) {
  const label = displayLevel(level);
  if (label === '国家级') return 'level-badge-national';
  if (label === '省级') return 'level-badge-province';
  if (label === '校级') return 'level-badge-school';
  if (label === '院级') return 'level-badge-college';
  return 'level-badge-default';
}

function statusBadgeTone(status: string) {
  if (status === 'published') return 'status-badge-open';
  if (status === 'draft') return 'status-badge-draft';
  if (status === 'closed') return 'status-badge-closed';
  return 'status-badge-default';
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

  const typeFallbackIcon: Record<ActivityType, string> = {
    competition: 'emoji_events',
    volunteer: 'volunteer_activism',
    culture_sports: 'sports_soccer',
    other: 'event_available',
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        eyebrow={isAdmin ? '活动运营' : '发现活动'}
        title={isAdmin ? '活动管理' : '活动大厅'}
        description={
          isAdmin
            ? '管理全部活动的发布状态与内容。'
            : '筛选感兴趣的赛事与活动，报名后可在「报名与材料」继续完善。'
        }
        actions={(
          <div className="text-[13px] text-body-subtle">
            共 <span className="font-semibold tabular-nums text-ink">{total}</span> 项
            <span className="mx-2 text-hairline">|</span>
            本页报名中 <span className="font-semibold tabular-nums text-ink">{publishedCount}</span>
          </div>
        )}
      />

      {/* 筛选工具条 */}
      <section className="rounded-xl border border-hairline bg-canvas p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Segmented
              options={ACTIVITY_TYPES}
              value={selectedType}
              onChange={(v) => { setSelectedType(v as ActivityType); setPage(1); }}
            />
            <div className="relative w-full lg:max-w-[300px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-placeholder">search</span>
              <input
                className="input-glass h-9 pl-9 text-[14px]"
                placeholder={`搜索${typeLabel[selectedType]}`}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
            <span className="text-[12px] text-placeholder">级别</span>
            <Segmented
              options={LEVELS}
              value={selectedLevel}
              onChange={(v) => { setSelectedLevel(v); setPage(1); }}
            />
            <span className="ml-2 text-[12px] text-placeholder">状态</span>
            <Segmented
              options={isAdmin ? STATUSES : STATUSES.filter((s) => s.value !== 'draft')}
              value={selectedStatus}
              onChange={(v) => { setSelectedStatus(v); setPage(1); }}
            />
          </div>
          <div className="flex min-w-0 items-center gap-2 border-t border-hairline pt-3">
            <span className="shrink-0 text-[12px] text-placeholder">分类</span>
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto no-scrollbar">
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
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{activeCategoryName}</h2>
          <p className="mt-0.5 text-[12.5px] text-placeholder">{activeTypeLabel} · {total} 个结果</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-[280px] animate-pulse rounded-xl border border-hairline bg-surface-tile-1" />
          ))}
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
        <div className="rounded-xl border border-dashed border-hairline py-16 text-center text-[13.5px] text-placeholder">
          {searchQuery ? '没有找到匹配的活动' : '暂无符合条件的活动'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const isRegistered = item.type === 'competition'
              ? registeredCompIds.has(String(item.id))
              : participatedActivityIds.has(String(item.id));
            const remainingDays = daysUntil(item.endTime);
            const categoryName = item.category ? categoryMap[item.category]?.name || item.category : '未分类';
            const levelLabel = displayLevel(item.level);
            const detailPath = isAdmin
              ? (item.type === 'competition' ? `/admin/publish/${item.id}` : `/admin/publish/activity/${item.id}`)
              : `/student/competitions/${item.id}`;
            const urgent = remainingDays !== null && remainingDays >= 0 && remainingDays <= 7;

            return (
              <article
                key={`${item.type}-${item.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-[box-shadow,border-color] duration-200 hover:border-primary/20 hover:shadow-[0_12px_32px_rgba(37,99,235,0.08)]"
              >
                {/* 封面：标签不再叠在图上（避免被缩放/图片遮挡） */}
                <button
                  type="button"
                  className="relative block h-[148px] w-full overflow-hidden bg-gradient-to-br from-primary-soft via-surface-tile-1 to-surface-tile-2 text-left"
                  onClick={() => navigate(detailPath)}
                >
                  <LazyImage
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    src={item.coverUrl}
                    alt={item.name}
                    fallbackIcon={typeFallbackIcon[item.type]}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
                </button>

                <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
                  {/* 等级/状态：正文区常显 */}
                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={`level-badge ${levelBadgeTone(item.level)}`}>
                      {levelLabel}
                    </span>
                    <span className={`status-badge ${statusBadgeTone(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                    {isRegistered ? (
                      <span className="status-badge status-badge-registered">已报名</span>
                    ) : null}
                  </div>

                  <button type="button" className="text-left" onClick={() => navigate(detailPath)}>
                    <h3 className="line-clamp-2 min-h-[44px] text-[15px] font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-primary">
                      {item.name}
                    </h3>
                  </button>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-body-subtle">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-placeholder">category</span>
                      {typeLabel[item.type]} · {categoryName}
                    </span>
                    <span className="text-hairline">·</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-placeholder">event</span>
                      截止 {formatDate(item.endTime)}
                    </span>
                  </div>

                  {urgent ? (
                    <p className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-[12px] font-medium text-warning">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {remainingDays === 0 ? '今天截止' : `还剩 ${remainingDays} 天截止`}
                    </p>
                  ) : (
                    <div className="mt-2 h-[28px]" />
                  )}

                  <div className="mt-auto flex gap-2 pt-3">
                    <button type="button" className="btn-secondary min-w-0 flex-1 !h-9" onClick={() => navigate(detailPath)}>
                      {isAdmin ? '编辑' : '详情'}
                    </button>
                    {!isAdmin && (
                      <button
                        type="button"
                        className={`${isRegistered ? 'btn-secondary' : 'btn-primary'} min-w-0 flex-1 !h-9`}
                        onClick={() => {
                          if (isRegistered) {
                            navigate(item.type === 'competition' ? '/student/registrations' : '/student/progress');
                            return;
                          }
                          if (item.type === 'competition') {
                            navigate(`/student/registrations/workbench/${item.id}`);
                          } else {
                            navigate('/student/progress');
                          }
                        }}
                      >
                        {isRegistered ? '已报名' : item.type === 'competition' ? '立即报名' : '申请参加'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
      )}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string; icon?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex max-w-full items-center gap-1 overflow-x-auto no-scrollbar">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value || o.label}
            type="button"
            onClick={() => onChange(o.value)}
            className={`chip shrink-0 ${active ? 'chip-primary' : ''}`}
          >
            {o.icon && <span className="material-symbols-outlined text-[14px] text-body-muted">{o.icon}</span>}
            {o.label}
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
      type="button"
      onClick={onClick}
      className={`chip shrink-0 ${active ? 'chip-primary' : ''}`}
    >
      <span className="material-symbols-outlined text-[14px] text-body-muted">
        {option.icon || 'category'}
      </span>
      <span className="max-w-[8rem] truncate">{option.label}</span>
      <span className="tabular-nums text-placeholder">{count}</span>
    </button>
  );
}
