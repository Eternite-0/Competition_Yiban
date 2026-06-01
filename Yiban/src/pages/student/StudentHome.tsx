import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { useStore as useAuthStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import Skeleton, { StatSkeleton } from '../../components/Skeleton';
import { listContainer, listItem, pageTransition, pageVariants } from '../../lib/motion';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const toneClass = {
  primary: 'bg-primary',
  warning: 'bg-warning',
  error: 'bg-error',
};

type Competition = {
  id: number | string;
  name: string;
  level: string;
  category: string;
  status: string;
  endTime?: string;
  coverUrl?: string;
};

type Registration = {
  id: number | string;
  competitionId: number | string;
  teamName?: string;
  status: string;
  submitDate?: string;
};

export default function StudentHome() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const compPage: any = await apiClient.get('/competition/list', {
          params: { current: 1, size: 5, status: 'published' },
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
          params: { current: 1, size: 3 },
        });
        setAnnouncements(Array.isArray(annPage?.records) ? annPage.records : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const registeredCount = registrations.length;
  const pendingSubmissions = registrations.filter((r) => r.status === '待完善').length;
  const reviewingSubmissions = registrations.filter((r) => r.status === '审核中' || r.status === '已提交').length;
  const passedCount = registrations.filter((r) => r.status === '审核通过').length;
  const hotEvents = competitions.slice(0, 3);
  const activeRegistration = registrations[0];
  const todayLabel = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;

  const firstDay = new Date(currentMonth.year, currentMonth.month - 1, 1).getDay();
  const daysInMonth = new Date(currentMonth.year, currentMonth.month, 0).getDate();
  const daysInPrev = new Date(currentMonth.year, currentMonth.month - 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells: { day: number; current: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, current: true });
  while (cells.length < 42) cells.push({ day: cells.length - daysInMonth - startOffset + 1, current: false });

  const isCurrentMonth = currentMonth.year === now.getFullYear() && currentMonth.month === now.getMonth() + 1;
  const today = isCurrentMonth ? now.getDate() : -1;

  const calendarEvents: Record<number, { label: string; tone: 'primary' | 'warning' | 'error' }> = {};
  competitions.forEach((comp) => {
    if (!comp.endTime) return;
    const d = new Date(comp.endTime);
    if (d.getFullYear() === currentMonth.year && d.getMonth() + 1 === currentMonth.month) {
      calendarEvents[d.getDate()] = { label: `${comp.name}截止`, tone: 'primary' };
    }
  });

  const stats = [
    { label: '近期可报名', value: competitions.length, hint: competitions.length > 0 ? '抓紧报名' : '暂无赛事', icon: 'emoji_events' },
    { label: '已报名赛事', value: registeredCount, hint: `进行中 ${reviewingSubmissions}`, icon: 'assignment_ind' },
    { label: '待补交材料', value: pendingSubmissions, hint: pendingSubmissions > 0 ? '请尽快上传' : '暂无待办', icon: 'pending_actions' },
    { label: '审核中成果', value: reviewingSubmissions, hint: reviewingSubmissions > 0 ? '预计下周反馈' : `已通过 ${passedCount}`, icon: 'rule' },
  ];

  const focusSteps = activeRegistration
    ? [
        { step: 1, title: '报名', status: 'done' },
        { step: 2, title: '材料', status: activeRegistration.status === '待完善' ? 'active' : 'done' },
        {
          step: 3,
          title: '评审',
          status:
            activeRegistration.status === '已提交' || activeRegistration.status === '审核中'
              ? 'active'
              : activeRegistration.status === '审核通过'
                ? 'done'
                : 'pending',
        },
        { step: 4, title: '完成', status: activeRegistration.status === '审核通过' ? 'active' : 'pending' },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex flex-col">
        <PageHero
          eyebrow={`Today · ${todayLabel}`}
          title={`欢迎回来，${currentUser?.name ?? '同学'}`}
          description="近期赛事、报名状态和待处理材料汇总。"
          className="mb-6 [&>div]:flex-row [&>div]:items-center [&>div]:justify-between"
          titleClassName="text-[22px] font-medium text-ink"
          descriptionClassName="mt-1 text-sm text-body-subtle"
          actions={(
            <button onClick={() => navigate('/student/competitions')} className="btn-primary">
              浏览赛事大厅
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          )}
        />
        <div className="app-panel p-lg mb-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-7 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {Array.from({ length: 4 }, (_, i) => <StatSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-5 mb-6">
          <div className="app-panel p-5">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, i) => <Skeleton key={i} className="h-9 w-9" />)}
            </div>
          </div>
          <div className="app-panel p-5">
            <Skeleton className="h-5 w-24 mb-4" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-hairline last:border-0">
                <Skeleton className="h-11 w-11" />
                <div className="flex-1"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-20" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col"
    >
      <PageHero
        eyebrow={`Today · ${todayLabel}`}
        title={`欢迎回来，${currentUser?.name ?? '同学'}`}
        description="近期赛事、报名状态和待处理材料汇总。"
        className="mb-6 [&>div]:flex-row [&>div]:items-center [&>div]:justify-between"
        titleClassName="text-[22px] font-medium text-ink"
        descriptionClassName="mt-1 text-sm text-body-muted"
        actions={(
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/student/competitions')} className="btn-primary">
            浏览赛事大厅
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </motion.button>
        )}
      />

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
        className="app-panel p-lg mb-4"
      >
        <div className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-primary">
              <span className="material-symbols-outlined icon-fill text-[18px]">adjust</span>
              今日焦点
            </div>
            <h2 className="mt-2 text-[24px] font-semibold leading-tight text-ink">
              {activeRegistration?.teamName || (hotEvents[0]?.name ?? '找到下一场适合的赛事')}
            </h2>
            <p className="mt-1.5 max-w-2xl text-[14px] text-ink-muted-80">
              {activeRegistration
                ? `当前状态：${activeRegistration.status}。继续完善材料或查看赛事工作台。`
                : '还没有进行中的报名，可以先从热门赛事中挑选适合的项目。'}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {activeRegistration ? (
              <div className="grid grid-cols-4 gap-2">
                {focusSteps.map((item) => (
                  <div key={item.step} className="min-w-0 text-center">
                    <div
                      className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold ${
                        item.status === 'done'
                          ? 'bg-primary text-on-primary'
                          : item.status === 'active'
                            ? 'border-2 border-primary bg-canvas text-primary'
                            : 'bg-surface-chip text-placeholder'
                      }`}
                    >
                      {item.status === 'done' ? (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      ) : (
                        item.step
                      )}
                    </div>
                    <div className="mt-1.5 truncate text-[11px] text-ink-muted-48">{item.title}</div>
                  </div>
                ))}
              </div>
            ) : (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/student/competitions')} className="btn-secondary justify-center">
                查看可报名赛事
              </motion.button>
            )}
            {activeRegistration ? (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/student/registrations')} className="btn-secondary justify-center">
                进入我的参赛
              </motion.button>
            ) : null}
          </div>
        </div>
      </motion.section>

      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6"
      >
        {stats.map((s) => (
          <motion.div key={s.label} variants={listItem} whileHover={{ scale: 1.03, y: -2 }} transition={pageTransition} className="app-panel p-3 md:p-4 min-h-[88px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-body-muted">{s.label}</span>
              <span className="material-symbols-outlined text-[18px] text-primary">{s.icon}</span>
            </div>
            <div className="text-[26px] font-medium leading-none text-ink">
              {s.value}
            </div>
            <span className="text-xs text-body-muted">{s.hint}</span>
          </motion.div>
        ))}
      </motion.div>

      <section className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-5 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...pageTransition, delay: 0.08 }}
          className="app-panel p-5"
        >
          <div className="mb-lg flex items-center justify-between">
            <h2 className="text-[20px] font-semibold">赛事日历</h2>
            <div className="flex items-center gap-1 text-[13px] text-ink-muted-80">
              <button onClick={() => setCurrentMonth((m) => m.month === 1 ? { year: m.year - 1, month: 12 } : { year: m.year, month: m.month - 1 })} className="icon-button !h-8 !w-8">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="px-2 font-medium tabular-nums">{currentMonth.year} · {currentMonth.month}月</span>
              <button onClick={() => setCurrentMonth((m) => m.month === 12 ? { year: m.year + 1, month: 1 } : { year: m.year, month: m.month + 1 })} className="icon-button !h-8 !w-8">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-x-1 gap-y-2 text-center text-[13px]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-2 text-[11px] font-medium text-ink-muted-48">{d}</div>
            ))}
            {cells.map((c, idx) => {
              const event = c.current ? calendarEvents[c.day] : undefined;
              const isToday = c.current && c.day === today;
              return (
                <div key={idx} className="group relative flex h-12 flex-col items-center justify-start pt-1">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full text-[14px] tabular-nums transition ${
                      isToday
                        ? 'bg-primary font-semibold text-on-primary'
                        : c.current
                          ? 'text-ink hover:bg-primary/[0.06]'
                          : 'text-ink-muted-48/50'
                    }`}
                  >
                    {c.day}
                  </span>
                  {event && (
                    <span className={`mt-1 h-1.5 w-1.5 rounded-full ${toneClass[event.tone]}`} />
                  )}
                  {event && (
                    <span className="pointer-events-none absolute -bottom-7 z-10 whitespace-nowrap rounded-xs border border-border bg-canvas px-2 py-1 text-[12px] text-body-muted opacity-0 shadow-float transition group-hover:opacity-100">
                      {event.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...pageTransition, delay: 0.12 }}
          className="app-panel p-5 flex flex-col"
        >
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-[20px] font-semibold">热门赛事</h2>
            <button onClick={() => navigate('/student/competitions')} className="text-[13px] font-medium text-primary hover:text-primary-focus">
              查看全部
            </button>
          </div>
          <motion.div variants={listContainer} initial="hidden" animate="visible" className="flex flex-col">
            {hotEvents.map((event, idx) => (
              <motion.button
                key={event.id}
                variants={listItem}
                whileHover={{ x: 2 }}
                onClick={() => navigate(`/student/competitions/${event.id}`)}
                className={`group flex items-center gap-md py-3 text-left ${
                  idx !== hotEvents.length - 1 ? 'border-b border-hairline/80' : ''
                }`}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-hairline bg-surface-pearl">
                  <span className="material-symbols-outlined text-[21px] text-primary">emoji_events</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-ink transition group-hover:text-primary">
                    {event.name}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="chip chip-primary !py-0.5 !text-[11px]">{event.level}</span>
                    <span className="truncate text-[12px] text-ink-muted-48">{event.category} 类</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-ink-muted-48 transition group-hover:translate-x-0.5 group-hover:text-primary">
                  chevron_right
                </span>
              </motion.button>
            ))}
            {hotEvents.length === 0 && (
              <div className="py-8 text-center text-[14px] text-ink-muted-48">暂无可报名赛事</div>
            )}
          </motion.div>
        </motion.div>
      </section>

      {announcements.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...pageTransition, delay: 0.16 }}
          className="app-panel p-lg"
        >
          <div className="mb-md flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[20px] font-semibold">
              <span className="material-symbols-outlined text-[20px] text-primary">campaign</span>
              最新公告
            </h2>
          </div>
          <motion.div variants={listContainer} initial="hidden" animate="visible" className="flex flex-col">
            {announcements.map((a: any) => (
              <motion.div
                key={a.id}
                variants={listItem}
                className="flex items-start gap-3 border-b border-border py-3 pl-3 last:border-b-0"
              >
                {a.isPinned && <span className="material-symbols-outlined mt-0.5 text-[16px] text-primary">push_pin</span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-ink">{a.title}</span>
                    <span className={`chip ${a.type === 'system' ? 'chip-warning' : 'chip-primary'}`}>
                      {a.type === 'system' ? '系统' : '赛事'}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-body-muted">{a.content}</p>
                </div>
                <span className="whitespace-nowrap text-[12px] text-body-muted">
                  {new Date(a.createTime).toLocaleDateString('zh-CN')}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}
    </motion.div>
  );
}
