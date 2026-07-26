import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { downloadFile } from '../../api/qiniu';
import PageHero from '../../components/PageHero';
import Pagination from '../../components/Pagination';

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

  const competitionCount = new Set(works.map((w) => w.competitionName).filter(Boolean)).size;
  const collegeCount = new Set(works.map((w) => w.college).filter(Boolean)).size;

  return (
    <div className="page-stack">
      <PageHero
        eyebrow="展示"
        title="光荣榜"
        description="展示审核通过的优秀赛事作品，激励创新，共鉴成长。"
      />

      <section className="metric-row" aria-label="作品概览">
        <div className="metric-item">
          <div className="metric-item-label">作品总数</div>
          <div className="metric-item-value">{works.length}</div>
          <div className="metric-item-hint">审核通过</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">赛事覆盖</div>
          <div className="metric-item-value">{competitionCount}</div>
          <div className="metric-item-hint">不同赛事</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">院系参与</div>
          <div className="metric-item-value">{collegeCount}</div>
          <div className="metric-item-hint">学院覆盖</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">级别分布</div>
          <div className="metric-item-value">{uniqueLevels.length}</div>
          <div className="metric-item-hint">级别类型</div>
        </div>
      </section>

      <div className="filter-strip">
        {LEVELS.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setFilterLevel(o.value)}
            className={`chip ${filterLevel === o.value ? 'chip-primary' : ''}`}
          >
            {o.label}
          </button>
        ))}
        <div className="relative ml-auto w-full md:w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-placeholder">
            search
          </span>
          <input
            className="input-glass h-9 pl-9 text-subhead"
            placeholder="搜索作品、学生、赛事"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-footnote text-placeholder">加载中…</p>
      ) : error ? (
        <p className="py-10 text-center text-footnote text-error">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-footnote text-placeholder">
          {works.length === 0 ? '暂无优秀作品展示' : '暂无符合条件的作品'}
        </p>
      ) : (
        <>
          <div className="flat-list">
            {paged.map((work) => {
              const hasTeam = Boolean(work.teamMembers && work.teamMembers.length > 0);
              return (
                <button
                  key={String(work.id)}
                  type="button"
                  className="flat-row flat-row-clickable !items-start"
                  onClick={() => setDetailWork(work)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-subhead font-medium text-ink">
                        {work.fileName || '未命名作品'}
                      </span>
                      {work.competitionLevel ? (
                        <span className={levelChipClass(work.competitionLevel)}>{work.competitionLevel}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-caption text-placeholder">
                      {work.competitionName || '—'}
                      {' · '}
                      {work.submitterName || work.studentName || '—'}
                      {hasTeam ? ` 等${(work.teamMembers?.length ?? 0) + 1}人` : ''}
                      {' · '}
                      {formatDate(work.uploadDate)}
                      {work.fileSize ? ` · ${formatFileSize(work.fileSize)}` : ''}
                    </p>
                  </div>
                  <span className="material-symbols-outlined shrink-0 text-[18px] text-placeholder">chevron_right</span>
                </button>
              );
            })}
          </div>
          <Pagination current={page} total={filtered.length} pageSize={pageSize} onChange={setPage} />
        </>
      )}

      {detailWork && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setDetailWork(null)}
        >
          <div
            className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-lg border border-hairline bg-canvas p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-hairline pb-3">
              <div className="min-w-0">
                <h3 className="text-subhead font-medium text-ink">作品详情</h3>
                <p className="mt-0.5 truncate text-caption text-placeholder">
                  {detailWork.fileName || '未命名作品'}
                </p>
              </div>
              <button type="button" onClick={() => setDetailWork(null)} className="icon-button !h-8 !w-8">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-4">
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

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-footnote">
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

              {detailWork.fileUrl && (
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => handleDownload(detailWork.fileUrl!, detailWork.fileName)}
                  disabled={downloading}
                >
                  {downloading ? '获取链接中…' : '下载作品文件'}
                </button>
              )}

              <div className="flex justify-end border-t border-hairline pt-3">
                <button type="button" className="btn-secondary" onClick={() => setDetailWork(null)}>
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, span = 1 }: { label: string; value: string; span?: 1 | 2 }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <p className="mb-0.5 text-caption-2 text-placeholder">{label}</p>
      <p className="break-words text-footnote font-medium text-ink">{value}</p>
    </div>
  );
}
