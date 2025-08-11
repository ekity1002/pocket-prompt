import type { ClipboardResult, ClipboardMetrics, ClipboardDebugInfo } from '@/types';
import type { PromptManager } from './prompt-manager';

export class ClipboardManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 100;
  private static readonly DEFAULT_TIMEOUT_MS = 5000;

  constructor(private promptManager: PromptManager) {}

  async copyToClipboard(
    text: string,
    timeoutMs: number = ClipboardManager.DEFAULT_TIMEOUT_MS,
    promptId?: string
  ): Promise<ClipboardResult> {
    this.validateInput(text);

    const context = this.createOperationContext(text);

    try {
      await this.performCopyWithRetry(text, timeoutMs, context);
      await this.recordUsageIfNeeded(promptId);

      return this.createSuccessResult(context);
    } catch (error) {
      return this.createErrorResult(error as Error, context);
    }
  }

  // ========================================
  // VALIDATION METHODS
  // ========================================

  private validateInput(text: string): void {
    if (text === null || text === undefined) {
      throw new Error('Text content is required');
    }
  }

  // ========================================
  // OPERATION CONTEXT MANAGEMENT
  // ========================================

  private createOperationContext(text: string) {
    return {
      startTime: Date.now(),
      textLength: text.length,
      retryCount: 0,
    };
  }

  // ========================================
  // CORE COPY OPERATIONS
  // ========================================

  private async performCopyWithRetry(
    text: string,
    timeoutMs: number,
    context: { retryCount: number }
  ): Promise<void> {
    let lastError: Error | null = null;

    while (context.retryCount < ClipboardManager.MAX_RETRIES) {
      try {
        this.validateClipboardAvailability();
        await this.copyWithTimeout(text, timeoutMs);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        context.retryCount++;

        if (this.shouldStopRetrying(error as Error, context.retryCount)) {
          break;
        }

        await this.delayBeforeRetry();
      }
    }

    // All retries failed
    throw lastError || new Error('Unknown error during copy operation');
  }

  private validateClipboardAvailability(): void {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not available');
    }
  }

  private shouldStopRetrying(error: Error, retryCount: number): boolean {
    // Don't retry timeout errors - they indicate system limitation
    if (error.message.includes('timeout')) {
      return true;
    }

    // Stop if we've reached max retries
    return retryCount >= ClipboardManager.MAX_RETRIES;
  }

  private async delayBeforeRetry(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ClipboardManager.RETRY_DELAY_MS));
  }

  // ========================================
  // USAGE TRACKING
  // ========================================

  private async recordUsageIfNeeded(promptId?: string): Promise<void> {
    if (!promptId) {
      return;
    }

    try {
      await this.promptManager.recordUsage(promptId);
    } catch (error) {
      // Ignore usage tracking errors - don't fail the copy operation
      console.warn('Failed to record usage:', error);
    }
  }

  // ========================================
  // RESULT CREATION
  // ========================================

  private createSuccessResult(context: {
    startTime: number;
    textLength: number;
    retryCount: number;
  }): ClipboardResult {
    const metrics = this.createMetrics(context);

    return {
      success: true,
      timestamp: new Date(),
      metrics,
    };
  }

  private createErrorResult(
    error: Error,
    context: { startTime: number; textLength: number; retryCount: number }
  ): ClipboardResult {
    const metrics = this.createMetrics(context);
    const debugInfo = this.createDebugInfo(error);

    const errorMessage =
      context.retryCount >= ClipboardManager.MAX_RETRIES
        ? `Failed after ${ClipboardManager.MAX_RETRIES} attempts: ${error.message}`
        : error.message || 'Unknown error';

    return {
      success: false,
      error: errorMessage,
      timestamp: new Date(),
      metrics,
      debugInfo,
    };
  }

  private createMetrics(context: {
    startTime: number;
    textLength: number;
    retryCount: number;
  }): ClipboardMetrics {
    const duration = Math.max(1, Date.now() - context.startTime); // Ensure at least 1ms

    return {
      duration,
      textLength: context.textLength,
      retryCount: context.retryCount,
    };
  }

  private createDebugInfo(error: Error): ClipboardDebugInfo {
    return {
      originalError: error,
      userAgent: navigator.userAgent,
      clipboardApiSupported: !!navigator.clipboard,
      permissionsGranted: false, // Assume false if we got here
    };
  }

  private async copyWithTimeout(text: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Copy operation timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      navigator.clipboard
        .writeText(text)
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          // Handle different types of clipboard errors
          if (error.name === 'NotAllowedError') {
            reject(new Error('Permission denied: Clipboard access not allowed'));
          } else {
            reject(error);
          }
        });
    });
  }
}
