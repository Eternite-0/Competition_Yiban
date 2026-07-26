import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';

interface RosterRecord {
  id: number;
  studentNo: string;
  realName: string;
  college: string;
  majorId: number;
  majorName: string;
  classId: number;
  className: string;
  grade: string;
  status: string;
  createTime: string;
}

interface Major {
  id: number;
  name: string;
  college: string;
}

interface ClassInfo {
  id: number;
  name: string;
  majorId: number;
}

interface RosterStats {
  total: number;
  registered: number;
  pending: number;
}

export default function StudentRosterManagement() {
  const [records, setRecords] = useState<RosterRecord[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [stats, setStats] = useState<RosterStats>({ total: 0, registered: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    studentNo: '', realName: '', college: '', majorId: '', classId: '', grade: ''
  });
  const [filters, setFilters] = useState({ keyword: '', college: '', majorId: '', grade: '', status: '' });
  const [pagination, setPagination] = useState({ current: 1, size: 10, total: 0 });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [colleges, setColleges] = useState<string[]>([]);
  const { isOpen, title, message, variant, confirm, close } = useConfirmModal();

  const grades = ['2022', '2023', '2024', '2025'];

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        current: pagination.current,
        size: pagination.size,
      };
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.college) params.college = filters.college;
      if (filters.majorId) params.majorId = filters.majorId;
      if (filters.grade) params.grade = filters.grade;
      if (filters.status) params.status = filters.status;
      const res: any = await apiClient.get('/admin/roster', { params });
      setRecords(res.records || []);
      setPagination((prev) => ({ ...prev, total: res.total || 0 }));
    } catch (err: any) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current, pagination.size]);

  const fetchMajors = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/majors');
      setMajors(res as any);
    } catch (err) { /* ignore */ }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const params: any = {};
      if (filters.college) params.college = filters.college;
      if (filters.majorId) params.majorId = filters.majorId;
      const res = await apiClient.get('/admin/classes', { params });
      setClasses(res as any);
    } catch (err) { /* ignore */ }
  }, [filters.college, filters.majorId]);

  const fetchStats = useCallback(async () => {
    try {
      const res: any = await apiClient.get('/admin/roster/stats');
      setStats(res);
    } catch (err) { /* ignore */ }
  }, []);

  const fetchColleges = useCallback(async () => {
    try {
      const res: any = await apiClient.get('/admin/colleges');
      setColleges(res || []);
    } catch (err) {
      console.error('获取学院列表失败:', err);
      setColleges(['计算机学院', '电子学院', '商学院', '设计学院', '机械学院', '外语学院', '理学院', '文学院']);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
    fetchMajors();
    fetchClasses();
    fetchStats();
    fetchColleges();
  }, [fetchRoster, fetchMajors, fetchClasses, fetchStats, fetchColleges]);

  const filteredMajors = filters.college
    ? majors.filter((m) => m.college === filters.college)
    : majors;

  const formMajors = formData.college
    ? majors.filter((m) => m.college === formData.college)
    : majors;

  const formClasses = formData.majorId
    ? classes.filter((c) => String(c.majorId) === formData.majorId)
    : classes;

  const handleOpenModal = (record?: RosterRecord) => {
    if (record) {
      setEditingId(record.id);
      setFormData({
        studentNo: record.studentNo,
        realName: record.realName,
        college: record.college,
        majorId: String(record.majorId || ''),
        classId: String(record.classId || ''),
        grade: record.grade,
      });
    } else {
      setEditingId(null);
      setFormData({ studentNo: '', realName: '', college: '', majorId: '', classId: '', grade: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.studentNo.trim() || !formData.realName.trim() || !formData.college) {
      toast.error('请填写完整信息');
      return;
    }
    try {
      const payload = {
        ...formData,
        majorId: formData.majorId ? Number(formData.majorId) : null,
        classId: formData.classId ? Number(formData.classId) : null,
      };
      if (editingId) {
        await apiClient.put(`/admin/roster/${editingId}`, payload);
        toast.success('更新成功');
      } else {
        await apiClient.post('/admin/roster', payload);
        toast.success('添加成功');
      }
      setShowModal(false);
      fetchRoster();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除记录',
      message: '确定删除该记录？',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/admin/roster/${id}`);
      toast.success('删除成功');
      fetchRoster();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('请选择文件');
      return;
    }
    setImporting(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', importFile);
      const res: any = await apiClient.post('/admin/roster/upload-excel', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res);
      toast.success(`导入完成: 成功${res.success}条`);
      fetchRoster();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="管理端"
        title="花名册管理"
        description="管理学生花名册，支持 Excel 导入"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowImportModal(true); setImportResult(null); setImportFile(null); }}
              className="btn-secondary"
            >
              <span className="material-symbols-outlined">upload_file</span>
              导入 Excel
            </button>
            <button type="button" onClick={() => handleOpenModal()} className="btn-primary">
              <span className="material-symbols-outlined">add</span>
              添加学生
            </button>
          </div>
        }
      />

      <div className="stat-grid">
        {[
          { label: '花名册总数', value: stats.total, icon: 'group', hint: '全部记录' },
          { label: '已注册', value: stats.registered, icon: 'check_circle', hint: '已开通账号' },
          { label: '未注册', value: stats.pending, icon: 'pending', hint: '待学生注册' },
        ].map((m) => (
          <div key={m.label} className="stat-card">
            <div className="stat-card-label">{m.label}</div>
            <div className="stat-card-value">{loading ? '—' : m.value}</div>
            <div className="stat-card-hint">
              <span className="material-symbols-outlined align-middle text-[14px] text-placeholder">{m.icon}</span>
              {' '}{m.hint}
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar" role="search">
        <div className="relative w-full sm:w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-placeholder">
            search
          </span>
          <input
            name="rosterKeyword"
            className="input-glass h-9 pl-9 text-footnote"
            placeholder="搜索学号/姓名"
            aria-label="搜索学号/姓名"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          />
        </div>
        <select
          name="filterCollege"
          className="input-glass h-9 w-full text-footnote sm:w-[140px]"
          value={filters.college}
          aria-label="筛选学院"
          onChange={(e) => setFilters({ ...filters, college: e.target.value, majorId: '' })}
        >
          <option value="">全部学院</option>
          {colleges.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          name="filterMajor"
          className="input-glass h-9 w-full text-footnote sm:w-[140px]"
          value={filters.majorId}
          aria-label="筛选专业"
          onChange={(e) => setFilters({ ...filters, majorId: e.target.value })}
        >
          <option value="">全部专业</option>
          {filteredMajors.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select
          name="filterGrade"
          className="input-glass h-9 w-full text-footnote sm:w-[100px]"
          value={filters.grade}
          aria-label="筛选年级"
          onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
        >
          <option value="">全部</option>
          {grades.map((g) => (
            <option key={g} value={g}>{g}级</option>
          ))}
        </select>
        <select
          name="filterStatus"
          className="input-glass h-9 w-full text-footnote sm:w-[100px]"
          value={filters.status}
          aria-label="筛选状态"
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">全部状态</option>
          <option value="pending">未注册</option>
          <option value="registered">已注册</option>
        </select>
      </div>

      <section className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">花名册列表</h2>
          <span className="chip tabular-nums">{pagination.total} 条</span>
        </div>
        {loading ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined">group</span>
            <p className="text-footnote">暂无花名册数据</p>
          </div>
        ) : (
          <>
            <div className="data-table-wrap !rounded-none !border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>学号</th>
                    <th>姓名</th>
                    <th>学院</th>
                    <th>专业</th>
                    <th>班级</th>
                    <th>年级</th>
                    <th>状态</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono">{r.studentNo}</td>
                      <td className="font-medium">{r.realName}</td>
                      <td>{r.college}</td>
                      <td>{r.majorName || '—'}</td>
                      <td>{r.className || '—'}</td>
                      <td>{r.grade}级</td>
                      <td>
                        <span className={`chip ${r.status === 'registered' ? 'chip-primary' : 'chip-warning'}`}>
                          {r.status === 'registered' ? '已注册' : '未注册'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => handleOpenModal(r)} className="btn-utility !h-8 !px-3 !text-caption">
                            编辑
                          </button>
                          <button type="button" onClick={() => handleDelete(r.id)} className="btn-danger !h-8 !px-3 !text-caption">
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
              <span className="text-caption text-placeholder">
                共 {pagination.total} 条记录
              </span>
              <Pagination
                current={pagination.current}
                total={pagination.total}
                pageSize={pagination.size}
                onChange={(p) => setPagination((prev) => ({ ...prev, current: p }))}
              />
            </div>
          </>
        )}
      </section>

      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="roster-modal-title"
          >
            <div className="section-card mx-4 w-full max-w-[480px]">
              <div className="section-card-header">
                <h3 id="roster-modal-title" className="section-card-title">
                  {editingId ? '编辑记录' : '添加学生'}
                </h3>
              </div>
              <div className="section-card-body flex flex-col gap-3">
                <input
                  className="input-glass"
                  placeholder="学号"
                  value={formData.studentNo}
                  onChange={(e) => setFormData({ ...formData, studentNo: e.target.value })}
                  disabled={!!editingId}
                />
                <input
                  className="input-glass"
                  placeholder="姓名"
                  value={formData.realName}
                  onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
                />
                <select
                  className="input-glass"
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value, majorId: '', classId: '' })}
                >
                  <option value="">请选择学院</option>
                  {colleges.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  className="input-glass"
                  value={formData.majorId}
                  onChange={(e) => setFormData({ ...formData, majorId: e.target.value, classId: '' })}
                >
                  <option value="">请选择专业</option>
                  {formMajors.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <select
                  className="input-glass"
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">请选择班级</option>
                  {formClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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

      <AnimatePresence>
        {showImportModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-modal-title"
          >
            <div className="section-card mx-4 w-full max-w-[500px]">
              <div className="section-card-header">
                <h3 id="import-modal-title" className="section-card-title">导入花名册</h3>
              </div>
              <div className="section-card-body">
                <div className="mb-4 rounded-md border border-border bg-surface-tile-1 p-4 text-footnote">
                  <div className="mb-2 font-medium text-primary">Excel 格式要求</div>
                  <ul className="list-disc space-y-1 pl-4 text-body-muted">
                    <li>第一行为表头，从第二行开始为数据</li>
                    <li>列顺序：学号、姓名、学院、专业、班级、年级</li>
                    <li>专业和班级如不存在会自动创建</li>
                    <li>重复学号会自动跳过</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="text-footnote text-body-muted"
                  />
                </div>

                {importResult && (
                  <div className="mb-4 rounded-md border border-border bg-surface-tile-1 p-4 text-footnote">
                    <div className="mb-2 font-medium text-ink">导入结果</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>成功: <span className="font-semibold text-success">{importResult.success}</span></div>
                      <div>跳过: <span className="font-semibold text-warning">{importResult.skipped}</span></div>
                      <div>失败: <span className="font-semibold text-error">{importResult.failed}</span></div>
                    </div>
                    {importResult.errors?.length > 0 && (
                      <div className="mt-2 text-error">
                        {importResult.errors.slice(0, 5).map((e: string, i: number) => (
                          <div key={i}>{e}</div>
                        ))}
                        {importResult.errors.length > 5 && <div>...共 {importResult.errors.length} 条错误</div>}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setShowImportModal(false)} className="btn-secondary">
                    关闭
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="btn-primary disabled:opacity-50"
                  >
                    {importing && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                    {importing ? '导入中...' : '开始导入'}
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
