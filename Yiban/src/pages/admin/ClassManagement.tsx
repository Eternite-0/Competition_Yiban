import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import { listContainer, listItem } from '../../lib/motion';
import PageHero from '../../components/PageHero';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';

interface ClassInfo {
  id: number;
  name: string;
  college: string;
  majorId: number;
  majorName: string;
  grade: string;
  status: string;
  createTime: string;
}

interface Major {
  id: number;
  name: string;
  college: string;
}

export default function ClassManagement() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', college: '', majorId: '', grade: '' });
  const { isOpen, title, message, variant, confirm, close } = useConfirmModal();
  const [filterCollege, setFilterCollege] = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  const colleges = ['计算机学院', '电子学院', '商学院', '设计学院', '机械学院', '外语学院', '理学院', '文学院'];
  const grades = ['2022', '2023', '2024', '2025'];

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterCollege) params.college = filterCollege;
      if (filterMajor) params.majorId = filterMajor;
      if (filterGrade) params.grade = filterGrade;
      const res = await apiClient.get('/admin/classes', { params });
      setClasses(res as any);
    } catch (err: any) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [filterCollege, filterMajor, filterGrade]);

  const fetchMajors = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/majors');
      setMajors(res as any);
    } catch (err: any) {
      console.error('加载专业失败', err);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchMajors();
  }, [fetchClasses, fetchMajors]);

  const filteredMajors = filterCollege
    ? majors.filter((m) => m.college === filterCollege)
    : majors;

  const formMajors = formData.college
    ? majors.filter((m) => m.college === formData.college)
    : majors;

  const handleOpenModal = (cls?: ClassInfo) => {
    if (cls) {
      setEditingId(cls.id);
      setFormData({
        name: cls.name,
        college: cls.college,
        majorId: String(cls.majorId),
        grade: cls.grade,
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', college: '', majorId: '', grade: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.college || !formData.majorId || !formData.grade) {
      toast.error('请填写完整信息');
      return;
    }
    try {
      const payload = {
        name: formData.name.trim(),
        college: formData.college,
        majorId: Number(formData.majorId),
        grade: formData.grade,
      };
      if (editingId) {
        await apiClient.put(`/admin/classes/${editingId}`, payload);
        toast.success('更新成功');
      } else {
        await apiClient.post('/admin/classes', payload);
        toast.success('添加成功');
      }
      setShowModal(false);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleToggleStatus = async (cls: ClassInfo) => {
    try {
      const newStatus = cls.status === 'active' ? 'inactive' : 'active';
      await apiClient.put(`/admin/classes/${cls.id}`, { status: newStatus });
      toast.success(newStatus === 'active' ? '已启用' : '已停用');
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除班级',
      message: '确定删除该班级？',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/admin/classes/${id}`);
      toast.success('删除成功');
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Administration"
        title="班级管理"
        description="管理各专业的班级信息"
        actions={
          <button
            onClick={() => handleOpenModal()}
            className="h-10 px-4 rounded-pill bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-focus transition flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            新增班级
          </button>
        }
      />

      {/* 筛选 */}
      <div className="glass-tint flex flex-wrap gap-sm items-center px-md py-3" role="search">
        <select
          name="filterCollege"
          className="input-glass h-9 w-full sm:w-[160px] text-[13px]"
          value={filterCollege}
          aria-label="筛选学院"
          onChange={(e) => {
            setFilterCollege(e.target.value);
            setFilterMajor('');
          }}
        >
          <option value="">全部学院</option>
          {colleges.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          name="filterMajor"
          className="input-glass h-9 w-full sm:w-[160px] text-[13px]"
          value={filterMajor}
          aria-label="筛选专业"
          onChange={(e) => setFilterMajor(e.target.value)}
        >
          <option value="">全部专业</option>
          {filteredMajors.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select
          name="filterGrade"
          className="input-glass h-9 w-full sm:w-[120px] text-[13px]"
          value={filterGrade}
          aria-label="筛选年级"
          onChange={(e) => setFilterGrade(e.target.value)}
        >
          <option value="">全部年级</option>
          {grades.map((g) => (
            <option key={g} value={g}>{g}级</option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="text-[13px] text-ink-muted-48">
          共 {classes.length} 个班级
        </span>
      </div>

      {/* 表格 */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-xxl">
            <span className="material-symbols-outlined animate-spin text-[24px] text-primary">progress_activity</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-xxl text-ink-muted-48">
            <span className="material-symbols-outlined text-[48px] mb-2">class</span>
            <p className="text-[14px]">暂无班级数据</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">班级名称</th>
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">所属专业</th>
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">学院</th>
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">年级</th>
                <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">状态</th>
                <th className="text-right px-md py-3 text-[12px] font-medium text-ink-muted-48">操作</th>
              </tr>
            </thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {classes.map((cls) => (
                <motion.tr
                  key={cls.id}
                  variants={listItem}
                  className="border-b border-hairline last:border-0 hover:bg-primary/5 transition"
                >
                  <td className="px-md py-3 text-[13px] text-ink font-medium">{cls.name}</td>
                  <td className="px-md py-3 text-[13px] text-ink">{cls.majorName}</td>
                  <td className="px-md py-3 text-[13px] text-ink">{cls.college}</td>
                  <td className="px-md py-3 text-[13px] text-ink">{cls.grade}级</td>
                  <td className="px-md py-3">
                    <span className={`chip ${cls.status === 'active' ? 'chip-primary' : 'chip-warning'}`}>
                      {cls.status === 'active' ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-md py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(cls)}
                        className="h-9 px-3 rounded-lg text-[12px] text-primary hover:bg-primary/10 transition"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleToggleStatus(cls)}
                        className="h-9 px-3 rounded-lg text-[12px] text-yellow-600 hover:bg-yellow-50 transition"
                      >
                        {cls.status === 'active' ? '停用' : '启用'}
                      </button>
                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="h-9 px-3 rounded-lg text-[12px] text-red-500 hover:bg-red-50 transition"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        )}
        </div>
      </div>

      {/* 弹窗 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong w-full max-w-[400px] mx-4 p-xl rounded-2xl"
            >
            <h3 id="class-modal-title" className="text-[18px] font-semibold text-ink mb-lg">
              {editingId ? '编辑班级' : '新增班级'}
            </h3>
            <div className="flex flex-col gap-3">
              <select
                className="input-glass h-[44px] px-4 text-[14px]"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value, majorId: '' })}
              >
                <option value="">请选择学院</option>
                {colleges.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                className="input-glass h-[44px] px-4 text-[14px]"
                value={formData.majorId}
                onChange={(e) => setFormData({ ...formData, majorId: e.target.value })}
              >
                <option value="">请选择专业</option>
                {formMajors.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select
                className="input-glass h-[44px] px-4 text-[14px]"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              >
                <option value="">请选择年级</option>
                {grades.map((g) => (
                  <option key={g} value={g}>{g}级</option>
                ))}
              </select>
              <input
                className="input-glass h-[44px] px-4 text-[14px]"
                placeholder="班级名称（如：软工2301）"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
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
          </motion.div>
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
