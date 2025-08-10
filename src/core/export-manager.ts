// Core business logic for export functionality
// Handles conversation export from various AI sites

import type { 
  ConversationExport, 
  ConversationData,
  ExportFormat, 
  ExportOptions,
  SupportedAISite 
} from '@/types';

/**
 * Core Export Management Service
 * Handles business logic for exporting conversations from AI sites
 */
export class ExportManager {
  private storage: any;

  constructor(storageAdapter: any) {
    this.storage = storageAdapter;
  }

  /**
   * Export conversation from current AI site
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

    // Format the export
    const exportData: ConversationExport = {
      id: this.generateExportId(),
      site,
      title: conversationData.title || `${site} Conversation`,
      url: window.location.href,
      exportedAt: new Date().toISOString(),
      format: options.format,
      data: conversationData,
      metadata: {
        messageCount: conversationData.messages.length,
        exportVersion: '1.0.0',
        userAgent: navigator.userAgent,
      },
    };

    // Save to storage if requested
    if (options.saveToStorage) {
      await this.storage.saveExport(exportData);
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
   * Get export history
   */
  async getExportHistory(limit = 50): Promise<ConversationExport[]> {
    return await this.storage.getExports(limit);
  }

  /**
   * Delete export from history
   */
  async deleteExport(exportId: string): Promise<void> {
    await this.storage.deleteExport(exportId);
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
        { role: 'user' as const, content: 'Sample user message', timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: 'Sample assistant response', timestamp: new Date().toISOString() },
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
        { role: 'user' as const, content: 'Sample user message', timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: 'Sample assistant response', timestamp: new Date().toISOString() },
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
        { role: 'user' as const, content: 'Sample user message', timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: 'Sample assistant response', timestamp: new Date().toISOString() },
      ],
    };
  }
}