import { useMemo } from 'react';

interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

/**
 * GitHub-style pagination with ellipsis window.
 * On mobile (< sm), only prev/next buttons are shown for touch-friendliness.
 */
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
    <div className="flex items-center justify-center gap-1 pt-md">
      {/* Prev */}
      <button
        className="icon-button !h-9 !w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 disabled:opacity-40"
        disabled={current <= 1}
        onClick={() => onChange(Math.max(1, current - 1))}
      >
        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
      </button>

      {/* Page numbers (hidden on mobile) */}
      <span className="hidden sm:flex items-center gap-1">
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1 text-ink-muted-48">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`grid h-9 w-9 place-items-center rounded-full text-[14px] tabular-nums transition ${
                p === current
                  ? 'bg-primary font-semibold text-on-primary'
                  : 'text-ink hover:bg-primary/[0.06]'
              }`}
            >
              {p}
            </button>
          )
        )}
      </span>

      {/* Mobile: current / total indicator */}
      <span className="sm:hidden px-2 text-[13px] text-ink tabular-nums">
        {current} / {totalPages}
      </span>

      {/* Next */}
      <button
        className="icon-button !h-9 !w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 disabled:opacity-40"
        disabled={current >= totalPages}
        onClick={() => onChange(Math.min(totalPages, current + 1))}
      >
        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>
    </div>
  );
}
