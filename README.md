# Pocket-Prompt - Chrome拡張機能

AIチャットサービス用のプロンプト管理Chrome拡張機能

## 概要

Pocket-Promptは、ChatGPT、Claude、Geminiなどの主要AIサービスで使用するプロンプトを効率的に管理・利用できるChrome拡張機能です。Clean Architectureに基づいた設計により、保守性と拡張性を重視した実装となっています。

## 主な機能

### 🗂️ プロンプト管理
- プロンプトの作成、編集、削除
- タグベースでの分類と検索
- お気に入り機能
- 使用回数・最終使用日の追跡

### 🤖 AIサイト統合
- **対応サイト**: ChatGPT、Claude、Gemini
- プロンプトの直接挿入
- 会話履歴のエクスポート
- サイト自動検出

### 📤 エクスポート機能
- **対応形式**: Markdown、JSON、TXT、CSV
- メタデータ付きエクスポート
- ローカルストレージ保存
- クリップボードコピー

### ⚙️ カスタマイズ
- ライト/ダーク/オートテーマ
- 日本語/英語対応
- 機能の個別有効化設定

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
│   ├── prompt-manager.ts      # プロンプト管理ロジック
│   ├── export-manager.ts      # エクスポート機能
│   └── ai-site-connector.ts   # AIサイト統合
├── components/           # UI層 - 再利用可能コンポーネント
│   ├── base/                  # 基本UIコンポーネント
│   │   ├── Button.ts          # ボタン
│   │   ├── Input.ts           # 入力フィールド
│   │   ├── Modal.ts           # モーダル
│   │   └── Toast.ts           # 通知
│   ├── layout/                # レイアウトコンポーネント
│   │   ├── Header.ts          # ヘッダー
│   │   ├── Sidebar.ts         # サイドバー
│   │   └── Container.ts       # コンテナ
│   ├── prompt/                # プロンプト関連
│   │   ├── PromptCard.ts      # プロンプトカード
│   │   ├── PromptForm.ts      # プロンプト編集フォーム
│   │   ├── PromptList.ts      # プロンプト一覧
│   │   └── PromptSearch.ts    # プロンプト検索
│   ├── export/                # エクスポート機能
│   │   ├── ExportButton.ts    # エクスポートボタン
│   │   ├── ExportModal.ts     # エクスポートダイアログ
│   │   └── FormatSelector.ts  # 形式選択
│   └── settings/              # 設定UI
│       ├── SettingsForm.ts    # 設定フォーム
│       ├── FeatureToggle.ts   # 機能切り替え
│       └── ThemeSelector.ts   # テーマ選択
├── types/                # 型定義
│   └── index.ts              # 全型定義
├── utils/                # ユーティリティ
│   ├── storage.ts            # ストレージ操作
│   └── index.ts              # 汎用ユーティリティ
├── background/           # バックグラウンドスクリプト
│   └── background.ts
├── content/              # コンテンツスクリプト
│   └── content.ts
├── popup/                # ポップアップUI
│   ├── popup.ts
│   └── popup.html
├── options/              # 設定ページ
│   ├── options.ts
│   └── options.html
└── styles/               # スタイルシート
    └── global.css            # Tailwind CSSベーススタイル
```

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