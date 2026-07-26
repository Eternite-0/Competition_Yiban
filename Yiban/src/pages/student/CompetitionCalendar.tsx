import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import { displayLevel } from '../../lib/levelDisplay';

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
  国家级: { bg: 'bg-badge-national-bg', dot: 'bg-primary', text: 'text-primary-focus', chip: 'chip-national' },
  省级: { bg: 'bg-badge-province-bg', dot: 'bg-badge-province-text', text: 'text-badge-province-text', chip: 'chip-province' },
  校级: { bg: 'bg-badge-school-bg', dot: 'bg-badge-school-text', text: 'text-badge-school-text', chip: 'chip-school' },
};

function getLevelStyle(level: string) {
  const label = displayLevel(level);
  return levelColor[label] ?? { bg: 'bg-surface-chip', dot: 'bg-placeholder', text: 'text-body-muted', chip: 'chip' };
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

  return (
    <div className="page-stack">
      <PageHero
        eyebrow="发现活动"
        title="赛事日历"
        description="按日期查看关键节点。点选日期，右侧会列出当天赛事。"
      />

      {error ? (
        <p className="py-8 text-footnote text-placeholder">
          加载失败，
          <button type="button" className="text-primary hover:underline" onClick={load}>重试</button>
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.75fr)]">
            <div className="calendar-flat" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <div className="calendar-flat-head">
                <h2 className="text-subhead font-semibold text-ink">
                  {year} 年 {month} 月
                </h2>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={goPrev} className="icon-button !h-8 !w-8" aria-label="上一月">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); setSelectedDay(null); }}
                    className="btn-utility !h-8 !px-3 !text-caption"
                  >
                    今天
                  </button>
                  <button type="button" onClick={goNext} className="icon-button !h-8 !w-8" aria-label="下一月">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
              <div className="calendar-flat-grid">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="calendar-flat-dow">{d}</div>
                ))}
                {cells.map((c) => {
                  const events = dayMap[c.key] ?? [];
                  const isToday = c.key === todayKey;
                  const isSelected = c.key === selectedDay;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSelectedDay(isSelected ? null : c.key)}
                      className={`calendar-flat-cell ${!c.current ? 'is-muted' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                    >
                      <div className={`text-footnote tabular-nums ${isToday ? 'font-semibold text-primary' : ''}`}>
                        {c.day}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {events.slice(0, 2).map((ev) => (
                          <div key={ev.id} className="truncate text-caption-2 leading-tight text-body-subtle">
                            {ev.name}
                          </div>
                        ))}
                        {events.length > 2 ? (
                          <div className="text-caption-2 text-placeholder">+{events.length - 2}</div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <section className="page-section">
              <div className="page-section-head">
                <h2 className="page-section-title">
                  {selectedDay
                    ? `${parseInt(selectedDay.split('-')[1], 10)} 月 ${parseInt(selectedDay.split('-')[2], 10)} 日`
                    : '当日安排'}
                </h2>
              </div>
              {!selectedDay ? (
                <p className="py-6 text-footnote text-placeholder">点击左侧日期查看安排</p>
              ) : selectedCompetitions.length === 0 ? (
                <p className="py-6 text-footnote text-placeholder">当日暂无赛事</p>
              ) : (
                <div className="flat-list">
                  {selectedCompetitions.map((c) => {
                    const s = getLevelStyle(c.level);
                    return (
                      <div key={c.id} className="flat-row items-start">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-subhead font-medium text-ink">{c.name}</div>
                          <div className="mt-1 text-caption text-placeholder">
                            {displayLevel(c.level)} · {c.category || '未分类'}
                            {c.endTime ? ` · 截止 ${String(c.endTime).slice(0, 10)}` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <section className="page-section">
            <div className="page-section-head">
              <h2 className="page-section-title">本月赛事</h2>
              <span className="page-section-extra">{monthComps.length} 项</span>
            </div>
            {loading ? (
              <p className="py-6 text-footnote text-placeholder">加载中…</p>
            ) : monthComps.length === 0 ? (
              <p className="py-6 text-footnote text-placeholder">本月暂无赛事</p>
            ) : (
              <div className="flat-list">
                {monthComps.map((c) => {
                  const end = parseDate(c.endTime);
                  return (
                    <div key={c.id} className="flat-row">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-subhead font-medium text-ink">{c.name}</div>
                        <div className="mt-0.5 text-caption text-placeholder">
                          {displayLevel(c.level)}
                          {end ? ` · ${end.getMonth() + 1}/${end.getDate()} 截止` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
