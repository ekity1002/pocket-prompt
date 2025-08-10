# Pocket-Prompt API エンドポイント仕様

## API概要

Pocket-Prompt Chrome拡張は、Chrome拡張のメッセージパッシングシステムを使用した内部API通信を行います。従来のRESTful APIではなく、chrome.runtime.sendMessage/onMessageを使用したイベント駆動型のAPI設計となります。

🟢 **青信号**: Chrome拡張内部API設計は技術要件と拡張機能制約から直接構築

## API通信フロー

### Chrome拡張メッセージパッシング構造

```
Popup UI ←→ Background Service Worker ←→ Content Scripts ←→ AI Sites
    ↕                       ↕
Options Page        Chrome Storage API
```

## 内部API エンドポイント

### 1. プロンプト管理API

#### 1.1 プロンプト一覧取得

**Message Type**: `GET_PROMPTS`
**From**: Popup/Options → Background
**To**: Background → Storage

```typescript
// Request
interface GetPromptsRequest extends ChromeMessage {
  type: 'GET_PROMPTS';
  data: {
    query?: SearchQuery;
    pagination?: {
      page: number;
      pageSize: number;
    };
  };
}

// Response
interface GetPromptsResponse extends ChromeResponse<Prompt[]> {
  data: {
    prompts: Prompt[];
    totalCount: number;
    hasMore: boolean;
  };
}
```

🟢 **青信号**: プロンプト取得は要件REQ-101の一覧表示から直接設計

#### 1.2 プロンプト保存

**Message Type**: `SAVE_PROMPT`
**From**: Popup/Options → Background
**To**: Background → Storage

```typescript
// Request
interface SavePromptRequest extends ChromeMessage {
  type: 'SAVE_PROMPT';
  data: {
    prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>;
    options?: {
      overwrite?: boolean;
      backup?: boolean;
    };
  };
}

// Response
interface SavePromptResponse extends ChromeResponse<Prompt> {
  data: {
    prompt: Prompt;
    isNew: boolean;
  };
}
```

🟢 **青信号**: プロンプト保存は要件REQ-001から直接設計

#### 1.3 プロンプト更新

**Message Type**: `UPDATE_PROMPT`
**From**: Options → Background
**To**: Background → Storage

```typescript
// Request
interface UpdatePromptRequest extends ChromeMessage {
  type: 'UPDATE_PROMPT';
  data: {
    id: string;
    updates: Partial<Prompt>;
    options?: {
      incrementUsage?: boolean;
      updateLastUsed?: boolean;
    };
  };
}

// Response
interface UpdatePromptResponse extends ChromeResponse<Prompt> {
  data: {
    prompt: Prompt;
    previousVersion?: Prompt;
  };
}
```

#### 1.4 プロンプト削除

**Message Type**: `DELETE_PROMPT`
**From**: Options → Background
**To**: Background → Storage

```typescript
// Request
interface DeletePromptRequest extends ChromeMessage {
  type: 'DELETE_PROMPT';
  data: {
    id: string;
    options?: {
      backup?: boolean;
      force?: boolean;
    };
  };
}

// Response
interface DeletePromptResponse extends ChromeResponse<boolean> {
  data: {
    success: boolean;
    deletedPrompt?: Prompt;
  };
}
```

### 2. クリップボード操作API

#### 2.1 プロンプトコピー

**Message Type**: `COPY_PROMPT`
**From**: Popup → Background
**To**: Background → Clipboard API

```typescript
// Request
interface CopyPromptRequest extends ChromeMessage {
  type: 'COPY_PROMPT';
  data: {
    promptId: string;
    options?: {
      format?: 'plain' | 'markdown' | 'formatted';
      includeMetadata?: boolean;
      trackUsage?: boolean;
    };
  };
}

// Response
interface CopyPromptResponse extends ChromeResponse<string> {
  data: {
    content: string;
    copiedAt: Date;
    promptId: string;
  };
}
```

🟢 **青信号**: ワンクリックコピーは要件REQ-002から直接設計

### 3. AIサイト連携API

#### 3.1 ページ情報取得

**Message Type**: `GET_PAGE_INFO`
**From**: Popup → Content Script
**To**: Content Script → AI Site DOM

```typescript
// Request
interface GetPageInfoRequest extends ChromeMessage {
  type: 'GET_PAGE_INFO';
  data: {
    detectAI?: boolean;
    getInputElements?: boolean;
  };
}

// Response
interface GetPageInfoResponse extends ChromeResponse<TabInfo> {
  data: {
    tabInfo: TabInfo;
    aiService?: AITarget;
    inputElements?: DOMElement[];
    isConversationPage: boolean;
  };
}
```

#### 3.2 テキスト挿入（Option機能）

**Message Type**: `INSERT_TEXT`
**From**: Popup → Content Script
**To**: Content Script → AI Site Input

```typescript
// Request
interface InsertTextRequest extends ChromeMessage {
  type: 'INSERT_TEXT';
  data: {
    text: string;
    targetElement?: string; // CSS selector
    options?: {
      replace?: boolean;
      append?: boolean;
      triggerEvents?: boolean;
    };
  };
}

// Response
interface InsertTextResponse extends ChromeResponse<boolean> {
  data: {
    success: boolean;
    insertedAt: Date;
    targetElement: string;
  };
}
```

🟢 **青信号**: 直接ペースト機能は要件REQ-303から直接設計

#### 3.3 会話履歴エクスポート

**Message Type**: `EXPORT_CONVERSATION`
**From**: Popup → Content Script
**To**: Content Script → AI Site DOM

```typescript
// Request
interface ExportConversationRequest extends ChromeMessage {
  type: 'EXPORT_CONVERSATION';
  data: {
    format: ExportFormat;
    options?: {
      includeMetadata?: boolean;
      includeTitles?: boolean;
      dateRange?: DateRange;
      maxMessages?: number;
    };
  };
}

// Response
interface ExportConversationResponse extends ChromeResponse<ExportResult> {
  data: {
    exportResult: ExportResult;
    conversation: ConversationExport;
    downloadUrl?: string;
  };
}
```

🟢 **青信号**: 会話エクスポートは要件REQ-003から直接設計

### 4. 検索・フィルタリングAPI（Option機能）

#### 4.1 プロンプト検索

**Message Type**: `SEARCH_PROMPTS`
**From**: Popup/Options → Background
**To**: Background → Storage + Search Engine

```typescript
// Request
interface SearchPromptsRequest extends ChromeMessage {
  type: 'SEARCH_PROMPTS';
  data: {
    query: SearchQuery;
    options?: {
      fuzzy?: boolean;
      highlightMatches?: boolean;
      cacheResults?: boolean;
    };
  };
}

// Response
interface SearchPromptsResponse extends ChromeResponse<SearchResult<Prompt>> {
  data: {
    results: SearchResult<Prompt>;
    stats: SearchStats;
    suggestions?: string[];
  };
}
```

🟢 **青信号**: 検索機能は要件REQ-302から直接設計

#### 4.2 タグ・カテゴリ検索

**Message Type**: `SEARCH_TAGS`
**From**: Options → Background
**To**: Background → Storage

```typescript
// Request
interface SearchTagsRequest extends ChromeMessage {
  type: 'SEARCH_TAGS';
  data: {
    query: string;
    type: 'tags' | 'categories' | 'both';
    options?: {
      limit?: number;
      sortBy?: 'name' | 'usageCount' | 'createdAt';
    };
  };
}

// Response
interface SearchTagsResponse extends ChromeResponse<(Tag | Category)[]> {
  data: {
    tags?: Tag[];
    categories?: Category[];
    totalCount: number;
  };
}
```

### 5. 設定管理API

#### 5.1 設定取得

**Message Type**: `GET_SETTINGS`
**From**: Popup/Options → Background
**To**: Background → Storage

```typescript
// Request
interface GetSettingsRequest extends ChromeMessage {
  type: 'GET_SETTINGS';
  data: {
    keys?: string[]; // 特定の設定キーのみ取得
  };
}

// Response
interface GetSettingsResponse extends ChromeResponse<UserSettings> {
  data: {
    settings: UserSettings;
    version: string;
    lastUpdated: Date;
  };
}
```

#### 5.2 設定更新

**Message Type**: `UPDATE_SETTINGS`
**From**: Options → Background
**To**: Background → Storage

```typescript
// Request
interface UpdateSettingsRequest extends ChromeMessage {
  type: 'UPDATE_SETTINGS';
  data: {
    updates: Partial<UserSettings>;
    options?: {
      merge?: boolean;
      validate?: boolean;
    };
  };
}

// Response
interface UpdateSettingsResponse extends ChromeResponse<UserSettings> {
  data: {
    settings: UserSettings;
    changedKeys: string[];
    requiresReload?: boolean;
  };
}
```

### 6. 同期API（Option機能）

#### 6.1 クラウド同期実行

**Message Type**: `SYNC_DATA`
**From**: Options → Background
**To**: Background → Google Drive API

```typescript
// Request
interface SyncDataRequest extends ChromeMessage {
  type: 'SYNC_DATA';
  data: {
    syncType: 'full' | 'incremental' | 'backup';
    options?: {
      force?: boolean;
      resolveConflicts?: boolean;
      dryRun?: boolean;
    };
  };
}

// Response
interface SyncDataResponse extends ChromeResponse<SyncResult> {
  data: {
    syncResult: SyncResult;
    conflicts?: SyncConflict[];
    backupCreated?: boolean;
  };
}

interface SyncResult {
  success: boolean;
  syncedItems: number;
  errors: SyncError[];
  duration: number;
  lastSyncAt: Date;
}
```

🟢 **青信号**: クラウド同期は要件REQ-305から直接設計

#### 6.2 同期状態確認

**Message Type**: `GET_SYNC_STATUS`
**From**: Options → Background

```typescript
// Request
interface GetSyncStatusRequest extends ChromeMessage {
  type: 'GET_SYNC_STATUS';
}

// Response
interface GetSyncStatusResponse extends ChromeResponse<SyncStatus> {
  data: {
    status: SyncStatus;
    pendingChanges: number;
    lastSync?: Date;
    nextSync?: Date;
  };
}

type SyncStatus = 'idle' | 'syncing' | 'conflict' | 'error' | 'disabled';
```

### 7. エラー・ログ管理API

#### 7.1 エラー報告

**Message Type**: `ERROR_REPORT`
**From**: Any Component → Background
**To**: Background → Error Logger

```typescript
// Request
interface ErrorReportRequest extends ChromeMessage {
  type: 'ERROR_REPORT';
  data: {
    error: Error | ApiError | DOMError;
    context?: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
  };
}

// Response
interface ErrorReportResponse extends ChromeResponse<string> {
  data: {
    errorId: string;
    loggedAt: Date;
    reportSent?: boolean;
  };
}
```

#### 7.2 ログ取得

**Message Type**: `GET_LOGS`
**From**: Options → Background

```typescript
// Request
interface GetLogsRequest extends ChromeMessage {
  type: 'GET_LOGS';
  data: {
    level?: 'error' | 'warning' | 'info';
    timeRange?: DateRange;
    limit?: number;
  };
}

// Response
interface GetLogsResponse extends ChromeResponse<LogEntry[]> {
  data: {
    logs: LogEntry[];
    totalCount: number;
    hasMore: boolean;
  };
}
```

### 8. パフォーマンス監視API

#### 8.1 メトリクス取得

**Message Type**: `GET_METRICS`
**From**: Options → Background

```typescript
// Request
interface GetMetricsRequest extends ChromeMessage {
  type: 'GET_METRICS';
  data: {
    timeRange?: DateRange;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  };
}

// Response
interface GetMetricsResponse extends ChromeResponse<PerformanceMetrics> {
  data: {
    metrics: PerformanceMetrics;
    trends: MetricTrend[];
    alerts?: PerformanceAlert[];
  };
}
```

🟡 **黄信号**: パフォーマンス監視APIは要件NFR-001〜003から推測

## API認証・セキュリティ

### メッセージ認証

```typescript
interface ChromeMessage {
  type: ChromeMessageType;
  data?: any;
  timestamp: Date;
  requestId: string;
  source: 'popup' | 'options' | 'background' | 'content';
  signature?: string; // HMAC-SHA256署名（将来的なセキュリティ強化）
}
```

### レート制限

```typescript
interface RateLimitConfig {
  maxRequestsPerMinute: Record<ChromeMessageType, number>;
  burstLimit: number;
  cooldownPeriod: number; // ms
}

// デフォルト制限
const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  maxRequestsPerMinute: {
    'GET_PROMPTS': 60,
    'SAVE_PROMPT': 30,
    'COPY_PROMPT': 120,
    'EXPORT_CONVERSATION': 10,
    'SEARCH_PROMPTS': 60,
    'SYNC_DATA': 5,
  },
  burstLimit: 10,
  cooldownPeriod: 1000
};
```

🟡 **黄信号**: レート制限設定は一般的なAPI保護から推測

## エラーハンドリング

### 標準エラーレスポンス

```typescript
interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
  requestId: string;
  retryable: boolean;
}

type ApiErrorCode = 
  // Storage関連
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_READ_FAILED'
  | 'STORAGE_WRITE_FAILED'
  | 'STORAGE_PERMISSION_DENIED'
  
  // Validation関連
  | 'INVALID_REQUEST_DATA'
  | 'VALIDATION_FAILED'
  | 'PROMPT_TOO_LARGE'
  | 'PROMPT_LIMIT_EXCEEDED'
  
  // Content Script関連
  | 'CONTENT_SCRIPT_NOT_AVAILABLE'
  | 'DOM_ELEMENT_NOT_FOUND'
  | 'AI_SITE_NOT_SUPPORTED'
  | 'PAGE_NAVIGATION_FAILED'
  
  // 同期関連
  | 'SYNC_AUTHENTICATION_FAILED'
  | 'SYNC_NETWORK_ERROR'
  | 'SYNC_CONFLICT_DETECTED'
  | 'SYNC_QUOTA_EXCEEDED'
  
  // 一般的なエラー
  | 'INTERNAL_ERROR'
  | 'REQUEST_TIMEOUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'FEATURE_DISABLED';
```

🟡 **黄信号**: エラーコード一覧は各機能の想定エラーから推測

## API使用例

### プロンプト保存からコピーまでの流れ

```typescript
// 1. プロンプト保存
const saveResponse = await chrome.runtime.sendMessage({
  type: 'SAVE_PROMPT',
  data: {
    prompt: {
      title: 'コードレビュー依頼',
      content: '以下のコードをレビューしてください...',
      tags: ['code', 'review'],
      category: 'development'
    }
  },
  timestamp: new Date(),
  requestId: generateRequestId()
});

// 2. プロンプトコピー
const copyResponse = await chrome.runtime.sendMessage({
  type: 'COPY_PROMPT',
  data: {
    promptId: saveResponse.data.prompt.id,
    options: {
      trackUsage: true
    }
  },
  timestamp: new Date(),
  requestId: generateRequestId()
});

// 3. 使用統計更新（自動）
// Background scriptで自動的に統計更新
```

### ChatGPT会話エクスポート

```typescript
// 1. ページ情報確認
const pageInfo = await chrome.tabs.sendMessage(tabId, {
  type: 'GET_PAGE_INFO',
  data: { detectAI: true },
  timestamp: new Date(),
  requestId: generateRequestId()
});

if (pageInfo.data.aiService === 'chatgpt') {
  // 2. 会話エクスポート実行
  const exportResponse = await chrome.tabs.sendMessage(tabId, {
    type: 'EXPORT_CONVERSATION',
    data: {
      format: 'markdown',
      options: { includeMetadata: true }
    },
    timestamp: new Date(),
    requestId: generateRequestId()
  });
  
  // 3. ダウンロード提供
  if (exportResponse.success) {
    chrome.downloads.download({
      url: exportResponse.data.downloadUrl,
      filename: `chatgpt-${Date.now()}.md`
    });
  }
}
```

## API バージョニング

### バージョン管理戦略

```typescript
interface ApiVersion {
  major: number;
  minor: number;
  patch: number;
}

// APIバージョン互換性
const API_COMPATIBILITY = {
  '1.0.0': ['1.0.x'], // Phase 1: Private MVP
  '1.1.0': ['1.0.x', '1.1.x'], // Phase 2: Code Refinement
  '2.0.0': ['2.0.x'] // Phase 3: OSS Release
};
```

🟢 **青信号**: バージョン管理は開発フェーズ戦略から直接設計

このAPI設計により、Pocket-Prompt Chrome拡張の全機能が適切に実装可能な内部通信システムが確立されます。Chrome拡張のメッセージパッシングシステムを最大限活用し、要件定義書のすべての機能要件を満たす設計となっています。