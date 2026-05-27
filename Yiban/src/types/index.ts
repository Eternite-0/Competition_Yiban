export type UserRole = 'student' | 'teacher' | 'admin';
export type ActivityType = 'competition' | 'volunteer';
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
export type CompetitionCategory = 'A' | 'B' | 'C';
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
  startTime?: string;
  endTime?: string;
  activityStart?: string;
  activityEnd?: string;
  tracks?: string[];
  tags?: string[];
  location?: string;
  serviceHours?: number;
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
