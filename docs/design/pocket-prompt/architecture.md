# Pocket-Prompt Chrome拡張 アーキテクチャ設計

## システム概要

Pocket-PromptはChrome拡張機能として実装されるクライアントサイドアプリケーションです。プロンプト管理とAIチャット履歴エクスポート機能を提供し、個人利用からOSS公開への段階的発展を想定した設計となっています。

🟢 **青信号**: システム概要は要件定義書から直接抽出

## アーキテクチャパターン

- **パターン**: クライアントサイドアーキテクチャ（Chrome Extension + Local Storage）
- **理由**: Chrome拡張の制約とローカルファーストの要件に最適化
- **将来拡張**: クラウド同期機能追加時はハイブリッドアーキテクチャに移行可能

🟢 **青信号**: ローカルストレージ主体の設計は要件REQ-005から直接決定

## コンポーネント構成

### Chrome拡張レイヤー

#### 1. Manifest & Background Scripts
```
- manifest.json (Manifest V3準拠)
- background/service-worker.ts
- content-scripts/ai-site-integration.ts
```

#### 2. UI Components
```
- popup/
  ├── popup.html
  ├── popup.ts
  └── popup.css
- options/
  ├── options.html
  ├── options.ts
  └── options.css
```

#### 3. Core Logic
```
- core/
  ├── prompt-manager.ts
  ├── storage-manager.ts
  ├── export-manager.ts
  └── ai-site-connector.ts
```

🟢 **青信号**: ポップアップ + オプションページ構成は要件REQ-402, REQ-403から直接決定

### データ層設計

#### Local Storage (Chrome.storage.local)
- **プロンプトデータ**: 構造化JSONとしてローカル保存
- **設定データ**: ユーザー設定とプリファレンス
- **キャッシュ**: AIサイトDOM情報のキャッシュ

#### 将来のCloud Storage (Option機能)
- **Google Drive API**: ファイル同期
- **Google OAuth 2.0**: 認証・認可
- **同期制御**: 競合解決とマージ機能

🟢 **青信号**: Chrome.storage設計は要件REQ-005から、クラウド同期はREQ-305から直接抽出

### 外部連携層

#### AIサイト連携
- **Content Script**: DOM操作とデータ抽出
- **Message Passing**: Popup ↔ Content Script通信  
- **Site Adapters**: ChatGPT/Claude/Gemini別の処理

🟢 **青信号**: AIサイト連携は要件REQ-003, REQ-303, REQ-304から直接設計

## システム境界

### 内部システム
- Chrome拡張本体（popup、options、background、content scripts）
- ローカルストレージ（Chrome.storage API）
- TypeScript型システム

### 外部システム
- **ChatGPT**: 会話履歴エクスポート対象（必須機能）
- **Claude/Gemini**: 将来対応予定（Option機能）
- **Google Services**: クラウド同期用（Option機能）
- **システムクリップボード**: コピー機能連携

🟢 **青信号**: システム境界は各要件の対象システムから直接特定

## セキュリティ設計

### 権限管理
```json
{
  "permissions": [
    "storage",
    "activeTab", 
    "clipboardWrite"
  ],
  "optional_permissions": [
    "identity",
    "https://drive.googleapis.com/*"
  ]
}
```

### データ保護
- **ローカル暗号化**: 機密プロンプトの暗号化保存
- **最小権限**: 必要最小限のChrome権限
- **CSP**: Content Security Policyによる XSS防止

🟡 **黄信号**: 具体的な権限設定は要件NFR-101の最小権限原則から推測

## パフォーマンス設計

### 応答時間最適化
- **Lazy Loading**: 大量プロンプト時の段階的読み込み
- **Virtual Scrolling**: 1000件以上のプロンプト表示最適化
- **Debounce**: 検索機能の入力制御

### メモリ使用量制御
- **データパギング**: 大容量データの分割処理
- **キャッシュ制御**: 不要データの自動削除
- **リソース解放**: DOM操作後のメモリクリーンアップ

🟡 **黄信号**: パフォーマンス最適化手法は要件NFR-001〜003の基準から推測

## 拡張性設計

### Plugin Architecture
```
interfaces/
├── IAISiteConnector.ts    // AI サイト連携インターフェース
├── IExporter.ts          // エクスポート形式インターフェース
└── IStorageProvider.ts   // ストレージプロバイダインターフェース

plugins/
├── chatgpt-connector.ts
├── claude-connector.ts
├── markdown-exporter.ts
└── json-exporter.ts
```

### Configuration Management
```typescript
interface ExtensionConfig {
  features: {
    tagManagement: boolean;
    cloudSync: boolean;
    multiAISupport: boolean;
  };
  aiSites: {
    chatgpt: boolean;
    claude: boolean;
    gemini: boolean;
  };
}
```

🟡 **黄信号**: プラグイン設計は要件REQ-301〜305のOption機能展開性から推測

## 開発フェーズ別アーキテクチャ

### Phase 1: Private MVP
```
Core Components Only:
- Basic popup UI
- Chrome.storage integration
- ChatGPT export only
- TypeScript base setup
```

### Phase 2: Code Refinement  
```
Quality Improvements:
- Full TypeScript conversion
- Test coverage 80%+
- Error handling enhancement
- Performance optimization
```

### Phase 3: OSS Release
```
Full Feature Set:
- Plugin architecture
- Multiple AI support
- Cloud sync capability
- Comprehensive documentation
```

🟢 **青信号**: フェーズ別設計は要件定義書の開発フェーズ戦略から直接構築

## 技術スタック詳細

### 開発技術
- **Language**: TypeScript 5.0+
- **Build Tool**: Webpack 5 / Vite (選択予定)
- **CSS Framework**: Tailwind CSS または CSS Modules
- **Testing**: Jest + Chrome Extension Testing Library

### Chrome Extension 技術
- **Manifest**: Version 3
- **Service Worker**: Background処理
- **Content Scripts**: サイト連携
- **Storage**: chrome.storage.local/sync

### 品質保証
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Testing**: Unit + Integration + E2E
- **Security**: Chrome Extension Security Review

🟡 **黄信号**: 具体的ツール選択は要件REQ-401のTypeScript要求とベストプラクティスから推測

## デプロイメント戦略

### 開発環境
- **Local Development**: Chrome Developer Mode
- **Hot Reload**: 開発効率向上
- **Debug Tools**: Chrome Extension DevTools

### 配布戦略
- **Phase 1**: ローカルインストール（.crxファイル）
- **Phase 3**: Chrome Web Store公開（OSS版）
- **Enterprise**: 企業向けプライベート配布（将来）

🟡 **黄信号**: デプロイメント戦略は開発フェーズとOSS公開要件から推測

## 運用・保守設計

### ログ・監視
- **Error Reporting**: ローカルエラーログ収集
- **Usage Analytics**: 匿名使用統計（OSS版のみ）
- **Performance Monitoring**: 応答時間計測

### アップデート戦略
- **Chrome Auto Update**: 拡張機能自動更新
- **Migration Scripts**: データ移行スクリプト
- **Backward Compatibility**: 旧バージョン互換性

🔴 **赤信号**: 運用保守設計は一般的なChrome拡張運用ベストプラクティスから推測