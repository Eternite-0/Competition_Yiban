import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { downloadFile } from '../../api/qiniu';
import PageHero from '../../components/PageHero';
import Pagination from '../../components/Pagination';
import { pageVariants, pageTransition, listContainer, listItem } from '../../lib/motion';

interface TeamMember {
  studentId?: number;
  studentName?: string;
  studentNo?: string;
}

interface SubmissionVO {
  id: string | number;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  uploadDate?: string;
  status?: string;
  reviewNote?: string;
  studentName?: string;
  studentNo?: string;
  college?: string;
  competitionName?: string;
  competitionLevel?: string;
  competitionTags?: string[];
  submitterName?: string;
  teamMembers?: TeamMember[];
}

const LEVELS: { label: string; value: string }[] = [
  { label: '全部级别', value: '' },
  { label: '国家级', value: '国家级' },
  { label: '省级', value: '省级' },
  { label: '校级', value: '校级' },
];

function levelChipClass(level?: string) {
  switch (level) {
    case '国家级': return 'chip chip-national';
    case '省级': return 'chip chip-province';
    case '校级': return 'chip chip-school';
    default: return 'chip';
  }
}

function levelAccentClass(level?: string) {
  switch (level) {
    case '国家级': return 'border-t-4 border-t-blue-500';
    case '省级': return 'border-t-4 border-t-sky-400';
    case '校级': return 'border-t-4 border-t-slate-300';
    default: return 'border-t-4 border-t-slate-200';
  }
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ExcellentWorks() {
  const [works, setWorks] = useState<SubmissionVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [page, setPage] = useState(1);
  const [detailWork, setDetailWork] = useState<SubmissionVO | null>(null);
  const [downloading, setDownloading] = useState(false);
  const pageSize = 12;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data: any = await apiClient.get('/submission/excellent', { params: { current: 1, size: 100 } });
        const records: SubmissionVO[] = Array.isArray(data?.records) ? data.records : (Array.isArray(data) ? data : []);
        setWorks(records);
      } catch (err: any) {
        setError(err.message || '加载失败');
        setWorks([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return works.filter((w) => {
      if (filterLevel && w.competitionLevel !== filterLevel) return false;
      if (search) {
        const q = search.toLowerCase();
        const teamStr = (w.teamMembers || []).map((m) => m.studentName || '').join(' ');
        const match =
          (w.fileName || '').toLowerCase().includes(q) ||
          (w.studentName || '').toLowerCase().includes(q) ||
          (w.competitionName || '').toLowerCase().includes(q) ||
          teamStr.toLowerCase().includes(q) ||
          (w.college || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [works, search, filterLevel]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterLevel]);

  const handleDownload = async (fileUrl: string, fileName?: string) => {
    try {
      setDownloading(true);
      await downloadFile(fileUrl, fileName);
    } catch (err) {
      console.error(err);
      toast.error('下载失败');
    } finally {
      setDownloading(false);
    }
  };

  const uniqueLevels = useMemo(
    () => Array.from(new Set(works.map((w) => w.competitionLevel).filter(Boolean))),
    [works]
  );

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="py-lg flex flex-col gap-lg"
    >
      <PageHero
        eyebrow="Showcase"
        title="光荣榜"
        description="展示审核通过的优秀赛事作品，激励创新，共鉴成长。"
      />

      {/* Summary strip */}
      <motion.section variants={listContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {[
          { label: '作品总数', value: works.length, icon: 'auto_awesome' },
          { label: '赛事覆盖', value: new Set(works.map((w) => w.competitionName).filter(Boolean)).size, icon: 'emoji_events' },
          { label: '院系参与', value: new Set(works.map((w) => w.college).filter(Boolean)).size, icon: 'school' },
          { label: '级别分布', value: uniqueLevels.length, icon: 'layers' },
        ].map((m) => (
          <motion.div
            key={m.label}
            variants={listItem}
            whileHover={{ scale: 1.03, y: -2 }}
            transition={pageTransition}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-blue-500 w-5 h-5 text-[20px]">{m.icon}</span>
              <span className="font-display font-semibold text-[34px] leading-none tabular-nums text-ink">
                {m.value}
              </span>
            </div>
            <span className="text-[13px] text-ink-muted-80">{m.label}</span>
          </motion.div>
        ))}
      </motion.section>

      {/* Filter bar */}
      <div className="glass-tint flex flex-wrap items-center gap-sm px-md py-3">
        <div className="inline-flex items-center p-0.5 bg-primary/6 rounded-pill">
          {LEVELS.map((o) => (
            <button
              key={o.label}
              onClick={() => setFilterLevel(o.value)}
              className={`px-3 py-1.5 rounded-pill text-[13px] transition-all ${
                filterLevel === o.value
                  ? 'bg-canvas text-ink font-semibold shadow-sm'
                  : 'text-ink-muted-80 hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative w-full md:w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">
            search
          </span>
          <input
            className="input-glass h-9 pl-9 text-[14px] !rounded-pill"
            placeholder="搜索作品、学生、赛事"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex w-full min-w-0 flex-col items-center justify-center py-section gap-2 text-ink-muted-48">
          <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
          <span className="empty-state-copy text-[14px]">加载中…</span>
        </div>
      ) : error ? (
        <div className="flex w-full min-w-0 flex-col items-center justify-center py-section gap-2 text-primary">
          <span className="material-symbols-outlined text-[32px]">error_outline</span>
          <span className="empty-state-copy text-[14px]">{error}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex w-full min-w-0 flex-col items-center justify-center py-section gap-2 text-ink-muted-48">
          <span className="material-symbols-outlined text-[36px]">workspace_premium</span>
          <span className="empty-state-copy text-[14px]">
            {works.length === 0 ? '暂无优秀作品展示' : '暂无符合条件的作品'}
          </span>
        </div>
      ) : (
        <>
          <motion.div variants={listContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
            {paged.map((work) => (
              <motion.div
                key={String(work.id)}
                variants={listItem}
                whileHover={{ scale: 1.02, y: -3 }}
                transition={pageTransition}
              >
                <WorkCard work={work} onClick={() => setDetailWork(work)} />
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          <Pagination current={page} total={filtered.length} pageSize={pageSize} onChange={setPage} />
        </>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detailWork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-primary/12 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDetailWork(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="glass-strong w-full max-w-[560px] p-xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-md">
                <div>
                  <h3 className="font-display text-[22px] font-semibold tracking-tight text-ink leading-tight">
                    作品详情
                  </h3>
                  <p className="text-[13px] text-ink-muted-80 mt-1 truncate max-w-[420px]">
                    {detailWork.fileName || '未命名作品'}
                  </p>
                </div>
                <button
                  onClick={() => setDetailWork(null)}
                  className="text-ink-muted-48 hover:text-ink"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {detailWork.competitionLevel && (
                    <span className={levelChipClass(detailWork.competitionLevel)}>
                      {detailWork.competitionLevel}
                    </span>
                  )}
                  {(detailWork.competitionTags || []).map((tag) => (
                    <span key={tag} className="chip">{tag}</span>
                  ))}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[13px]">
                  <DetailRow label="作品名称" value={detailWork.fileName || '未命名'} span={2} />
                  <DetailRow label="所属赛事" value={detailWork.competitionName || '—'} span={2} />
                  <DetailRow label="提交人" value={detailWork.submitterName || detailWork.studentName || '—'} />
                  <DetailRow label="学号" value={detailWork.studentNo || '—'} />
                  <DetailRow label="院系" value={detailWork.college || '—'} />
                  <DetailRow label="上传日期" value={formatDate(detailWork.uploadDate)} />
                  {detailWork.teamMembers && detailWork.teamMembers.length > 0 && (
                    <DetailRow label="团队成员" value={detailWork.teamMembers.map((m) => m.studentName || m.studentNo).join('、')} span={2} />
                  )}
                  <DetailRow label="文件大小" value={formatFileSize(detailWork.fileSize)} />
                  <DetailRow label="审核状态" value={detailWork.status || '—'} />
                  {detailWork.reviewNote && (
                    <DetailRow label="评语" value={detailWork.reviewNote} span={2} />
                  )}
                </div>

                {/* Download */}
                {detailWork.fileUrl && (
                  <div className="pt-3 border-t border-hairline">
                    <button
                      className="btn-primary w-full !py-2.5 !text-[13px] flex items-center justify-center gap-2"
                      onClick={() => handleDownload(detailWork.fileUrl!, detailWork.fileName)}
                      disabled={downloading}
                    >
                      {downloading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                          获取链接中…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">download</span>
                          下载作品文件
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-lg pt-md border-t border-hairline">
                <button
                  className="btn-secondary !py-2 !text-[13px]"
                  onClick={() => setDetailWork(null)}
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WorkCard({ work, onClick }: { work: SubmissionVO; onClick: () => void }) {
  const tags = work.competitionTags ?? [];
  const hasTeam = Boolean(work.teamMembers && work.teamMembers.length > 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full transition-all hover:border-slate-300 hover:shadow-sm cursor-pointer group ${levelAccentClass(work.competitionLevel)}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Image placeholder */}
      <div className="hidden" />
      {/* Header accent */}
      <div className="hidden" />

      {/* Body */}
      <div className="p-lg flex flex-col flex-1">
        {/* Level + tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {work.competitionLevel && (
            <span className={levelChipClass(work.competitionLevel)}>
              {work.competitionLevel}
            </span>
          )}
          {tags.slice(0, 2).map((tag) => (
            <span key={tag} className="chip !py-0.5 !text-[11px]">{tag.trim()}</span>
          ))}
        </div>

        {/* Title */}
        <h4 className="text-[16px] font-semibold leading-snug tracking-tight text-ink line-clamp-2 mb-2 group-hover:text-primary transition">
          {work.fileName || '未命名作品'}
        </h4>

        {/* Competition */}
        <p className="text-[13px] text-ink-muted-80 truncate mb-3">
          {work.competitionName || '—'}
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Meta */}
        <div className="flex flex-col gap-1.5 pt-3 border-t border-hairline text-[12px] text-ink-muted-80">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[15px] text-ink-muted-48">person</span>
            <span className="truncate">
              {work.submitterName || work.studentName || '—'}
              {hasTeam && ` 等${(work.teamMembers?.length ?? 0) + 1}人`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-ink-muted-48">calendar_today</span>
              {formatDate(work.uploadDate)}
            </span>
            {work.fileSize ? (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-ink-muted-48">description</span>
                {formatFileSize(work.fileSize)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, span = 1 }: { label: string; value: string; span?: 1 | 2 }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <p className="text-[11px] text-ink-muted-48 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[13px] text-ink font-medium break-words">{value}</p>
    </div>
  );
}
