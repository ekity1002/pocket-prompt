# TASK-0014: ワンクリックコピー機能UI実装 - 要件定義

## 概要
プロンプト一覧から直感的かつ効率的にワンクリックでクリップボードにコピーできる機能のUI実装。視覚的フィードバック、キーボードナビゲーション、アクセシビリティ対応を含む包括的な実装。

## 要件一覧

### REQ-COPY-001: コピーボタンUI
**要件**: 各プロンプトアイテムに専用のコピーボタンを配置
- **配置**: プロンプトアイテムの右上角
- **デザイン**: アイコンボタン（コピーアイコン）
- **サイズ**: 32x32px、タッチフレンドリー
- **ツールチップ**: ホバー時に「コピー」表示
- **状態**: デフォルト、ホバー、アクティブ、ローディング

### REQ-COPY-002: 視覚的フィードバック
**要件**: コピー操作の視覚的フィードバック提供
- **クリック時アニメーション**: バウンス効果、アイコン変化
- **成功フィードバック**: 
  - アイコンが一時的にチェックマークに変化
  - 緑色のハイライト効果
  - トースト通知「コピーしました」
- **失敗フィードバック**:
  - アイコンが一時的にエラーアイコンに変化
  - 赤色のハイライト効果
  - エラートースト通知

### REQ-COPY-003: トースト通知システム
**要件**: 非侵入的な通知システム実装
- **表示位置**: ポップアップ上部
- **表示時間**: 成功3秒、エラー5秒
- **アニメーション**: スライドイン・フェードアウト
- **タイプ**: 成功、エラー、情報
- **アクセシビリティ**: ARIA live region対応

### REQ-COPY-004: キーボードナビゲーション
**要件**: キーボード操作でのコピー機能
- **フォーカス管理**: Tabキーでプロンプト間移動
- **コピーショートカット**: 
  - Spaceキーまたはenterキーでコピー実行
  - Ctrl+C（フォーカス中）でコピー
- **視覚的フォーカス**: フォーカスリングの明確な表示
- **スクリーンリーダー**: 適切な読み上げ対応

### REQ-COPY-005: レスポンシブ・アダプティブUI
**要件**: 異なる画面サイズ・デバイス対応
- **Chrome拡張サイズ**: 350px幅での最適表示
- **タッチサポート**: モバイルデバイスでの操作対応
- **高DPI対応**: Retinaディスプレイでのシャープな表示
- **プリファレンス対応**: prefers-reduced-motionの尊重

### REQ-COPY-006: 使用統計・分析連携
**要件**: コピー操作の統計記録
- **使用回数更新**: 各プロンプトのコピー回数自動更新
- **最終使用日時**: コピー日時の記録
- **統計表示**: プロンプト一覧での使用回数表示
- **ソート連携**: 使用頻度順ソートとの連携

## 技術仕様

### UIコンポーネント構成
```
CopyButton
├── CopyIcon (デフォルト状態)
├── LoadingSpinner (コピー中)
├── SuccessIcon (成功時)
└── ErrorIcon (失敗時)

ToastNotification
├── ToastContainer (位置管理)
├── ToastItem (個別通知)
└── ToastManager (状態管理)
```

### CSS実装方針
```css
/* コピーボタンの基本スタイル */
.copy-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.2s ease;
}

/* アニメーション */
@keyframes copy-success {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .copy-button {
    animation: none;
    transition: none;
  }
}
```

### TypeScript実装設計
```typescript
interface CopyButtonProps {
  promptId: string;
  onCopy: (promptId: string) => Promise<void>;
  disabled?: boolean;
  variant?: 'default' | 'compact';
}

interface CopyState {
  status: 'idle' | 'copying' | 'success' | 'error';
  message?: string;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration: number;
  timestamp: number;
}
```

### アクセシビリティ実装
```html
<button 
  class="copy-button"
  aria-label="プロンプトをクリップボードにコピー"
  data-prompt-id="prompt-123"
  role="button"
  tabindex="0"
>
  <svg role="img" aria-hidden="true">
    <!-- コピーアイコン -->
  </svg>
</button>

<!-- トースト通知 -->
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  class="toast-container"
>
  <!-- 通知内容 -->
</div>
```

## パフォーマンス要件

### 応答性能
- **コピー実行**: 200ms以内に視覚的フィードバック開始
- **クリップボードコピー**: 1秒以内に完了（NFR-002）
- **UI更新**: 16ms以内でスムーズなアニメーション

### メモリ効率
- **イベントリスナー**: 適切なクリーンアップ
- **タイマー管理**: トースト通知の自動削除
- **DOM更新**: 最小限のDOM操作

## セキュリティ要件

### データ保護
- **クリップボードアクセス**: chrome.clipboardWrite権限の適切な使用
- **XSS対策**: HTML出力時のエスケープ処理
- **入力検証**: promptIdの妥当性チェック

### プライバシー
- **使用統計**: ローカルストレージのみ使用
- **ログ記録**: 機密情報の除外
- **エラー報告**: 個人情報の非含有

## テスト戦略

### 単体テスト
- [ ] CopyButtonコンポーネントのレンダリング
- [ ] 各状態（idle, copying, success, error）の表示
- [ ] クリックイベント処理
- [ ] キーボードイベント処理
- [ ] ToastNotificationの表示・非表示

### 統合テスト
- [ ] ClipboardManagerとの連携
- [ ] 使用統計更新の確認
- [ ] エラーハンドリングフロー
- [ ] UI状態の連携動作

### アクセシビリティテスト
- [ ] スクリーンリーダーでの読み上げ
- [ ] キーボードナビゲーション
- [ ] フォーカス管理
- [ ] カラーコントラスト比
- [ ] 拡大表示での使用性

### ユーザビリティテスト
- [ ] 直感的な操作性
- [ ] フィードバックの明確性
- [ ] エラー状況の理解容易性
- [ ] レスポンシブ表示の確認

## 実装手順

### Phase 1: 基本UI実装
1. CopyButtonコンポーネント作成
2. 基本的なクリック処理実装
3. アイコン・スタイル適用

### Phase 2: フィードバック機能
1. トースト通知システム実装
2. アニメーション効果追加
3. 状態管理の強化

### Phase 3: アクセシビリティ
1. ARIA属性追加
2. キーボードナビゲーション
3. スクリーンリーダー対応

### Phase 4: 統合・最適化
1. 既存システムとの統合
2. パフォーマンス最適化
3. エラーハンドリング強化

## 成功基準

### 機能要件
- [ ] ワンクリックでコピー実行
- [ ] 明確な成功・失敗フィードバック
- [ ] キーボード操作完全対応
- [ ] 使用統計の正確な記録

### 非機能要件
- [ ] 1秒以内のコピー完了
- [ ] スムーズなアニメーション（60fps）
- [ ] アクセシビリティ基準準拠
- [ ] Chrome拡張サイズでの最適表示

### ユーザビリティ要件
- [ ] 直感的な操作（初回使用で理解可能）
- [ ] 明確な状態フィードバック
- [ ] エラー時の適切な説明
- [ ] 快適な操作体験