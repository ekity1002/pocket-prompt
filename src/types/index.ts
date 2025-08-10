// Core type definitions for Pocket-Prompt Chrome Extension
// Based on design document interfaces.ts

export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: PromptMetadata;
}

export interface PromptMetadata {
  usageCount: number;
  lastUsedAt?: string | null;
  isFavorite: boolean;
  sourceUrl?: string | null;
  aiModel?: string | null;
  description?: string;
  author?: string;
  version?: string;
  isPrivate?: boolean;
}

// Request/Response types for prompt operations
export interface CreatePromptRequest {
  title: string;
  content: string;
  tags?: string[];
  categoryId?: string | null;
  metadata?: Partial<PromptMetadata>;
}

export interface UpdatePromptRequest {
  title?: string;
  content?: string;
  tags?: string[];
  categoryId?: string | null;
  metadata?: Partial<PromptMetadata>;
}

export interface PromptSearchOptions {
  query?: string;
  tags?: string[];
  categoryId?: string | null;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'usageCount' | 'lastUsedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// AI Site types
export type SupportedAISite = 'chatgpt' | 'claude' | 'gemini';
export type AITarget = SupportedAISite; // Alias for backward compatibility

export interface AISiteInfo {
  name: string;
  url: string;
  provider: string;
  supportsExport: boolean;
  supportsTextInsertion: boolean;
  textareaSelector: string;
  conversationSelector: string;
  features: string[];
}

export interface TextInsertionOptions {
  append?: boolean;
  prepend?: boolean;
  replace?: boolean;
}

// Export types
export type ExportFormat = 'markdown' | 'json' | 'txt' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  saveToStorage?: boolean;
  filename?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ConversationData {
  title: string;
  messages: ConversationMessage[];
}

export interface ConversationExport {
  id: string;
  site: SupportedAISite;
  title: string;
  url: string;
  exportedAt: string;
  format: ExportFormat;
  data: ConversationData;
  metadata: {
    messageCount: number;
    exportVersion: string;
    userAgent: string;
  };
}

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
