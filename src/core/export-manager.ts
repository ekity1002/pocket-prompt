// Core business logic for export functionality
// Handles conversation export from various AI sites
// TASK-0019: Enhanced with export history management

import { ExportHistoryManager } from './export-history-manager';
import type {
  ConversationExport,
  ConversationData,
  ExportFormat,
  ExportOptions,
  SupportedAISite,
  ExportHistoryEntry,
  ExportStatistics,
} from '@/types';

/**
 * Core Export Management Service
 * Handles business logic for exporting conversations from AI sites
 */
export class ExportManager {
  private storage: any;
  private historyManager: ExportHistoryManager;

  constructor(storageAdapter: any) {
    this.storage = storageAdapter;
    this.historyManager = new ExportHistoryManager(storageAdapter);
  }

  /**
   * Export conversation from current AI site
   * TASK-0019: Enhanced with duplicate check and history management
   */
  async exportConversation(
    site: SupportedAISite,
    options: ExportOptions
  ): Promise<ConversationExport> {
    // Validate options
    this.validateExportOptions(options);

    // Get site-specific extractor
    const extractor = this.getSiteExtractor(site);

    // Extract conversation data
    const conversationData = await extractor.extractConversation();

    // Check for duplicate export
    const url = options.url || (typeof window !== 'undefined' ? window.location.href : '');
    const isDuplicate = await this.historyManager.checkDuplicate(url, site, conversationData.title);

    if (isDuplicate && !options.forceDuplicate) {
      console.warn('Duplicate export detected:', { url, site, title: conversationData.title });
    }

    // Format the export
    const exportData: ConversationExport = {
      id: this.generateExportId(),
      site,
      title: conversationData.title || `${site} Conversation`,
      url,
      exportedAt: new Date().toISOString(),
      format: options.format,
      data: conversationData,
      metadata: {
        messageCount: conversationData.messages.length,
        exportVersion: '1.0.0',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      },
    };

    // Save to storage if requested
    if (options.saveToStorage) {
      await this.storage.saveExport(exportData);
      // TASK-0019: Save to history
      await this.historyManager.saveToHistory(exportData);
    }

    return exportData;
  }

  /**
   * Convert export to specified format
   */
  convertToFormat(exportData: ConversationExport, format: ExportFormat): string {
    switch (format) {
      case 'markdown':
        return this.convertToMarkdown(exportData);
      case 'json':
        return this.convertToJson(exportData);
      case 'txt':
        return this.convertToText(exportData);
      case 'csv':
        return this.convertToCsv(exportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Delete export from history
   * @deprecated Use removeExportFromHistory instead
   */
  async deleteExport(exportId: string): Promise<void> {
    await this.removeExportFromHistory(exportId);
  }

  /**
   * Copy export to clipboard
   */
  async copyToClipboard(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }

  /**
   * Validate export options
   */
  private validateExportOptions(options: ExportOptions): void {
    if (!options.format) {
      throw new Error('Export format is required');
    }

    const validFormats: ExportFormat[] = ['markdown', 'json', 'txt', 'csv'];
    if (!validFormats.includes(options.format)) {
      throw new Error(`Invalid export format: ${options.format}`);
    }
  }

  /**
   * Get site-specific conversation extractor
   */
  private getSiteExtractor(site: SupportedAISite) {
    switch (site) {
      case 'chatgpt':
        return new ChatGPTExtractor();
      case 'claude':
        return new ClaudeExtractor();
      case 'gemini':
        return new GeminiExtractor();
      default:
        throw new Error(`Unsupported AI site: ${site}`);
    }
  }

  /**
   * Convert to Markdown format
   */
  private convertToMarkdown(exportData: ConversationExport): string {
    const { data } = exportData;
    let markdown = `# ${data.title}\n\n`;
    markdown += `**Exported from:** ${exportData.site}\n`;
    markdown += `**Date:** ${new Date(exportData.exportedAt).toLocaleString()}\n`;
    markdown += `**URL:** ${exportData.url}\n\n---\n\n`;

    data.messages.forEach((message, index) => {
      const role = message.role === 'user' ? '👤 User' : '🤖 Assistant';
      markdown += `## ${role}\n\n${message.content}\n\n`;
    });

    return markdown;
  }

  /**
   * Convert to JSON format
   */
  private convertToJson(exportData: ConversationExport): string {
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Convert to plain text format
   */
  private convertToText(exportData: ConversationExport): string {
    const { data } = exportData;
    let text = `${data.title}\n`;
    text += `Exported from: ${exportData.site}\n`;
    text += `Date: ${new Date(exportData.exportedAt).toLocaleString()}\n`;
    text += `URL: ${exportData.url}\n\n`;
    text += '='.repeat(50) + '\n\n';

    data.messages.forEach((message, index) => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      text += `[${role}]\n${message.content}\n\n`;
    });

    return text;
  }

  /**
   * Convert to CSV format
   */
  private convertToCsv(exportData: ConversationExport): string {
    const { data } = exportData;
    let csv = 'Index,Role,Content,Timestamp\n';

    data.messages.forEach((message, index) => {
      const content = message.content.replace(/"/g, '""'); // Escape quotes
      csv += `${index + 1},"${message.role}","${content}","${message.timestamp || ''}"\n`;
    });

    return csv;
  }

  /**
   * Get export history
   * TASK-0019: Delegate to history manager
   */
  async getExportHistory(limit = 50): Promise<ExportHistoryEntry[]> {
    return await this.historyManager.getHistory(limit);
  }

  /**
   * Get export statistics
   * TASK-0019: Delegate to history manager
   */
  async getExportStatistics(): Promise<ExportStatistics> {
    return await this.historyManager.getStatistics();
  }

  /**
   * Check for duplicate export
   * TASK-0019: Delegate to history manager
   */
  async checkDuplicateExport(url: string, site: SupportedAISite, title: string): Promise<boolean> {
    return await this.historyManager.checkDuplicate(url, site, title);
  }

  /**
   * Remove export from history
   * TASK-0019: Delegate to history manager
   */
  async removeExportFromHistory(exportId: string): Promise<void> {
    await this.historyManager.removeFromHistory(exportId);
  }

  /**
   * Get export for re-download
   * TASK-0019: Delegate to history manager
   */
  async getExportForRedownload(exportId: string): Promise<ConversationExport> {
    return await this.historyManager.getExportForRedownload(exportId);
  }

  /**
   * Cleanup old exports
   * TASK-0019: Delegate to history manager
   */
  async cleanupOldExports(retentionDays: number = 30): Promise<void> {
    await this.historyManager.cleanupOldHistory(retentionDays);
  }

  /**
   * Generate unique export ID
   */
  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Site-specific extractors (placeholders for now - will be implemented in later tasks)
class ChatGPTExtractor {
  async extractConversation(): Promise<ConversationData> {
    // TODO: Implement ChatGPT conversation extraction
    return {
      title: 'ChatGPT Conversation',
      messages: [
        {
          role: 'user' as const,
          content: 'Sample user message',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant' as const,
          content: 'Sample assistant response',
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}

class ClaudeExtractor {
  async extractConversation(): Promise<ConversationData> {
    // TODO: Implement Claude conversation extraction
    return {
      title: 'Claude Conversation',
      messages: [
        {
          role: 'user' as const,
          content: 'Sample user message',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant' as const,
          content: 'Sample assistant response',
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}

class GeminiExtractor {
  async extractConversation(): Promise<ConversationData> {
    // TODO: Implement Gemini conversation extraction
    return {
      title: 'Gemini Conversation',
      messages: [
        {
          role: 'user' as const,
          content: 'Sample user message',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant' as const,
          content: 'Sample assistant response',
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
