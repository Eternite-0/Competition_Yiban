import { toast } from 'sonner';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import { uploadToQiniu } from '../../api/qiniu';
import PageHero from '../../components/PageHero';
import { useStore } from '../../store/useStore';

interface Competition {
  id: number | string;
  name: string;
  level: string;
  category: string;
}

interface Student {
  id: number;
  username: string; // student number
  realName: string;
  college?: string;
  major?: string;
}

interface SelectedFile {
  file: File;
  id: string;
}

function PortalDropdown({ anchorRef, open, onClose, children }: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] overflow-y-auto rounded-md border border-hairline bg-canvas shadow-float"
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: 320,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

export default function AchievementUpload() {
  const navigate = useNavigate();

  // Competition selection
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [compSearch, setCompSearch] = useState('');
  const [showCompDropdown, setShowCompDropdown] = useState(false);
  const compRef = useRef<HTMLDivElement>(null);

  // Team members
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<Student[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Student[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const memberSearchRef = useRef<HTMLDivElement>(null);
  const memberTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Files
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIdx, setCurrentUploadIdx] = useState(0);

  const currentUser = useStore((s) => s.currentUser);

  // Load competitions
  useEffect(() => {
    apiClient.get('/competition/list', { params: { current: 1, size: 100, status: 'published' } })
      .then((data: any) => {
        const records = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
        setCompetitions(records);
      })
      .catch(console.error);
  }, []);

  // Auto-add current user as team member
  useEffect(() => {
    if (!currentUser) return;
    const self: Student = {
      id: Number(currentUser.id),
      username: currentUser.studentId || '',
      realName: currentUser.name,
      college: currentUser.department,
    };
    setSelectedMembers([self]);
  }, [currentUser]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (compRef.current && !compRef.current.contains(e.target as Node)) setShowCompDropdown(false);
      if (memberSearchRef.current && !memberSearchRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
        setCheckedIds(new Set());
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Search students
  const searchStudents = useCallback((keyword: string) => {
    if (!keyword.trim()) {
      setMemberResults([]);
      setShowMemberDropdown(false);
      return;
    }
    setSearchingMembers(true);
    apiClient.get('/auth/search-students', { params: { keyword: keyword.trim() } })
      .then((data: any) => {
        const list: Student[] = Array.isArray(data) ? data : [];
        setMemberResults(list.filter(s => !selectedMembers.some(m => m.id === s.id) && s.id !== Number(currentUser?.id)));
        setShowMemberDropdown(true);
      })
      .catch(() => setMemberResults([]))
      .finally(() => setSearchingMembers(false));
  }, [selectedMembers]);

  const handleMemberSearchChange = (value: string) => {
    setMemberSearch(value);
    setCheckedIds(new Set());
    if (memberTimerRef.current) clearTimeout(memberTimerRef.current);
    memberTimerRef.current = setTimeout(() => searchStudents(value), 300);
  };

  const toggleCheck = (id: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmMembers = () => {
    const toAdd = memberResults.filter(s => checkedIds.has(s.id));
    if (toAdd.length > 0) {
      setSelectedMembers(prev => [...prev, ...toAdd]);
    }
    setCheckedIds(new Set());
    setShowMemberDropdown(false);
    setMemberSearch('');
  };

  const removeMember = (id: number) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== id));
  };

  // File handling
  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    const maxSize = 50 * 1024 * 1024;
    const skipped: string[] = [];
    const valid = arr.filter(f => {
      if (f.size > maxSize) {
        skipped.push(`${f.name} (${(f.size / (1024 * 1024)).toFixed(1)}MB)`);
        return false;
      }
      return true;
    });
    if (skipped.length > 0) {
      toast.error(`以下文件超过50MB限制，已跳过: ${skipped.join(', ')}`);
    }
    const newSelected: SelectedFile[] = valid.map(f => ({
      file: f,
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }));
    setFiles(prev => [...prev, ...newSelected]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredCompetitions = compSearch
    ? competitions.filter(c => c.name.includes(compSearch) || c.level.includes(compSearch) || c.category.includes(compSearch))
    : competitions;

  // Submit
  const handleSubmit = async () => {
    if (!selectedComp) {
      toast.error('请选择关联赛事');
      return;
    }
    if (files.length === 0) {
      toast.error('请至少上传一个附件');
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error('请至少添加一名关联学生');
      return;
    }

    const studentIds = selectedMembers.map(m => m.id);

    try {
      setSubmitting(true);
      setUploadProgress(0);

      for (let i = 0; i < files.length; i++) {
        setCurrentUploadIdx(i);
        const result = await uploadToQiniu(files[i].file, (p) => {
          // overall progress: completed files + current file progress
          const overall = Math.round(((i + p / 100) / files.length) * 100);
          setUploadProgress(overall);
        });

        await apiClient.post('/submission/submit-team', null, {
          params: {
            competitionId: selectedComp.id,
            fileName: files[i].file.name,
            fileUrl: result.url,
            fileSize: result.fsize,
            studentIds,
          },
        });
      }

      setUploadProgress(100);
      toast.success(`已成功提交 ${files.length} 个附件`);
      navigate('/student/registrations');
    } catch (err: any) {
      console.error('Submit failed', err);
      toast.error(err.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
      setCurrentUploadIdx(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="py-lg flex flex-col gap-lg"
    >
      {/* Header */}
      <PageHero
        title="上传获奖凭证"
        description="为团队成员一起上传获奖凭证，队长上传后其他成员无需重复提交。"
        prefix={(
          <nav className="flex items-center gap-1 text-[13px] text-ink-muted-48 mb-1">
            <button onClick={() => navigate(-1)} className="hover:text-ink transition">返回</button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-ink">上传成果</span>
          </nav>
        )}
        actions={(
          <>
            <button className="btn-secondary" onClick={() => navigate(-1)}>取消</button>
            <button
              onClick={handleSubmit}
              disabled={!selectedComp || files.length === 0 || selectedMembers.length === 0 || submitting}
              className="btn-primary"
            >
              {submitting && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              <span className="material-symbols-outlined text-[18px]">send</span>
              提交审核
            </button>
          </>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Left: form */}
        <div className="lg:col-span-8 flex flex-col gap-lg">

          {/* Competition selector */}
          <section className="glass p-xl">
            <h3 className="text-[19px] font-semibold tracking-tight text-ink mb-md pb-md border-b border-hairline">
              <span className="text-error mr-1">*</span>关联赛事
            </h3>
            <div ref={compRef}>
              {selectedComp ? (
                <div className="rounded-md border border-hairline p-3 bg-canvas flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 grid place-items-center text-primary">
                      <span className="material-symbols-outlined icon-fill">emoji_events</span>
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-ink">{selectedComp.name}</p>
                      <p className="text-[11px] text-ink-muted-48 mt-0.5">{selectedComp.level} · {selectedComp.category} 类</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedComp(null)}
                    className="text-ink-muted-48 hover:text-primary p-2 rounded-md hover:bg-primary/6 transition"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">search</span>
                  <input
                    className="input-glass h-11 pl-9 text-[14px]"
                    placeholder="搜索赛事名称…"
                    value={compSearch}
                    onChange={(e) => { setCompSearch(e.target.value); setShowCompDropdown(true); }}
                    onFocus={() => setShowCompDropdown(true)}
                  />
                </div>
              )}
            </div>
            <PortalDropdown
              anchorRef={compRef}
              open={showCompDropdown && !selectedComp && filteredCompetitions.length > 0}
              onClose={() => setShowCompDropdown(false)}
            >
              {filteredCompetitions.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedComp(c); setShowCompDropdown(false); setCompSearch(''); }}
                  className="w-full text-left px-4 py-3 hover:bg-primary/5 transition flex items-center justify-between border-b border-hairline last:border-0"
                >
                  <div>
                    <p className="text-[14px] font-medium text-ink">{c.name}</p>
                    <p className="text-[11px] text-ink-muted-48 mt-0.5">{c.level} · {c.category} 类</p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
                </button>
              ))}
            </PortalDropdown>
          </section>

          {/* Team members */}
          <section className="glass p-xl">
            <div className="flex items-center justify-between mb-md pb-md border-b border-hairline">
              <h3 className="text-[19px] font-semibold tracking-tight text-ink">
                <span className="text-error mr-1">*</span>关联成员
              </h3>
              <span className="chip">{selectedMembers.length} 人</span>
            </div>
            <p className="text-[12px] text-ink-muted-48 mb-md">
              搜索并添加本次成果关联的团队成员。队长上传后，所有关联成员均可查看该成果，无需重复上传。
            </p>

            {/* Search */}
            <div ref={memberSearchRef} className="relative mb-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">person_search</span>
              <input
                className="input-glass h-11 pl-9 text-[14px]"
                placeholder="输入学号或姓名搜索其他队友…"
                value={memberSearch}
                onChange={(e) => handleMemberSearchChange(e.target.value)}
                onFocus={() => { if (memberResults.length > 0) setShowMemberDropdown(true); }}
              />
              {searchingMembers && (
                <span className="material-symbols-outlined animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-ink-muted-48">progress_activity</span>
              )}
            </div>
            <PortalDropdown
              anchorRef={memberSearchRef}
              open={showMemberDropdown && memberResults.length > 0}
              onClose={() => { setShowMemberDropdown(false); setCheckedIds(new Set()); }}
            >
              <div className="max-h-56 overflow-y-auto">
                {memberResults.map(s => {
                  const checked = checkedIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleCheck(s.id)}
                      className={`w-full text-left px-4 py-2.5 transition flex items-center gap-3 border-b border-hairline last:border-0 ${
                        checked ? 'bg-primary/8' : 'hover:bg-primary/6'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 grid place-items-center shrink-0 transition ${
                        checked ? 'bg-primary border-primary' : 'border-primary/20'
                      }`}>
                      {checked && <span className="material-symbols-outlined text-[14px] text-on-primary">check</span>}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary/10 grid place-items-center text-primary text-[12px] font-semibold shrink-0">
                        {s.realName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink">{s.realName}</p>
                        <p className="text-[11px] text-ink-muted-48">{s.username} · {s.college} {s.major}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {checkedIds.size > 0 && (
                <div className="px-4 py-2.5 border-t border-hairline flex items-center justify-between bg-canvas sticky bottom-0">
                  <span className="text-[12px] text-ink-muted-80">已选 {checkedIds.size} 人</span>
                  <button
                    onClick={confirmMembers}
                    className="btn-primary !py-1.5 !px-4 !text-[12px]"
                  >
                    确定
                  </button>
                </div>
              )}
            </PortalDropdown>

            {/* Selected members list */}
            {selectedMembers.length > 0 ? (
              <div className="flex flex-col gap-2">
                {selectedMembers.map(m => {
                  const isSelf = m.id === Number(currentUser?.id);
                  return (
                    <div key={m.id} className={`rounded-md border p-3 bg-canvas flex items-center justify-between group transition ${isSelf ? 'border-primary/30 bg-primary/3' : 'border-hairline hover:border-primary/40'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full grid place-items-center text-[12px] font-semibold ${isSelf ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                          {m.realName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[14px] font-medium text-ink">{m.realName}</p>
                            {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">我</span>}
                          </div>
                          <p className="text-[11px] text-ink-muted-48">{m.username} · {m.college}</p>
                        </div>
                      </div>
                      {!isSelf && (
                        <button
                          onClick={() => removeMember(m.id)}
                          className="text-ink-muted-48 hover:text-primary p-2 rounded-md hover:bg-primary/6 transition opacity-0 group-hover:opacity-100"
                          title="移除"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-ink-muted-48">
                <span className="material-symbols-outlined text-[32px] mb-1 block">group_add</span>
                <p className="text-[13px]">请搜索并添加关联成员</p>
              </div>
            )}
          </section>

          {/* File upload */}
          <section className="glass p-xl">
            <div className="flex items-center justify-between mb-md pb-md border-b border-hairline">
              <h3 className="text-[19px] font-semibold tracking-tight text-ink">
                <span className="text-error mr-1">*</span>附件材料
              </h3>
              <span className="chip">{files.length} 个文件</span>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="flex flex-col gap-2 mb-md">
                {files.map((f) => (
                  <div key={f.id} className="rounded-md border border-hairline p-3 bg-canvas flex items-center justify-between group hover:border-primary/40 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 grid place-items-center text-primary">
                        <span className="material-symbols-outlined icon-fill text-[18px]">description</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-ink">{f.file.name}</p>
                        <p className="text-[11px] text-ink-muted-48 mt-0.5">{formatFileSize(f.file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="text-ink-muted-48 hover:text-primary p-2 rounded-md hover:bg-primary/6 transition opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <div
              className={`rounded-md border-2 border-dashed flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                files.length > 0 ? 'py-6' : 'py-section'
              } ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-hairline bg-canvas hover:border-primary/50 hover:bg-primary/3'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => document.getElementById('achievement-file-input')?.click()}
            >
              <div className={`w-12 h-12 rounded-full grid place-items-center mb-2 transition ${
                isDragging ? 'bg-primary/15' : 'bg-canvas-parchment group-hover:bg-primary/10'
              }`}>
                <span className={`material-symbols-outlined text-[24px] ${
                  isDragging ? 'text-primary' : 'text-ink-muted-48 group-hover:text-primary'
                }`}>cloud_upload</span>
              </div>
              <p className="text-[14px] font-semibold text-ink mb-1">点击或拖拽文件到这里</p>
              <p className="text-[12px] text-ink-muted-48">支持 .pdf, .doc, .docx, .jpg, .png, .zip · 可多选 · 限 50 MB/个</p>
              <input
                id="achievement-file-input"
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png,.gif,.webp"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
              />
            </div>

            {/* Upload progress */}
            {submitting && (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-ink-muted-48 mb-1">
                  <span>上传中 ({currentUploadIdx + 1}/{files.length})…</span>
                  <span className="tabular-nums">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-primary/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right: instructions */}
        <aside className="lg:col-span-4 flex flex-col gap-md sticky top-6 self-start">
          <div className="glass p-lg">
            <h3 className="text-[15px] font-semibold text-ink mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">tips_and_updates</span>
              使用说明
            </h3>
            <div className="flex flex-col gap-md">
              <div>
                <h4 className="text-[13px] font-medium text-ink mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  队长代传
                </h4>
                <p className="text-[12px] text-ink-muted-80 leading-relaxed pl-3 border-l-2 border-primary/20">
                  队长上传获奖凭证时，可以同时添加所有团队成员。上传后每个成员都能在个人成果中看到该凭证。
                </p>
              </div>
              <div>
                <h4 className="text-[13px] font-medium text-ink mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  材料要求
                </h4>
                <p className="text-[12px] text-ink-muted-80 leading-relaxed pl-3 border-l-2 border-primary/20">
                  附件需清晰可见，包含完整的赛事名称、获奖级别、个人姓名及主办方公章。支持一次上传多个文件。
                </p>
              </div>
              <div>
                <h4 className="text-[13px] font-medium text-ink mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-error" />
                  常见驳回原因
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {[
                    '证书图片模糊，无法辨认关键信息',
                    '填写的获奖等级与上传证书不符',
                    '证明材料缺失官方印章或防伪标识',
                  ].map((item) => (
                    <li key={item} className="text-[12px] text-ink-muted-80 flex items-start gap-1.5 leading-relaxed">
                      <span className="material-symbols-outlined text-[13px] text-error mt-0.5 shrink-0">close</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-[15px] font-semibold text-ink mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">checklist</span>
              提交检查
            </h3>
            <ul className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl">
              {[
                { done: !!selectedComp, label: '选择关联赛事' },
                { done: selectedMembers.length > 0, label: `添加关联成员 (${selectedMembers.length}人)` },
                { done: files.length > 0, label: `上传附件 (${files.length}个)` },
              ].map(it => (
                <li key={it.label} className={`flex items-center gap-2 text-sm ${it.done ? 'text-green-700' : 'text-slate-400'}`}>
                  <span className={it.done ? 'text-green-500' : 'text-slate-400'}>
                    {it.done ? '✓' : '○'}
                  </span>
                  <span>{it.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
