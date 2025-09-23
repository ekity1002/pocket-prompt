// ChatGPT Conversation Data Export and Formatting System
// TASK-0017: ChatGPT会話データ抽出・パース

import type {
  ConversationData,
  ConversationExport,
  ExportFormat,
  SupportedAISite,
  ConversationMessage,
} from '@/types';
import { ChatGPTMessageParser } from './conversation-parser';

export interface ExportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dataIntegrity: boolean;
  messageCount: number;
}

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  includeRawHtml?: boolean;
  prettify?: boolean;
  validateData?: boolean;
}

/**
 * ChatGPT Conversation Export System
 * Handles data normalization, validation, and multi-format export
 */
export class ConversationExporter {
  private parser: ChatGPTMessageParser;
  private site: SupportedAISite = 'chatgpt';

  constructor() {
    this.parser = new ChatGPTMessageParser();
  }

  /**
   * Export conversation in specified format
   */
  public async exportConversation(options: ExportOptions): Promise<ConversationExport> {
    try {
      // Extract conversation data
      const conversationData = this.parser.extractConversationData();

      // Validate data if requested
      const validation = options.validateData
        ? this.validateConversationData(conversationData)
        : {
            isValid: true,
            errors: [],
            warnings: [],
            dataIntegrity: true,
            messageCount: conversationData.messages.length,
          };

      if (!validation.isValid && options.validateData) {
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }

      // Normalize data
      const normalizedData = this.normalizeConversationData(conversationData, options);

      // Create export object
      const exportData: ConversationExport = {
        id: this.generateExportId(),
        site: this.site,
        title: normalizedData.title,
        url: window.location.href,
        exportedAt: new Date().toISOString(),
        format: options.format,
        data: normalizedData,
        metadata: {
          messageCount: validation.messageCount,
          exportVersion: '1.0.0',
          userAgent: navigator.userAgent,
          extractionTime: Date.now(),
          parsingErrors: validation.errors,
          dataIntegrity: validation.dataIntegrity,
        },
      };

      return exportData;
    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format conversation data for specific export format
   */
  public formatConversationData(exportData: ConversationExport): string {
    switch (exportData.format) {
      case 'markdown':
        return this.formatAsMarkdown(exportData);
      case 'json':
        return this.formatAsJSON(exportData);
      case 'txt':
        return this.formatAsPlainText(exportData);
      case 'csv':
        return this.formatAsCSV(exportData);
      default:
        throw new Error(`Unsupported export format: ${exportData.format}`);
    }
  }

  /**
   * Validate conversation data integrity
   */
  private validateConversationData(data: ConversationData): ExportValidationResult {
    const result: ExportValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      dataIntegrity: true,
      messageCount: data.messages.length,
    };

    // Basic validation
    if (!data.title || data.title.trim().length === 0) {
      result.errors.push('Missing conversation title');
    }

    if (!data.messages || data.messages.length === 0) {
      result.errors.push('No messages found in conversation');
    }

    // Message validation
    data.messages.forEach((message, index) => {
      if (!message.content || message.content.trim().length === 0) {
        result.errors.push(`Message ${index} has empty content`);
      }

      if (!message.role || !['user', 'assistant'].includes(message.role)) {
        result.errors.push(`Message ${index} has invalid role: ${message.role}`);
      }

      if (message.content && message.content.length > 50000) {
        result.warnings.push(
          `Message ${index} is unusually long (${message.content.length} chars)`
        );
      }
    });

    // Check for alternating pattern
    if (data.messages.length > 1) {
      let expectedRole: 'user' | 'assistant' = 'user';
      for (let i = 0; i < data.messages.length; i++) {
        if (i === 0 && data.messages[i].role !== 'user') {
          result.warnings.push('Conversation does not start with user message');
        }

        if (i > 0 && data.messages[i].role === data.messages[i - 1].role) {
          result.warnings.push(
            `Messages ${i - 1} and ${i} have same role (${data.messages[i].role})`
          );
        }
      }
    }

    // Check data integrity
    const hasCorruptedMessages = data.messages.some(
      (msg) =>
        !msg.content || typeof msg.content !== 'string' || !msg.role || typeof msg.role !== 'string'
    );

    if (hasCorruptedMessages) {
      result.dataIntegrity = false;
      result.errors.push('Some messages contain corrupted data');
    }

    // Check for potential HTML/script injection
    const hasUnsafeContent = data.messages.some((msg) =>
      /<script|javascript:|on\w+=/i.test(msg.content)
    );

    if (hasUnsafeContent) {
      result.warnings.push('Messages contain potentially unsafe HTML/script content');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Normalize conversation data
   */
  private normalizeConversationData(
    data: ConversationData,
    options: ExportOptions
  ): ConversationData {
    const normalized: ConversationData = {
      title: this.normalizeTitle(data.title),
      messages: data.messages.map((msg) => this.normalizeMessage(msg, options)),
      metadata: {
        ...data.metadata,
        totalMessages: data.messages.length,
        extractedAt: new Date().toISOString(),
      },
    };

    return normalized;
  }

  /**
   * Normalize individual message
   */
  private normalizeMessage(
    message: ConversationMessage,
    options: ExportOptions
  ): ConversationMessage {
    const normalized: ConversationMessage = {
      role: message.role,
      content: this.normalizeMessageContent(message.content),
    };

    if (options.includeTimestamps && message.timestamp) {
      normalized.timestamp = this.normalizeTimestamp(message.timestamp);
    }

    if (options.includeMetadata && message.metadata) {
      normalized.metadata = {
        ...message.metadata,
        ...(options.includeRawHtml ? {} : { rawHtml: undefined }),
      };
    }

    return normalized;
  }

  /**
   * Normalize message content
   */
  private normalizeMessageContent(content: string): string {
    let cleaned = content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, '  ') // Convert tabs to spaces
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
      .replace(/\s+$/gm, '') // Remove trailing whitespace
      .replace(/^\s+$/gm, '') // Remove whitespace-only lines
      // Preserve meaningful spacing while limiting excessive line breaks
      .replace(/\n{4,}/g, '\n\n\n') // Limit consecutive line breaks to max 3 for better section separation
      .replace(/(\n\s*){4,}/g, '\n\n\n'); // Remove excessive whitespace-separated line breaks

    // Detect and format pipe-separated tables
    cleaned = this.formatPipeDelimitedTables(cleaned);

    return (
      cleaned
        // Preserve list formatting by ensuring proper line breaks
        .replace(/(\d+\.)\s*\n\s*/g, '$1 ') // Keep numbered lists on same line only if directly adjacent
        .replace(/([•\-\*])\s*\n\s*(?![•\-\*\d])/g, '$1 ') // Keep bullet points on same line only if not followed by another list item
        // Ensure list items are properly separated
        .replace(/(\d+\..+?)\n\s*(\d+\.)/g, '$1\n\n$2') // Add spacing between numbered list items
        .replace(/([•\-\*].+?)\n\s*([•\-\*])/g, '$1\n$2') // Maintain spacing between bullet points
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up any remaining triple line breaks
        .trim()
    );
  }

  /**
   * Normalize title
   */
  private normalizeTitle(title: string): string {
    return title
      .replace(/[^\w\s\-_.()[\]]/g, '') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Normalize timestamp
   */
  private normalizeTimestamp(timestamp: string): string {
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Format as Markdown
   */
  private formatAsMarkdown(exportData: ConversationExport): string {
    const { data, metadata } = exportData;
    let markdown = '';

    // Header
    markdown += `# ${data.title}\n\n`;
    markdown += `**Exported from:** ${exportData.site}\n`;
    markdown += `**URL:** ${exportData.url}\n`;
    markdown += `**Date:** ${new Date(exportData.exportedAt).toLocaleString()}\n`;
    markdown += `**Messages:** ${metadata.messageCount}\n\n`;

    markdown += '---\n\n';

    // Messages
    data.messages.forEach((message, index) => {
      const roleIcon = message.role === 'user' ? '👤' : '🤖';
      const roleName = message.role === 'user' ? 'User' : 'Assistant';

      markdown += `## ${roleIcon} ${roleName}\n\n`;

      if (message.timestamp) {
        markdown += `*${new Date(message.timestamp).toLocaleString()}*\n\n`;
      }

      markdown += `${message.content}\n\n`;

      if (index < data.messages.length - 1) {
        markdown += '---\n\n';
      }
    });

    // Footer
    if (data.metadata) {
      markdown += '\n---\n\n';
      markdown += '## Export Metadata\n\n';
      markdown += `- **Total Messages:** ${data.metadata.totalMessages}\n`;
      markdown += `- **Extracted At:** ${data.metadata.extractedAt}\n`;
      markdown += `- **Conversation ID:** ${data.metadata.conversationId || 'Unknown'}\n`;
      markdown += `- **Export Version:** ${metadata.exportVersion}\n`;
    }

    return markdown;
  }

  /**
   * Format as JSON
   */
  private formatAsJSON(exportData: ConversationExport): string {
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Format as Plain Text
   */
  private formatAsPlainText(exportData: ConversationExport): string {
    const { data } = exportData;
    let text = '';

    // Header
    text += `${data.title}\n`;
    text += `${'='.repeat(data.title.length)}\n\n`;
    text += `Exported from: ${exportData.site}\n`;
    text += `Date: ${new Date(exportData.exportedAt).toLocaleString()}\n\n`;

    // Messages
    data.messages.forEach((message, index) => {
      const roleName = message.role === 'user' ? 'USER' : 'ASSISTANT';
      text += `[${roleName}]\n`;

      if (message.timestamp) {
        text += `(${new Date(message.timestamp).toLocaleString()})\n`;
      }

      text += `${message.content}\n\n`;
    });

    return text;
  }

  /**
   * Format as CSV
   */
  private formatAsCSV(exportData: ConversationExport): string {
    const { data } = exportData;
    let csv = 'Index,Role,Timestamp,Content,MessageId\n';

    data.messages.forEach((message, index) => {
      const content = message.content.replace(/"/g, '""').replace(/\n/g, '\\n');
      const timestamp = message.timestamp || '';
      const messageId = message.metadata?.messageId || '';

      csv += `${index + 1},"${message.role}","${timestamp}","${content}","${messageId}"\n`;
    });

    return csv;
  }

  /**
   * Generate unique export ID
   */
  private generateExportId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `export_${timestamp}_${random}`;
  }

  /**
   * Format pipe-delimited tables in text content
   */
  private formatPipeDelimitedTables(content: string): string {
    // Look for lines that contain multiple pipes (potential table rows)
    const lines = content.split('\n');
    const result: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if this line looks like a table row (has multiple pipes)
      const pipeCount = (line.match(/\|/g) || []).length;
      const isTableRow = pipeCount >= 2 && line.includes('|');

      if (isTableRow) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
      } else {
        if (inTable) {
          // End of table, process it
          const formattedTable = this.formatTableRows(tableRows);
          result.push(formattedTable);
          inTable = false;
          tableRows = [];
        }
        result.push(line);
      }
    }

    // Handle table at end of content
    if (inTable && tableRows.length > 0) {
      const formattedTable = this.formatTableRows(tableRows);
      result.push(formattedTable);
    }

    return result.join('\n');
  }

  /**
   * Format an array of table rows into proper Markdown table
   */
  private formatTableRows(rows: string[]): string {
    if (rows.length === 0) return '';

    const formattedRows: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = row
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);

      if (cells.length > 0) {
        const formattedRow = `| ${cells.join(' | ')} |`;
        formattedRows.push(formattedRow);

        // Add header separator after first row
        if (i === 0) {
          const separator = cells.map(() => '---').join(' | ');
          formattedRows.push(`| ${separator} |`);
        }
      }
    }

    return formattedRows.join('\n');
  }
}

export default ConversationExporter;
