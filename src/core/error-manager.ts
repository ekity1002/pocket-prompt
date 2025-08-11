// ErrorManager Implementation
// TASK-0010: Comprehensive error handling and logging infrastructure

import type {
  ErrorContext,
  UserErrorInfo,
  ErrorStatistics,
  StructuredLogEntry,
  ErrorLevel,
  ChromeExtensionError,
} from '@/types';

export class ErrorManager {
  private static readonly ERROR_STORAGE_KEY = 'errorStats';
  private static readonly MAX_LOG_SIZE = 50; // Maximum characters for production logging

  // ========================================
  // CORE ERROR LOGGING METHODS
  // ========================================

  static async logError(error: Error, context: ErrorContext): Promise<void> {
    const logEntry = this.createStructuredLogEntry(error, 'ERROR', context);
    console.error(`ERROR [${context.module || 'Unknown'}]`, logEntry);
    await this.updateErrorStatistics(error, context);
  }

  static async logWarning(message: string, context: ErrorContext): Promise<void> {
    const warningEntry = this.createStructuredLogEntry(new Error(message), 'WARN', context);
    console.warn(`WARN [${context.module || 'Unknown'}]`, warningEntry);
  }

  static async logInfo(message: string, context: ErrorContext): Promise<void> {
    const infoEntry = this.createStructuredLogEntry(new Error(message), 'INFO', context);
    console.info(`INFO [${context.module || 'Unknown'}]`, infoEntry);
  }

  // ========================================
  // CHROME EXTENSION SPECIFIC ERROR HANDLING
  // ========================================

  static async handleStorageError(error: Error): Promise<void> {
    const context: ErrorContext = {
      module: 'Chrome.Storage',
      function: 'storageOperation',
    };

    const logEntry = this.createStructuredLogEntry(error, 'ERROR', context);
    logEntry.errorType = error.name || 'StorageError';
    logEntry.chromeSpecific = true;

    console.error('CHROME_STORAGE_ERROR', logEntry);
  }

  static async handlePermissionError(error: Error): Promise<void> {
    const context: ErrorContext = {
      module: 'Chrome.Permissions',
      function: 'permissionCheck',
    };

    const logEntry = this.createStructuredLogEntry(error, 'ERROR', context);
    logEntry.errorType = error.name || 'PermissionError';
    logEntry.chromeSpecific = true;

    console.error('CHROME_PERMISSION_ERROR', logEntry);
  }

  static async handleChromeExtensionError(
    error: ChromeExtensionError,
    context?: ErrorContext
  ): Promise<void> {
    const errorContext: ErrorContext = context || {
      module: 'Chrome.Extension',
      function: 'extensionOperation',
    };

    const logEntry = this.createStructuredLogEntry(error, 'ERROR', errorContext);
    logEntry.errorType = error.name || 'ChromeExtensionError';
    logEntry.chromeSpecific = true;

    // Determine context based on error patterns
    if (error.message.includes('Service worker')) {
      logEntry.context = 'service_worker';
    } else if (error.message.includes('connection') || error.message.includes('inject')) {
      logEntry.context = 'content_script';
    } else {
      logEntry.context = error.context || 'unknown';
    }

    console.error('CHROME_EXTENSION_ERROR', logEntry);
  }

  // ========================================
  // USER-FRIENDLY ERROR HANDLING
  // ========================================

  static handleUserError(error: Error): UserErrorInfo {
    // Handle quota exceeded errors
    if (error.name === 'QuotaExceededError' || error.message.includes('QuotaExceeded')) {
      return {
        title: 'ストレージ容量不足',
        message: 'データの保存容量が不足しています。不要なプロンプトを削除してください。',
        actionable: true,
        actions: [
          { label: 'データを整理', action: 'cleanup' },
          { label: '設定を確認', action: 'settings' },
        ],
        severity: 'error',
      };
    }

    // Handle permission errors
    if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
      return {
        title: '権限が必要です',
        message: 'この機能を使用するには権限の許可が必要です。設定を確認してください。',
        actionable: true,
        actions: [
          { label: '権限設定', action: 'permissions' },
          { label: 'ヘルプ', action: 'help' },
        ],
        severity: 'warning',
      };
    }

    // Handle network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        title: 'ネットワークエラー',
        message: 'インターネット接続を確認して、再度お試しください。',
        actionable: true,
        actions: [
          { label: '再試行', action: 'retry' },
          { label: '接続確認', action: 'network' },
        ],
        severity: 'error',
      };
    }

    // Generic error fallback
    return {
      title: 'エラーが発生しました',
      message: '予期しないエラーが発生しました。しばらく待ってから再度お試しください。',
      actionable: true,
      actions: [
        { label: '再試行', action: 'retry' },
        { label: 'サポート', action: 'support' },
      ],
      severity: 'error',
    };
  }

  static getErrorMessage(error: Error, locale: 'ja' | 'en' = 'ja'): string {
    if (locale === 'en') {
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        return 'Network connection failed. Please check your internet connection and try again.';
      }
      if (error.name === 'QuotaExceededError') {
        return 'Storage quota exceeded. Please free up some space and try again.';
      }
      return 'An unexpected error occurred. Please try again later.';
    }

    // Japanese messages (default)
    if (error.message.includes('fetch')) {
      return 'ネットワーク接続に失敗しました。インターネット接続を確認して再度お試しください。';
    }
    if (error.name === 'QuotaExceededError') {
      return 'ストレージ容量が不足しています。容量を空けて再度お試しください。';
    }
    return '予期しないエラーが発生しました。しばらく待ってから再度お試しください。';
  }

  // ========================================
  // ERROR STATISTICS AND MONITORING
  // ========================================

  static async getErrorStats(): Promise<ErrorStatistics> {
    try {
      const result = await chrome.storage.local.get([this.ERROR_STORAGE_KEY]);
      const stats = result[this.ERROR_STORAGE_KEY] || this.createDefaultStats();

      // Calculate error rate if we have time data
      if (stats.totalErrors > 0 && stats.lastUpdated) {
        const hoursSinceLastUpdate =
          (Date.now() - new Date(stats.lastUpdated).getTime()) / (1000 * 60 * 60);
        stats.errorRate = hoursSinceLastUpdate > 0 ? stats.totalErrors / hoursSinceLastUpdate : 0;
      }

      return stats;
    } catch (error) {
      console.warn('Failed to get error statistics:', error);
      return this.createDefaultStats();
    }
  }

  static async reportCriticalError(error: Error): Promise<void> {
    const context: ErrorContext = {
      module: 'CriticalErrorReporter',
      function: 'reportCriticalError',
    };

    const logEntry = this.createStructuredLogEntry(error, 'CRITICAL', context);
    logEntry.severity = 'critical';
    logEntry.requiresImmedateAttention = true;

    console.error('CRITICAL', logEntry);

    // Update statistics for critical errors
    await this.updateErrorStatistics(error, context);
  }

  // ========================================
  // PRIVATE UTILITY METHODS
  // ========================================

  private static createStructuredLogEntry(
    error: Error,
    level: ErrorLevel,
    context: ErrorContext
  ): StructuredLogEntry {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    const baseEntry: StructuredLogEntry = {
      timestamp: new Date(),
      level,
      module: context.module || 'Unknown',
      function: context.function || 'Unknown',
      message: error.message,
      userAgent: navigator.userAgent,
      requestId: context.requestId,
      debugMode: isDevelopment,
      environment: process.env.NODE_ENV || 'development',
    };

    // Add stack trace in development or for errors
    if (isDevelopment || level === 'ERROR' || level === 'CRITICAL') {
      baseEntry.stack = error.stack;
    }

    // Add performance impact detection
    if (context.metadata?.duration && context.metadata?.threshold) {
      baseEntry.performanceImpact = context.metadata.duration > context.metadata.threshold;
      if (!isProduction) {
        baseEntry.metadata = context.metadata;
      }
    }

    // Add reproduction context in development or test environment
    if ((isDevelopment || process.env.NODE_ENV === 'test') && context.reproductionContext) {
      baseEntry.reproductionContext = context.reproductionContext;
    }

    // Add metadata only in non-production environments to avoid sensitive data
    if (!isProduction && context.metadata && !this.containsSensitiveData(context.metadata)) {
      baseEntry.metadata = context.metadata;
    }

    return baseEntry;
  }

  private static containsSensitiveData(metadata: Record<string, any>): boolean {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'sensitiveData'];
    return Object.keys(metadata).some((key) =>
      sensitiveKeys.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey.toLowerCase()))
    );
  }

  private static async updateErrorStatistics(error: Error, context: ErrorContext): Promise<void> {
    try {
      const currentStats = await this.getErrorStats();

      const updatedStats: ErrorStatistics = {
        totalErrors: currentStats.totalErrors + 1,
        errorsByType: {
          ...currentStats.errorsByType,
          [error.name || 'UnknownError']:
            (currentStats.errorsByType?.[error.name || 'UnknownError'] || 0) + 1,
        },
        errorsByModule: {
          ...currentStats.errorsByModule,
          [context.module || 'Unknown']:
            (currentStats.errorsByModule?.[context.module || 'Unknown'] || 0) + 1,
        },
        lastUpdated: new Date().toISOString(),
      };

      await chrome.storage.local.set({ [this.ERROR_STORAGE_KEY]: updatedStats });
    } catch (storageError) {
      console.warn('Failed to update error statistics:', storageError);
    }
  }

  private static createDefaultStats(): ErrorStatistics {
    return {
      totalErrors: 0,
      errorsByType: {},
      errorsByModule: {},
      errorRate: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}
