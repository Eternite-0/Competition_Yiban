import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';

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

  const colleges = ['计算机学院', '电子学院', '商学院', '设计学院', '机械学院', '外语学院', '理学院', '文学院'];
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

  useEffect(() => {
    fetchRoster();
    fetchMajors();
    fetchClasses();
    fetchStats();
  }, [fetchRoster, fetchMajors, fetchClasses, fetchStats]);

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
    if (!window.confirm('确定删除该记录？')) return;
    try {
      const { default: apiClient } = await import('../../api/client');
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
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Administration"
        title="花名册管理"
        description="管理学生花名册，支持 Excel 导入"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowImportModal(true); setImportResult(null); setImportFile(null); }}
              className="h-10 px-4 rounded-pill bg-canvas border border-hairline text-[13px] text-ink hover:border-primary/30 transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              导入 Excel
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="h-10 px-4 rounded-pill bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-focus transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              添加学生
            </button>
          </div>
        }
      />

      {/* 统计卡片 */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <div className="stat-tile p-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-ink-muted-80">花名册总数</span>
            <span className="material-symbols-outlined text-[18px] text-primary">group</span>
          </div>
          <span className="font-display font-medium text-[22px] leading-none tabular-nums text-ink">
            {loading ? '—' : stats.total}
          </span>
        </div>
        <div className="stat-tile p-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-ink-muted-80">已注册</span>
            <span className="material-symbols-outlined text-[18px] text-green-600">check_circle</span>
          </div>
          <span className="font-display font-medium text-[22px] leading-none tabular-nums text-green-600">
            {loading ? '—' : stats.registered}
          </span>
        </div>
        <div className="stat-tile p-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-ink-muted-80">未注册</span>
            <span className="material-symbols-outlined text-[18px] text-yellow-600">pending</span>
          </div>
          <span className="font-display font-medium text-[22px] leading-none tabular-nums text-yellow-600">
            {loading ? '—' : stats.pending}
          </span>
        </div>
      </section>

      {/* 筛选 */}
      <div className="glass-tint flex flex-wrap gap-sm items-center px-md py-3" role="search">
        <div className="relative w-full sm:w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">
            search
          </span>
          <input
            name="rosterKeyword"
            className="input-glass h-9 pl-9 text-[13px] !rounded-pill"
            placeholder="搜索学号/姓名"
            aria-label="搜索学号/姓名"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          />
        </div>
        <select
          name="filterCollege"
          className="input-glass h-9 w-full sm:w-[140px] text-[13px]"
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
          className="input-glass h-9 w-full sm:w-[140px] text-[13px]"
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
          className="input-glass h-9 w-full sm:w-[100px] text-[13px]"
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
          className="input-glass h-9 w-full sm:w-[100px] text-[13px]"
          value={filters.status}
          aria-label="筛选状态"
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">全部状态</option>
          <option value="pending">未注册</option>
          <option value="registered">已注册</option>
        </select>
      </div>

      {/* 表格 */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-xxl">
            <span className="material-symbols-outlined animate-spin text-[24px] text-primary">progress_activity</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-xxl text-ink-muted-48">
            <span className="material-symbols-outlined text-[48px] mb-2">group</span>
            <p className="text-[14px]">暂无花名册数据</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">学号</th>
                  <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">姓名</th>
                  <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">学院</th>
                  <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">专业</th>
                  <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">班级</th>
                  <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">年级</th>
                  <th className="text-left px-md py-3 text-[12px] font-medium text-ink-muted-48">状态</th>
                  <th className="text-right px-md py-3 text-[12px] font-medium text-ink-muted-48">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-hairline last:border-0 hover:bg-primary/5 transition"
                  >
                    <td className="px-md py-3 text-[13px] text-ink font-mono">{r.studentNo}</td>
                    <td className="px-md py-3 text-[13px] text-ink font-medium">{r.realName}</td>
                    <td className="px-md py-3 text-[13px] text-ink">{r.college}</td>
                    <td className="px-md py-3 text-[13px] text-ink">{r.majorName || '-'}</td>
                    <td className="px-md py-3 text-[13px] text-ink">{r.className || '-'}</td>
                    <td className="px-md py-3 text-[13px] text-ink">{r.grade}级</td>
                    <td className="px-md py-3">
                      <span className={`chip ${r.status === 'registered' ? 'chip-primary' : 'chip-warning'}`}>
                        {r.status === 'registered' ? '已注册' : '未注册'}
                      </span>
                    </td>
                    <td className="px-md py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(r)}
                          className="h-9 px-3 rounded-lg text-[12px] text-primary hover:bg-primary/10 transition"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="h-9 px-3 rounded-lg text-[12px] text-red-500 hover:bg-red-50 transition"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* 分页 */}
            <div className="flex items-center justify-between px-md py-3 border-t border-hairline">
              <span className="text-[12px] text-ink-muted-48">
                共 {pagination.total} 条记录
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination((p) => ({ ...p, current: Math.max(1, p.current - 1) }))}
                  disabled={pagination.current <= 1}
                  className="h-9 px-3 rounded-lg text-[12px] text-ink hover:bg-primary/10 transition disabled:opacity-30"
                >
                  上一页
                </button>
                <span className="text-[12px] text-ink">
                  {pagination.current} / {Math.ceil(pagination.total / pagination.size)}
                </span>
                <button
                  onClick={() => setPagination((p) => ({ ...p, current: p.current + 1 }))}
                  disabled={pagination.current >= Math.ceil(pagination.total / pagination.size)}
                  className="h-9 px-3 rounded-lg text-[12px] text-ink hover:bg-primary/10 transition disabled:opacity-30"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="roster-modal-title">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong w-full max-w-[480px] mx-4 p-xl rounded-2xl"
          >
            <h3 id="roster-modal-title" className="text-[18px] font-semibold text-ink mb-lg">
              {editingId ? '编辑记录' : '添加学生'}
            </h3>
            <div className="flex flex-col gap-3">
              <input
                className="input-glass h-[44px] px-4 text-[14px]"
                placeholder="学号"
                value={formData.studentNo}
                onChange={(e) => setFormData({ ...formData, studentNo: e.target.value })}
                disabled={!!editingId}
              />
              <input
                className="input-glass h-[44px] px-4 text-[14px]"
                placeholder="姓名"
                value={formData.realName}
                onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
              />
              <select
                className="input-glass h-[44px] px-4 text-[14px]"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value, majorId: '', classId: '' })}
              >
                <option value="">请选择学院</option>
                {colleges.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                className="input-glass h-[44px] px-4 text-[14px]"
                value={formData.majorId}
                onChange={(e) => setFormData({ ...formData, majorId: e.target.value, classId: '' })}
              >
                <option value="">请选择专业</option>
                {formMajors.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select
                className="input-glass h-[44px] px-4 text-[14px]"
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              >
                <option value="">请选择班级</option>
                {formClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
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

      {/* 导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="roster-modal-title">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong w-full max-w-[500px] mx-4 p-xl rounded-2xl"
          >
            <h3 id="roster-modal-title" className="text-[18px] font-semibold text-ink mb-lg">导入花名册</h3>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 text-[13px]">
              <div className="font-medium text-primary mb-2">Excel 格式要求</div>
              <ul className="list-disc pl-4 space-y-1 text-ink-muted-80">
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
                className="text-[13px]"
              />
            </div>

            {importResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-[13px]">
                <div className="font-medium text-green-800 mb-2">导入结果</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>成功: <span className="font-semibold text-green-600">{importResult.success}</span></div>
                  <div>跳过: <span className="font-semibold text-yellow-600">{importResult.skipped}</span></div>
                  <div>失败: <span className="font-semibold text-red-500">{importResult.failed}</span></div>
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="mt-2 text-red-500">
                    {importResult.errors.slice(0, 5).map((e: string, i: number) => (
                      <div key={i}>{e}</div>
                    ))}
                    {importResult.errors.length > 5 && <div>...共 {importResult.errors.length} 条错误</div>}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-lg">
              <button
                onClick={() => setShowImportModal(false)}
                className="h-[40px] px-4 rounded-pill text-[13px] text-ink hover:bg-primary/10 transition"
              >
                关闭
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="h-[40px] px-6 rounded-pill bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-focus transition disabled:opacity-50 flex items-center gap-2"
              >
                {importing && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                {importing ? '导入中...' : '开始导入'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
