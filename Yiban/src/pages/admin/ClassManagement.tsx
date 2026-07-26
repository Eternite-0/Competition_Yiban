import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
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
      await apiClient.delete(`/admin/classes/${id}`);
      toast.success('删除成功');
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="管理端"
        title="班级管理"
        description="管理各专业的班级信息"
        actions={
          <button type="button" onClick={() => handleOpenModal()} className="btn-primary">
            <span className="material-symbols-outlined">add</span>
            新增班级
          </button>
        }
      />

      <div className="filter-bar" role="search">
        <select
          name="filterCollege"
          className="input-glass h-9 w-full text-footnote sm:w-[160px]"
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
          className="input-glass h-9 w-full text-footnote sm:w-[160px]"
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
          className="input-glass h-9 w-full text-footnote sm:w-[120px]"
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
        <span className="chip tabular-nums">共 {classes.length} 个班级</span>
      </div>

      <section className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">班级列表</h2>
        </div>
        {loading ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined">class</span>
            <p className="text-footnote">暂无班级数据</p>
          </div>
        ) : (
          <div className="data-table-wrap !rounded-none !border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>班级名称</th>
                  <th>所属专业</th>
                  <th>学院</th>
                  <th>年级</th>
                  <th>状态</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id}>
                    <td className="font-medium">{cls.name}</td>
                    <td>{cls.majorName}</td>
                    <td>{cls.college}</td>
                    <td>{cls.grade}级</td>
                    <td>
                      <span className={`chip ${cls.status === 'active' ? 'chip-primary' : 'chip-warning'}`}>
                        {cls.status === 'active' ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => handleOpenModal(cls)} className="btn-utility !h-8 !px-3 !text-caption">
                          编辑
                        </button>
                        <button type="button" onClick={() => handleToggleStatus(cls)} className="btn-secondary !h-8 !px-3 !text-caption">
                          {cls.status === 'active' ? '停用' : '启用'}
                        </button>
                        <button type="button" onClick={() => handleDelete(cls.id)} className="btn-danger !h-8 !px-3 !text-caption">
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
            aria-labelledby="class-modal-title"
          >
            <div className="section-card mx-4 w-full max-w-[400px]">
              <div className="section-card-header">
                <h3 id="class-modal-title" className="section-card-title">
                  {editingId ? '编辑班级' : '新增班级'}
                </h3>
              </div>
              <div className="section-card-body flex flex-col gap-3">
                <select
                  className="input-glass"
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value, majorId: '' })}
                >
                  <option value="">请选择学院</option>
                  {colleges.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  className="input-glass"
                  value={formData.majorId}
                  onChange={(e) => setFormData({ ...formData, majorId: e.target.value })}
                >
                  <option value="">请选择专业</option>
                  {formMajors.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <select
                  className="input-glass"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                >
                  <option value="">请选择年级</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>{g}级</option>
                  ))}
                </select>
                <input
                  className="input-glass"
                  placeholder="班级名称（如：软工2301）"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
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
