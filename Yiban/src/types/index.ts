export type UserRole = 'student' | 'teacher' | 'admin';
export type ActivityType = 'competition' | 'volunteer' | 'other';
export type ActivityStatus = 'draft' | 'published' | 'closed' | 'archived';
export type ParticipationStatus = 'submitted' | 'in_review' | 'approved' | 'rejected' | 'returned' | 'cancelled';
export type ReviewTaskStatus = 'pending' | 'processing' | 'resolved';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  studentId?: string;
}

export type CompetitionLevel = '国家级' | '省级' | '校级' | '院级';
export type CompetitionCategory = string;
export type CompetitionStatus = '报名中' | '进行中' | '已结束' | '即将截止';

export interface Competition {
  id: string;
  title: string;
  level: CompetitionLevel;
  category: CompetitionCategory;
  status: CompetitionStatus;
  organizer: string;
  deadline: string;
  description: string;
  views: number;
  teams: number;
  tags: string[];
  imageUrl?: string;
}

export type RegistrationStatus = '待提交成果' | '待审核' | '审核通过' | '审核驳回' | '已报名';

export interface Registration {
  id: string;
  competitionId: string;
  competitionTitle: string;
  studentId: string;
  studentName: string;
  status: RegistrationStatus;
  submitDate: string;
  teamName?: string;
  members?: string[];
}

export interface Submission {
  id: string;
  registrationId: string;
  studentName: string;
  competitionTitle: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  status: '待审核' | '审核通过' | '审核驳回';
  reviewNote?: string;
}

export interface GrowthRecord {
  dimension: string;
  score: number;
  maxScore: number;
}

export interface StudentGrowth {
  studentId: string;
  studentName: string;
  radar: GrowthRecord[];
  totalCompetitions: number;
  awards: number;
  completionRate: number;
}

export interface TeamPost {
  id: string;
  authorName: string;
  authorDept: string;
  competitionTitle: string;
  content: string;
  rolesNeeded: string;
  date: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  status: ActivityStatus;
  level?: string;
  category?: string;
  organizer?: string;
  startTime?: string;
  endTime?: string;
  activityStart?: string;
  activityEnd?: string;
  maxTeamSize?: number;
  maxParticipants?: number;
  coverUrl?: string;
  content?: string;
  tracks?: string[];
  tags?: string[];
  location?: string;
  serviceHours?: number;
}

export interface ActivityCategory {
  id: number;
  type: ActivityType;
  code: string;
  name: string;
  icon?: string;
  sortOrder?: number;
  status?: 'active' | 'disabled';
  createTime?: string;
  updateTime?: string;
}

export interface Participation {
  id: string;
  activityId: string;
  activityTitle: string;
  activityType: ActivityType;
  status: ParticipationStatus;
  teamName?: string;
  track?: string;
  submitDate?: string;
  reviewNote?: string;
}

export interface ReviewTask {
  id: string;
  activityType: ActivityType;
  targetType: 'registration' | 'submission' | 'participation';
  targetId: string;
  title: string;
  status: ReviewTaskStatus;
  submitterName?: string;
  deadline?: string;
}

// === Stage System ===

export interface CompetitionStage {
  id: number;
  competitionId: number;
  name: string;
  stageOrder: number;
  startTime?: string;
  endTime?: string;
  description?: string;
  status: 'upcoming' | 'active' | 'closed';
}

export type StageProgressStatus = 'not_started' | 'in_progress' | 'submitted' | 'passed' | 'failed';

export interface StudentStageProgress {
  progressId: number;
  stageId: number;
  stageName: string;
  stageOrder: number;
  startTime?: string;
  endTime?: string;
  description?: string;
  status: StageProgressStatus;
  submitTime?: string;
  reviewTime?: string;
  reviewNote?: string;
}

export interface CompetitionProgress {
  competitionId: number;
  competitionName: string;
  competitionLevel: string;
  currentStage?: string;
  stages: StudentStageProgress[];
}

// === Announcement ===

export type AnnouncementType = 'system' | 'competition' | 'stage';

export interface Announcement {
  id: number;
  competitionId?: number;
  stageId?: number;
  title: string;
  content: string;
  authorId: number;
  authorName?: string;
  type: AnnouncementType;
  isPinned: boolean;
  status: 'draft' | 'published';
  createTime: string;
  competitionName?: string;
}
