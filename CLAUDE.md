■実装ルール
リリースブランチ: main
開発ブランチ: develop
gitフローで開発を行う.
各種修正のプルリクはdevelopブランチに行う
コミットする前にbiome format をかけること。

■技術スタック
- Node.js バージョン管理: Volta (Node.js 20.19.4)
- TypeScript: 厳格モードで型安全性を確保
- ビルドシステム: Vite (Chrome拡張最適化)
- CSS Framework: Tailwind CSS v3
  - Chrome拡張向けカスタムテーマ
  - PostCSS + Autoprefixer統合
- リント・フォーマット: Biome.js
- Chrome Extension: Manifest V3準拠

