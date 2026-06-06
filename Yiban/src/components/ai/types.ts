export type AssistantTone = 'precise' | 'warm' | 'fast';
export type AvatarMotion = 'calm' | 'active' | 'still';
export type AvatarStyle = 'classic' | 'blue' | 'warm' | 'mint' | 'sunset';

export interface ChatImageAttachment {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  type: string;
}
