// =========================================
// Pocket-Prompt TypeScript インターフェース定義
// =========================================

// 🟢 青信号: 基本エンティティは要件REQ-001のプロンプト保存要件から直接設計

// =========================================
// Core Entities（コアエンティティ）
// =========================================

/**
 * プロンプトエンティティ
 * 要件REQ-001: プロンプトをタイトルと本文（複数行対応）で保存
 */
export interface Prompt {
  id: string;
  title: string;
  content: string; // 複数行対応
  tags: string[]; // 要件REQ-301: タグ管理（Option機能）
  category?: string; // 要件REQ-301: カテゴリ管理（Option機能）
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  metadata: PromptMetadata;
}

/**
 * プロンプトメタデータ
 */
export interface PromptMetadata {
  description?: string;
  author?: string;
  version: string;
  isPrivate: boolean;
  aiTarget?: AITarget[]; // 対象AIサービス
}

/**
 * AI対象サービス列挙
 * 🟢 青信号: ChatGPT必須、Claude/Geminiは要件REQ-303, REQ-304から直接定義
 */
export type AITarget = 'chatgpt' | 'claude' | 'gemini';

/**
 * タグエンティティ
 * 🟢 青信号: 要件REQ-301のタグ管理から直接設計
 */
export interface Tag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: Date;
  usageCount: number;
}

/**
 * カテゴリエンティティ
 * 🟢 青信号: 要件REQ-301のカテゴリ管理から直接設計
 */
export interface Category {
  id: string;
  name: string;
  parentId?: string; // 階層対応
  icon?: string;
  color?: string;
  description?: string;
  createdAt: Date;
  promptCount: number;
}

// =========================================
// Storage Interfaces（ストレージインターフェース）
// =========================================

/**
 * ストレージデータ構造
 * 🟢 青信号: 要件REQ-005のChrome.storage API要件から直接設計
 */
export interface StorageData {
  prompts: Record<string, Prompt>;
  tags: Record<string, Tag>;
  categories: Record<string, Category>;
  settings: UserSettings;
  metadata: StorageMetadata;
}

/**
 * ストレージメタデータ
 */
export interface StorageMetadata {
  version: string;
  lastBackup?: Date;
  dataSize: number;
  encryptionEnabled: boolean; // 要件NFR-102: データ暗号化
}

/**
 * ユーザー設定
 * 🟡 黄信号: 設定項目は一般的なChrome拡張設定から推測
 */
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'ja' | 'en';
  features: FeatureFlags;
  ui: UISettings;
  export: ExportSettings;
  sync: SyncSettings;
}

/**
 * 機能フラグ
 * 🟢 青信号: Option機能の有効/無効制御は要件REQ-301〜305から直接設計
 */
export interface FeatureFlags {
  tagManagement: boolean;
  searchFiltering: boolean;
  aiSiteIntegration: boolean;
  cloudSync: boolean;
  multiAiSupport: boolean;
}

/**
 * UI設定
 */
export interface UISettings {
  popupSize: 'small' | 'medium' | 'large';
  showUsageCount: boolean;
  showLastUsed: boolean;
  itemsPerPage: number;
  confirmBeforeDelete: boolean;
}

/**
 * エクスポート設定
 * 🟢 青信号: 要件REQ-003のエクスポート機能から直接設計
 */
export interface ExportSettings {
  defaultFormat: ExportFormat;
  includeMetadata: boolean;
  includeTags: boolean;
  dateFormat: string;
}

/**
 * 同期設定
 * 🟢 青信号: 要件REQ-305のクラウド同期から直接設計
 */
export interface SyncSettings {
  enabled: boolean;
  provider: 'google' | 'manual';
  autoSync: boolean;
  syncInterval: number; // minutes
  lastSync?: Date;
  conflictResolution: 'local' | 'remote' | 'manual';
}

// =========================================
// Export Interfaces（エクスポートインターフェース）
// =========================================

/**
 * 会話エクスポートデータ
 * 🟢 青信号: 要件REQ-003のChatGPTエクスポートから直接設計
 */
export interface ConversationExport {
  id: string;
  title: string;
  aiService: AITarget;
  url: string;
  exportedAt: Date;
  messages: ConversationMessage[];
  metadata: ConversationMetadata;
}

/**
 * 会話メッセージ
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

/**
 * メッセージメタデータ
 */
export interface MessageMetadata {
  model?: string;
  tokens?: number;
  attachments?: AttachmentInfo[];
}

/**
 * 添付ファイル情報
 */
export interface AttachmentInfo {
  type: 'image' | 'file' | 'code';
  name: string;
  size?: number;
  mimeType?: string;
}

/**
 * 会話メタデータ
 */
export interface ConversationMetadata {
  participantCount: number;
  messageCount: number;
  duration?: number; // minutes
  topics?: string[];
  summary?: string;
}

/**
 * エクスポート形式
 * 🟢 青信号: Markdown必須は要件REQ-003から、その他は一般的なエクスポート形式
 */
export type ExportFormat = 'markdown' | 'json' | 'txt' | 'html' | 'pdf';

/**
 * エクスポート結果
 */
export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  data?: string | Blob;
  filename: string;
  size: number;
  error?: ExportError;
}

/**
 * エクスポートエラー
 */
export interface ExportError {
  code: ExportErrorCode;
  message: string;
  details?: any;
}

/**
 * エクスポートエラーコード
 * 🟡 黄信号: エラーコードは一般的なエクスポートエラーから推測
 */
export type ExportErrorCode = 
  | 'CONVERSATION_NOT_FOUND'
  | 'UNSUPPORTED_FORMAT'
  | 'DATA_TOO_LARGE'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'PARSING_ERROR';

// =========================================
// AI Site Integration Interfaces（AIサイト連携インターフェース）
// =========================================

/**
 * AIサイトコネクタインターフェース
 * 🟢 青信号: 要件REQ-303の直接ペースト機能から設計
 */
export interface IAISiteConnector {
  getServiceName(): AITarget;
  isSupported(url: string): boolean;
  findInputElement(document: Document): HTMLElement | null;
  insertText(element: HTMLElement, text: string): Promise<boolean>;
  extractConversation(document: Document): Promise<ConversationMessage[]>;
  getConversationMetadata(document: Document): Promise<ConversationMetadata>;
}

/**
 * DOM操作結果
 */
export interface DOMOperationResult {
  success: boolean;
  element?: HTMLElement;
  error?: DOMError;
}

/**
 * DOM操作エラー
 */
export interface DOMError {
  code: DOMErrorCode;
  message: string;
  selector?: string;
}

/**
 * DOM操作エラーコード
 * 🟡 黄信号: DOM操作エラーは一般的なWebスクレイピングエラーから推測
 */
export type DOMErrorCode = 
  | 'ELEMENT_NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'READONLY_ELEMENT'
  | 'NAVIGATION_ERROR'
  | 'TIMEOUT_ERROR';

// =========================================
// Search & Filter Interfaces（検索・フィルターインターフェース）
// =========================================

/**
 * 検索クエリ
 * 🟢 青信号: 要件REQ-302の検索機能から直接設計
 */
export interface SearchQuery {
  keyword?: string;
  tags?: string[];
  categories?: string[];
  aiTarget?: AITarget[];
  dateRange?: DateRange;
  sortBy: SearchSortBy;
  sortOrder: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * 日付範囲
 */
export interface DateRange {
  from?: Date;
  to?: Date;
}

/**
 * 検索ソート基準
 */
export type SearchSortBy = 
  | 'createdAt'
  | 'updatedAt'
  | 'lastUsedAt'
  | 'usageCount'
  | 'title'
  | 'relevance';

/**
 * 検索結果
 */
export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  query: SearchQuery;
  executionTime: number;
}

/**
 * 検索統計
 */
export interface SearchStats {
  totalItems: number;
  matchedItems: number;
  categories: Record<string, number>;
  tags: Record<string, number>;
  aiTargets: Record<AITarget, number>;
}

// =========================================
// API Response Interfaces（APIレスポンスインターフェース）
// =========================================

/**
 * 基本APIレスポンス
 * 🟡 黄信号: 内部API通信構造は一般的なAPI設計から推測
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
  requestId?: string;
}

/**
 * APIエラー
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

/**
 * ページネーション情報
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =========================================
// Event Interfaces（イベントインターフェース）
// =========================================

/**
 * アプリケーションイベント
 * 🟡 黄信号: イベント駆動設計は一般的なChrome拡張パターンから推測
 */
export type AppEvent = 
  | PromptEvent
  | StorageEvent
  | ExportEvent
  | SyncEvent
  | ErrorEvent;

/**
 * プロンプトイベント
 */
export interface PromptEvent {
  type: 'prompt.created' | 'prompt.updated' | 'prompt.deleted' | 'prompt.used';
  promptId: string;
  data?: Partial<Prompt>;
  timestamp: Date;
}

/**
 * ストレージイベント
 */
export interface StorageEvent {
  type: 'storage.saved' | 'storage.loaded' | 'storage.cleared' | 'storage.error';
  key?: string;
  data?: any;
  error?: ApiError;
  timestamp: Date;
}

/**
 * エクスポートイベント
 */
export interface ExportEvent {
  type: 'export.started' | 'export.completed' | 'export.failed';
  exportId: string;
  format: ExportFormat;
  data?: ExportResult;
  error?: ExportError;
  timestamp: Date;
}

/**
 * 同期イベント
 */
export interface SyncEvent {
  type: 'sync.started' | 'sync.completed' | 'sync.failed' | 'sync.conflict';
  syncId: string;
  data?: any;
  error?: ApiError;
  timestamp: Date;
}

/**
 * エラーイベント
 */
export interface ErrorEvent {
  type: 'error.occurred';
  source: string;
  error: Error | ApiError | ExportError | DOMError;
  context?: any;
  timestamp: Date;
}

// =========================================
// Validation Interfaces（バリデーションインターフェース）
// =========================================

/**
 * バリデーション結果
 * 🟡 黄信号: バリデーション機能は一般的なデータ検証要件から推測
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

/**
 * バリデーションエラー
 */
export interface ValidationError {
  field: string;
  code: ValidationErrorCode;
  message: string;
  value?: any;
}

/**
 * バリデーション警告
 */
export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
}

/**
 * バリデーションエラーコード
 */
export type ValidationErrorCode =
  | 'REQUIRED'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_FORMAT'
  | 'DUPLICATE'
  | 'INVALID_TYPE';

// =========================================
// Performance & Monitoring Interfaces（パフォーマンス・監視インターフェース）
// =========================================

/**
 * パフォーマンス指標
 * 🟡 黄信号: パフォーマンス監視は要件NFR-001〜003から推測
 */
export interface PerformanceMetrics {
  popupLoadTime: number;
  searchResponseTime: number;
  exportTime: number;
  copyTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  errorRate: number;
  timestamp: Date;
}

/**
 * 使用統計
 */
export interface UsageStats {
  totalPrompts: number;
  totalUsage: number;
  topPrompts: Array<{ promptId: string; usageCount: number }>;
  topTags: Array<{ tag: string; usageCount: number }>;
  aiServiceUsage: Record<AITarget, number>;
  dailyStats: DailyUsageStats[];
}

/**
 * 日別使用統計
 */
export interface DailyUsageStats {
  date: Date;
  promptsCreated: number;
  promptsUsed: number;
  exportsPerformed: number;
  averageResponseTime: number;
}

// =========================================
// Chrome Extension Specific Interfaces（Chrome拡張固有インターフェース）
// =========================================

/**
 * Chrome拡張メッセージ
 * 🟢 青信号: Chrome拡張通信は技術要件から直接設計
 */
export interface ChromeMessage {
  type: ChromeMessageType;
  data?: any;
  tabId?: number;
  timestamp: Date;
  requestId: string;
}

/**
 * Chrome拡張メッセージタイプ
 */
export type ChromeMessageType =
  | 'GET_PROMPTS'
  | 'SAVE_PROMPT' 
  | 'COPY_PROMPT'
  | 'EXPORT_CONVERSATION'
  | 'INSERT_TEXT'
  | 'GET_PAGE_INFO'
  | 'SYNC_DATA'
  | 'ERROR_REPORT';

/**
 * Chrome拡張レスポンス
 */
export interface ChromeResponse<T = any> extends ApiResponse<T> {
  messageType: ChromeMessageType;
  requestId: string;
}

/**
 * タブ情報
 */
export interface TabInfo {
  id: number;
  url: string;
  title: string;
  aiService?: AITarget;
  isSupported: boolean;
  lastAccessed: Date;
}

// =========================================
// Type Guards & Utilities（型ガード・ユーティリティ）
// =========================================

/**
 * プロンプト型ガード
 */
export function isPrompt(obj: any): obj is Prompt {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.content === 'string' &&
    Array.isArray(obj.tags);
}

/**
 * AITarget型ガード
 */
export function isAITarget(value: string): value is AITarget {
  return ['chatgpt', 'claude', 'gemini'].includes(value);
}

/**
 * エクスポート形式型ガード
 */
export function isExportFormat(value: string): value is ExportFormat {
  return ['markdown', 'json', 'txt', 'html', 'pdf'].includes(value);
}

// =========================================
// Constants（定数定義）
// =========================================

/**
 * アプリケーション定数
 * 🟡 黄信号: 制限値は要件の境界値テストとChrome拡張制約から推測
 */
export const APP_CONSTANTS = {
  MAX_PROMPT_CONTENT_LENGTH: 10000, // 要件EDGE-101
  MAX_PROMPTS_COUNT: 1000, // 要件EDGE-102
  MAX_EXPORT_CONVERSATIONS: 50, // 要件EDGE-103
  MIN_SEARCH_QUERY_LENGTH: 2,
  DEFAULT_PAGE_SIZE: 20,
  CACHE_DURATION: 300000, // 5 minutes
  SYNC_INTERVAL: 900000, // 15 minutes
  MAX_TAG_LENGTH: 50,
  MAX_CATEGORY_DEPTH: 3,
} as const;

/**
 * エラーメッセージ
 */
export const ERROR_MESSAGES = {
  PROMPT_TITLE_REQUIRED: 'プロンプトのタイトルは必須です',
  PROMPT_CONTENT_REQUIRED: 'プロンプトの本文は必須です',
  PROMPT_CONTENT_TOO_LONG: 'プロンプトの本文が長すぎます',
  STORAGE_QUOTA_EXCEEDED: 'ストレージ容量が不足しています',
  EXPORT_FAILED: 'エクスポートに失敗しました',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  PERMISSION_DENIED: '権限が不足しています',
} as const;

// 🟢 青信号: TypeScriptインターフェース設計は要件定義書の全要件を網羅して直接構築