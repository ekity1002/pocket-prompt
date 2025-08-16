# Pocket-Prompt - Chrome拡張機能

AIチャットサービス用のプロンプト管理Chrome拡張機能

## 概要

Pocket-Promptは、ChatGPT、Claude、Geminiなどの主要AIサービスで使用するプロンプトを効率的に管理・利用できるChrome拡張機能です。Clean Architectureに基づいた設計により、保守性と拡張性を重視した実装となっています。

## 主な機能

### ✅ プロンプト管理（実装済み）
- **プロンプトの作成・削除**: リアルタイム検証付きモーダル
- **クリップボード統合**: ワンクリックでプロンプトをコピー
- **Chrome Storage同期**: Chrome拡張ストレージでの永続化
- **使用統計追跡**: 使用回数と最終使用日の自動記録
- **タグ機能**: カンマ区切りでのプロンプト分類
- **オートセーブ**: 下書きの自動保存機能（24時間保持）

### ✅ ユーザーインターフェース（実装済み）
- **ポップアップUI**: プロンプト一覧とクイック操作
- **プロンプト作成モーダル**: 包括的な入力フォーム
- **インライン操作**: コピー・削除ボタンを横並び配置
- **アクセシビリティ対応**: ARIA属性とキーボードナビゲーション
- **エラーハンドリング**: トースト通知による直感的フィードバック

### 🚧 AIサイト統合（部分実装・未実装）
- **対応サイト**: ChatGPT、Claude、Gemini
- **プロンプト直接挿入**: 🔴 未実装
- **サイト自動検出**: 🔴 未実装
- **コンテキストメニュー**: 🔴 未実装

### ✅ エクスポート機能（実装済み）
- **会話履歴エクスポート**: ChatGPT対応済み
- **対応形式**: Markdownのみ
- **対応サイト**: ChatGPTのみ
- **メタデータ保持**: 作成日時、使用統計含む
- **エクスポート履歴管理**: 完全な履歴追跡システム
- **ローカルファイル保存**: ダウンロード機能完備

### 🚧 高度な設定（部分実装・未実装）
- **設定ページ**: ✅ 基本UI実装済み
- **テーマ切り替え**: 🔴 未実装
- **多言語対応**: 🔴 未実装  
- **機能制御**: 🔴 未実装
- **キーボードショートカット**: ⚠️ 一部実装（モーダル内のみ）

### 🚧 検索・フィルタ機能（未実装）
- **プロンプト検索**: 🔴 未実装
- **タグフィルタ**: 🔴 未実装
- **お気に入り機能**: 🔴 未実装
- **ソート機能**: 🔴 未実装

## 技術スタック

### フロントエンド・ビルド
- **TypeScript 5.0+**: 型安全性とコード品質の確保
- **Vite**: 高速な開発ビルドツール
- **Tailwind CSS v3**: ユーティリティファーストのCSS
- **PostCSS + Autoprefixer**: CSS処理とブラウザ対応

### アーキテクチャ
- **Clean Architecture**: ビジネスロジックとUI層の分離
- **Chrome Extension Manifest V3**: 最新のChrome拡張仕様
- **TypeScript Strict Mode**: 厳格な型チェック

### 開発ツール
- **Volta**: Node.jsバージョン管理 (20.19.4)
- **Biome.js**: 高速なリンター・フォーマッター
- **npm scripts**: 開発・ビルド・テストワークフロー

## プロジェクト構造

```
src/
├── core/                 # ビジネスロジック層
│   ├── prompt-storage-adapter.ts # ✅ プロンプト管理ロジック（Chrome Storage）
│   ├── export-manager.ts      # ✅ エクスポート機能
│   ├── conversation-exporter.ts # ✅ 会話履歴エクスポート
│   └── ai-site-connector.ts   # 🔴 AIサイト統合（未実装）
├── components/           # UI層 - 再利用可能コンポーネント
│   ├── base/                  # 基本UIコンポーネント
│   │   ├── Button.ts          # ボタン
│   │   ├── Input.ts           # 入力フィールド
│   │   ├── Modal.ts           # モーダル
│   │   └── Toast.ts           # 通知
│   ├── ui/                    # UIコンポーネント（実装済み）
│   │   ├── CopyButton.ts      # ✅ コピーボタン（インライン対応）
│   │   ├── DeleteButton.ts    # ✅ 削除ボタン（確認ダイアログ付き）
│   │   └── ToastNotification.ts # ✅ トースト通知システム
│   ├── prompt/                # プロンプト関連（実装済み）
│   │   ├── PromptCreateModal.ts # ✅ プロンプト作成モーダル
│   │   ├── PromptCard.ts      # 🔴 未実装
│   │   ├── PromptForm.ts      # 🔴 未実装
│   │   ├── PromptList.ts      # 🔴 未実装
│   │   └── PromptSearch.ts    # 🔴 未実装
│   ├── layout/                # レイアウトコンポーネント
│   │   ├── Header.ts          # ✅ ヘッダー
│   │   ├── Sidebar.ts         # ✅ サイドバー
│   │   └── Container.ts       # ✅ コンテナ
│   ├── export/                # エクスポート機能（実装済み）
│   │   ├── ExportButton.ts    # ✅ エクスポートボタン
│   │   ├── ExportModal.ts     # ✅ エクスポートダイアログ
│   │   └── FormatSelector.ts  # ✅ 形式選択
│   └── settings/              # 設定UI
│       ├── SettingsForm.ts    # ✅ 設定フォーム（基本実装）
│       ├── FeatureToggle.ts   # ✅ 機能切り替え
│       └── ThemeSelector.ts   # ✅ テーマ選択
├── types/                # 型定義
│   └── index.ts              # 全型定義
├── utils/                # ユーティリティ
│   ├── storage.ts            # ストレージ操作
│   └── index.ts              # 汎用ユーティリティ
├── background/           # バックグラウンドスクリプト
│   ├── index.ts               # ✅ プロンプト管理統合済み
│   └── background.ts          # ✅ メッセージハンドリング
├── content/              # コンテンツスクリプト
│   └── content.ts             # ✅ サイト統合（ChatGPT対応）
├── popup/                # ポップアップUI（実装済み）
│   ├── popup.ts               # ✅ 完全実装（CRUD操作対応）
│   └── popup.html             # ✅ UIレイアウト
├── options/              # 設定ページ（基本実装）
│   ├── options.ts             # ⚠️ 基本UI（機能は未実装）
│   └── options.html           # ✅ 設定画面レイアウト
└── styles/               # スタイルシート
    └── global.css            # Tailwind CSSベーススタイル
```

## 現在の開発状況

### 📊 実装進捗
- **プロンプト管理機能**: ✅ 完全実装
- **ポップアップUI**: ✅ 完全実装  
- **エクスポート機能**: ✅ 完全実装（ChatGPT対応）
- **基本設定UI**: ⚠️ 部分実装（機能連携未完了）
- **AIサイト統合**: 🔴 未実装（プロンプト挿入機能）
- **検索・フィルタ**: 🔴 未実装

### 🎯 次期実装予定
1. **プロンプト編集機能**: 既存プロンプトの修正機能
2. **検索・フィルタ機能**: タグベースでの絞り込み
3. **AIサイト統合**: Claude、Geminiへのプロンプト挿入
4. **設定機能**: テーマ切り替え、多言語対応
5. **インポート機能**: プロンプトの一括インポート

## 開発環境セットアップ

### 前提条件
- **Node.js 20.19.4** (Voltaを使用して管理)
- **npm 10.0+**

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd pocket-prompt

# Voltaを使用してNode.jsバージョンを設定（推奨）
volta install node@20.19.4

# 依存関係をインストール
npm install
```

### 開発コマンド

```bash
# 開発モードでビルド（ファイル監視付き）
npm run dev

# 本番ビルド
npm run build

# 型チェック
npm run type-check

# リント
npm run lint

# フォーマット
npm run format

# プロジェクト解析
npm run analyze

# 全チェック（型チェック + リント）
npm run check
```

### Chrome拡張機能として読み込み

1. `npm run build` でビルド実行
2. Chromeで `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `dist` フォルダを選択

## 設計原則

### Clean Architecture
- **外部依存の分離**: UIとビジネスロジックを明確に分離
- **依存性逆転**: コアロジックは外部技術に依存しない設計
- **単一責任**: 各モジュールは明確な責任を持つ

### TypeScript活用
- **厳密な型チェック**: `strict: true` による型安全性
- **インターフェース設計**: 明確なコントラクト定義
- **絶対パス import**: `@/` プレフィックスによる可読性向上

### Tailwind CSS統合
- **Chrome拡張特化カスタムテーマ**: primaryカラーとサイズ設定
- **コンポーネントクラス**: 再利用可能なスタイルパターン
- **レスポンシブ対応**: 様々な表示サイズへの対応

## ライセンス

MIT License

## 貢献

プロジェクトの改善にご協力いただける場合は、issueの作成やプルリクエストをお送りください。

## サポート

問題が発生した場合は、GitHubのissuesで報告してください。