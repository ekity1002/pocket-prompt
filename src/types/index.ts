// Core type definitions for Pocket-Prompt Chrome Extension
// Based on design document interfaces.ts

export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  metadata: PromptMetadata;
}

export interface PromptMetadata {
  description?: string;
  author?: string;
  version: string;
  isPrivate: boolean;
  aiTarget?: AITarget[];
}

export type AITarget = 'chatgpt' | 'claude' | 'gemini';

// Chrome Extension Message Types
export interface ChromeMessage {
  type: ChromeMessageType;
  data?: unknown;
  tabId?: number;
  timestamp: Date;
  requestId: string;
}

export type ChromeMessageType =
  | 'GET_PROMPTS'
  | 'SAVE_PROMPT'
  | 'COPY_PROMPT'
  | 'EXPORT_CONVERSATION'
  | 'INSERT_TEXT'
  | 'GET_PAGE_INFO'
  | 'SYNC_DATA'
  | 'ERROR_REPORT';

export interface ChromeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
  requestId: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// Storage interfaces
export interface StorageData {
  prompts: Record<string, Prompt>;
  settings: UserSettings;
  metadata: StorageMetadata;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'ja' | 'en';
  features: FeatureFlags;
}

export interface FeatureFlags {
  tagManagement: boolean;
  searchFiltering: boolean;
  aiSiteIntegration: boolean;
  cloudSync: boolean;
  multiAiSupport: boolean;
}

export interface StorageMetadata {
  version: string;
  lastBackup?: Date;
  dataSize: number;
  encryptionEnabled: boolean;
}
