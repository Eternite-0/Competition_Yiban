import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  /** Size of the spinner in pixels */
  size?: number;
  /** Loading message to display */
  message?: string;
  /** Whether to center in parent */
  centered?: boolean;
  /** Full page loading mode */
  fullPage?: boolean;
}

/**
 * Reusable loading spinner with optional message.
 * Uses the material design progress_activity icon with spin animation.
 */
export default function LoadingSpinner({
  size = 32,
  message = '加载中…',
  centered = true,
  fullPage = false,
}: LoadingSpinnerProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center gap-3"
    >
      <span
        className="material-symbols-outlined animate-spin text-primary"
        style={{ fontSize: `${size}px` }}
      >
        progress_activity
      </span>
      {message && (
        <span className="text-[14px] text-ink-muted-48">{message}</span>
      )}
    </motion.div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas-parchment/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  if (centered) {
    return (
      <div className="flex flex-col items-center justify-center py-section">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Inline loading dot indicator for buttons and small spaces.
 */
export function InlineLoader({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-current"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-current"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-current"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
      />
    </span>
  );
}

/**
 * Progress bar for determinate loading — 使用全局统一样式。
 */
export { default as ProgressBar } from './ProgressBar';
