# ポップアップUI基盤 要件定義
# TASK-0011: ポップアップUI基盤・レイアウト

## 🎯 目的

Chrome拡張のポップアップUIの基盤となるレイアウト、スタイリング、状態管理システムを構築し、優れたユーザーエクスペリエンスを提供する。

## 📋 機能要件

### REQ-UI-001: 基本レイアウト構造
- Chrome拡張ポップアップに最適化されたサイズ (400x600px推奨)
- CSS Grid/Flexboxを使用したレスポンシブレイアウト
- ヘッダー、メインコンテンツ、フッターの3段構造
- スクロール可能なコンテンツエリア

### REQ-UI-002: 状態表示システム
- **ローディング状態**: データ読み込み中の視覚的フィードバック
- **エラー状態**: ErrorManagerと連携したユーザーフレンドリーエラー表示
- **空状態**: プロンプトが保存されていない場合の案内表示
- **成功状態**: アクション完了時のフィードバック表示

### REQ-UI-003: レスポンシブデザイン
- 異なるスクリーンサイズでの適切な表示
- Chrome拡張ウィンドウサイズ変更への対応
- テキストサイズ変更対応（アクセシビリティ）

### REQ-UI-004: アクセシビリティ基盤
- WCAG 2.1 AA レベル準拠
- キーボード操作完全対応
- スクリーンリーダー対応（ARIA属性）
- 適切なコントラスト比確保

### REQ-UI-005: テーマシステム
- ライト/ダークテーマ対応
- システムテーマ自動検出
- カスタムカラーパレット
- Chrome拡張に最適化されたスタイリング

### REQ-UI-006: パフォーマンス要件
- 初期表示: 3秒以内 (NFR-001)
- UI操作レスポンス: 100ms以内
- スムーズなアニメーション: 60fps
- メモリ使用量最適化

## 🏗️ アーキテクチャ設計

### HTML構造
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pocket Prompt</title>
    <link rel="stylesheet" href="popup.css">
</head>
<body>
    <div id="popup-root" class="popup-container">
        <!-- Header -->
        <header class="popup-header">
            <h1 class="app-title">Pocket Prompt</h1>
            <button class="settings-button" aria-label="設定">⚙️</button>
        </header>
        
        <!-- Main Content -->
        <main class="popup-main">
            <!-- State Display Components -->
            <div id="loading-state" class="state-display loading-state" hidden>
                <div class="spinner"></div>
                <p>読み込み中...</p>
            </div>
            
            <div id="error-state" class="state-display error-state" hidden>
                <div class="error-icon">⚠️</div>
                <h3 class="error-title">エラーが発生しました</h3>
                <p class="error-message"></p>
                <div class="error-actions"></div>
            </div>
            
            <div id="empty-state" class="state-display empty-state" hidden>
                <div class="empty-icon">📝</div>
                <h3>プロンプトがありません</h3>
                <p>新しいプロンプトを作成してみましょう</p>
                <button class="create-prompt-button">プロンプトを作成</button>
            </div>
            
            <!-- Content Container -->
            <div id="content-container" class="content-container">
                <!-- Dynamic content will be inserted here -->
            </div>
        </main>
        
        <!-- Footer -->
        <footer class="popup-footer">
            <button class="primary-action-button">新しいプロンプト</button>
        </footer>
    </div>
    
    <script src="popup.js"></script>
</body>
</html>
```

### CSS Grid Layout System
```css
.popup-container {
    display: grid;
    grid-template-rows: auto 1fr auto;
    grid-template-areas: 
        "header"
        "main"
        "footer";
    height: 100vh;
    max-height: 600px;
    width: 400px;
}

.popup-header { grid-area: header; }
.popup-main { grid-area: main; overflow-y: auto; }
.popup-footer { grid-area: footer; }
```

### 状態管理システム
```typescript
interface UIState {
    currentView: 'loading' | 'empty' | 'list' | 'form' | 'error';
    isLoading: boolean;
    error: UserErrorInfo | null;
    data: any | null;
}

class PopupStateManager {
    private state: UIState = {
        currentView: 'loading',
        isLoading: false,
        error: null,
        data: null,
    };

    setState(newState: Partial<UIState>): void
    showLoading(): void
    showError(error: UserErrorInfo): void
    showEmpty(): void
    showContent(data: any): void
    hideAllStates(): void
}
```

## 🎨 デザインシステム

### カラーパレット
```css
:root {
    /* Light Theme */
    --color-primary: #3b82f6;
    --color-primary-hover: #2563eb;
    --color-secondary: #6b7280;
    --color-background: #ffffff;
    --color-surface: #f9fafb;
    --color-text: #1f2937;
    --color-text-secondary: #6b7280;
    --color-border: #e5e7eb;
    --color-success: #10b981;
    --color-warning: #f59e0b;
    --color-error: #ef4444;
    
    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    
    /* Typography */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    
    /* Border Radius */
    --border-radius-sm: 0.25rem;
    --border-radius-md: 0.375rem;
    --border-radius-lg: 0.5rem;
    
    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
    --color-background: #1f2937;
    --color-surface: #374151;
    --color-text: #f9fafb;
    --color-text-secondary: #d1d5db;
    --color-border: #4b5563;
}
```

### コンポーネント設計原則
1. **再利用性**: 汎用的なコンポーネント設計
2. **アクセシビリティ**: ARIA属性、キーボード操作対応
3. **パフォーマンス**: CSS最適化、GPU加速アニメーション
4. **保守性**: BEMクラス命名規則、モジュール化

## 🧪 テスト要求

### REQ-UI-TEST-001: レスポンシブレイアウトテスト
- [ ] 320px幅での最小表示確認
- [ ] 400px推奨幅での最適表示確認
- [ ] 縦横比変更時のレイアウト維持
- [ ] テキストサイズ変更対応

### REQ-UI-TEST-002: アクセシビリティテスト
- [ ] キーボードナビゲーション全機能対応
- [ ] スクリーンリーダー読み上げ確認
- [ ] コントラスト比4.5:1以上確認
- [ ] フォーカスインジケータ視認性

### REQ-UI-TEST-003: 状態表示テスト
- [ ] ローディング状態正常表示・非表示
- [ ] エラー状態表示とErrorManager連携
- [ ] 空状態表示と適切な誘導
- [ ] 状態間遷移のスムーズさ

### REQ-UI-TEST-004: パフォーマンステスト
- [ ] 初期表示3秒以内完了
- [ ] UI操作100ms以内レスポンス
- [ ] アニメーション60fps維持
- [ ] メモリ使用量10MB以下

## 🎯 成功基準

### Phase 1 (必須)
- [x] 基本HTML構造とCSS Grid レイアウト
- [x] ローディング・エラー・空状態表示システム
- [x] 基本テーマシステム（ライト/ダーク）
- [x] キーボード操作基盤

### Phase 2 (推奨)
- [x] レスポンシブデザイン完全対応
- [x] アクセシビリティ WCAG 2.1 AA準拠
- [x] アニメーションシステム
- [x] ErrorManager統合

### Phase 3 (拡張)
- [ ] カスタムテーマ機能
- [ ] 高度なアニメーション効果
- [ ] パフォーマンス監視ダッシュボード

## 💡 技術的考慮事項

### Chrome拡張制約
- Content Security Policy準拠
- Manifest V3対応
- 最小限のリソース使用量
- セキュアなDOM操作

### パフォーマンス最適化
- CSS-in-JSではなくCSS Modulesまたは外部CSS
- 仮想スクロール（長いリスト用）
- レイジーローディング（画像・コンポーネント）
- メモリリーク防止

### ブラウザ互換性
- Chrome 88+ (Manifest V3サポート)
- Edge Chromium対応
- Firefox将来対応準備

## 📱 ユーザーエクスペリエンス

### ユーザージャーニー
1. **拡張アイコンクリック** → 3秒以内にポップアップ表示
2. **初回利用** → 空状態表示でプロンプト作成誘導
3. **エラー発生** → わかりやすいエラーメッセージと復旧手順
4. **データ読み込み** → ローディング状態でユーザー待機軽減

### インタラクション設計
- **ホバー効果**: 微細な色変更とシャドウ
- **クリック効果**: 即座のビジュアルフィードバック
- **キーボード操作**: 全機能をキーボードで操作可能
- **エラーハンドリング**: ErrorManagerと連携した統一的エラー表示