import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  /** Renders as a circle */
  circle?: boolean;
  /** Number of lines to render (for text blocks) */
  lines?: number;
  /** Whether to show the shimmer animation */
  animate?: boolean;
}

/**
 * Skeleton placeholder for loading states.
 * Uses a shimmer animation over a muted background.
 */
export default function Skeleton({
  className = '',
  circle = false,
  lines,
  animate = true,
}: SkeletonProps) {
  const baseClass = `bg-surface-tile-2 ${circle ? 'rounded-full' : 'rounded-sm'} ${className}`;

  if (lines && lines > 1) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }, (_, i) => (
          <motion.div
            key={i}
            className={`${baseClass} ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
            style={{ height: '14px' }}
            {...(animate ? shimmerProps : {})}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={baseClass}
      {...(animate ? shimmerProps : {})}
    />
  );
}

const shimmerProps = {
  animate: {
    opacity: [0.5, 1, 0.5],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

// ── Composite skeleton layouts ──

/** Card skeleton for competition/registration list items */
export function CardSkeleton() {
  return (
    <div className="app-panel p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11" circle />
        <div className="flex-1">
          <Skeleton className="h-4 w-2/3 mb-2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton lines={2} className="h-3" />
      <div className="flex gap-2 pt-2 border-t border-hairline">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </div>
    </div>
  );
}

/** Stat tile skeleton */
export function StatSkeleton() {
  return (
    <div className="stat-tile p-4 flex flex-col justify-between">
      <Skeleton className="h-3 w-16 mb-3" />
      <Skeleton className="h-7 w-12" />
      <Skeleton className="h-3 w-20 mt-2" />
    </div>
  );
}

/** Table row skeleton */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-hairline">
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === 0 ? 'w-1/4' : i === columns - 1 ? 'w-16' : 'w-1/6'}`}
        />
      ))}
    </div>
  );
}

/** Page-level loading skeleton with header + content */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
