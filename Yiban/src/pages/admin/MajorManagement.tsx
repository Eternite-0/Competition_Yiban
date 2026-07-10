import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';

interface Major {
  id: number;
  name: string;
  college: string;
  status: string;
  createTime: string;
}

export default function MajorManagement() {
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', college: '' });
  const [filterCollege, setFilterCollege] = useState('');
  const { isOpen, title, message, variant, confirm, close } = useConfirmModal();

  const colleges = ['计算机学院', '电子学院', '商学院', '设计学院', '机械学院', '外语学院', '理学院', '文学院'];

  const fetchMajors = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterCollege) params.college = filterCollege;
      const res = await apiClient.get('/admin/majors', { params });
      setMajors(res as any);
    } catch (err: any) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [filterCollege]);

  useEffect(() => {
    fetchMajors();
  }, [fetchMajors]);

  const handleOpenModal = (major?: Major) => {
    if (major) {
      setEditingId(major.id);
      setFormData({ name: major.name, college: major.college });
    } else {
      setEditingId(null);
      setFormData({ name: '', college: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.college) {
      toast.error('请填写完整信息');
      return;
    }
    try {
      if (editingId) {
        await apiClient.put(`/admin/majors/${editingId}`, formData);
        toast.success('更新成功');
      } else {
        await apiClient.post('/admin/majors', formData);
        toast.success('添加成功');
      }
      setShowModal(false);
      fetchMajors();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleToggleStatus = async (major: Major) => {
    try {
      const newStatus = major.status === 'active' ? 'inactive' : 'active';
      await apiClient.put(`/admin/majors/${major.id}`, { status: newStatus });
      toast.success(newStatus === 'active' ? '已启用' : '已停用');
      fetchMajors();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除专业',
      message: '确定删除该专业？',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/admin/majors/${id}`);
      toast.success('删除成功');
      fetchMajors();
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="管理端"
        title="专业管理"
        description="管理各学院的专业信息"
        actions={
          <button type="button" onClick={() => handleOpenModal()} className="btn-primary">
            <span className="material-symbols-outlined">add</span>
            新增专业
          </button>
        }
      />

      <div className="filter-bar" role="search">
        <select
          name="filterCollege"
          className="input-glass h-9 w-full text-[13px] sm:w-[200px]"
          value={filterCollege}
          aria-label="筛选学院"
          onChange={(e) => setFilterCollege(e.target.value)}
        >
          <option value="">全部学院</option>
          {colleges.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="chip tabular-nums">共 {majors.length} 个专业</span>
      </div>

      <section className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">专业列表</h2>
        </div>
        {loading ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          </div>
        ) : majors.length === 0 ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined">school</span>
            <p className="text-[13px]">暂无专业数据</p>
          </div>
        ) : (
          <div className="data-table-wrap !rounded-none !border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>专业名称</th>
                  <th>所属学院</th>
                  <th>状态</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {majors.map((major) => (
                  <tr key={major.id}>
                    <td className="tabular-nums">{major.id}</td>
                    <td className="font-medium">{major.name}</td>
                    <td>{major.college}</td>
                    <td>
                      <span className={`chip ${major.status === 'active' ? 'chip-primary' : 'chip-warning'}`}>
                        {major.status === 'active' ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => handleOpenModal(major)} className="btn-utility !h-8 !px-3 !text-[12px]">
                          编辑
                        </button>
                        <button type="button" onClick={() => handleToggleStatus(major)} className="btn-secondary !h-8 !px-3 !text-[12px]">
                          {major.status === 'active' ? '停用' : '启用'}
                        </button>
                        <button type="button" onClick={() => handleDelete(major.id)} className="btn-danger !h-8 !px-3 !text-[12px]">
                          删除
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
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="major-modal-title"
          >
            <div className="section-card mx-4 w-full max-w-[400px]">
              <div className="section-card-header">
                <h3 id="major-modal-title" className="section-card-title">
                  {editingId ? '编辑专业' : '新增专业'}
                </h3>
              </div>
              <div className="section-card-body flex flex-col gap-3">
                <input
                  className="input-glass"
                  placeholder="专业名称"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <select
                  className="input-glass"
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                >
                  <option value="">请选择学院</option>
                  {colleges.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                    取消
                  </button>
                  <button type="button" onClick={handleSave} className="btn-primary">
                    保存
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
