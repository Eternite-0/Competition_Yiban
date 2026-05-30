import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';

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
    if (!window.confirm('确定通过该教师的注册申请？')) return;
    try {
      const { default: apiClient } = await import('../../api/client');
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
      const { default: apiClient } = await import('../../api/client');
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
    <div className="p-xl">
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h1 className="text-[24px] font-semibold text-ink">注册审核</h1>
          <p className="text-[13px] text-ink-muted-48 mt-1">审核教师注册申请</p>
        </div>
        <div className="glass px-4 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-yellow-500">pending_actions</span>
          <span className="text-[14px] font-medium text-ink">待审核: {teachers.length}</span>
        </div>
      </div>

      {/* 列表 */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-xxl">
            <span className="material-symbols-outlined animate-spin text-[24px] text-primary">progress_activity</span>
          </div>
        ) : teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-xxl text-ink-muted-48">
            <span className="material-symbols-outlined text-[48px] mb-2">check_circle</span>
            <p className="text-[14px]">暂无待审核的注册申请</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">工号</th>
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">姓名</th>
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">学院</th>
                <th className="text-right px-md py-3 text-[12px] font-medium text-ink-muted-48">操作</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-hairline last:border-0 hover:bg-primary/5 transition"
                >
                  <td className="px-md py-3 text-[13px] text-ink font-mono">{t.username}</td>
                  <td className="px-md py-3 text-[13px] text-ink font-medium">{t.realName}</td>
                  <td className="px-md py-3 text-[13px] text-ink">{t.college}</td>
                  <td className="px-md py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleApprove(t.id)}
                        className="h-[36px] px-4 rounded-pill bg-green-500 text-white text-[13px] font-medium hover:bg-green-600 transition flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        通过
                      </button>
                      <button
                        onClick={() => handleOpenReject(t.id)}
                        className="h-[36px] px-4 rounded-pill bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 transition flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        驳回
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 驳回弹窗 */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong w-full max-w-[400px] mx-4 p-xl rounded-2xl"
          >
            <h3 className="text-[18px] font-semibold text-ink mb-lg">驳回注册申请</h3>
            <div className="mb-4">
              <label className="text-[13px] text-ink-muted-48 mb-2 block">驳回原因（选填）</label>
              <textarea
                className="input-glass w-full h-[120px] px-4 py-3 text-[14px] resize-none"
                placeholder="请输入驳回原因，将通知给申请人"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="h-[40px] px-4 rounded-pill text-[13px] text-ink hover:bg-primary/10 transition"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="h-[40px] px-6 rounded-pill bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 transition"
              >
                确认驳回
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
