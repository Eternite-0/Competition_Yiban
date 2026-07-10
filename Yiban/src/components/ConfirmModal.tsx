import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const icon =
    variant === 'danger' ? 'delete' : variant === 'warning' ? 'warning' : 'info';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-canvas shadow-float"
          >
            <div className="p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface-tile-1 text-body-muted">
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </div>
                <h3 className="text-[15px] font-medium text-ink">{title}</h3>
              </div>
              <p className="text-[13.5px] leading-relaxed text-body-subtle">{message}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="btn-secondary">
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}