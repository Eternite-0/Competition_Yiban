import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import { useStore as useAuthStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const toneClass = {
  primary: 'bg-primary',
  warning: 'bg-primary/55',
  error: 'bg-primary/35',
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

  useEffect(() => {
    const load = async () => {
      try {
        const compPage: any = await apiClient.get('/competition/list', {
          params: { current: 1, size: 5, status: 'published' },
        });
        setCompetitions(Array.isArray(compPage?.records) ? compPage.records : []);
      } catch (err) {
        console.error('Failed to load competitions', err);
      }
      try {
        const regs: any = await apiClient.get('/registration/my');
        setRegistrations(Array.isArray(regs) ? regs : []);
      } catch (err) {
        console.error('Failed to load registrations', err);
      }
      try {
        const annPage: any = await apiClient.get('/announcement/list', {
          params: { current: 1, size: 3 },
        });
        setAnnouncements(Array.isArray(annPage?.records) ? annPage.records : []);
      } catch (err) {
        console.error('Failed to load announcements', err);
      }
    };
    load();
  }, []);

  const registeredCount = registrations.length;
  const pendingSubmissions = registrations.filter((r) => r.status === '待完善').length;
  const reviewingSubmissions = registrations.filter((r) => r.status === '审核中' || r.status === '已提交').length;
  const passedCount = registrations.filter((r) => r.status === '审核通过').length;
  const hotEvents = competitions.slice(0, 3);

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

  // Build calendar events from real competition data
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

  return (
    <div className="flex flex-col gap-lg py-lg">
      <PageHero
        eyebrow={`Today · ${currentMonth.year}.${currentMonth.month}.${today}`}
        title={`欢迎回来，${currentUser?.name ?? '同学'}`}
        description="这里是你近期的赛事节奏与成长概览。"
        actions={(
          <button onClick={() => navigate('/student/competitions')} className="btn-primary">
            浏览赛事大厅
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        )}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass p-lg flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-muted-80 font-medium">{s.label}</span>
              <span className="material-symbols-outlined text-[20px] text-primary">{s.icon}</span>
            </div>
            <div className="font-display font-semibold text-[40px] leading-none tracking-[-0.02em] text-ink">
              {s.value}
            </div>
            <span className="text-[12px] text-ink-muted-48">{s.hint}</span>
          </motion.div>
        ))}
      </div>

      {/* Main split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-md">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="lg:col-span-7 glass p-xl"
        >
          <div className="flex items-center justify-between mb-lg">
            <h2 className="text-[21px] font-semibold tracking-tight">赛事日历</h2>
            <div className="flex items-center gap-1 text-[14px] text-ink-muted-80">
              <button onClick={() => setCurrentMonth(m => m.month === 1 ? { year: m.year - 1, month: 12 } : { year: m.year, month: m.month - 1 })} className="w-8 h-8 grid place-items-center rounded-full hover:bg-primary/6 transition">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="px-2 font-medium tabular-nums">{currentMonth.year} · {currentMonth.month}月</span>
              <button onClick={() => setCurrentMonth(m => m.month === 12 ? { year: m.year + 1, month: 1 } : { year: m.year, month: m.month + 1 })} className="w-8 h-8 grid place-items-center rounded-full hover:bg-primary/6 transition">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-[13px]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-[11px] text-ink-muted-48 font-medium uppercase tracking-widest pb-2">{d}</div>
            ))}
            {cells.map((c, idx) => {
              const event = c.current ? calendarEvents[c.day] : undefined;
              const isToday = c.current && c.day === today;
              return (
                <div key={idx} className="group relative h-12 flex flex-col items-center justify-start pt-1">
                  <span
                    className={`w-9 h-9 grid place-items-center rounded-full text-[14px] tabular-nums transition ${
                      isToday
                        ? 'bg-primary text-on-primary font-semibold'
                        : c.current
                        ? 'text-ink hover:bg-primary/6'
                        : 'text-ink-muted-48/50'
                    }`}
                  >
                    {c.day}
                  </span>
                  {event && (
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full ${toneClass[event.tone]}`} />
                  )}
                  {event && (
                    <span className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -bottom-7 px-2 py-1 rounded-sm border border-hairline text-[11px] text-ink-muted-80 bg-canvas whitespace-nowrap z-10">
                      {event.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Hot events */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="lg:col-span-5 glass p-xl flex flex-col"
        >
          <div className="flex items-center justify-between mb-lg">
            <h2 className="text-[21px] font-semibold tracking-tight">热门赛事</h2>
            <button onClick={() => navigate('/student/competitions')} className="text-[14px] text-primary hover:text-primary-focus">
              查看全部 →
            </button>
          </div>
          <div className="flex flex-col">
            {hotEvents.map((event, idx) => (
              <button
                key={event.id}
                onClick={() => navigate(`/student/competitions/${event.id}`)}
                className={`group flex items-center gap-md text-left py-3 ${
                  idx !== hotEvents.length - 1 ? 'border-b border-hairline' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-md bg-canvas-parchment border border-hairline grid place-items-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[22px] text-primary">emoji_events</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-ink truncate group-hover:text-primary transition">
                    {event.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="chip chip-primary !py-0.5 !text-[11px]">{event.level}</span>
                    <span className="text-[12px] text-ink-muted-48 truncate">{event.category} 类</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-ink-muted-48 group-hover:text-primary group-hover:translate-x-0.5 transition">
                  chevron_right
                </span>
              </button>
            ))}
            {hotEvents.length === 0 && (
              <div className="py-8 text-center text-[14px] text-ink-muted-48">暂无可报名赛事</div>
            )}
          </div>
        </motion.div>
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          className="glass p-xl"
        >
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-[21px] font-semibold tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">campaign</span>
              最新公告
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary/3 transition">
                {a.isPinned && <span className="material-symbols-outlined text-[16px] text-warning mt-0.5">push_pin</span>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-ink truncate">{a.title}</span>
                    <span className={`chip !text-[10px] ${a.type === 'system' ? 'chip-primary' : 'chip-warning'}`}>
                      {a.type === 'system' ? '系统' : '赛事'}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-muted-48 mt-0.5 line-clamp-2">{a.content}</p>
                </div>
                <span className="text-[11px] text-ink-muted-48 whitespace-nowrap">
                  {new Date(a.createTime).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Current Focus */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="glass p-xl"
      >
        <div className="flex items-center justify-between mb-lg flex-wrap gap-3">
          <div>
            <h2 className="text-[21px] font-semibold tracking-tight">当前聚焦</h2>
            {registrations.length > 0 ? (
              <p className="text-[15px] text-ink-muted-80 mt-1">
                {registrations[0].teamName || '我的团队'} · {registrations[0].status}
              </p>
            ) : (
              <p className="text-[15px] text-ink-muted-80 mt-1">暂无进行中的赛事</p>
            )}
          </div>
          {registrations.length > 0 && (
            <span className={`chip ${
              registrations[0].status === '审核通过' ? 'chip-success' :
              registrations[0].status === '已提交' || registrations[0].status === '审核中' ? 'chip-primary' :
              'chip-warning'
            }`}>{registrations[0].status}</span>
          )}
        </div>

        {registrations.length > 0 ? (
          <div className="grid grid-cols-4 gap-md relative">
            <div className="absolute top-5 left-[12.5%] right-[12.5%] h-px bg-hairline" />
            <div className="absolute top-5 left-[12.5%] w-[37.5%] h-px bg-primary" />
            {[
              { step: 1, title: '提交报名', status: 'done' },
              { step: 2, title: '材料审核', status: registrations[0].status === '待完善' ? 'active' : 'done' },
              { step: 3, title: '作品评审', status: registrations[0].status === '已提交' || registrations[0].status === '审核中' ? 'active' : registrations[0].status === '审核通过' ? 'done' : 'pending' },
              { step: 4, title: '完成', status: registrations[0].status === '审核通过' ? 'active' : 'pending' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center relative">
                <div
                  className={`w-10 h-10 rounded-full grid place-items-center text-[14px] font-semibold relative z-10 ${
                    s.status === 'done'
                      ? 'bg-primary text-on-primary'
                      : s.status === 'active'
                      ? 'bg-canvas border-2 border-primary text-primary'
                      : 'bg-canvas border border-hairline text-ink-muted-48'
                  }`}
                >
                  {s.status === 'done' ? (
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  ) : (
                    s.step
                  )}
                </div>
                <div
                  className={`mt-3 text-[14px] ${
                    s.status === 'pending'
                      ? 'text-ink-muted-48'
                      : s.status === 'active'
                      ? 'text-primary font-semibold'
                      : 'text-ink font-medium'
                  }`}
                >
                  {s.title}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-[40px] text-ink-muted-48">emoji_events</span>
            <p className="text-[14px] text-ink-muted-48 mt-2">还没有报名赛事</p>
            <button
              onClick={() => navigate('/student/competitions')}
              className="btn-primary mt-4 !py-1.5 !text-[13px]"
            >
              去报名赛事
            </button>
          </div>
        )}
      </motion.section>
    </div>
  );
}
