-- =========================================
-- Pocket-Prompt ローカルストレージスキーマ設計
-- Chrome.storage.local用のJSON構造設計
-- =========================================

-- 注意: Chrome拡張はローカルストレージベースのため、実際のSQLデータベースは使用しない
-- このスキーマは chrome.storage.local に保存するJSONデータ構造の論理設計を表現

-- 🟢 青信号: ローカルストレージ設計は要件REQ-005のChrome.storage API要件から直接設計

-- =========================================
-- 1. プロンプトストレージスキーマ
-- =========================================

/*
chrome.storage.local キー: "prompts"
構造: Record<string, Prompt>
説明: プロンプトIDをキーとするプロンプトオブジェクトのマップ
*/

-- プロンプトエンティティの論理構造
-- CREATE TABLE IF NOT EXISTS prompts (
CREATE TABLE prompts (
    id TEXT PRIMARY KEY,              -- UUID v4形式
    title TEXT NOT NULL,              -- 要件REQ-001: タイトル必須
    content TEXT NOT NULL,            -- 要件REQ-001: 本文（複数行対応）
    tags TEXT,                        -- JSON配列文字列 要件REQ-301（Option）
    category_id TEXT,                 -- カテゴリID 要件REQ-301（Option）
    created_at TEXT NOT NULL,         -- ISO 8601形式
    updated_at TEXT NOT NULL,         -- ISO 8601形式
    last_used_at TEXT,                -- 最終使用日時
    usage_count INTEGER DEFAULT 0,    -- 使用回数
    
    -- メタデータ（JSON文字列）
    description TEXT,                 -- プロンプト説明
    author TEXT,                      -- 作成者
    version TEXT DEFAULT '1.0.0',    -- バージョン
    is_private INTEGER DEFAULT 1,    -- プライベートフラグ（1: private, 0: public）
    ai_targets TEXT,                  -- JSON配列: ['chatgpt', 'claude', 'gemini']
    
    -- 制約
    CHECK (length(title) > 0),        -- タイトル必須
    CHECK (length(content) > 0),      -- 本文必須
    CHECK (length(content) <= 10000), -- 要件EDGE-101: 最大10,000文字制限
    CHECK (usage_count >= 0)          -- 使用回数は非負数
);

-- プロンプト用インデックス
CREATE INDEX idx_prompts_created_at ON prompts(created_at);
CREATE INDEX idx_prompts_updated_at ON prompts(updated_at);
CREATE INDEX idx_prompts_last_used_at ON prompts(last_used_at);
CREATE INDEX idx_prompts_usage_count ON prompts(usage_count DESC);
CREATE INDEX idx_prompts_category ON prompts(category_id);

-- 全文検索用インデックス（仮想テーブル）
-- 要件REQ-302: キーワード検索機能
CREATE VIRTUAL TABLE prompts_fts USING fts5(
    title,
    content,
    description,
    tags
);

-- =========================================
-- 2. タグストレージスキーマ（Option機能）
-- =========================================

/*
chrome.storage.local キー: "tags"
構造: Record<string, Tag>
要件REQ-301: タグ・カテゴリ管理
*/

CREATE TABLE tags (
    id TEXT PRIMARY KEY,              -- UUID v4形式
    name TEXT NOT NULL UNIQUE,       -- タグ名（ユニーク）
    color TEXT,                       -- カラーコード（例: #FF5722）
    description TEXT,                 -- タグ説明
    created_at TEXT NOT NULL,         -- 作成日時
    usage_count INTEGER DEFAULT 0,   -- 使用回数
    
    -- 制約
    CHECK (length(name) > 0),         -- タグ名必須
    CHECK (length(name) <= 50),      -- 最大50文字制限
    CHECK (usage_count >= 0)          -- 使用回数は非負数
);

-- タグ用インデックス
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);
CREATE INDEX idx_tags_created_at ON tags(created_at);

-- =========================================
-- 3. カテゴリストレージスキーマ（Option機能）
-- =========================================

/*
chrome.storage.local キー: "categories"
構造: Record<string, Category>
要件REQ-301: タグ・カテゴリ管理
*/

CREATE TABLE categories (
    id TEXT PRIMARY KEY,              -- UUID v4形式
    name TEXT NOT NULL,               -- カテゴリ名
    parent_id TEXT,                   -- 親カテゴリID（階層構造対応）
    icon TEXT,                        -- アイコン名（例: 'code', 'document'）
    color TEXT,                       -- カラーコード
    description TEXT,                 -- カテゴリ説明
    created_at TEXT NOT NULL,         -- 作成日時
    prompt_count INTEGER DEFAULT 0,  -- 配下のプロンプト数
    
    -- 制約
    CHECK (length(name) > 0),         -- カテゴリ名必須
    CHECK (length(name) <= 100),     -- 最大100文字制限
    CHECK (prompt_count >= 0),        -- プロンプト数は非負数
    CHECK (parent_id != id),          -- 自己参照禁止
    
    -- 外部キー制約（論理的）
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- カテゴリ用インデックス
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_created_at ON categories(created_at);

-- 階層構造クエリ用の再帰ビュー
CREATE VIEW category_hierarchy AS
WITH RECURSIVE category_tree(id, name, parent_id, level, path) AS (
    -- ルートカテゴリ
    SELECT id, name, parent_id, 0, name
    FROM categories 
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- 子カテゴリ
    SELECT c.id, c.name, c.parent_id, ct.level + 1, ct.path || ' > ' || c.name
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE ct.level < 3  -- 要件: 最大階層深度3
)
SELECT * FROM category_tree;

-- =========================================
-- 4. 設定ストレージスキーマ
-- =========================================

/*
chrome.storage.local キー: "settings"
構造: UserSettings object
*/

CREATE TABLE user_settings (
    key TEXT PRIMARY KEY,             -- 設定キー
    value TEXT NOT NULL,              -- 設定値（JSON文字列）
    type TEXT NOT NULL,               -- データ型
    updated_at TEXT NOT NULL,         -- 更新日時
    
    -- 制約
    CHECK (type IN ('string', 'number', 'boolean', 'object', 'array'))
);

-- 設定項目のデフォルト値定義
INSERT OR IGNORE INTO user_settings (key, value, type, updated_at) VALUES
('theme', '"auto"', 'string', datetime('now')),
('language', '"ja"', 'string', datetime('now')),
('ui.popupSize', '"medium"', 'string', datetime('now')),
('ui.itemsPerPage', '20', 'number', datetime('now')),
('ui.showUsageCount', 'true', 'boolean', datetime('now')),
('ui.confirmBeforeDelete', 'true', 'boolean', datetime('now')),
('export.defaultFormat', '"markdown"', 'string', datetime('now')),
('export.includeMetadata', 'true', 'boolean', datetime('now')),
('sync.enabled', 'false', 'boolean', datetime('now')),
('sync.autoSync', 'false', 'boolean', datetime('now')),
('sync.syncInterval', '15', 'number', datetime('now')),
('features.tagManagement', 'false', 'boolean', datetime('now')),
('features.cloudSync', 'false', 'boolean', datetime('now')),
('features.multiAiSupport', 'false', 'boolean', datetime('now'));

-- =========================================
-- 5. エクスポート履歴スキーマ
-- =========================================

/*
chrome.storage.local キー: "export_history"
構造: Record<string, ConversationExport>
要件REQ-003: ChatGPT会話履歴エクスポート
*/

CREATE TABLE conversation_exports (
    id TEXT PRIMARY KEY,              -- UUID v4形式
    title TEXT NOT NULL,              -- 会話タイトル
    ai_service TEXT NOT NULL,         -- 'chatgpt' | 'claude' | 'gemini'
    url TEXT NOT NULL,                -- 元URL
    exported_at TEXT NOT NULL,        -- エクスポート日時
    message_count INTEGER DEFAULT 0,  -- メッセージ数
    file_size INTEGER DEFAULT 0,      -- ファイルサイズ（bytes）
    format TEXT NOT NULL,             -- エクスポート形式
    
    -- メタデータ（JSON文字列）
    metadata TEXT,                    -- 会話メタデータ
    
    -- 制約
    CHECK (ai_service IN ('chatgpt', 'claude', 'gemini')),
    CHECK (format IN ('markdown', 'json', 'txt', 'html', 'pdf')),
    CHECK (message_count >= 0),
    CHECK (file_size >= 0),
    CHECK (length(title) > 0),
    CHECK (length(url) > 0)
);

-- エクスポート履歴用インデックス
CREATE INDEX idx_exports_exported_at ON conversation_exports(exported_at DESC);
CREATE INDEX idx_exports_ai_service ON conversation_exports(ai_service);
CREATE INDEX idx_exports_format ON conversation_exports(format);

-- =========================================
-- 6. 使用統計スキーマ
-- =========================================

/*
chrome.storage.local キー: "usage_stats"
構造: UsageStats object
パフォーマンス監視とユーザー行動分析用
*/

CREATE TABLE daily_usage_stats (
    date TEXT PRIMARY KEY,            -- YYYY-MM-DD形式
    prompts_created INTEGER DEFAULT 0,   -- 作成されたプロンプト数
    prompts_used INTEGER DEFAULT 0,      -- 使用されたプロンプト数
    exports_performed INTEGER DEFAULT 0,  -- エクスポート実行回数
    search_performed INTEGER DEFAULT 0,   -- 検索実行回数
    popup_opens INTEGER DEFAULT 0,        -- ポップアップ起動回数
    average_response_time REAL DEFAULT 0, -- 平均応答時間（ms）
    
    -- 制約
    CHECK (prompts_created >= 0),
    CHECK (prompts_used >= 0),
    CHECK (exports_performed >= 0),
    CHECK (search_performed >= 0),
    CHECK (popup_opens >= 0),
    CHECK (average_response_time >= 0)
);

-- 使用統計用インデックス
CREATE INDEX idx_usage_stats_date ON daily_usage_stats(date DESC);

-- 週次・月次統計用ビュー
CREATE VIEW weekly_usage_stats AS
SELECT 
    strftime('%Y-W%W', date) as week,
    SUM(prompts_created) as prompts_created,
    SUM(prompts_used) as prompts_used,
    SUM(exports_performed) as exports_performed,
    AVG(average_response_time) as avg_response_time
FROM daily_usage_stats 
GROUP BY strftime('%Y-W%W', date)
ORDER BY week DESC;

CREATE VIEW monthly_usage_stats AS
SELECT 
    strftime('%Y-%m', date) as month,
    SUM(prompts_created) as prompts_created,
    SUM(prompts_used) as prompts_used,
    SUM(exports_performed) as exports_performed,
    AVG(average_response_time) as avg_response_time
FROM daily_usage_stats 
GROUP BY strftime('%Y-%m', date)
ORDER BY month DESC;

-- =========================================
-- 7. キャッシュスキーマ
-- =========================================

/*
chrome.storage.local キー: "cache"
構造: Record<string, CacheEntry>
AIサイトのDOM情報などの一時データ
*/

CREATE TABLE cache_entries (
    key TEXT PRIMARY KEY,             -- キャッシュキー
    data TEXT NOT NULL,               -- キャッシュデータ（JSON文字列）
    expires_at TEXT NOT NULL,         -- 有効期限
    created_at TEXT NOT NULL,         -- 作成日時
    access_count INTEGER DEFAULT 0,  -- アクセス回数
    
    -- 制約
    CHECK (access_count >= 0)
);

-- キャッシュ用インデックス
CREATE INDEX idx_cache_expires_at ON cache_entries(expires_at);
CREATE INDEX idx_cache_created_at ON cache_entries(created_at);

-- 期限切れキャッシュ削除用ビュー
CREATE VIEW expired_cache AS
SELECT key FROM cache_entries 
WHERE expires_at < datetime('now');

-- =========================================
-- 8. 同期データスキーマ（Option機能）
-- =========================================

/*
chrome.storage.local キー: "sync_metadata"
構造: SyncMetadata object
要件REQ-305: クラウド同期機能
*/

CREATE TABLE sync_metadata (
    entity_type TEXT NOT NULL,       -- 'prompt' | 'tag' | 'category' | 'settings'
    entity_id TEXT NOT NULL,         -- エンティティID
    local_hash TEXT NOT NULL,        -- ローカルデータのハッシュ値
    remote_hash TEXT,                -- リモートデータのハッシュ値
    last_sync_at TEXT,               -- 最終同期日時
    conflict_status TEXT DEFAULT 'none', -- 'none' | 'local' | 'remote' | 'conflict'
    sync_action TEXT DEFAULT 'none',  -- 'none' | 'create' | 'update' | 'delete'
    
    PRIMARY KEY (entity_type, entity_id),
    
    -- 制約
    CHECK (entity_type IN ('prompt', 'tag', 'category', 'settings')),
    CHECK (conflict_status IN ('none', 'local', 'remote', 'conflict')),
    CHECK (sync_action IN ('none', 'create', 'update', 'delete'))
);

-- 同期メタデータ用インデックス
CREATE INDEX idx_sync_last_sync ON sync_metadata(last_sync_at);
CREATE INDEX idx_sync_conflict ON sync_metadata(conflict_status);
CREATE INDEX idx_sync_action ON sync_metadata(sync_action);

-- =========================================
-- 9. エラーログスキーマ
-- =========================================

/*
chrome.storage.local キー: "error_logs"
構造: Array<ErrorLog>
エラー追跡とデバッグ用
*/

CREATE TABLE error_logs (
    id TEXT PRIMARY KEY,              -- UUID v4形式
    timestamp TEXT NOT NULL,          -- エラー発生日時
    level TEXT NOT NULL,              -- 'error' | 'warning' | 'info'
    source TEXT NOT NULL,             -- エラー発生源
    message TEXT NOT NULL,            -- エラーメッセージ
    stack_trace TEXT,                 -- スタックトレース
    context TEXT,                     -- エラーコンテキスト（JSON文字列）
    user_agent TEXT,                  -- ユーザーエージェント
    version TEXT NOT NULL,            -- 拡張機能バージョン
    
    -- 制約
    CHECK (level IN ('error', 'warning', 'info')),
    CHECK (length(message) > 0)
);

-- エラーログ用インデックス
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_error_logs_source ON error_logs(source);

-- エラー統計用ビュー
CREATE VIEW error_stats AS
SELECT 
    date(timestamp) as date,
    level,
    source,
    COUNT(*) as count
FROM error_logs 
GROUP BY date(timestamp), level, source
ORDER BY date DESC, count DESC;

-- =========================================
-- 10. データ整合性とメンテナンス
-- =========================================

-- 🟡 黄信号: データ整合性チェックは一般的なデータベース運用から推測

-- オーファンデータクリーンアップ用ビュー
CREATE VIEW orphaned_data AS
SELECT 'prompts' as table_name, id, 'invalid_category' as issue
FROM prompts 
WHERE category_id IS NOT NULL 
AND category_id NOT IN (SELECT id FROM categories);

-- データサイズ監視用ビュー
CREATE VIEW storage_usage AS
SELECT 
    'prompts' as entity_type,
    COUNT(*) as count,
    AVG(length(content)) as avg_content_length,
    MAX(length(content)) as max_content_length,
    SUM(length(title) + length(content)) as total_size
FROM prompts
UNION ALL
SELECT 
    'tags' as entity_type,
    COUNT(*) as count,
    AVG(length(name)) as avg_content_length,
    MAX(length(name)) as max_content_length,
    SUM(length(name) + COALESCE(length(description), 0)) as total_size
FROM tags
UNION ALL
SELECT 
    'categories' as entity_type,
    COUNT(*) as count,
    AVG(length(name)) as avg_content_length,
    MAX(length(name)) as max_content_length,
    SUM(length(name) + COALESCE(length(description), 0)) as total_size
FROM categories;

-- =========================================
-- 11. Chrome Storage キー構造サマリー
-- =========================================

/*
実際のChrome.storage.local構造:

{
  // メインデータ
  "prompts": Record<string, Prompt>,           // プロンプトデータ
  "tags": Record<string, Tag>,                 // タグデータ（Option）
  "categories": Record<string, Category>,      // カテゴリデータ（Option）
  "settings": UserSettings,                    // ユーザー設定
  
  // 履歴・統計
  "export_history": Array<ConversationExport>, // エクスポート履歴
  "usage_stats": UsageStats,                   // 使用統計
  "daily_stats": Record<string, DailyUsageStats>, // 日別統計
  
  // システムデータ
  "cache": Record<string, CacheEntry>,         // キャッシュデータ
  "sync_metadata": Array<SyncMetadata>,        // 同期メタデータ（Option）
  "error_logs": Array<ErrorLog>,               // エラーログ
  
  // メタデータ
  "schema_version": "1.0.0",                   // スキーマバージョン
  "last_backup": "2024-01-01T00:00:00Z",      // 最終バックアップ日時
  "encryption_enabled": boolean,                // 暗号化有効フラグ
  "total_size": number                         // 総データサイズ（bytes）
}

容量制限:
- chrome.storage.local: 10MB（要件EDGE-002で5MB制限として管理）
- 各アイテム: 8KB推奨、チャンク分割で対応
*/

-- =========================================
-- 12. マイグレーション用スクリプト
-- =========================================

-- 🟡 黄信号: マイグレーション戦略は一般的なデータ移行要件から推測

-- バージョン間マイグレーション用テーブル
CREATE TABLE schema_migrations (
    version TEXT PRIMARY KEY,        -- スキーマバージョン
    applied_at TEXT NOT NULL,        -- 適用日時
    description TEXT,                -- マイグレーション内容
    rollback_sql TEXT               -- ロールバック用SQL
);

-- 初期バージョン記録
INSERT INTO schema_migrations (version, applied_at, description) VALUES
('1.0.0', datetime('now'), 'Initial schema creation');

-- データバックアップ用ビュー
CREATE VIEW full_backup AS
SELECT 
    'prompts' as table_name,
    json_object(
        'id', id,
        'title', title,
        'content', content,
        'tags', tags,
        'category_id', category_id,
        'created_at', created_at,
        'updated_at', updated_at,
        'last_used_at', last_used_at,
        'usage_count', usage_count,
        'description', description,
        'author', author,
        'version', version,
        'is_private', is_private,
        'ai_targets', ai_targets
    ) as data
FROM prompts
UNION ALL
SELECT 'tags' as table_name,
    json_object(
        'id', id,
        'name', name,
        'color', color,
        'description', description,
        'created_at', created_at,
        'usage_count', usage_count
    ) as data
FROM tags
UNION ALL
SELECT 'categories' as table_name,
    json_object(
        'id', id,
        'name', name,
        'parent_id', parent_id,
        'icon', icon,
        'color', color,
        'description', description,
        'created_at', created_at,
        'prompt_count', prompt_count
    ) as data
FROM categories;

-- 🟢 青信号: データベーススキーマ設計は要件定義書のデータ要件を完全に反映して構築