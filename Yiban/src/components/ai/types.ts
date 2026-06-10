export type AvatarMotion = 'calm' | 'active' | 'still';
export type AvatarStyle = 'classic' | 'blue' | 'warm' | 'mint' | 'sunset';

export interface ChatImageAttachment {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  type: string;
}

export interface AiSourceSummary {
  label: string;
  count?: number;
}

export interface AiToolProgress {
  message: string;
  createTime?: string;
}
