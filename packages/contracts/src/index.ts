export type Theme = 'dark' | 'light' | 'system';
export interface AppSettings {
  ollamaUrl: string;
  model: string;
  systemPrompt: string;
  followModelDefaults: boolean;
  temperature: number;
  numCtx: number;
  think: boolean | string | null;
  theme: Theme;
}
export type GenerationSettings = Pick<AppSettings, 'model' | 'systemPrompt' | 'followModelDefaults' | 'temperature' | 'numCtx' | 'think'>;
export interface ModelProfile extends GenerationSettings {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
export interface EffectiveConfiguration {
  settings: AppSettings;
  source: 'global' | 'project' | 'conversation';
  profileId?: string;
  hasOverrides: boolean;
}
export interface ModelInfo {
  name: string;
  size: number;
  modifiedAt: string;
  family?: string;
  parameterSize?: string;
  quantization?: string;
}
export interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  pinned?: boolean;
  parentId?: string;
  forkedFromMessageId?: string;
  sectionId?: string;
  /** Omitted means the global Ollama connection configured in settings. */
  endpointId?: string;
  profileId?: string;
  configOverrides?: Partial<GenerationSettings>;
}
export interface OllamaEndpoint {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}
export interface SidebarSection {
  id: string;
  name: string;
  position: number;
  createdAt: string;
  folderPath?: string;
  repository?: string;
  pinned?: boolean;
  profileId?: string;
}
export interface MessageActivity {
  id: string;
  kind: 'model' | 'hardware' | 'generation';
  label: string;
  status: 'running' | 'complete' | 'cancelled' | 'error';
  startedAt: string;
  completedAt?: string;
}
export const ATTACHMENT_LIMITS = {
  maxItems: 8,
  maxTextBytes: 262144,
  maxImageBytes: 4194304,
  maxTotalBytes: 8388608,
  maxImagePixels: 16777216,
  maxImageDimension: 8192,
} as const;
export interface AttachmentInput {
  name: string;
  kind: 'text' | 'image';
  mimeType: string;
  text?: string;
  /** Image bytes encoded as base64, without the data URL prefix. */
  data?: string;
}
export interface MessageAttachment extends AttachmentInput {
  id: string;
  size: number;
  width?: number;
  height?: number;
}
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  status: 'complete' | 'streaming' | 'cancelled' | 'error';
  model?: string;
  activities?: MessageActivity[];
  attachments?: MessageAttachment[];
}
export interface ConversationDetail {
  conversation: Conversation;
  messages: Message[];
}
export interface HealthResponse {
  status: 'ok';
  version: string;
  ollama: { connected: boolean; url: string; error?: string };
  storage: 'sqlite';
}
export interface ModelsResponse {
  models: ModelInfo[];
  connected: boolean;
  error?: string;
}
export interface ModelRecommendations {
  model: string;
  temperature: number | null;
  numCtx: number | null;
  contextLimit: number | null;
  think: boolean | string | null;
  thinkingValues: Array<boolean | string>;
  thinkingSupported: boolean | null;
  capabilities: string[];
  source: 'ollama';
  modelSizeBytes?: number;
  kvBytesPerToken?: number;
  effectiveNumCtx?: number;
  hardware?: HardwareAssessment;
}
export interface HardwareAssessment {
  ramTotalBytes: number | null;
  ramAvailableBytes: number | null;
  gpuName: string | null;
  gpuTotalBytes: number | null;
  gpuAvailableBytes: number | null;
  modelSizeBytes: number | null;
  contextCap: number;
  execution: 'gpu' | 'mixed' | 'cpu' | 'unknown';
  canRun: boolean | null;
  estimated: true;
  reason: string;
}
export type ChatStreamEvent =
  | { type: 'message'; message: Message }
  | { type: 'delta'; content: string }
  | { type: 'activity'; messageId: string; activity: MessageActivity }
  | { type: 'done'; message: Message }
  | { type: 'error'; error: string };
export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}
export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  temperature?: number;
  numCtx?: number;
  think?: boolean | string;
  signal?: AbortSignal;
}
