import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { uploadToQiniu, downloadFile } from '../../api/qiniu';
import PageHero from '../../components/PageHero';
import ProgressBar from '../../components/ProgressBar';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';

interface Work {
  id: string;
  title: string;
  author: string;
  competition: string;
  year: string;
  award: string;
  attachments: number;
  fileUrl: string;
  displayed: boolean;
}

interface SubmissionRecord {
  id?: string | number;
  registrationId?: string | number;
  studentName?: string;
  studentId?: string;
  competitionTitle?: string;
  competitionName?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  uploadDate?: string;
  uploadTime?: string;
  status?: string;
  reviewNote?: string;
  approved?: boolean;
  displayed?: boolean;
}

const awardChip: Record<string, string> = {
  '国赛特等奖': 'chip chip-error',
  '国赛金奖': 'chip chip-primary',
  '国赛一等奖': 'chip chip-primary',
  '省赛一等奖': 'chip chip-success',
  '审核通过': 'chip chip-success',
};

const academicYear = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const mapToWork = (s: SubmissionRecord, idx: number): Work => ({
  id: String(s.id ?? s.registrationId ?? idx),
  title: s.fileName || '未命名作品',
  author: s.studentName || '—',
  competition: s.competitionTitle || s.competitionName || '—',
  year: academicYear(s.uploadDate || s.uploadTime),
  award: '审核通过',
  attachments: s.fileUrl ? 1 : 0,
  fileUrl: s.fileUrl || '',
  displayed: Boolean(s.displayed),
});

export default function ExcellentWorks() {
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [rawById, setRawById] = useState<Record<string, SubmissionRecord>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { isOpen, title, message, variant, confirm, close } = useConfirmModal();

  const [search, setSearch] = useState('');
  const [filterCompetition, setFilterCompetition] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterAward, setFilterAward] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [detailWork, setDetailWork] = useState<Work | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPending, setPickerPending] = useState<Set<string>>(new Set());
  const [pickerWorks, setPickerWorks] = useState<Work[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [editWork, setEditWork] = useState<Work | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editFileUploading, setEditFileUploading] = useState(false);
  const [editFileProgress, setEditFileProgress] = useState(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCompId, setUploadCompId] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [competitionOptions, setCompetitionOptions] = useState<{ id: string | number; name: string }[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data: any = await apiClient.get('/submission/excellent', { params: { current: 1, size: 100 } });
      const records: SubmissionRecord[] = Array.isArray(data?.records) ? data.records : (Array.isArray(data) ? data : []);
      const mapped = records.map(mapToWork);
      const raw: Record<string, SubmissionRecord> = {};
      records.forEach((r, idx) => {
        raw[String(r.id ?? r.registrationId ?? idx)] = r;
      });
      setRawById(raw);
      setAllWorks(mapped);
    } catch (err) {
      console.error('Failed to fetch excellent works:', err);
      setLoadError(err instanceof Error ? err.message : '加载失败，请稍后重试');
      setAllWorks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    apiClient.get('/competition/list', { params: { current: 1, size: 100 } }).then((data: any) => {
      const records = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      setCompetitionOptions(records.map((c: any) => ({ id: c.id, name: c.name })));
    }).catch(console.error);
  }, []);

  const callToggle = async (submissionId: string, displayed: boolean): Promise<boolean> => {
    try {
      await apiClient.post('/submission/admin/toggle-display', null, {
        params: { submissionId, displayed },
      });
      setAllWorks((prev) =>
        prev.map((w) => (w.id === submissionId ? { ...w, displayed } : w))
      );
      return true;
    } catch (err: any) {
      toast.error(err?.message || '操作失败');
      return false;
    }
  };

  const uniqueCompetitions = useMemo(
    () => Array.from(new Set(allWorks.map((w) => w.competition))),
    [allWorks]
  );
  const uniqueYears = useMemo(
    () =>
      Array.from(new Set(allWorks.map((w) => w.year))).filter((y) => y !== '—').sort().reverse(),
    [allWorks]
  );

  const filteredWorks = useMemo(() => {
    return allWorks.filter((w) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !w.title.toLowerCase().includes(q) &&
          !w.author.toLowerCase().includes(q) &&
          !w.competition.toLowerCase().includes(q)
        )
          return false;
      }
      if (filterCompetition && w.competition !== filterCompetition) return false;
      if (filterYear && w.year !== filterYear) return false;
      if (filterAward === 'displayed' && !w.displayed) return false;
      if (filterAward === 'hidden' && w.displayed) return false;
      return true;
    });
  }, [allWorks, search, filterCompetition, filterYear, filterAward]);

  const pagedWorks = filteredWorks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedWorks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedWorks.map((w) => w.id)));
    }
  };

  const batchSetDisplay = async (displayed: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await Promise.all(ids.map((id) => callToggle(id, displayed)));
    const ok = results.filter(Boolean).length;
    toast.success(`已${displayed ? '展示' : '下架'} ${ok}/${ids.length} 项`);
    setSelectedIds(new Set());
  };

  const resetFilters = () => {
    setSearch('');
    setFilterCompetition('');
    setFilterYear('');
    setFilterAward('');
    setCurrentPage(1);
  };

  const handleDelete = async (work: Work) => {
    if (!work.displayed) {
      toast('该作品未上架，无需下架');
      return;
    }
    const confirmed = await confirm({
      title: '下架作品',
      message: `确认将「${work.title}」从优秀作品墙下架？（不会删除提交记录本身）`,
      confirmText: '下架',
      cancelText: '取消',
      variant: 'warning',
    });
    if (!confirmed) return;
    const ok = await callToggle(work.id, false);
    if (ok) toast.success('已下架');
  };

  const openEdit = (work: Work) => {
    setEditWork(work);
    setEditNote(rawById[work.id]?.reviewNote || '');
    setEditFile(null);
    setEditFileUploading(false);
    setEditFileProgress(0);
  };

  const saveEdit = async () => {
    if (!editWork) return;
    try {
      setEditSaving(true);

      // Replace file if a new one was selected
      if (editFile) {
        setEditFileUploading(true);
        setEditFileProgress(0);
        const result = await uploadToQiniu(editFile, setEditFileProgress);
        await apiClient.post('/submission/admin/update-file', null, {
          params: {
            submissionId: editWork.id,
            fileName: editFile.name,
            fileUrl: result.url,
            fileSize: result.fsize,
          },
        });
        setEditFileUploading(false);
        // Update local state
        setAllWorks((prev) =>
          prev.map((w) =>
            w.id === editWork.id
              ? { ...w, title: editFile.name, fileUrl: result.url, attachments: 1 }
              : w
          )
        );
      }

      // Update review note
      await apiClient.post('/submission/admin/update-note', null, {
        params: { submissionId: editWork.id, reviewNote: editNote },
      });
      setRawById((prev) => ({
        ...prev,
        [editWork.id]: { ...(prev[editWork.id] || {}), reviewNote: editNote },
      }));
      toast.success(editFile ? '附件和评语已更新' : '已保存');
      setEditWork(null);
    } catch (err: any) {
      toast.error(err?.message || '保存失败');
    } finally {
      setEditSaving(false);
      setEditFileUploading(false);
      setEditFileProgress(0);
    }
  };



  const openPicker = async () => {
    setPickerPending(new Set());
    setPickerOpen(true);
    setPickerLoading(true);
    try {
      const data: any = await apiClient.get('/submission/list', {
        params: { status: '审核通过', current: 1, size: 200 },
      });
      const records: SubmissionRecord[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.records)
          ? data.records
          : [];
      const displayedIds = new Set(allWorks.map((w) => w.id));
      setPickerWorks(
        records
          .filter((r) => !r.displayed && !displayedIds.has(String(r.id)))
          .map(mapToWork)
      );
    } catch (err) {
      console.error(err);
      toast.error('加载审核通过的作品失败');
      setPickerWorks([]);
    } finally {
      setPickerLoading(false);
    }
  };

  const togglePickerPending = (id: string) => {
    setPickerPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmPickerAdd = async () => {
    const ids = Array.from(pickerPending);
    if (ids.length === 0) {
      toast('未选择任何作品');
      return;
    }
    const results = await Promise.all(ids.map((id) => callToggle(id, true)));
    const ok = results.filter(Boolean).length;
    toast.success(`已录入 ${ok}/${ids.length} 项至展示墙`);
    setPickerOpen(false);
    setPickerPending(new Set());
    load();
  };

  const openUploadModal = () => {
    setUploadFile(null);
    setUploadCompId('');
    setUploadNote('');
    setUploadProgress(0);
    setUploadOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile || !uploadCompId) {
      toast.error('请选择文件和赛事');
      return;
    }
    try {
      setUploadSaving(true);
      setUploadProgress(0);
      const result = await uploadToQiniu(uploadFile, setUploadProgress);
      await apiClient.post('/submission/admin/create-excellent', null, {
        params: {
          competitionId: uploadCompId,
          fileName: uploadFile.name,
          fileUrl: result.url,
          fileSize: result.fsize,
          reviewNote: uploadNote || undefined,
        },
      });
      toast.success('优秀作品上传成功');
      setUploadOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || '上传失败');
    } finally {
      setUploadSaving(false);
      setUploadProgress(0);
    }
  };

  const displayedCount = allWorks.filter((w) => w.displayed).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <PageHero
        eyebrow="Showcase"
        title="优秀作品管理"
        description="管理和展示平台优秀赛事作品。"
        actions={(
          <>
            <button className="btn-secondary" onClick={openPicker} disabled={loading}>
              <span className="material-symbols-outlined text-[18px]">playlist_add</span>
              录入已有作品
            </button>
            <button className="btn-primary" onClick={openUploadModal} disabled={loading}>
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              上传新作品
            </button>
          </>
        )}
      />

      {/* KPI strip */}
      <div className="stat-grid">
        {[
          { label: '作品总数', value: allWorks.length, icon: 'auto_awesome', hint: '全部作品' },
          { label: '已展示', value: displayedCount, icon: 'visibility', hint: '前台可见' },
          { label: '所属赛事', value: uniqueCompetitions.length, icon: 'event', hint: '覆盖赛事' },
          { label: '当前选中', value: selectedIds.size, icon: 'check_circle', hint: '批量操作' },
        ].map((m) => (
          <div key={m.label} className="stat-card">
            <div className="stat-card-label">{m.label}</div>
            <div className="stat-card-value">{m.value}</div>
            <div className="stat-card-hint">
              <span className="material-symbols-outlined align-middle text-[14px] text-placeholder">{m.icon}</span>
              {' '}{m.hint}
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="relative w-full md:w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-placeholder">
            search
          </span>
          <input
            className="input-glass h-9 pl-9 text-footnote !rounded-lg"
            placeholder="搜索作品 / 成员 / 赛事"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <select
          className="input-glass h-9 min-w-[140px] text-footnote"
          value={filterCompetition}
          onChange={(e) => {
            setFilterCompetition(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">所属赛事</option>
          {uniqueCompetitions.map((c) => (
            <option key={c} value={c}>
              {c.length > 24 ? c.slice(0, 24) + '…' : c}
            </option>
          ))}
        </select>
        <select
          className="input-glass h-9 min-w-[110px] text-footnote"
          value={filterYear}
          onChange={(e) => {
            setFilterYear(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">学年</option>
          {uniqueYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className="input-glass h-9 min-w-[140px] text-footnote"
          value={filterAward}
          onChange={(e) => {
            setFilterAward(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">全部展示状态</option>
          <option value="displayed">已展示</option>
          <option value="hidden">未展示</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={resetFilters}
          className="h-9 px-3 rounded-lg text-caption text-body-muted hover:text-ink hover:bg-hover-overlay transition"
        >
          重置筛选
        </button>
      </div>

      {/* Batch toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="filter-bar !border-primary/25"
          >
            <span className="text-footnote text-ink font-medium">
              已选择{' '}
              <span className="text-body-muted font-semibold tabular-nums">{selectedIds.size}</span> 项
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => batchSetDisplay(true)} className="btn-primary !py-1.5 !text-caption">
                <span className="material-symbols-outlined text-[14px]">visibility</span>
                批量展示
              </button>
              <button onClick={() => batchSetDisplay(false)} className="btn-secondary !py-1.5 !text-caption">
                <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                批量下架
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-caption text-body-muted hover:text-ink px-2 py-1.5 rounded-lg hover:bg-hover-overlay transition"
              >
                取消选择
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">作品列表</h2>
          <span className="chip tabular-nums">{allWorks.length} 条</span>
        </div>
        <div className="data-table-wrap !rounded-none !border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded-xs accent-primary cursor-pointer"
                    checked={selectedIds.size === pagedWorks.length && pagedWorks.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>作品名称</th>
                <th>所属赛事</th>
                <th>学年</th>
                <th>审核状态</th>
                <th>学生</th>
                <th>附件</th>
                <th>展示</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedWorks.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-panel py-12">
                      <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
                        {loading ? 'progress_activity' : loadError ? 'cloud_off' : 'search_off'}
                      </span>
                      <p className="text-footnote">
                        {loading
                          ? '加载中…'
                          : loadError
                            ? `加载失败：${loadError}`
                            : allWorks.length === 0
                              ? '暂无审核通过作品'
                              : '暂无匹配作品'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedWorks.map((work) => (
                  <tr
                    key={work.id}
                    className={selectedIds.has(work.id) ? 'bg-primary-soft/40' : undefined}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 cursor-pointer rounded-xs accent-primary"
                        checked={selectedIds.has(work.id)}
                        onChange={() => toggleSelect(work.id)}
                      />
                    </td>
                    <td className="max-w-[260px] truncate font-medium" title={work.title}>
                      {work.title}
                    </td>
                    <td className="max-w-[220px] truncate text-body-muted">{work.competition}</td>
                    <td className="tabular-nums text-placeholder">{work.year}</td>
                    <td>
                      <span className={awardChip[work.award] || 'chip'}>{work.award}</span>
                    </td>
                    <td className="text-body-muted">{work.author}</td>
                    <td>
                      <div className={`flex items-center gap-1 ${work.attachments > 0 ? 'text-body-muted' : 'text-placeholder'}`}>
                        <span className="material-symbols-outlined text-[14px]">attachment</span>
                        <span className="text-caption tabular-nums">
                          {work.attachments > 0 ? `${work.attachments}` : '—'}
                        </span>
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={work.displayed}
                          onChange={() => callToggle(work.id, !work.displayed)}
                        />
                        <div className="h-5 w-9 rounded-full bg-surface-chip transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-canvas after:shadow after:transition-transform after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-4" />
                      </label>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="btn-utility !mx-0.5 !h-8 !px-2 !text-caption" onClick={() => setDetailWork(work)}>
                        详情
                      </button>
                      <button type="button" className="btn-utility !mx-0.5 !h-8 !px-2 !text-caption" onClick={() => openEdit(work)}>
                        编辑
                      </button>
                      <button type="button" className="btn-danger !mx-0.5 !h-8 !px-2 !text-caption" onClick={() => handleDelete(work)}>
                        下架
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
          <span className="text-caption text-placeholder">
            共 <span className="font-medium tabular-nums text-ink">{filteredWorks.length}</span> 条
          </span>
          <Pagination current={currentPage} total={filteredWorks.length} pageSize={pageSize} onChange={setCurrentPage} />
        </div>
      </section>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailWork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm"
            onClick={() => setDetailWork(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="section-card w-full max-w-[560px] p-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-md">
                <h3 className="font-display text-title-2 font-semibold tracking-tight text-ink leading-tight">
                  作品详情
                </h3>
                <button
                  onClick={() => setDetailWork(null)}
                  className="text-placeholder hover:text-ink"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-footnote">
                <DetailRow label="作品名称" value={detailWork.title} span={2} />
                <DetailRow label="所属赛事" value={detailWork.competition} span={2} />
                <DetailRow label="学生" value={detailWork.author} />
                <DetailRow label="学年" value={detailWork.year} />
                <DetailRow label="状态" value={detailWork.award} />
                <DetailRow label="展示" value={detailWork.displayed ? '已上架' : '未上架'} />
                {rawById[detailWork.id]?.reviewNote && (
                  <DetailRow label="评语" value={rawById[detailWork.id].reviewNote!} span={2} />
                )}
                {detailWork.fileUrl && (
                  <div className="col-span-2 mt-2">
                    <p className="text-caption text-placeholder mb-1">附件</p>
                    <button
                      className="text-footnote text-body-muted hover:text-ink inline-flex items-center gap-1.5 break-all"
                      onClick={async () => {
                        try {
                          await downloadFile(detailWork.fileUrl, detailWork.title);
                        } catch (err) {
                          console.error(err);
                          toast.error('下载失败');
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      下载附件
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-lg pt-md border-t border-hairline">
                <button
                  className="btn-secondary !py-2 !text-footnote"
                  onClick={() => setDetailWork(null)}
                >
                  关闭
                </button>
                <button
                  className={detailWork.displayed ? 'btn-secondary !py-2 !text-footnote' : 'btn-primary !py-2 !text-footnote'}
                  onClick={async () => {
                    const ok = await callToggle(detailWork.id, !detailWork.displayed);
                    if (ok) {
                      toast.success(detailWork.displayed ? '已下架' : '已上架');
                      setDetailWork({ ...detailWork, displayed: !detailWork.displayed });
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {detailWork.displayed ? 'visibility_off' : 'visibility'}
                  </span>
                  {detailWork.displayed ? '从展示墙下架' : '加入展示墙'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Picker Modal */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm"
            onClick={() => setPickerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="section-card w-full max-w-[640px] max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-xl pb-md flex justify-between items-start">
                <div>
                  <h3 className="font-display text-title-2 font-semibold tracking-tight text-ink leading-tight">
                    录入优秀作品
                  </h3>
                  <p className="text-footnote text-body-muted mt-1">
                    从所有 审核通过 但尚未上架的作品中选择
                  </p>
                </div>
                <button
                  onClick={() => setPickerOpen(false)}
                  className="text-placeholder hover:text-ink"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-xl">
                {pickerLoading ? (
                  <div className="text-center py-12 text-placeholder">
                    <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
                    <p className="text-footnote mt-2">加载中…</p>
                  </div>
                ) : pickerWorks.length === 0 ? (
                  <div className="text-center py-12 text-placeholder">
                    <span className="material-symbols-outlined text-[36px] block mb-2 opacity-40">
                      task_alt
                    </span>
                    <p className="text-footnote">所有审核通过的作品都已上架</p>
                  </div>
                ) : (
                  <ul className="flex flex-col">
                    {pickerWorks.map((w) => (
                      <li
                        key={w.id}
                        className="py-3 border-b border-hairline last:border-0 flex items-start gap-3 cursor-pointer hover:bg-hover-overlay -mx-2 px-2 rounded transition"
                        onClick={() => togglePickerPending(w.id)}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 w-3.5 h-3.5 rounded-xs accent-primary cursor-pointer"
                          checked={pickerPending.has(w.id)}
                          onChange={() => togglePickerPending(w.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-footnote font-medium text-ink truncate">{w.title}</p>
                          <p className="text-caption-2 text-placeholder mt-0.5 truncate">
                            {w.competition} · {w.author} · {w.year}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-xl pt-md flex justify-between items-center border-t border-hairline">
                <span className="text-caption text-placeholder">
                  已选 <span className="text-body-muted font-semibold tabular-nums">{pickerPending.size}</span> 项
                </span>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary !py-2 !text-footnote"
                    onClick={() => setPickerOpen(false)}
                  >
                    取消
                  </button>
                  <button
                    className="btn-primary !py-2 !text-footnote"
                    onClick={confirmPickerAdd}
                    disabled={pickerPending.size === 0}
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    确认录入
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editWork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm"
            onClick={() => !editSaving && setEditWork(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="section-card w-full max-w-[560px] p-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-md">
                <div>
                  <h3 className="font-display text-title-2 font-semibold tracking-tight text-ink leading-tight">
                    编辑作品
                  </h3>
                  <p className="text-footnote text-body-muted mt-1 truncate max-w-[420px]">
                    {editWork.title}
                  </p>
                </div>
                <button
                  onClick={() => !editSaving && setEditWork(null)}
                  className="text-placeholder hover:text-ink"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 text-caption">
                  <DetailRow label="所属赛事" value={editWork.competition} span={2} />
                  <DetailRow label="学生" value={editWork.author} />
                  <DetailRow label="学年" value={editWork.year} />
                </div>

                {/* File replacement */}
                <div>
                  <label className="text-subhead font-medium text-body-muted block mb-1.5">
                    替换附件（选填）
                  </label>
                  {editFile ? (
                    <div className="flex items-center gap-3 rounded-md border border-hairline p-3 bg-canvas">
                      <span className="material-symbols-outlined text-body-muted">description</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-footnote font-medium text-ink truncate">{editFile.name}</p>
                        <p className="text-caption-2 text-placeholder">
                          {editFile.size < 1024 * 1024
                            ? `${(editFile.size / 1024).toFixed(0)} KB`
                            : `${(editFile.size / (1024 * 1024)).toFixed(1)} MB`}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditFile(null)}
                        className="text-placeholder hover:text-ink"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      className="rounded-md border-2 border-dashed border-hairline p-4 flex items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition"
                      onClick={() => document.getElementById('edit-file-input')?.click()}
                    >
                      <span className="material-symbols-outlined text-[20px] text-placeholder">cloud_upload</span>
                      <div>
                        <p className="text-footnote text-body-muted">点击选择新文件替换当前附件</p>
                        <p className="text-caption-2 text-placeholder">支持图片、PDF、文档等 · 限 50 MB</p>
                      </div>
                      <input
                        id="edit-file-input"
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png,.gif,.webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            if (f.size > 50 * 1024 * 1024) {
                              toast.error('文件大小不能超过50MB');
                            } else {
                              setEditFile(f);
                            }
                          }
                          e.target.value = '';
                        }}
                      />
                    </div>
                  )}
                  {editFileUploading && (
                    <div className="mt-2">
                      <div className="flex justify-between text-caption-2 text-placeholder mb-1">
                        <span>上传中…</span>
                        <span className="tabular-nums">{editFileProgress}%</span>
                      </div>
                      <ProgressBar value={editFileProgress} size="md" showThumb segments={5} />
                    </div>
                  )}
                  {editWork.fileUrl && !editFile && (
                    <p className="text-caption-2 text-placeholder mt-1.5">
                      当前附件：{editWork.title}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-subhead font-medium text-body-muted block mb-1.5">
                    评语 / 简介
                  </label>
                  <textarea
                    className="input-glass !rounded-md w-full min-h-[120px] p-3 text-footnote resize-y"
                    placeholder="编辑该作品的评语或展示简介…"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                  />
                  <p className="text-caption-2 text-placeholder mt-1">
                    展示于优秀作品墙的评语，会同步给作品作者。
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-lg pt-md border-t border-hairline">
                <button
                  className="btn-secondary !py-2 !text-footnote"
                  onClick={() => setEditWork(null)}
                  disabled={editSaving}
                >
                  取消
                </button>
                <button
                  className="btn-primary !py-2 !text-footnote"
                  onClick={saveEdit}
                  disabled={editSaving}
                >
                  {editSaving && (
                    <span className="material-symbols-outlined animate-spin text-[16px]">
                      progress_activity
                    </span>
                  )}
                  {editSaving ? '保存中…' : '保存'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm"
            onClick={() => !uploadSaving && setUploadOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="section-card w-full max-w-[560px] p-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-md">
                <div>
                  <h3 className="font-display text-title-2 font-semibold tracking-tight text-ink leading-tight">
                    上传优秀作品
                  </h3>
                  <p className="text-footnote text-body-muted mt-1">
                    上传文件至七牛云并自动创建展示记录
                  </p>
                </div>
                <button
                  onClick={() => !uploadSaving && setUploadOpen(false)}
                  className="text-placeholder hover:text-ink"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-md">
                <div className="flex flex-col gap-1.5">
                  <label className="text-subhead font-medium text-body-muted">关联赛事</label>
                  <select
                    className="input-glass"
                    value={uploadCompId}
                    onChange={(e) => setUploadCompId(e.target.value)}
                  >
                    <option value="">请选择赛事</option>
                    {competitionOptions.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {String(c.name).length > 30 ? String(c.name).slice(0, 30) + '…' : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-subhead font-medium text-body-muted">文件</label>
                  {uploadFile ? (
                    <div className="flex items-center gap-3 rounded-md border border-hairline p-3 bg-canvas">
                      <span className="material-symbols-outlined text-body-muted">description</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-footnote font-medium text-ink truncate">{uploadFile.name}</p>
                        <p className="text-caption-2 text-placeholder">
                          {uploadFile.size < 1024 * 1024
                            ? `${(uploadFile.size / 1024).toFixed(0)} KB`
                            : `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`}
                        </p>
                      </div>
                      <button
                        onClick={() => setUploadFile(null)}
                        className="text-placeholder hover:text-ink"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      className="rounded-md border-2 border-dashed border-hairline p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition"
                      onClick={() => document.getElementById('admin-upload-input')?.click()}
                    >
                      <span className="material-symbols-outlined text-[28px] text-placeholder">cloud_upload</span>
                      <p className="text-footnote text-body-muted">点击选择文件</p>
                      <p className="text-caption-2 text-placeholder">支持图片、PDF、文档等</p>
                      <input
                        id="admin-upload-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setUploadFile(f);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-subhead font-medium text-body-muted">评语 / 简介（选填）</label>
                  <textarea
                    className="input-glass !rounded-md w-full min-h-[80px] p-3 text-footnote resize-y"
                    placeholder="展示于优秀作品墙的评语…"
                    value={uploadNote}
                    onChange={(e) => setUploadNote(e.target.value)}
                  />
                </div>

                {uploadSaving && (
                  <div>
                    <div className="flex justify-between text-caption-2 text-placeholder mb-1">
                      <span>上传中…</span>
                      <span className="tabular-nums">{uploadProgress}%</span>
                    </div>
                    <ProgressBar value={uploadProgress} size="md" showThumb segments={5} />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-lg pt-md border-t border-hairline">
                <button
                  className="btn-secondary !py-2 !text-footnote"
                  onClick={() => setUploadOpen(false)}
                  disabled={uploadSaving}
                >
                  取消
                </button>
                <button
                  className="btn-primary !py-2 !text-footnote"
                  onClick={handleUploadSubmit}
                  disabled={uploadSaving || !uploadFile || !uploadCompId}
                >
                  {uploadSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      上传中…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                      上传并展示
                    </>
                  )}
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

function DetailRow({ label, value, span = 1 }: { label: string; value: string; span?: 1 | 2 }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <p className="text-caption text-placeholder mb-0.5">{label}</p>
      <p className="text-footnote text-ink font-medium break-words">{value}</p>
    </div>
  );
}
