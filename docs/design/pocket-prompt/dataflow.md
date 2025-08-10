# Pocket-Prompt データフロー図

## システム全体のデータフロー

### 高レベルアーキテクチャフロー

```mermaid
flowchart TB
    User[ユーザー] --> Popup[ポップアップUI]
    User --> Options[オプションページ]
    User --> AISite[AI サイト<br/>ChatGPT/Claude/Gemini]
    
    Popup --> StorageManager[ストレージ管理]
    Options --> StorageManager
    Popup --> ClipboardAPI[クリップボードAPI]
    
    AISite --> ContentScript[コンテンツスクリプト]
    ContentScript --> ExportManager[エクスポート管理]
    ContentScript --> Popup
    
    StorageManager --> ChromeStorage[Chrome.storage.local]
    ExportManager --> MarkdownProcessor[Markdownプロセッサ]
    
    subgraph CloudSync[クラウド同期<br/>Option機能]
        GoogleOAuth[Google OAuth 2.0]
        GoogleDrive[Google Drive API]
        SyncManager[同期マネージャー]
        
        StorageManager -.-> SyncManager
        SyncManager -.-> GoogleOAuth
        SyncManager -.-> GoogleDrive
    end
    
    style CloudSync stroke-dasharray: 5 5
    style User fill:#e1f5fe
    style ChromeStorage fill:#f3e5f5
    style AISite fill:#fff3e0
```

🟢 **青信号**: 全体フローは要件定義のシステム境界とコンポーネントから直接構築

## ユーザーインタラクションフロー

### 1. プロンプト管理フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant P as ポップアップUI
    participant SM as ストレージマネージャー
    participant CS as Chrome Storage
    participant C as クリップボード

    Note over U, C: プロンプト保存フロー
    U->>P: プロンプト作成フォーム入力
    P->>P: バリデーション実行
    P->>SM: プロンプトデータ保存要求
    SM->>CS: データ暗号化・保存
    CS-->>SM: 保存完了通知
    SM-->>P: 保存成功レスポンス
    P-->>U: 成功メッセージ表示

    Note over U, C: プロンプト利用フロー
    U->>P: 保存済みプロンプト選択
    P->>SM: プロンプト取得要求
    SM->>CS: データ復号化・取得
    CS-->>SM: プロンプトデータ
    SM-->>P: プロンプト内容
    U->>P: ワンクリックコピー実行
    P->>C: クリップボードにコピー
    C-->>P: コピー完了
    P-->>U: コピー完了通知
```

🟢 **青信号**: プロンプト管理フローは要件REQ-001, REQ-002から直接設計

### 2. AIサイト連携フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant AI as AIサイト<br/>(ChatGPT)
    participant CS as コンテンツスクリプト
    participant EM as エクスポートマネージャー
    participant MP as Markdownプロセッサ
    participant P as ポップアップUI

    Note over U, P: 会話履歴エクスポートフロー
    U->>AI: AI との対話実行
    AI-->>U: 会話完了
    U->>P: エクスポート機能起動
    P->>CS: DOM要素取得要求
    CS->>AI: 会話データスクレイピング
    AI-->>CS: 会話DOM要素
    CS->>EM: 会話データ解析要求
    EM->>MP: Markdown変換実行
    MP-->>EM: Markdown形式データ
    EM-->>CS: エクスポート完了
    CS-->>P: エクスポート結果
    P-->>U: ダウンロード/コピー提供

    Note over U, P: 直接ペースト機能（Option）
    U->>P: プロンプト選択
    U->>P: 直接ペーストボタンクリック
    P->>CS: DOM操作要求（入力欄特定）
    CS->>AI: 入力欄要素検索
    AI-->>CS: 入力欄DOM要素
    CS->>AI: プロンプト挿入実行
    CS-->>P: 挿入完了通知
    P-->>U: 成功フィードバック
```

🟢 **青信号**: AIサイト連携は要件REQ-003, REQ-303から直接設計

## データ処理フロー

### 1. ストレージ管理フロー

```mermaid
flowchart TD
    Input[入力データ] --> Validation[バリデーション]
    Validation -->|成功| Encryption[暗号化処理]
    Validation -->|失敗| ErrorHandling[エラーハンドリング]
    
    Encryption --> StorageWrite[Chrome Storage書き込み]
    StorageWrite --> IndexUpdate[インデックス更新]
    IndexUpdate --> Success[保存完了]
    
    StorageRead[Storage読み込み] --> Decryption[復号化処理]
    Decryption --> DataValidation[データ整合性確認]
    DataValidation --> Output[出力データ]
    
    subgraph CloudSyncFlow[クラウド同期フロー<br/>Option機能]
        LocalChange[ローカル変更検出]
        ConflictDetection[競合検出]
        MergeStrategy[マージ戦略実行]
        CloudSync[クラウドデータ同期]
        
        LocalChange --> ConflictDetection
        ConflictDetection --> MergeStrategy
        MergeStrategy --> CloudSync
    end
    
    IndexUpdate -.-> LocalChange
    
    style CloudSyncFlow stroke-dasharray: 5 5
    style Success fill:#c8e6c9
    style ErrorHandling fill:#ffcdd2
```

🟡 **黄信号**: 暗号化・復号化処理は要件NFR-102から、同期フローは要件REQ-305から推測

### 2. エクスポート処理フロー

```mermaid
flowchart LR
    AIPage[AIサイトページ] --> DOMScraper[DOM スクレイパー]
    DOMScraper --> DataExtractor[データ抽出器]
    DataExtractor --> ConversationParser[会話パーサー]
    
    ConversationParser --> StructuredData[構造化データ]
    StructuredData --> MarkdownGenerator[Markdown生成器]
    MarkdownGenerator --> MetadataAppender[メタデータ付与]
    
    MetadataAppender --> OutputFormat{出力形式}
    OutputFormat -->|ファイル| FileDownload[ファイルダウンロード]
    OutputFormat -->|クリップボード| ClipboardCopy[クリップボードコピー]
    
    subgraph AISpecific[AI サイト別処理]
        ChatGPTParser[ChatGPT パーサー]
        ClaudeParser[Claude パーサー<br/>Option]
        GeminiParser[Gemini パーサー<br/>Option]
    end
    
    ConversationParser --> ChatGPTParser
    ConversationParser -.-> ClaudeParser
    ConversationParser -.-> GeminiParser
    
    style AISpecific stroke-dasharray: 5 5
    style FileDownload fill:#e3f2fd
    style ClipboardCopy fill:#e8f5e8
```

🟢 **青信号**: ChatGPTエクスポートは要件REQ-003から、Option機能は要件REQ-304から直接設計

## 検索・フィルタリング処理フロー（Option機能）

```mermaid
flowchart TB
    SearchInput[検索入力] --> InputParser[入力解析]
    InputParser --> QueryType{クエリタイプ}
    
    QueryType -->|キーワード| KeywordSearch[キーワード検索]
    QueryType -->|タグ| TagSearch[タグ検索]
    QueryType -->|複合| CombinedSearch[複合検索]
    
    KeywordSearch --> IndexSearch[インデックス検索]
    TagSearch --> TagIndexSearch[タグインデックス検索]
    CombinedSearch --> MultiSearch[マルチ検索実行]
    
    IndexSearch --> ResultRanking[結果ランキング]
    TagIndexSearch --> ResultRanking
    MultiSearch --> ResultRanking
    
    ResultRanking --> Pagination[ページネーション]
    Pagination --> DisplayResults[検索結果表示]
    
    subgraph SearchOptimization[検索最適化]
        FullTextIndex[全文検索インデックス]
        TagIndex[タグインデックス]
        RecentUsage[最近使用履歴]
        
        IndexSearch --> FullTextIndex
        TagIndexSearch --> TagIndex
        ResultRanking --> RecentUsage
    end
    
    style SearchOptimization stroke-dasharray: 5 5
    style DisplayResults fill:#f3e5f5
```

🟢 **青信号**: 検索機能は要件REQ-302から直接設計

## エラーハンドリングフロー

```mermaid
flowchart TD
    Operation[各種操作] --> ErrorCheck{エラー発生?}
    ErrorCheck -->|No| Success[正常完了]
    ErrorCheck -->|Yes| ErrorType{エラー種別}
    
    ErrorType -->|ストレージエラー| StorageError[ストレージエラー処理]
    ErrorType -->|権限エラー| PermissionError[権限エラー処理]
    ErrorType -->|ネットワークエラー| NetworkError[ネットワークエラー処理]
    ErrorType -->|DOM操作エラー| DOMError[DOM操作エラー処理]
    
    StorageError --> StorageRetry[再試行処理]
    StorageRetry --> FallbackStorage[フォールバック処理]
    
    PermissionError --> PermissionRequest[権限要求]
    PermissionRequest --> UserConfirmation[ユーザー確認]
    
    NetworkError --> OfflineMode[オフラインモード]
    OfflineMode --> QueueOperation[操作キューイング]
    
    DOMError --> DOMRefresh[DOM再取得]
    DOMRefresh --> AlternativeMethod[代替手法]
    
    FallbackStorage --> UserNotification[ユーザー通知]
    UserConfirmation --> UserNotification
    QueueOperation --> UserNotification
    AlternativeMethod --> UserNotification
    
    UserNotification --> ErrorLogging[エラーログ記録]
    ErrorLogging --> RecoveryOptions[復旧オプション提示]
    
    style Success fill:#c8e6c9
    style UserNotification fill:#ffecb3
    style ErrorLogging fill:#ffcdd2
```

🟡 **黄信号**: エラーハンドリング戦略は要件EDGE-001〜004と一般的な Chrome拡張エラー対応から推測

## パフォーマンス最適化フロー

```mermaid
flowchart LR
    DataRequest[データ要求] --> CacheCheck{キャッシュ確認}
    CacheCheck -->|Hit| CacheReturn[キャッシュ返却]
    CacheCheck -->|Miss| DataFetch[データ取得]
    
    DataFetch --> LazyLoad{遅延ロード判定}
    LazyLoad -->|大容量| ChunkLoad[チャンク読み込み]
    LazyLoad -->|通常| FullLoad[全量読み込み]
    
    ChunkLoad --> VirtualScroll[仮想スクロール]
    FullLoad --> IndexBuild[インデックス構築]
    
    VirtualScroll --> CacheStore[キャッシュ保存]
    IndexBuild --> CacheStore
    CacheStore --> OptimizedReturn[最適化返却]
    
    subgraph PerformanceMonitoring[パフォーマンス監視]
        ResponseTime[応答時間計測]
        MemoryUsage[メモリ使用量監視]
        CacheHitRate[キャッシュヒット率]
        
        OptimizedReturn --> ResponseTime
        CacheReturn --> ResponseTime
        CacheStore --> MemoryUsage
        CacheCheck --> CacheHitRate
    end
    
    style CacheReturn fill:#e8f5e8
    style OptimizedReturn fill:#e1f5fe
    style PerformanceMonitoring stroke-dasharray: 5 5
```

🟡 **黄信号**: パフォーマンス最適化フローは要件NFR-001〜003の基準から推測

## データ同期フロー（Cloud Sync - Option機能）

```mermaid
sequenceDiagram
    participant L as ローカルストレージ
    participant SM as 同期マネージャー
    participant GA as Google OAuth
    participant GD as Google Drive
    participant R as リモートストレージ

    Note over L, R: 初回同期設定
    SM->>GA: OAuth認証要求
    GA-->>SM: アクセストークン
    SM->>GD: API接続確認
    GD-->>SM: 接続成功
    
    Note over L, R: データ同期処理
    L->>SM: ローカル変更通知
    SM->>L: 変更データ取得
    SM->>GD: リモートデータ確認
    GD->>R: 最新データ取得
    R-->>GD: リモートデータ
    GD-->>SM: リモートデータ応答
    
    SM->>SM: 競合検出・解決
    SM->>GD: 統合データ送信
    GD->>R: データ保存
    R-->>GD: 保存完了
    GD-->>SM: 同期完了
    SM->>L: ローカル更新
    
    Note over L, R: オフライン・オンライン対応
    SM->>SM: オフライン状態検出
    SM->>SM: 変更キューイング
    SM->>SM: オンライン復帰検出
    SM->>GD: キューデータ一括送信
```

🟢 **青信号**: クラウド同期フローは要件REQ-305のGoogle連携から直接設計

このデータフロー設計により、Pocket-Prompt Chrome拡張の全体的なデータの流れと各コンポーネント間の相互作用が明確になります。各フローは要件定義書の機能要件と非機能要件に基づいて設計されており、パフォーマンス要件とエラーハンドリング要件を満たす構造となっています。