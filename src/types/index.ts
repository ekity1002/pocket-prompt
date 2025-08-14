// Core type definitions for Pocket-Prompt Chrome Extension
// TASK-0005: Enhanced TypeScript interfaces with type guards and validation
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
  // TASK-0019: Export history options
  forceDuplicate?: boolean;
  url?: string;
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

// TASK-0019: Export History Management Types
export interface ExportHistoryEntry {
  exportId: string;
  title: string;
  site: SupportedAISite;
  format: ExportFormat;
  exportedAt: string;
  url: string;
  fileSize: number;
  messageCount: number;
}

export interface ExportStatistics {
  totalExports: number;
  totalFileSize: number;
  averageFileSize: number;
  totalMessages: number;
  averageMessages: number;
  siteBreakdown: Record<SupportedAISite, number>;
  formatBreakdown: Record<ExportFormat, number>;
  oldestExport: string | null;
  newestExport: string | null;
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
  | 'UPDATE_PROMPT'
  | 'DELETE_PROMPT'
  | 'COPY_PROMPT'
  | 'SEARCH_PROMPTS'
  | 'EXPORT_CONVERSATION'
  | 'SAVE_CONVERSATION'
  | 'GET_CONVERSATIONS'
  | 'UPDATE_CONVERSATION'
  | 'DELETE_CONVERSATION'
  | 'GET_CONVERSATION_DATA'
  | 'GET_STORAGE_STATS'
  | 'BULK_OPERATIONS'
  | 'INSERT_TEXT'
  | 'GET_PAGE_INFO'
  | 'SYNC_DATA'
  | 'BACKGROUND_EVENT'
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

// Clipboard API interfaces
export interface ClipboardResult {
  success: boolean;
  error?: string;
  timestamp: Date;
  metrics?: ClipboardMetrics;
  debugInfo?: ClipboardDebugInfo;
}

export interface ClipboardMetrics {
  duration: number;
  textLength: number;
  retryCount: number;
}

export interface ClipboardDebugInfo {
  originalError?: Error;
  userAgent: string;
  clipboardApiSupported: boolean;
  permissionsGranted: boolean;
}

// Error Management Types
export type {
  ErrorLevel,
  ErrorContext,
  ReproductionContext,
  StructuredLogEntry,
  UserErrorInfo,
  ErrorAction,
  ErrorStatistics,
  ChromeExtensionError,
} from './error-types';

// Storage interfaces
export interface StorageData {
  prompts: Prompt[];
  settings: Settings;
  categories: string[];
  tags: string[];
}

// Legacy type mappings for backward compatibility
export type UserSettings = Settings;

export interface Settings {
  theme: 'system' | 'light' | 'dark' | 'auto';
  autoSave: boolean;
  syncEnabled: boolean;
  autoTag: boolean;
  exportFormat: ExportFormat;
  shortcuts: {
    capture: string;
    toggle: string;
  };
}

export interface PromptFilter {
  category?: string;
  tags?: string[];
  searchQuery?: string;
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface PromptListOptions {
  filter?: PromptFilter;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'category';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// UserSettings is now an alias for Settings - keeping this for legacy compatibility
// The actual interface is defined above

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

// ========================================
// CONSTANTS & CONFIGURATION
// ========================================

export const POCKET_PROMPT_CONSTANTS = {
  // Storage limits
  MAX_STORAGE_SIZE: 5 * 1024 * 1024, // 5MB Chrome extension limit
  MAX_PROMPTS_COUNT: 1000,
  MAX_PROMPT_CONTENT_LENGTH: 10000,
  MAX_TAG_COUNT: 50,
  MAX_TAG_LENGTH: 50,

  // Version info
  STORAGE_VERSION: '1.0.0',
  API_VERSION: '1.0.0',
  MANIFEST_VERSION: 3,

  // Chrome extension
  EXTENSION_ID: (typeof chrome !== 'undefined' && chrome?.runtime?.id) || 'pocket-prompt-dev',

  // AI Site configurations
  SUPPORTED_AI_SITES: ['chatgpt', 'claude', 'gemini'] as const,
  SITE_SELECTORS: {
    chatgpt: {
      textarea: 'textarea[placeholder*="Send a message"]',
      conversation: '[data-testid^="conversation-turn-"]',
      url: 'https://chat.openai.com',
    },
    claude: {
      textarea: 'div[contenteditable="true"]',
      conversation: '[data-testid="chat-turn"]',
      url: 'https://claude.ai',
    },
    gemini: {
      textarea: 'textarea[placeholder*="Enter a prompt here"]',
      conversation: '.conversation-container .message',
      url: 'https://gemini.google.com',
    },
  },

  // Export settings
  EXPORT_FORMATS: ['markdown', 'json', 'txt', 'csv'] as const,
  DEFAULT_EXPORT_FORMAT: 'markdown' as ExportFormat,

  // UI settings
  THEMES: ['light', 'dark', 'auto'] as const,
  LANGUAGES: ['ja', 'en'] as const,
  DEFAULT_LANGUAGE: 'ja' as 'ja' | 'en',

  // Performance limits
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 5000,
  MODAL_TRANSITION_DURATION: 200,

  // Error codes
  ERROR_CODES: {
    STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
    INVALID_PROMPT_DATA: 'INVALID_PROMPT_DATA',
    AI_SITE_NOT_DETECTED: 'AI_SITE_NOT_DETECTED',
    EXPORT_FAILED: 'EXPORT_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
  } as const,
} as const;

// Type-safe constants
export type SupportedAISiteConstant = (typeof POCKET_PROMPT_CONSTANTS.SUPPORTED_AI_SITES)[number];
export type ExportFormatConstant = (typeof POCKET_PROMPT_CONSTANTS.EXPORT_FORMATS)[number];
export type ThemeConstant = (typeof POCKET_PROMPT_CONSTANTS.THEMES)[number];
export type LanguageConstant = (typeof POCKET_PROMPT_CONSTANTS.LANGUAGES)[number];
export type ErrorCodeConstant = keyof typeof POCKET_PROMPT_CONSTANTS.ERROR_CODES;

// ========================================
// TYPE GUARDS & VALIDATION
// ========================================

/**
 * Type guard for Prompt interface
 */
export function isPrompt(obj: unknown): obj is Prompt {
  if (typeof obj !== 'object' || obj === null) return false;

  const p = obj as Record<string, unknown>;

  return (
    typeof p['id'] === 'string' &&
    typeof p['title'] === 'string' &&
    typeof p['content'] === 'string' &&
    Array.isArray(p['tags']) &&
    p['tags'].every((tag: unknown) => typeof tag === 'string') &&
    (p['categoryId'] === undefined ||
      p['categoryId'] === null ||
      typeof p['categoryId'] === 'string') &&
    typeof p['createdAt'] === 'string' &&
    typeof p['updatedAt'] === 'string' &&
    isPromptMetadata(p['metadata'])
  );
}

/**
 * Type guard for PromptMetadata interface
 */
export function isPromptMetadata(obj: unknown): obj is PromptMetadata {
  if (typeof obj !== 'object' || obj === null) return false;

  const m = obj as Record<string, unknown>;

  return (
    typeof m['usageCount'] === 'number' &&
    (m['lastUsedAt'] === undefined ||
      m['lastUsedAt'] === null ||
      typeof m['lastUsedAt'] === 'string') &&
    typeof m['isFavorite'] === 'boolean' &&
    (m['sourceUrl'] === undefined ||
      m['sourceUrl'] === null ||
      typeof m['sourceUrl'] === 'string') &&
    (m['aiModel'] === undefined || m['aiModel'] === null || typeof m['aiModel'] === 'string') &&
    (m['description'] === undefined || typeof m['description'] === 'string') &&
    (m['author'] === undefined || typeof m['author'] === 'string') &&
    (m['version'] === undefined || typeof m['version'] === 'string') &&
    (m['isPrivate'] === undefined || typeof m['isPrivate'] === 'boolean')
  );
}

/**
 * Type guard for SupportedAISite
 */
export function isSupportedAISite(site: unknown): site is SupportedAISite {
  return (
    typeof site === 'string' &&
    (POCKET_PROMPT_CONSTANTS.SUPPORTED_AI_SITES as readonly string[]).includes(site)
  );
}

/**
 * Type guard for ExportFormat
 */
export function isExportFormat(format: unknown): format is ExportFormat {
  return (
    typeof format === 'string' &&
    (POCKET_PROMPT_CONSTANTS.EXPORT_FORMATS as readonly string[]).includes(format)
  );
}

/**
 * Type guard for UserSettings
 */
export function isUserSettings(obj: unknown): obj is UserSettings {
  if (typeof obj !== 'object' || obj === null) return false;

  const s = obj as Record<string, unknown>;

  return (
    (POCKET_PROMPT_CONSTANTS.THEMES as readonly string[]).includes(s['theme'] as string) &&
    (POCKET_PROMPT_CONSTANTS.LANGUAGES as readonly string[]).includes(s['language'] as string) &&
    isFeatureFlags(s['features'])
  );
}

/**
 * Type guard for FeatureFlags
 */
export function isFeatureFlags(obj: unknown): obj is FeatureFlags {
  if (typeof obj !== 'object' || obj === null) return false;

  const f = obj as Record<string, unknown>;

  return (
    typeof f['tagManagement'] === 'boolean' &&
    typeof f['searchFiltering'] === 'boolean' &&
    typeof f['aiSiteIntegration'] === 'boolean' &&
    typeof f['cloudSync'] === 'boolean' &&
    typeof f['multiAiSupport'] === 'boolean'
  );
}

/**
 * Type guard for ChromeMessage
 */
export function isChromeMessage(obj: unknown): obj is ChromeMessage {
  if (typeof obj !== 'object' || obj === null) return false;

  const m = obj as Record<string, unknown>;

  return (
    typeof m['type'] === 'string' &&
    [
      'GET_PROMPTS',
      'SAVE_PROMPT',
      'COPY_PROMPT',
      'EXPORT_CONVERSATION',
      'INSERT_TEXT',
      'GET_PAGE_INFO',
      'SYNC_DATA',
      'ERROR_REPORT',
    ].includes(m['type'] as string) &&
    (m['tabId'] === undefined || typeof m['tabId'] === 'number') &&
    m['timestamp'] instanceof Date &&
    typeof m['requestId'] === 'string'
  );
}

/**
 * Type guard for ConversationExport
 */
export function isConversationExport(obj: unknown): obj is ConversationExport {
  if (typeof obj !== 'object' || obj === null) return false;

  const e = obj as Record<string, unknown>;

  return (
    typeof e['id'] === 'string' &&
    isSupportedAISite(e['site']) &&
    typeof e['title'] === 'string' &&
    typeof e['url'] === 'string' &&
    typeof e['exportedAt'] === 'string' &&
    isExportFormat(e['format']) &&
    isConversationData(e['data']) &&
    typeof e['metadata'] === 'object' &&
    e['metadata'] !== null
  );
}

/**
 * Type guard for ConversationData
 */
export function isConversationData(obj: unknown): obj is ConversationData {
  if (typeof obj !== 'object' || obj === null) return false;

  const d = obj as Record<string, unknown>;

  return (
    typeof d['title'] === 'string' &&
    Array.isArray(d['messages']) &&
    (d['messages'] as unknown[]).every(isConversationMessage)
  );
}

/**
 * Type guard for ConversationMessage
 */
export function isConversationMessage(obj: unknown): obj is ConversationMessage {
  if (typeof obj !== 'object' || obj === null) return false;

  const m = obj as Record<string, unknown>;

  return (
    (m['role'] === 'user' || m['role'] === 'assistant') &&
    typeof m['content'] === 'string' &&
    (m['timestamp'] === undefined || typeof m['timestamp'] === 'string')
  );
}

// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * Validates prompt content constraints
 */
export function validatePromptContent(content: string): string[] {
  const errors: string[] = [];

  if (!content.trim()) {
    errors.push('Prompt content cannot be empty');
  }

  if (content.length > POCKET_PROMPT_CONSTANTS.MAX_PROMPT_CONTENT_LENGTH) {
    errors.push(
      `Prompt content cannot exceed ${POCKET_PROMPT_CONSTANTS.MAX_PROMPT_CONTENT_LENGTH} characters`
    );
  }

  return errors;
}

/**
 * Validates prompt title constraints
 */
export function validatePromptTitle(title: string): string[] {
  const errors: string[] = [];

  if (!title.trim()) {
    errors.push('Prompt title cannot be empty');
  }

  if (title.length > 200) {
    errors.push('Prompt title cannot exceed 200 characters');
  }

  return errors;
}

/**
 * Validates tag constraints
 */
export function validateTags(tags: string[]): string[] {
  const errors: string[] = [];

  if (tags.length > POCKET_PROMPT_CONSTANTS.MAX_TAG_COUNT) {
    errors.push(`Cannot have more than ${POCKET_PROMPT_CONSTANTS.MAX_TAG_COUNT} tags`);
  }

  for (const tag of tags) {
    if (!tag.trim()) {
      errors.push('Tags cannot be empty');
    }

    if (tag.length > POCKET_PROMPT_CONSTANTS.MAX_TAG_LENGTH) {
      errors.push(`Tag "${tag}" exceeds ${POCKET_PROMPT_CONSTANTS.MAX_TAG_LENGTH} characters`);
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(tag)) {
      errors.push(`Tag "${tag}" contains invalid characters`);
    }
  }

  // Check for duplicates
  const uniqueTags = new Set(tags.map((tag) => tag.toLowerCase().trim()));
  if (uniqueTags.size !== tags.length) {
    errors.push('Duplicate tags are not allowed');
  }

  return errors;
}

/**
 * Validates CreatePromptRequest
 */
export function validateCreatePromptRequest(request: unknown): request is CreatePromptRequest {
  if (typeof request !== 'object' || request === null) return false;

  const r = request as Record<string, unknown>;

  const titleErrors = validatePromptTitle(r['title'] as string);
  const contentErrors = validatePromptContent(r['content'] as string);
  const tagErrors = validateTags((r['tags'] as string[]) || []);

  return titleErrors.length === 0 && contentErrors.length === 0 && tagErrors.length === 0;
}

/**
 * Creates default UserSettings
 */
export function createDefaultUserSettings(): Settings {
  return {
    theme: 'auto',
    autoSave: true,
    syncEnabled: true,
    autoTag: true,
    exportFormat: POCKET_PROMPT_CONSTANTS.DEFAULT_EXPORT_FORMAT,
    shortcuts: {
      capture: 'Alt+Shift+C',
      toggle: 'Alt+Shift+P',
    },
  };
}

/**
 * Creates default PromptMetadata
 */
export function createDefaultPromptMetadata(): PromptMetadata {
  return {
    usageCount: 0,
    lastUsedAt: null,
    isFavorite: false,
    sourceUrl: null,
    aiModel: null,
  };
}

/**
 * Generates unique ID for prompts
 */
export function generatePromptId(): string {
  return `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generates unique ID for requests
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
