import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import type { CompetitionProgress, StudentStageProgress, StageProgressStatus } from '../../types';

const statusConfig: Record<StageProgressStatus, { icon: string; label: string; color: string; bg: string }> = {
  passed: { icon: 'check_circle', label: '已通过', color: 'text-success', bg: 'bg-success/10' },
  in_progress: { icon: 'pending', label: '进行中', color: 'text-primary', bg: 'bg-primary/10' },
  submitted: { icon: 'schedule', label: '已提交', color: 'text-primary', bg: 'bg-primary/10' },
  failed: { icon: 'cancel', label: '未通过', color: 'text-error', bg: 'bg-error/10' },
  not_started: { icon: 'radio_button_unchecked', label: '未开始', color: 'text-ink-muted-48', bg: '' },
};

function StageTimeline({ stages }: { stages: StudentStageProgress[] }) {
  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-hairline" />

      <div className="flex flex-col gap-4">
        {stages.map((stage, idx) => {
          const cfg = statusConfig[stage.status];
          const isLast = idx === stages.length - 1;
          return (
            <div key={stage.stageId} className="relative flex items-start gap-3">
              {/* Dot */}
              <div className={`absolute left-[-17px] w-[10px] h-[10px] rounded-full mt-1.5 z-10 ${
                stage.status === 'passed' ? 'bg-success' :
                stage.status === 'in_progress' || stage.status === 'submitted' ? 'bg-primary ring-4 ring-primary/20' :
                stage.status === 'failed' ? 'bg-error' :
                'bg-hairline border-2 border-ink-muted-48/30'
              }`} />

              {/* Content */}
              <div className={`flex-1 ${isLast ? '' : 'pb-2'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-semibold text-ink">{stage.stageName}</span>
                  <span className={`chip !text-[11px] ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                </div>

                {(stage.startTime || stage.endTime) && (
                  <p className="text-[12px] text-ink-muted-48 mt-1">
                    {stage.startTime ? new Date(stage.startTime).toLocaleDateString('zh-CN') : ''}
                    {stage.startTime && stage.endTime ? ' — ' : ''}
                    {stage.endTime ? new Date(stage.endTime).toLocaleDateString('zh-CN') : ''}
                  </p>
                )}

                {stage.description && stage.status === 'in_progress' && (
                  <p className="text-[13px] text-ink-muted-80 mt-1.5 bg-primary/5 rounded-md px-3 py-2 border border-primary/10">
                    {stage.description}
                  </p>
                )}

                {stage.reviewNote && (
                  <p className="text-[12px] text-ink-muted-80 mt-1">
                    <span className="font-medium">审核意见：</span>{stage.reviewNote}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyProgress() {
  const navigate = useNavigate();
  const [progressList, setProgressList] = useState<CompetitionProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data: any = await apiClient.get('/student/progress/my');
        setProgressList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load progress', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="py-section text-center text-ink-muted-48">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="mt-2 text-[14px]">加载中…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="py-lg flex flex-col gap-lg"
    >
      <PageHero
        eyebrow="My Progress"
        title="我的赛事进度"
        description="追踪你在每项赛事中的阶段进展，了解当前状态和下一步行动。"
        actions={(
          <button onClick={() => navigate('/student/competitions')} className="btn-secondary">
            <span className="material-symbols-outlined text-[18px]">search</span>
            浏览更多赛事
          </button>
        )}
      />

      {progressList.length === 0 ? (
        <div className="glass p-xl text-center">
          <span className="material-symbols-outlined text-[48px] text-ink-muted-48">timeline</span>
          <p className="text-[15px] text-ink-muted-80 mt-3">暂无赛事进度</p>
          <p className="text-[13px] text-ink-muted-48 mt-1">报名赛事后，你的阶段进度将在这里展示。</p>
          <button onClick={() => navigate('/student/competitions')} className="btn-primary mt-4">
            去报名赛事
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-lg">
          {progressList.map((comp, idx) => (
            <motion.div
              key={comp.competitionId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="glass p-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-lg pb-md border-b border-hairline">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[19px] font-semibold text-ink">{comp.competitionName}</h2>
                    <span className="chip chip-primary !text-[11px]">{comp.competitionLevel}</span>
                  </div>
                  {comp.currentStage && (
                    <p className="text-[13px] text-ink-muted-80 mt-1">
                      当前阶段：<span className="text-primary font-medium">{comp.currentStage}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/student/competitions/${comp.competitionId}`)}
                  className="text-[13px] text-primary hover:text-primary-focus flex items-center gap-1"
                >
                  查看赛事详情
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              {/* Timeline */}
              <StageTimeline stages={comp.stages} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
