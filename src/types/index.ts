export type ToolCategory = 'watermark' | 'video' | 'audio' | 'cover';

export type ToolId =
  | 'watermark'
  | 'trim'
  | 'compress'
  | 'aspect'
  | 'convert'
  | 'gif'
  | 'audio'
  | 'cover';

export interface ToolItem {
  id: ToolId;
  name: string;
  category: ToolCategory;
  description: string;
  badge?: string;
  iconName: string;
  isLocalOnly: boolean;
}

export interface VideoMetadata {
  name: string;
  size: number;
  type: string;
  duration: number;
  width: number;
  height: number;
  url: string;
}

export type ProcessingState =
  | 'idle'
  | 'loading_engine'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface ProcessingResult {
  data: Uint8Array | null;
  blobUrl: string | null;
  outputName: string;
  outputSize: number;
  mimeType: string;
}

export interface WatermarkParseResult {
  title: string;
  author?: string;
  platform: string;
  coverUrl: string;
  videoUrl: string;
  downloadUrl?: string;
  audioUrl?: string;
  qualityList?: { label: string; url: string }[];
  /** 作品形态：video 为普通视频；image_album 为图文作品（无视频流） */
  contentKind?: 'video' | 'image_album';
  /** 图文作品的图片（已由后端代理，可直接展示/抓取） */
  images?: string[];
  /** 图文作品的背景音乐地址与标题 */
  musicUrl?: string;
  musicTitle?: string;
}

export interface AdSlotProps {
  slotId?: string;
  format?: 'banner' | 'in-feed' | 'modal' | 'sidebar';
  className?: string;
}
