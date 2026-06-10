import { motion } from 'framer-motion';
import { pageTransition } from '../lib/motion';

type ErrorVariant = 'network' | 'not-found' | 'permission' | 'server' | 'generic';

interface ErrorStateProps {
  /** Error variant determines icon and default message */
  variant?: ErrorVariant;
  /** Custom error message */
  message?: string;
  /** Custom error title */
  title?: string;
  /** Retry callback - shows retry button if provided */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const VARIANT_CONFIG: Record<ErrorVariant, { icon: string; title: string; message: string }> = {
  network: {
    icon: 'wifi_off',
    title: '网络连接失败',
    message: '请检查网络连接后重试',
  },
  'not-found': {
    icon: 'search_off',
    title: '未找到内容',
    message: '请求的资源不存在或已被删除',
  },
  permission: {
    icon: 'lock',
    title: '无访问权限',
    message: '您没有权限访问此内容',
  },
  server: {
    icon: 'cloud_off',
    title: '服务器异常',
    message: '服务暂时不可用，请稍后重试',
  },
  generic: {
    icon: 'error_outline',
    title: '加载失败',
    message: '加载数据时出现问题，请稍后重试',
  },
};

/**
 * Unified error state display component.
 * Shows an icon, title, message, and optional retry button.
 */
export default function ErrorState({
  variant = 'generic',
  message,
  title,
  onRetry,
  className = '',
}: ErrorStateProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
      className={`flex w-full min-w-0 flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      <span className="material-symbols-outlined text-[48px] text-ink-muted-48 mb-4">
        {config.icon}
      </span>
      <h3 className="empty-state-copy text-[16px] font-medium text-ink mb-1">
        {title || config.title}
      </h3>
      <p className="empty-state-copy text-[14px] text-body-subtle mb-6">
        {message || config.message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          重新加载
        </button>
      )}
    </motion.div>
  );
}

/**
 * Compact inline error display for smaller spaces.
 */
export function InlineError({
  message,
  onRetry,
  className = '',
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-3 rounded-md border border-danger-border bg-danger-bg px-4 py-3 ${className}`}
    >
      <span className="material-symbols-outlined text-[18px] text-error shrink-0">
        error_outline
      </span>
      <span className="text-[13px] text-ink flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-[13px] text-primary font-medium hover:underline shrink-0"
        >
          重试
        </button>
      )}
    </motion.div>
  );
}

/**
 * Parse API error into a user-friendly message.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes('network') || msg.includes('fetch') || msg.includes('连接')) {
      return '网络连接异常，请检查网络后重试';
    }
    if (msg.includes('timeout') || msg.includes('超时')) {
      return '请求超时，请稍后重试';
    }
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('登录')) {
      return '登录已过期，请重新登录';
    }
    if (msg.includes('403') || msg.includes('forbidden') || msg.includes('权限')) {
      return '您没有权限执行此操作';
    }
    if (msg.includes('404') || msg.includes('not found')) {
      return '请求的内容不存在';
    }
    if (msg.includes('500') || msg.includes('server') || msg.includes('服务器')) {
      return '服务器暂时异常，请稍后重试';
    }

    // Return original message if it's already user-friendly (Chinese)
    if (/[一-鿿]/.test(error.message)) {
      return error.message;
    }
  }

  return '操作失败，请稍后重试';
}

/**
 * Error variant for API response error codes.
 */
export function variantFromStatus(status: number): ErrorVariant {
  if (status >= 500) return 'server';
  if (status === 404) return 'not-found';
  if (status === 401 || status === 403) return 'permission';
  return 'generic';
}
