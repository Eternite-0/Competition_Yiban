import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

type Competition = {
  id: number | string;
  name: string;
  level: string;
  category: string;
  status: string;
  startTime?: string;
  endTime?: string;
  coverUrl?: string;
};

const levelColor: Record<string, { bg: string; dot: string; text: string; chip: string }> = {
  国家级: { bg: 'bg-red-50', dot: 'bg-red-500', text: 'text-red-700', chip: 'chip-error' },
  省级: { bg: 'bg-blue-50', dot: 'bg-blue-500', text: 'text-blue-700', chip: 'chip-primary' },
  校级: { bg: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-700', chip: 'chip-success' },
};

function getLevelStyle(level: string) {
  return levelColor[level] ?? { bg: 'bg-gray-50', dot: 'bg-gray-400', text: 'text-gray-600', chip: 'chip' };
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(str?: string): Date | null {
  if (!str) return null;
  // Bare date strings like "2024-05-27" are parsed as UTC midnight by new Date(),
  // causing off-by-one day errors in negative UTC offsets. Parse date-only strings
  // explicitly as local time.
  const dateOnly = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const d = new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export default function CompetitionCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res: any = await apiClient.get('/competition/list', {
        params: { current: 1, size: 200, status: 'published' },
      });
      setCompetitions(Array.isArray(res?.records) ? res.records : []);
    } catch (err) {
      console.error('Failed to load competitions', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Build a map: dateKey -> competitions on that day
  const dayMap = useMemo(() => {
    const map: Record<string, Competition[]> = {};
    for (const c of competitions) {
      const end = parseDate(c.endTime);
      if (end) {
        const key = toDateKey(end);
        (map[key] ??= []).push(c);
      }
      const start = parseDate(c.startTime);
      if (start) {
        const key = toDateKey(start);
        if (!map[key]?.some((x) => x.id === c.id)) {
          (map[key] ??= []).push(c);
        }
      }
    }
    return map;
  }, [competitions]);

  // Calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrev = new Date(year, month - 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const cells: { day: number; current: boolean; key: string }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? year - 1 : year;
    cells.push({ day: d, current: false, key: `${py}-${String(pm).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, current: true, key: `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    cells.push({ day: i, current: false, key: `${ny}-${String(nm).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
  }

  const todayKey = toDateKey(today);

  const goPrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
    setSelectedDay(null);
  };

  const goNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
    setSelectedDay(null);
  };

  const touchStartX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx > 0) goPrev();
      else goNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const selectedCompetitions = selectedDay ? (dayMap[selectedDay] ?? []) : [];

  return (
    <div className="flex flex-col gap-lg py-lg">
      <PageHero
        eyebrow="Competition Calendar"
        title="赛事日历"
        description="一览本月赛事关键节点，点击日期查看当天的赛事安排。"
      />

      {error ? (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-xl flex flex-col items-center justify-center py-20 text-center"
        >
          <span className="material-symbols-outlined text-[48px] text-ink-muted-48">cloud_off</span>
          <p className="text-[15px] text-ink-muted-80 mt-4">赛事数据加载失败</p>
          <button
            onClick={load}
            className="mt-4 px-5 py-2 rounded-full text-[13px] font-medium bg-primary text-on-primary hover:opacity-90 transition"
          >
            重新加载
          </button>
        </motion.section>
      ) : (
      <>
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-md">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-8 glass p-xl"
        >
          <div className="flex items-center justify-between mb-lg">
            <h2 className="text-[21px] font-semibold tracking-tight">
              {year} 年 {month} 月
            </h2>
            <div className="flex items-center gap-1 text-[14px] text-ink-muted-80">
              <button
                onClick={goPrev}
                className="w-8 h-8 grid place-items-center rounded-full hover:bg-primary/6 transition"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); setSelectedDay(null); }}
                className="px-3 py-1 rounded-full text-[13px] font-medium hover:bg-primary/6 transition"
              >
                今天
              </button>
              <button
                onClick={goNext}
                className="w-8 h-8 grid place-items-center rounded-full hover:bg-primary/6 transition"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-lg text-[12px]">
            {Object.entries(levelColor).map(([label, c]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                <span className="text-ink-muted-80">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <span className="text-ink-muted-80">其他</span>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-[11px] text-ink-muted-48 font-medium uppercase tracking-widest pb-2">
                {d}
              </div>
            ))}
            {cells.map((c) => {
              const events = dayMap[c.key] ?? [];
              const isToday = c.key === todayKey;
              const isSelected = c.key === selectedDay;
              const dateLabel = `${parseInt(c.key.split('-')[1])}月${parseInt(c.key.split('-')[2])}日${events.length > 0 ? `, ${events.length}个赛事` : ''}`;
              return (
                <button
                  key={c.key}
                  onClick={() => setSelectedDay(isSelected ? null : c.key)}
                  aria-label={dateLabel}
                  aria-pressed={isSelected}
                  className={`group relative h-14 sm:h-16 flex flex-col items-center justify-start pt-1 rounded-lg transition ${
                    isSelected ? 'bg-primary/8 ring-1 ring-primary/30' : 'hover:bg-primary/4'
                  }`}
                >
                  <span
                    className={`w-9 h-9 grid place-items-center rounded-full text-[14px] tabular-nums transition ${
                      isToday
                        ? 'bg-primary text-on-primary font-semibold'
                        : c.current
                          ? isSelected
                            ? 'text-primary font-semibold'
                            : 'text-ink hover:bg-primary/6'
                          : 'text-ink-muted-48/50'
                    }`}
                  >
                    {c.day}
                  </span>
                  {events.length > 0 && (
                    <div className="flex items-center gap-0.5 mt-1">
                      {events.slice(0, 3).map((ev) => {
                        const s = getLevelStyle(ev.level);
                        return <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />;
                      })}
                      {events.length > 3 && (
                        <span className="text-[10px] text-ink-muted-48 ml-0.5">+{events.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Day detail panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-4 glass p-xl flex flex-col"
        >
          <h2 className="text-[21px] font-semibold tracking-tight mb-lg">
            {selectedDay ? (() => {
              const parts = selectedDay.split('-');
              return `${parseInt(parts[1])} 月 ${parseInt(parts[2])} 日`;
            })() : '选择日期'}
          </h2>

          <AnimatePresence mode="wait">
            {selectedDay ? (
              <motion.div
                key={selectedDay}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : selectedCompetitions.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {selectedCompetitions.map((c) => {
                      const s = getLevelStyle(c.level);
                      return (
                        <div
                          key={c.id}
                          className={`p-4 rounded-lg border border-hairline ${s.bg} transition hover:shadow-sm`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className={`text-[15px] font-medium ${s.text} leading-snug`}>
                                {c.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className={`chip !py-0.5 !text-[11px] ${s.chip}`}>
                                  {c.level}
                                </span>
                                <span className="text-[12px] text-ink-muted-48">{c.category}</span>
                              </div>
                              {c.endTime && (() => {
                                const ed = parseDate(c.endTime);
                                return ed ? (
                                  <div className="flex items-center gap-1 mt-2 text-[12px] text-ink-muted-48">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    截止: {ed.toLocaleDateString('zh-CN')}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="material-symbols-outlined text-[40px] text-ink-muted-48">event_busy</span>
                    <p className="text-[14px] text-ink-muted-48 mt-3">当日暂无赛事安排</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <span className="material-symbols-outlined text-[48px] text-ink-muted-48/50">calendar_month</span>
                <p className="text-[14px] text-ink-muted-48 mt-3">点击日历中的日期<br />查看当天赛事</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Upcoming competitions list */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="glass p-xl"
      >
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-[21px] font-semibold tracking-tight">近期赛事</h2>
          <span className="text-[13px] text-ink-muted-48">本月所有赛事一览</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (() => {
          const monthComps = competitions.filter((c) => {
            const start = parseDate(c.startTime);
            const end = parseDate(c.endTime);
            const inMonth = (d: Date | null) => d && d.getFullYear() === year && d.getMonth() + 1 === month;
            return inMonth(start) || inMonth(end);
          }).sort((a, b) => {
            const da = parseDate(a.endTime) ?? parseDate(a.startTime);
            const db = parseDate(b.endTime) ?? parseDate(b.startTime);
            return (da?.getTime() ?? 0) - (db?.getTime() ?? 0);
          });

          return monthComps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
              {monthComps.map((c, i) => {
                const s = getLevelStyle(c.level);
                const end = parseDate(c.endTime);
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className="flex items-center gap-3 p-4 rounded-lg border border-hairline hover:shadow-sm transition"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-ink truncate">{c.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-ink-muted-48">{c.level}</span>
                        {end && (
                          <span className="text-[11px] text-ink-muted-48">
                            {end.getMonth() + 1}/{end.getDate()} 截止
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-[40px] text-ink-muted-48">emoji_events</span>
              <p className="text-[14px] text-ink-muted-48 mt-3">本月暂无赛事</p>
            </div>
          );
        })()}
      </motion.section>
      </>
      )}
    </div>
  );
}
