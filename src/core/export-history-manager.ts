// TASK-0019: Export History Manager Implementation
// エクスポート履歴・管理機能の実装

import { StorageManager } from './storage-manager';
import type {
  ConversationExport,
  ExportHistoryEntry,
  ExportStatistics,
  SupportedAISite,
  ExportFormat,
} from '@/types';

/**
 * Export History Manager
 * エクスポート履歴の保存、取得、管理機能を提供
 */
export class ExportHistoryManager {
  private readonly HISTORY_KEY = 'exportHistory';
  private readonly EXPORT_DATA_PREFIX = 'exportData_';
  private readonly DEFAULT_RETENTION_DAYS = 30;

  constructor(private storage: StorageManager) {}

  /**
   * エクスポートを履歴に保存
   * @param exportData エクスポートデータ
   */
  async saveToHistory(exportData: ConversationExport): Promise<void> {
    try {
      const historyEntry: ExportHistoryEntry = {
        exportId: exportData.id,
        title: exportData.title,
        site: exportData.site,
        format: exportData.format,
        exportedAt: exportData.exportedAt,
        url: exportData.url,
        fileSize: this.calculateFileSize(exportData),
        messageCount: exportData.metadata.messageCount,
      };

      // 既存の履歴を取得
      const existingHistory = await this.getHistory();

      // 新しいエントリを最初に追加（最新順）
      const updatedHistory = [historyEntry, ...existingHistory];

      // 履歴を保存
      await this.storage.set(this.HISTORY_KEY, updatedHistory);

      // エクスポートデータ本体も保存（再ダウンロード用）
      await this.storage.set(`${this.EXPORT_DATA_PREFIX}${exportData.id}`, exportData);
    } catch (error) {
      console.error('Failed to save export to history:', error);
      throw new Error(
        `Failed to save export to history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * エクスポート履歴を取得
   * @param limit 取得する履歴数の上限（デフォルトはすべて）
   * @returns エクスポート履歴リスト（最新順）
   */
  async getHistory(limit?: number): Promise<ExportHistoryEntry[]> {
    try {
      const history = (await this.storage.get<ExportHistoryEntry[]>(this.HISTORY_KEY)) || [];

      if (limit && limit > 0) {
        return history.slice(0, limit);
      }

      return history;
    } catch (error) {
      console.error('Failed to get export history:', error);
      return [];
    }
  }

  /**
   * 重複エクスポートをチェック
   * @param url 会話のURL
   * @param site AIサイト
   * @param title 会話タイトル
   * @returns 重複している場合はtrue
   */
  async checkDuplicate(url: string, site: SupportedAISite, title: string): Promise<boolean> {
    try {
      const history = await this.getHistory();

      return history.some((entry) => entry.url === url && entry.site === site);
    } catch (error) {
      console.error('Failed to check duplicate export:', error);
      return false;
    }
  }

  /**
   * エクスポート統計情報を取得
   * @returns 統計情報
   */
  async getStatistics(): Promise<ExportStatistics> {
    try {
      const history = await this.getHistory();

      if (history.length === 0) {
        return {
          totalExports: 0,
          totalFileSize: 0,
          averageFileSize: 0,
          totalMessages: 0,
          averageMessages: 0,
          siteBreakdown: { chatgpt: 0, claude: 0, gemini: 0 },
          formatBreakdown: { markdown: 0, json: 0, txt: 0, csv: 0 },
          oldestExport: null,
          newestExport: null,
        };
      }

      const totalExports = history.length;
      const totalFileSize = history.reduce((sum, entry) => sum + entry.fileSize, 0);
      const totalMessages = history.reduce((sum, entry) => sum + entry.messageCount, 0);

      // サイト別集計
      const siteBreakdown: Record<SupportedAISite, number> = { chatgpt: 0, claude: 0, gemini: 0 };
      history.forEach((entry) => {
        siteBreakdown[entry.site]++;
      });

      // フォーマット別集計
      const formatBreakdown: Record<ExportFormat, number> = {
        markdown: 0,
        json: 0,
        txt: 0,
        csv: 0,
      };
      history.forEach((entry) => {
        formatBreakdown[entry.format]++;
      });

      // 日付の最古と最新を取得（履歴は最新順でソートされている）
      const exportDates = history.map((entry) => entry.exportedAt).sort();
      const oldestExport = exportDates[0];
      const newestExport = exportDates[exportDates.length - 1];

      return {
        totalExports,
        totalFileSize,
        averageFileSize: Math.round(totalFileSize / totalExports),
        totalMessages,
        averageMessages: Math.round((totalMessages / totalExports) * 100) / 100,
        siteBreakdown,
        formatBreakdown,
        oldestExport,
        newestExport,
      };
    } catch (error) {
      console.error('Failed to get export statistics:', error);
      throw new Error(
        `Failed to get export statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 古い履歴を自動削除
   * @param retentionDays 保持日数（デフォルト30日）
   */
  async cleanupOldHistory(retentionDays: number = this.DEFAULT_RETENTION_DAYS): Promise<void> {
    try {
      const history = await this.getHistory();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const retainedHistory = history.filter((entry) => {
        const exportDate = new Date(entry.exportedAt);
        return exportDate >= cutoffDate;
      });

      // 削除されるエントリのデータも削除
      const deletedEntries = history.filter((entry) => {
        const exportDate = new Date(entry.exportedAt);
        return exportDate < cutoffDate;
      });

      for (const entry of deletedEntries) {
        await this.storage.remove(`${this.EXPORT_DATA_PREFIX}${entry.exportId}`);
      }

      // 履歴が変更された場合のみ保存
      if (retainedHistory.length !== history.length) {
        await this.storage.set(this.HISTORY_KEY, retainedHistory);
      }
    } catch (error) {
      console.error('Failed to cleanup old history:', error);
      throw new Error(
        `Failed to cleanup old history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 履歴からエクスポートデータを取得（再ダウンロード用）
   * @param exportId エクスポートID
   * @returns エクスポートデータ
   */
  async getExportForRedownload(exportId: string): Promise<ConversationExport> {
    try {
      // まず履歴にエクスポートが存在するかチェック
      const history = await this.getHistory();
      const historyEntry = history.find((entry) => entry.exportId === exportId);

      if (!historyEntry) {
        throw new Error('Export not found in history');
      }

      // エクスポートデータを取得
      const exportData = await this.storage.get<ConversationExport>(
        `${this.EXPORT_DATA_PREFIX}${exportId}`
      );

      if (!exportData) {
        throw new Error('Export data not found');
      }

      return exportData;
    } catch (error) {
      console.error('Failed to get export for redownload:', error);
      throw error;
    }
  }

  /**
   * 履歴から特定のエクスポートを削除
   * @param exportId 削除するエクスポートID
   */
  async removeFromHistory(exportId: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const updatedHistory = history.filter((entry) => entry.exportId !== exportId);

      // 履歴を更新
      await this.storage.set(this.HISTORY_KEY, updatedHistory);

      // エクスポートデータも削除
      await this.storage.remove(`${this.EXPORT_DATA_PREFIX}${exportId}`);
    } catch (error) {
      console.error('Failed to remove export from history:', error);
      throw new Error(
        `Failed to remove export from history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * エクスポートデータのファイルサイズを計算
   * @param exportData エクスポートデータ
   * @returns ファイルサイズ（バイト）
   */
  private calculateFileSize(exportData: ConversationExport): number {
    try {
      return new Blob([JSON.stringify(exportData)]).size;
    } catch {
      // フォールバック：JSON文字列の長さ × 2 (UTF-16概算)
      return JSON.stringify(exportData).length * 2;
    }
  }
}

export default ExportHistoryManager;
