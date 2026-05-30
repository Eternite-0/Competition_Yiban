import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';

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
      const { default: apiClient } = await import('../../api/client');
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
    if (!window.confirm('确定删除该专业？')) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/admin/majors/${id}`);
      toast.success('删除成功');
      fetchMajors();
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="p-xl">
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h1 className="text-[24px] font-semibold text-ink">专业管理</h1>
          <p className="text-[13px] text-ink-muted-48 mt-1">管理各学院的专业信息</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="h-[40px] px-4 rounded-pill bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-focus transition flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          新增专业
        </button>
      </div>

      {/* 筛选 */}
      <div className="glass p-md mb-lg">
        <div className="flex items-center gap-3">
          <select
            className="input-glass h-[40px] px-3 text-[13px] w-[200px]"
            value={filterCollege}
            onChange={(e) => setFilterCollege(e.target.value)}
          >
            <option value="">全部学院</option>
            {colleges.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-[13px] text-ink-muted-48">
            共 {majors.length} 个专业
          </span>
        </div>
      </div>

      {/* 表格 */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-xxl">
            <span className="material-symbols-outlined animate-spin text-[24px] text-primary">progress_activity</span>
          </div>
        ) : majors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-xxl text-ink-muted-48">
            <span className="material-symbols-outlined text-[48px] mb-2">school</span>
            <p className="text-[14px]">暂无专业数据</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">ID</th>
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">专业名称</th>
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">所属学院</th>
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">状态</th>
                <th className="text-right px-md py-3 text-[12px] font-medium text-ink-muted-48">操作</th>
              </tr>
            </thead>
            <tbody>
              {majors.map((major) => (
                <motion.tr
                  key={major.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-hairline last:border-0 hover:bg-primary/5 transition"
                >
                  <td className="px-md py-3 text-[13px] text-ink">{major.id}</td>
                  <td className="px-md py-3 text-[13px] text-ink font-medium">{major.name}</td>
                  <td className="px-md py-3 text-[13px] text-ink">{major.college}</td>
                  <td className="px-md py-3">
                    <span className={`chip ${major.status === 'active' ? 'chip-primary' : 'chip-warning'}`}>
                      {major.status === 'active' ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-md py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(major)}
                        className="h-[32px] px-3 rounded-lg text-[12px] text-primary hover:bg-primary/10 transition"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleToggleStatus(major)}
                        className="h-[32px] px-3 rounded-lg text-[12px] text-yellow-600 hover:bg-yellow-50 transition"
                      >
                        {major.status === 'active' ? '停用' : '启用'}
                      </button>
                      <button
                        onClick={() => handleDelete(major.id)}
                        className="h-[32px] px-3 rounded-lg text-[12px] text-red-500 hover:bg-red-50 transition"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong w-full max-w-[400px] mx-4 p-xl rounded-2xl"
          >
            <h3 className="text-[18px] font-semibold text-ink mb-lg">
              {editingId ? '编辑专业' : '新增专业'}
            </h3>
            <div className="flex flex-col gap-3">
              <input
                className="input-glass h-[44px] px-4 text-[14px]"
                placeholder="专业名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <select
                className="input-glass h-[44px] px-4 text-[14px]"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              >
                <option value="">请选择学院</option>
                {colleges.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 mt-lg">
              <button
                onClick={() => setShowModal(false)}
                className="h-[40px] px-4 rounded-pill text-[13px] text-ink hover:bg-primary/10 transition"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="h-[40px] px-6 rounded-pill bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-focus transition"
              >
                保存
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
