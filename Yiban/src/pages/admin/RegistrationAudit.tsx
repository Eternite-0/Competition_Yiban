import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';

interface PendingTeacher {
  id: number;
  username: string;
  realName: string;
  college: string;
}

export default function RegistrationAudit() {
  const [teachers, setTeachers] = useState<PendingTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { isOpen, title, message, variant, confirm, close } = useConfirmModal();

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/registrations/pending');
      setTeachers(res as any);
    } catch (err: any) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (userId: number) => {
    const confirmed = await confirm({
      title: '审核通过',
      message: '确定通过该教师的注册申请？',
      confirmText: '通过',
      cancelText: '取消',
      variant: 'info',
    });
    if (!confirmed) return;
    try {
      await apiClient.post('/admin/registrations/approve', { userId });
      toast.success('审核通过');
      fetchPending();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleOpenReject = (userId: number) => {
    setRejectingId(userId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    try {
      await apiClient.post('/admin/registrations/reject', {
        userId: rejectingId,
        reason: rejectReason,
      });
      toast.success('已驳回');
      setShowRejectModal(false);
      fetchPending();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="管理端"
        title="注册审核"
        description="审核教师注册申请"
        actions={
          <span className="chip chip-warning">
            <span className="material-symbols-outlined text-[16px]">pending_actions</span>
            待审核 {teachers.length}
          </span>
        }
      />

      <section className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">待审核教师</h2>
          <span className="chip tabular-nums">{teachers.length} 人</span>
        </div>
        {loading ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          </div>
        ) : teachers.length === 0 ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined">check_circle</span>
            <p className="text-footnote">暂无待审核的注册申请</p>
          </div>
        ) : (
          <div className="data-table-wrap !rounded-none !border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>工号</th>
                  <th>姓名</th>
                  <th>学院</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono">{t.username}</td>
                    <td className="font-medium">{t.realName}</td>
                    <td>{t.college}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => handleApprove(t.id)} className="btn-primary !h-8 !px-3 !text-caption">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          通过
                        </button>
                        <button type="button" onClick={() => handleOpenReject(t.id)} className="btn-danger !h-8 !px-3 !text-caption">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          驳回
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {showRejectModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-modal-title"
          >
            <div className="section-card mx-4 w-full max-w-[400px]">
              <div className="section-card-header">
                <h3 id="reject-modal-title" className="section-card-title">驳回注册申请</h3>
              </div>
              <div className="section-card-body">
                <label className="mb-2 block text-footnote text-body-muted">驳回原因（选填）</label>
                <textarea
                  className="input-glass !h-[120px] resize-none"
                  placeholder="请输入驳回原因，将通知给申请人"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setShowRejectModal(false)} className="btn-secondary">
                    取消
                  </button>
                  <button type="button" onClick={handleReject} className="btn-danger">
                    确认驳回
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={() => {}}
        title={title}
        message={message}
        variant={variant}
      />
    </div>
  );
}
