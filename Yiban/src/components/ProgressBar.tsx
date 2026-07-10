/**
 * 统一进度条 — 参考 iOS/现代 UI：
 * 浅蓝轨道 + 亮蓝填充胶囊 + 分段圆点 + 末端白环拇指
 */
import type { CSSProperties } from 'react';

type ProgressBarSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<ProgressBarSize, { track: number; thumb: number; dot: number }> = {
  sm: { track: 8, thumb: 12, dot: 4 },
  md: { track: 12, thumb: 16, dot: 5 },
  lg: { track: 16, thumb: 20, dot: 6 },
};

export type ProgressBarProps = {
  /** 0–100 */
  value: number;
  /** 分段节点数量（含起止），默认 5 */
  segments?: number;
  size?: ProgressBarSize;
  /** 是否显示末端白色拇指圆 */
  showThumb?: boolean;
  /** 是否显示百分比文字 */
  showLabel?: boolean;
  className?: string;
  trackClassName?: string;
  /** 无动画（列表大量渲染时） */
  instant?: boolean;
};

export default function ProgressBar({
  value,
  segments = 5,
  size = 'md',
  showThumb = true,
  showLabel = false,
  className = '',
  trackClassName = '',
  instant = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const dims = sizeMap[size];
  const count = Math.max(2, Math.min(12, segments));
  const dots = Array.from({ length: count }, (_, i) => (i / (count - 1)) * 100);

  return (
    <div className={`flex items-center gap-2.5 ${className}`.trim()}>
      <div
        className={`progress-track relative w-full flex-1 ${trackClassName}`.trim()}
        style={
          {
            height: dims.track,
            '--progress-pct': `${pct}%`,
          } as CSSProperties
        }
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* 填充 */}
        <div
          className={`progress-fill absolute left-0 top-0 h-full ${instant ? '' : 'progress-fill-animate'}`}
          style={{ width: `${pct}%` }}
        />

        {/* 分段节点 */}
        <div className="pointer-events-none absolute inset-0 z-[1]">
          {dots.map((pos) => {
            const reached = pos <= pct + 0.01;
            return (
              <span
                key={pos}
                className={`progress-dot absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  reached ? 'progress-dot-on' : 'progress-dot-off'
                }`}
                style={{
                  left: `${pos}%`,
                  width: dims.dot,
                  height: dims.dot,
                }}
              />
            );
          })}
        </div>

        {/* 末端拇指 */}
        {showThumb && pct > 0 && (
          <span
            className="progress-thumb absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${pct}%`,
              width: dims.thumb,
              height: dims.thumb,
            }}
          />
        )}
      </div>

      {showLabel ? (
        <span className="shrink-0 tabular-nums text-[12.5px] font-semibold text-primary">
          {Math.round(pct)}%
        </span>
      ) : null}
    </div>
  );
}

/** 阶段步进条：按已完成阶段数展示（用于时间线上方的总览） */
export function StageProgressBar({
  stages,
  className = '',
  size = 'md',
}: {
  stages: Array<{ status?: string }>;
  className?: string;
  size?: ProgressBarSize;
}) {
  const total = Math.max(1, stages.length);
  const score = stages.reduce((sum, s) => {
    const st = s.status;
    if (st === 'passed') return sum + 1;
    if (st === 'submitted' || st === 'in_progress') return sum + 0.5;
    if (st === 'failed') return sum + 0.35;
    return sum;
  }, 0);
  const value = Math.min(100, Math.round((score / total) * 100));
  return (
    <ProgressBar
      value={value}
      segments={Math.min(8, Math.max(2, total))}
      size={size}
      showThumb
      showLabel
      className={className}
    />
  );
}
