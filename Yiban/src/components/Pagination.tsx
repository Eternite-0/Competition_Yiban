import { useMemo } from 'react';

interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export default function Pagination({ current, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const result: (number | '...')[] = [];
    result.push(1);
    if (current > 3) result.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);
    for (let i = start; i <= end; i++) result.push(i);
    if (current < totalPages - 2) result.push('...');
    result.push(totalPages);
    return result;
  }, [current, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <button
        type="button"
        className="icon-button !h-8 !w-8 disabled:opacity-40"
        disabled={current <= 1}
        onClick={() => onChange(Math.max(1, current - 1))}
        aria-label="上一页"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
      </button>

      <span className="hidden items-center gap-1 sm:flex">
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1 text-placeholder">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-footnote tabular-nums transition-colors ${
                p === current
                  ? 'bg-primary font-medium text-on-primary'
                  : 'text-body-muted hover:bg-primary-soft hover:text-primary'
              }`}
            >
              {p}
            </button>
          )
        )}
      </span>

      <span className="px-2 text-footnote tabular-nums text-body-muted sm:hidden">
        {current} / {totalPages}
      </span>

      <button
        type="button"
        className="icon-button !h-8 !w-8 disabled:opacity-40"
        disabled={current >= totalPages}
        onClick={() => onChange(Math.min(totalPages, current + 1))}
        aria-label="下一页"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>
    </div>
  );
}
