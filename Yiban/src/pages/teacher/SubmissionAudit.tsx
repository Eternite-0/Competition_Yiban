import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import { getSignedDownloadUrl } from '../../api/qiniu';
import {
  formatConfidence,
  getAwardProof,
  listAwardProofAudit,
  normalizeConfidence,
  reviewAwardProof,
  toDisplayList,
  toFieldConfidenceItems,
  type AwardProofVO,
} from '../../api/awardProof';
import PageHero from '../../components/PageHero';
import { useStore } from '../../store/useStore';


interface Submission {
  id: string;
  studentName: string;
  competitionTitle: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  uploadDate: string;
  status: string;
  reviewNote?: string;
  source: 'registration' | 'submission' | 'task' | 'awardProof'; // to pick the right audit API
  targetType?: string;
  targetId?: number | string;
  teamMembers?: { studentId: number; studentName: string; studentNo: string }[];
  awardProof?: AwardProofVO;
  awardLevel?: string;
  awardTime?: string;
  organizer?: string;
  winnerName?: string;
  certificateNo?: string;
  sealText?: string;
  confidence?: number;
  fieldConfidenceJson?: unknown;
  evidenceJson?: unknown;
  riskFlagsJson?: unknown;
  detailLoaded?: boolean;
}

const LOW_CONFIDENCE_THRESHOLD = 0.75;

function getFileType(fileName: string): 'image' | 'pdf' | 'word' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  return 'other';
}

function getAwardProofRecords(data: AwardProofVO[] | { records?: AwardProofVO[] } | null): AwardProofVO[] {
  if (Array.isArray(data)) return data;
  return data?.records ?? [];
}

function auditTypeLabel(item: Pick<Submission, 'source' | 'targetType'>) {
  if (item.source === 'awardProof' || item.targetType === 'award_proof') return '获奖证明';
  if (item.targetType === 'registration') return '报名审核';
  if (item.targetType === 'participation') return '活动审核';
  return '成果审核';
}

function auditTypeChip(item: Pick<Submission, 'source' | 'targetType'>) {
  if (item.source === 'awardProof' || item.targetType === 'award_proof') return 'chip chip-success';
  if (item.targetType === 'registration') return 'chip chip-warning';
  if (item.targetType === 'participation') return 'chip';
  return 'chip chip-primary';
}

function mapAwardProof(item: AwardProofVO, detailLoaded = false): Submission {
  const students = item.students ?? item.studentList ?? [];
  const teamMembers = students.map((student, index) => {
    const rawId = student.studentId ?? student.id ?? index;
    return {
      studentId: Number(rawId) || index,
      studentName: student.studentName ?? student.realName ?? '未知学生',
      studentNo: student.studentNo ?? student.username ?? '',
    };
  });
  const studentName =
    item.submitterName ??
    item.studentName ??
    item.winnerName ??
    teamMembers[0]?.studentName ??
    '未知学生';

  return {
    id: `award-${item.id}`,
    targetType: 'award_proof',
    targetId: item.id,
    studentName,
    competitionTitle: item.competitionName ?? '获奖证明',
    fileName: item.fileName ?? '获奖证书',
    fileUrl: item.fileUrl ?? '',
    uploadDate: item.createTime ?? item.submitTime ?? item.updateTime ?? '',
    status: '待审核',
    reviewNote: item.reviewNote,
    source: 'awardProof',
    teamMembers,
    awardProof: item,
    awardLevel: item.awardLevel,
    awardTime: item.awardTime,
    organizer: item.organizer,
    winnerName: item.winnerName,
    certificateNo: item.certificateNo,
    sealText: item.sealText,
    confidence: item.confidence,
    fieldConfidenceJson: item.fieldConfidenceJson,
    evidenceJson: item.evidenceJson,
    riskFlagsJson: item.riskFlagsJson,
    detailLoaded,
  };
}

function FilePreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fileType = getFileType(fileName);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setSignedUrl(null);
    if (!fileUrl) {
      setLoading(false);
      return;
    }

    // Local files need auth header → fetch as blob
    if (fileUrl.startsWith('/api/file/serve/')) {
      const token = localStorage.getItem('token');
      fetch(fileUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then((res) => {
          if (!res.ok) throw new Error('fetch failed');
          return res.blob();
        })
        .then((blob) => setSignedUrl(URL.createObjectURL(blob)))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
      return;
    }

    getSignedDownloadUrl(fileUrl)
      .then((url) => setSignedUrl(url))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-placeholder">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="text-[13px]">加载预览中…</p>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-placeholder">
        <span className="material-symbols-outlined text-[40px]">broken_image</span>
        <p className="text-[13px]">预览加载失败</p>
        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-body-muted text-[12px] underline">
            在新标签页打开
          </a>
        )}
      </div>
    );
  }

  if (fileType === 'image') {
    return (
      <div className="flex items-center justify-center h-full p-4 overflow-auto">
        <img
          loading="lazy"
          src={signedUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain rounded-md"
        />
      </div>
    );
  }

  if (fileType === 'pdf') {
    return (
      <iframe
        src={signedUrl}
        title={fileName}
        className="w-full h-full border-0 rounded-md"
      />
    );
  }

  if (fileType === 'word') {
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
    return (
      <iframe
        src={officeUrl}
        title={fileName}
        className="w-full h-full border-0 rounded-md"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-placeholder">
      <span className="material-symbols-outlined text-[48px]">folder_zip</span>
      <p className="text-[14px] font-medium text-ink">{fileName}</p>
      <p className="text-[12px]">该文件类型不支持在线预览</p>
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary !py-2 !text-[13px] mt-1"
      >
        <span className="material-symbols-outlined text-[16px]">download</span>
        下载文件
      </a>
    </div>
  );
}

function PreviewModal({
  fileName,
  fileUrl,
  onClose,
}: {
  fileName: string;
  fileUrl: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="relative section-card flex flex-col overflow-hidden"
        style={{ width: '90vw', height: '88vh', maxWidth: '1100px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-hairline shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[20px] text-body-muted shrink-0">description</span>
            <span className="text-[14px] font-semibold text-ink truncate">{fileName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-placeholder hover:text-ink p-1.5 rounded-lg hover:bg-hover-overlay transition"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        {/* Preview area */}
        <div className="flex-1 overflow-hidden">
          <FilePreview fileUrl={fileUrl} fileName={fileName} />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SubmissionAudit() {
  const currentUser = useStore((s) => s.currentUser);
  const workbenchBase = currentUser?.role === 'admin' ? '/admin/workbench' : '/teacher/workbench';
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [processedSubmissions, setProcessedSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'全部' | '报名' | '成果' | '获奖证明' | '活动'>('全部');
  const [previewFile, setPreviewFile] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      // Fetch all audit sources in parallel
      const [taskData, regData, subData, awardData] = await Promise.all([
        apiClient.get(`${workbenchBase}/tasks`, { params: { current: 1, size: 100, status: 'pending' } }).catch(() => null),
        apiClient.get('/registration/pending', { params: { current: 1, size: 50 } }).catch(() => null),
        apiClient.get('/submission/list', { params: { status: '待审核', current: 1, size: 50 } }).catch(() => null),
        listAwardProofAudit('pending').catch(() => null),
      ]);

      const taskRecords: any[] = Array.isArray(taskData) ? taskData : taskData?.records ?? [];
      const regRecords: any[] = Array.isArray(regData) ? regData : regData?.records ?? [];
      const subRecords: any[] = Array.isArray(subData) ? subData : subData?.records ?? [];
      const awardRecords = getAwardProofRecords(awardData);

      const taskTargets = new Set(taskRecords.map((item: any) => `${item.targetType}-${item.targetId}`));

      const fromTasks: Submission[] = taskRecords.map((item: any) => {
        const payload = item.payload || {};
        return {
          id: `task-${item.id}`,
          targetType: item.targetType,
          targetId: item.targetId,
          studentName: item.submitterName ?? (item.submitterNo ? `学号 ${item.submitterNo}` : '未知学生'),
          competitionTitle: payload.competitionName ?? payload.activityTitle ?? item.title ?? '待审核事项',
          fileName: payload.fileName ?? payload.teamName ?? payload.track ?? item.title ?? '—',
          fileUrl: payload.fileUrl ?? '',
          fileSize: payload.fileSize,
          uploadDate: item.createTime ?? '',
          status: '待审核',
          reviewNote: item.reviewNote,
          source: 'task' as const,
        };
      });

      // Map registrations — only those with uploaded files (status 审核中)
      const fromRegs: Submission[] = regRecords
        .filter((item: any) => item.status === '审核中')
        .filter((item: any) => !taskTargets.has(`registration-${item.id ?? item.registrationId}`))
        .map((item: any) => ({
          id: `reg-${item.id ?? item.registrationId}`,
          targetType: 'registration',
          targetId: item.id ?? item.registrationId,
          studentName: item.studentName ?? (item.studentId != null ? `学号 ${item.studentId}` : '未知学生'),
          competitionTitle: item.competitionName ?? item.competitionTitle ?? (item.competitionId != null ? `赛事 #${item.competitionId}` : '未知赛事'),
          fileName: item.fileName ?? (item.teamName ? `团队：${item.teamName}` : '—'),
          fileUrl: item.fileUrl ?? '',
          fileSize: item.fileSize,
          uploadDate: item.uploadDate ?? item.submitDate ?? '',
          status: '待审核',
          source: 'registration' as const,
        }));

      // Map standalone submissions (only those without registration)
      const fromSubs: Submission[] = subRecords
        .filter((item: any) => !item.registrationId)
        .filter((item: any) => !taskTargets.has(`submission-${item.id}`))
        .map((item: any) => ({
          id: `sub-${item.id}`,
          targetType: 'submission',
          targetId: item.id,
          studentName: item.studentName ?? (item.studentId != null ? `学号 ${item.studentId}` : '未知学生'),
          competitionTitle: item.competitionName ?? (item.competitionId != null ? `赛事 #${item.competitionId}` : '未知赛事'),
          fileName: item.fileName ?? '—',
          fileUrl: item.fileUrl ?? '',
          fileSize: item.fileSize,
          uploadDate: item.uploadDate ?? '',
          status: '待审核',
          source: 'submission' as const,
          teamMembers: item.teamMembers,
        }));

      const fromAwards = awardRecords.map(item => mapAwardProof(item, false));

      setPendingSubmissions([...fromTasks, ...fromRegs, ...fromSubs, ...fromAwards]);
    } catch (error: any) {
      console.error('Failed to fetch pending submissions:', error);
      toast.error(error?.message || '加载待审核列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const filteredPending = useMemo(() => {
    let list = pendingSubmissions;
    if (filterTab === '报名') list = pendingSubmissions.filter(s => s.targetType === 'registration');
    if (filterTab === '成果') list = pendingSubmissions.filter(s => s.targetType === 'submission' || s.source === 'submission');
    if (filterTab === '获奖证明') list = pendingSubmissions.filter(s => s.source === 'awardProof' || s.targetType === 'award_proof');
    if (filterTab === '活动') list = pendingSubmissions.filter(s => s.targetType === 'participation');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          (s.studentName && s.studentName.toLowerCase().includes(q)) ||
          (s.competitionTitle && s.competitionTitle.toLowerCase().includes(q)) ||
          (s.fileName && s.fileName.toLowerCase().includes(q)) ||
          (s.winnerName && s.winnerName.toLowerCase().includes(q)) ||
          (s.awardLevel && s.awardLevel.toLowerCase().includes(q))
      );
    }
    return list;
  }, [pendingSubmissions, filterTab, searchQuery]);

  const selected = selectedId ? pendingSubmissions.find((s) => s.id === selectedId) : null;

  useEffect(() => {
    if (!selected || selected.source !== 'awardProof' || selected.detailLoaded || !selected.targetId) return;
    let cancelled = false;
    getAwardProof(selected.targetId)
      .then((detail) => {
        if (cancelled) return;
        const mapped = mapAwardProof(detail, true);
        setPendingSubmissions(prev => prev.map(item => (
          item.id === selected.id
            ? { ...item, ...mapped, id: item.id, status: item.status, source: 'awardProof' as const }
            : item
        )));
      })
      .catch((error) => {
        console.error('Failed to fetch award proof detail:', error);
      });
    return () => { cancelled = true; };
  }, [selected?.id, selected?.source, selected?.targetId, selected?.detailLoaded]);

  const registrationCount = pendingSubmissions.filter(item => item.targetType === 'registration').length;
  const submissionCount = pendingSubmissions.filter(item => item.targetType === 'submission' || item.source === 'submission').length;
  const awardProofCount = pendingSubmissions.filter(item => item.source === 'awardProof' || item.targetType === 'award_proof').length;
  const participationCount = pendingSubmissions.filter(item => item.targetType === 'participation').length;

  const handleAudit = async (approve: boolean, reviewNote: string) => {
    if (!selected) return;
    try {
      if (selected.source === 'registration') {
        // Registration-based: use registration/audit with the original ID (strip prefix)
        const realId = selected.id.replace(/^reg-/, '');
        await apiClient.post(
          '/registration/audit',
          { approve, reviewNote },
          { params: { registrationId: realId } }
        );
      } else if (selected.source === 'task') {
        const realId = selected.id.replace(/^task-/, '');
        await apiClient.post(`${workbenchBase}/tasks/${realId}/action`, {
          action: approve ? 'approve' : (reviewNote.startsWith('【退回补充】') ? 'return' : 'reject'),
          reviewNote: reviewNote.replace('【退回补充】', ''),
        });
      } else if (selected.source === 'awardProof') {
        const realId = selected.targetId ?? selected.id.replace(/^award-/, '');
        await reviewAwardProof({
          id: realId,
          action: approve ? 'approve' : (reviewNote.startsWith('【退回补充】') ? 'return' : 'reject'),
          reviewNote: reviewNote.replace('【退回补充】', ''),
        });
      } else {
        // Standalone submission: use submission/review
        const realId = selected.id.replace(/^sub-/, '');
        await apiClient.post('/submission/review', null, {
          params: { submissionId: realId, approve, reviewNote },
        });
      }
      const isReturn = !approve && reviewNote.startsWith('【退回补充】');
      const processedItem = { ...selected, status: approve ? '审核通过' : (isReturn ? '退回补充' : '审核驳回'), reviewNote };
      setProcessedSubmissions(prev => [processedItem, ...prev]);
      setPendingSubmissions(prev => prev.filter(s => s.id !== selected.id));
      setSelectedId(null);
      setNote('');
      toast.success(approve ? '审核通过' : (isReturn ? '已退回补充' : '已驳回'));
    } catch (error: any) {
      console.error('Failed to audit submission:', error);
      toast.error(error?.message || '操作失败，请重试');
    }
  };

  const handleReturnForSupplement = () => {
    if (!note.trim()) {
      toast.error('退回补充时必须填写需要补充的内容');
      return;
    }
    handleAudit(false, `【退回补充】${note}`);
  };
  const handleApprove = () => handleAudit(true, note || '');
  const handleReject = () => {
    if (!note.trim()) {
      toast.error('驳回时必须填写审核意见');
      return;
    }
    handleAudit(false, note);
  };

  return (
      <div className="review-workspace-page flex min-h-[680px] flex-col gap-3 lg:h-[calc(100vh-150px)]">
      {/* Header */}
      <PageHero
        eyebrow="审核工作区"
        title="统一审核中心"
        description="在同一工作区处理报名、成果、活动材料与获奖证明。"
      />

      {/* Three-column */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden">
        {/* Left: list */}
        <section className="w-full lg:w-80 section-card flex flex-col overflow-hidden shrink-0">
          <div className="p-md border-b border-hairline">
            <h2 className="section-card-title">待审核列表</h2>
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-placeholder">search</span>
              <input
                className="input-glass h-9 pl-9 text-[13px] !rounded-lg"
                placeholder="搜索姓名、赛事…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-1 p-0.5 bg-surface-tile-1 rounded-md w-fit">
              {([
                { key: '全部', label: `全部 ${pendingSubmissions.length}` },
                { key: '报名', label: `报名 ${registrationCount}` },
                { key: '成果', label: `成果 ${submissionCount}` },
                { key: '获奖证明', label: `获奖 ${awardProofCount}` },
                { key: '活动', label: `活动 ${participationCount}` },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-3 py-1 rounded-lg text-[12px] transition-all ${
                    filterTab === tab.key
                      ? 'bg-canvas text-ink font-medium'
                      : 'text-body-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowHistory(true)}
              className="lg:hidden mt-2 text-[12px] text-body-muted hover:text-ink flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">history</span>
              已处理记录 ({processedSubmissions.length})
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full text-placeholder">
                <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
              </div>
            ) : filteredPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-placeholder py-12 gap-2">
                <span className="material-symbols-outlined text-[36px]">inbox</span>
                <p className="text-[13px]">暂无待审核</p>
              </div>
            ) : (
              filteredPending.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`list-row list-row-clickable relative w-full !items-start text-left ${
                    selectedId === s.id ? 'bg-hover-overlay' : ''
                  }`}
                >
                  {selectedId === s.id && (
                    <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-md bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="text-[13.5px] font-medium text-ink">{s.studentName || '未知学生'}</span>
                      <span className={auditTypeChip(s)}>{auditTypeLabel(s)}</span>
                    </div>
                    <p className="line-clamp-2 text-[12px] leading-snug text-body-muted">{s.competitionTitle || '未知赛事'}</p>
                    <p className="mt-1 text-[11px] text-placeholder">
                      {s.source === 'awardProof' && s.awardLevel ? `${s.awardLevel} · ` : ''}
                      {s.fileName || '无文件'} · {s.uploadDate || '—'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Middle: details */}
        <section className="flex-1 flex flex-col min-w-0 lg:min-w-[400px] gap-3 overflow-y-auto pr-1">
          <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-3"
            >
              <div className="section-card section-card-body">
                <h3 className="section-card-title pb-3 mb-3 border-b border-hairline">申报详情</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-[13px]">
                  <DetailItem label="学生姓名" value={selected.studentName} />
                  <DetailItem label="赛事名称" value={selected.competitionTitle} />
                  <DetailItem label="上传时间" value={selected.uploadDate} />
                  {selected.targetType === 'registration' && (
                    <>
                      <DetailItem label="审核类型" value="报名审核" />
                      <DetailItem label="队伍/赛道" value={selected.fileName || '—'} />
                    </>
                  )}
                  {selected.targetType === 'participation' && (
                    <DetailItem label="审核类型" value="活动参与审核" />
                  )}
                  {selected.source === 'awardProof' && (
                    <>
                      <DetailItem label="证明类型" value="AI 获奖证明" />
                      <DetailItem label="获奖等级" value={selected.awardLevel || '—'} />
                      <DetailItem label="获奖时间" value={selected.awardTime || '—'} />
                    </>
                  )}
                  {selected.source === 'submission' && (
                    <DetailItem label="提交方式" value="队长代传" />
                  )}
                  {selected.reviewNote && (
                    <div className="md:col-span-2">
                      <span className="text-placeholder mr-2">审核意见</span>
                      <span className="text-ink">{selected.reviewNote}</span>
                    </div>
                  )}
                  {selected.teamMembers && selected.teamMembers.length > 0 && (
                    <div className="md:col-span-2">
                    <p className="text-[12px] text-placeholder mb-1.5">关联成员</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.teamMembers.map(m => (
                          <span key={m.studentId} className="chip">
                            {m.studentName}
                            <span className="text-placeholder ml-1">{m.studentNo}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selected.source === 'awardProof' && (
                <AwardProofInsightPanel submission={selected} />
              )}

              {/* Attachment preview */}
              <div className="section-card section-card-body">
                <div className="flex items-center justify-between pb-3 mb-md border-b border-hairline">
                  <h3 className="section-card-title flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-body-muted">attach_file</span>
                    {selected.source === 'awardProof' ? '证书原图' : '附件材料'}
                  </h3>
                  {selected.fileUrl && (
                    <button
                      onClick={() => setPreviewFile({ fileName: selected.fileName, fileUrl: selected.fileUrl })}
                      className="btn-primary !py-1.5 !px-4 !text-[12px]"
                    >
                      <span className="material-symbols-outlined text-[15px]">open_in_full</span>
                      全屏预览
                    </button>
                  )}
                </div>

                {selected.fileUrl ? (
                  <div className="rounded-lg overflow-hidden border border-hairline bg-canvas"
                    style={{ height: '420px' }}
                  >
                    <FilePreview fileUrl={selected.fileUrl} fileName={selected.fileName} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-placeholder">
                    <span className="material-symbols-outlined text-[36px]">folder_off</span>
                    <p className="text-[13px]">该申报暂未上传附件</p>
                  </div>
                )}

                {selected.fileName && (
                  <p className="text-[11px] text-placeholder mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">description</span>
                    {selected.fileName}
                    {selected.fileSize != null && (
                      <span className="ml-1">
                        · {selected.fileSize < 1024 * 1024
                          ? `${(selected.fileSize / 1024).toFixed(0)} KB`
                          : `${(selected.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="section-card section-card-body">
                <h3 className="section-card-title pb-3 mb-3 border-b border-hairline">流转记录</h3>
                <ol className="relative pl-5">
                  <span className="absolute left-1 top-2 bottom-2 w-px bg-hairline" />
                  <li className="relative mb-3">
                    <span className="absolute -left-[14px] top-1 w-2 h-2 rounded-md bg-ink" />
                    <p className="text-[13px] text-ink font-medium">学生提交申报</p>
                    <span className="text-[11px] text-placeholder">{selected.uploadDate}</span>
                  </li>
                  <li className="relative">
                    <span className="absolute -left-[14px] top-1 w-2 h-2 rounded-md bg-canvas border-2 border-ink" />
                    <p className="text-[13px] text-body-muted font-medium">教师审核</p>
                    <span className="text-[11px] text-body-muted">待处理</span>
                  </li>
                </ol>
              </div>

              <div className="section-card section-card-body">
                <label className="block text-[13px] font-medium text-ink mb-2">审核意见</label>
                <textarea
                  className="input-glass !h-auto py-2.5 resize-none mb-3"
                  rows={4}
                  placeholder="请输入审核意见（通过时选填，驳回时必填）"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex items-center justify-end flex-wrap gap-3">
                  <div className="flex gap-2">
                    <button className="btn-secondary !py-2 !text-[13px]" onClick={handleReturnForSupplement}>退回补充</button>
                    <button className="btn-danger !py-2 !text-[13px] !px-5"
                      onClick={handleReject}
                    >
                      驳回
                    </button>
                    <button className="btn-primary !py-2 !text-[13px]"
                      onClick={handleApprove}
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      审核通过
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 section-card empty-panel"
            >
              <span className="material-symbols-outlined text-[56px] opacity-40">assignment</span>
              <p className="text-[15px] font-medium text-body-muted">选择左侧列表查看详情</p>
              <p className="text-[13px]">点击待审核项目以查看申报信息</p>
            </motion.div>
          )}
          </AnimatePresence>
        </section>

        {/* Right: history */}
        <section className={`w-full lg:w-72 section-card flex flex-col overflow-hidden shrink-0 ${showHistory ? '' : 'hidden lg:flex'}`}>
          <div className="section-card-header">
            <h3 className="section-card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-body-muted">history</span>
              已处理记录
            </h3>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="lg:hidden text-placeholder hover:text-ink"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {processedSubmissions.length === 0 ? (
              <div className="empty-panel py-8">
                <span className="material-symbols-outlined">check_circle</span>
                <p className="text-[12px]">暂无已处理记录</p>
              </div>
            ) : (
              processedSubmissions.map((s, index) => (
                <div key={`${s.id}-${index}`} className="list-row !items-start">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="text-[13px] font-medium text-ink">{s.studentName || '未知'}</span>
                      <span className={s.status === '审核通过' ? 'chip chip-success' : s.status === '退回补充' ? 'chip chip-warning' : 'chip chip-error'}>
                        {s.status}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-[12px] text-body-muted">{s.competitionTitle}</p>
                    {s.reviewNote && (
                      <p className="mt-1 text-[11px] italic text-placeholder">"{s.reviewNote}"</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {previewFile && (
        <PreviewModal
          fileName={previewFile.fileName}
          fileUrl={previewFile.fileUrl}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-placeholder mb-0.5">{label}</p>
      <p className="text-[13px] text-ink font-medium">{value}</p>
    </div>
  );
}

function AwardProofInsightPanel({ submission }: { submission: Submission }) {
  const confidenceItems = toFieldConfidenceItems(submission.fieldConfidenceJson);
  const evidenceItems = toDisplayList(submission.evidenceJson);
  const riskItems = toDisplayList(submission.riskFlagsJson);
  const overallConfidence = normalizeConfidence(submission.confidence);
  const confidenceClass =
    overallConfidence !== null && overallConfidence < LOW_CONFIDENCE_THRESHOLD
      ? 'chip chip-warning'
      : 'chip chip-success';
  const rows = [
    { field: 'competitionName', label: '比赛名称', value: submission.competitionTitle },
    { field: 'awardLevel', label: '获奖等级', value: submission.awardLevel },
    { field: 'awardTime', label: '获奖时间', value: submission.awardTime },
    { field: 'organizer', label: '主办单位', value: submission.organizer },
    { field: 'winnerName', label: '获奖人', value: submission.winnerName },
    { field: 'certificateNo', label: '证书编号', value: submission.certificateNo },
    { field: 'sealText', label: '印章文字', value: submission.sealText },
  ];
  const lowConfidenceItems = confidenceItems.filter(item => item.confidence < LOW_CONFIDENCE_THRESHOLD);

  const getConfidence = (field: string, label: string) =>
    confidenceItems.find(item => item.field === field || item.label === label);

  return (
    <div className="section-card section-card-body">
      <div className="flex items-center justify-between pb-3 mb-md border-b border-hairline">
        <h3 className="section-card-title flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-body-muted">verified</span>
          获奖证明核验
        </h3>
        <div className="flex items-center gap-2">
          {submission.awardProof?.aiTaskId && (
            <span className="chip">AI任务 #{submission.awardProof.aiTaskId}</span>
          )}
          <span className={confidenceClass}>总置信度 {formatConfidence(submission.confidence)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-md">
        <div>
          <h4 className="text-[13px] font-semibold text-ink mb-2">学生提交字段</h4>
          <div className="rounded-md border border-hairline overflow-hidden bg-canvas">
            {rows.map(row => (
              <ProofFieldRow key={row.field} label={row.label} value={row.value || '—'} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-[13px] font-semibold text-ink mb-2">AI 识别字段</h4>
          <div className="rounded-md border border-hairline overflow-hidden bg-canvas">
            {rows.map(row => {
              const confidence = getConfidence(row.field, row.label);
              return (
                <ProofFieldRow
                  key={row.field}
                  label={row.label}
                  value={row.value || '—'}
                  aside={confidence ? formatConfidence(confidence.confidence) : '—'}
                  warning={Boolean(confidence && confidence.confidence < LOW_CONFIDENCE_THRESHOLD)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {submission.awardProof?.fileHash && (
        <div className="mt-md rounded-md border border-hairline bg-canvas p-3">
          <p className="text-[12px] text-placeholder mb-1">文件 Hash</p>
          <p className="text-[12px] text-ink break-all">{submission.awardProof.fileHash}</p>
        </div>
      )}

      {(lowConfidenceItems.length > 0 || riskItems.length > 0) && (
        <div className="mt-md rounded-md border border-error/20 bg-error/5 p-md">
          <h4 className="text-[13px] font-semibold text-error mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[17px]">warning</span>
            风险与低置信度
          </h4>
          <div className="flex flex-col gap-2">
            {lowConfidenceItems.length > 0 && (
              <p className="text-[12px] text-body-muted">
                {lowConfidenceItems.map(item => `${item.label} ${formatConfidence(item.confidence)}`).join('、')}
              </p>
            )}
            {riskItems.map((item, index) => (
              <p key={`${item}-${index}`} className="text-[12px] text-body-muted flex items-start gap-1.5 leading-relaxed">
                <span className="material-symbols-outlined text-[14px] text-error mt-0.5 shrink-0">report</span>
                <span>{item}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {evidenceItems.length > 0 && (
        <div className="mt-md">
          <h4 className="text-[13px] font-semibold text-ink mb-2">证据片段</h4>
          <div className="flex flex-col gap-2">
            {evidenceItems.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-md border border-hairline bg-canvas p-3 text-[12px] text-body-muted leading-relaxed">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProofFieldRow({
  label,
  value,
  aside,
  warning = false,
}: {
  label: string;
  value: string;
  aside?: string;
  warning?: boolean;
}) {
  return (
    <div className="grid grid-cols-[96px_1fr_auto] gap-3 px-3 py-2.5 border-b border-hairline last:border-0 text-[12px] items-start">
      <span className="text-placeholder">{label}</span>
      <span className="text-ink font-medium break-words">{value}</span>
      {aside && (
        <span className={warning ? 'text-error font-semibold' : 'text-placeholder'}>
          {aside}
        </span>
      )}
    </div>
  );
}
