// ChatGPT Conversation Exporter Test Suite
// TASK-0017: ChatGPT会話データ抽出・パース

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConversationExporter } from '../../src/content/conversation-exporter';
import type { ConversationData, ExportFormat, ConversationExport } from '../../src/types';

const mockExtractConversationData = vi.fn().mockReturnValue({
  title: 'Mock Conversation',
  messages: [
    {
      role: 'user',
      content: 'What is artificial intelligence?',
      timestamp: '2024-01-15T10:00:00.000Z',
      metadata: {
        messageId: 'msg-1',
        index: 0,
      },
    },
    {
      role: 'assistant',
      content: 'Artificial intelligence (AI) is a field of computer science.\n\n```python\n# Example AI code\nprint("Hello AI")\n```\n\nAI involves machine learning and neural networks.',
      timestamp: '2024-01-15T10:01:00.000Z',
      metadata: {
        messageId: 'msg-2',
        parentId: 'msg-1',
        index: 1,
      },
    },
  ],
  metadata: {
    site: 'chatgpt',
    url: 'https://chat.openai.com/c/test-123',
    conversationId: 'test-123',
    totalMessages: 2,
    extractedAt: '2024-01-15T10:05:00.000Z',
    language: 'en',
    isCompleted: true,
  },
});

// Mock ChatGPTMessageParser
vi.mock('../../src/content/conversation-parser', () => ({
  ChatGPTMessageParser: vi.fn().mockImplementation(() => ({
    extractConversationData: mockExtractConversationData,
  })),
}));

const createMockConversationData = (): ConversationData => ({
  title: 'Test Conversation About AI',
  messages: [
    {
      role: 'user',
      content: 'What is machine learning?',
      timestamp: '2024-01-15T10:00:00.000Z',
      metadata: {
        messageId: 'msg-1',
        index: 0,
      },
    },
    {
      role: 'assistant',
      content: 'Machine learning is a subset of AI that enables computers to learn without being explicitly programmed.\n\n```python\nfrom sklearn import datasets\ndata = datasets.load_iris()\n```\n\nIt involves algorithms that improve through experience.',
      timestamp: '2024-01-15T10:01:00.000Z',
      metadata: {
        messageId: 'msg-2',
        parentId: 'msg-1',
        index: 1,
        model: 'gpt-4',
      },
    },
  ],
  metadata: {
    site: 'chatgpt',
    url: 'https://chat.openai.com/c/test-conversation',
    conversationId: 'test-conversation',
    totalMessages: 2,
    extractedAt: '2024-01-15T10:05:00.000Z',
    language: 'en',
    isCompleted: true,
  },
});

const createInvalidConversationData = (): ConversationData => ({
  title: '',
  messages: [
    {
      role: 'user',
      content: '',
      timestamp: '2024-01-15T10:00:00.000Z',
    },
    {
      role: 'invalid' as any,
      content: 'Message with invalid role',
      timestamp: '2024-01-15T10:01:00.000Z',
    },
    {
      role: 'assistant',
      content: 'Valid message',
      timestamp: '2024-01-15T10:02:00.000Z',
    },
  ],
  metadata: {
    site: 'chatgpt',
    url: 'https://chat.openai.com/c/invalid',
    totalMessages: 3,
  },
});

describe('Conversation Exporter', () => {
  let exporter: ConversationExporter;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://chat.openai.com/c/test-conversation',
      },
      writable: true,
    });

    // Mock navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Test Browser',
      writable: true,
    });
    
    exporter = new ConversationExporter();
    
    // Override the parser directly
    exporter['parser'] = {
      extractConversationData: mockExtractConversationData,
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Export Conversation', () => {
    it('should export conversation in JSON format', async () => {
      // 🟢 Green: Basic export functionality
      const result = await exporter.exportConversation({
        format: 'json',
        includeMetadata: true,
        includeTimestamps: true,
        validateData: false,
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('json');
      expect(result.site).toBe('chatgpt');
      expect(result.data.title).toBe('Mock Conversation');
      expect(result.data.messages).toHaveLength(2);
      expect(result.metadata.messageCount).toBe(2);
      expect(result.metadata.exportVersion).toBe('1.0.0');
    });

    it('should export conversation in Markdown format', async () => {
      // 🟢 Green: Markdown export
      const result = await exporter.exportConversation({
        format: 'markdown',
        includeMetadata: true,
        includeTimestamps: true,
        validateData: false,
      });

      expect(result.format).toBe('markdown');
      expect(result.data.title).toBe('Mock Conversation');
      expect(result.data.messages).toHaveLength(2);
    });

    it('should export conversation with validation', async () => {
      // 🟡 Yellow: Data validation during export
      const result = await exporter.exportConversation({
        format: 'json',
        includeMetadata: true,
        validateData: true,
      });

      expect(result.metadata.dataIntegrity).toBe(true);
      expect(result.metadata.parsingErrors).toHaveLength(0);
    });

    it('should handle export options correctly', async () => {
      // 🟡 Yellow: Export options handling
      const resultWithoutMetadata = await exporter.exportConversation({
        format: 'json',
        includeMetadata: false,
        includeTimestamps: false,
        validateData: false,
      });

      expect(resultWithoutMetadata.data.messages[0].metadata).toBeUndefined();
      expect(resultWithoutMetadata.data.messages[0].timestamp).toBeUndefined();
    });
  });

  describe('Data Validation', () => {
    it('should validate correct conversation data', async () => {
      // 🟢 Green: Valid data validation
      mockExtractConversationData.mockReturnValue(createMockConversationData());

      const result = await exporter.exportConversation({
        format: 'json',
        validateData: true,
      });

      expect(result.metadata.dataIntegrity).toBe(true);
      expect(result.metadata.parsingErrors).toHaveLength(0);
    });

    it('should detect invalid conversation data', async () => {
      // 🔴 Red: Invalid data detection
      mockExtractConversationData.mockReturnValue(createInvalidConversationData());

      await expect(
        exporter.exportConversation({
          format: 'json',
          validateData: true,
        })
      ).rejects.toThrow('Data validation failed');
    });

    it('should warn about suspicious content patterns', async () => {
      // 🔴 Red: Security validation
      const suspiciousData: ConversationData = {
        title: 'Suspicious Conversation',
        messages: [
          {
            role: 'user',
            content: 'Normal message',
            timestamp: '2024-01-15T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Message with <script>alert("xss")</script> content',
            timestamp: '2024-01-15T10:01:00.000Z',
          },
        ],
        metadata: {
          site: 'chatgpt',
          url: 'https://chat.openai.com/c/suspicious',
          totalMessages: 2,
        },
      };

      mockExtractConversationData.mockReturnValue(suspiciousData);

      const result = await exporter.exportConversation({
        format: 'json',
        validateData: true,
      });

      // Should complete but with warnings
      expect(result.metadata.parsingErrors.length).toBeGreaterThan(0);
      expect(result.metadata.parsingErrors.some(error => 
        error.includes('unsafe HTML')
      )).toBe(true);
    });

    it('should validate message role consistency', async () => {
      // 🟡 Yellow: Role pattern validation
      const inconsistentData: ConversationData = {
        title: 'Inconsistent Conversation',
        messages: [
          {
            role: 'assistant', // Should start with user
            content: 'Assistant starting the conversation',
            timestamp: '2024-01-15T10:00:00.000Z',
          },
          {
            role: 'assistant', // Two assistant messages in a row
            content: 'Another assistant message',
            timestamp: '2024-01-15T10:01:00.000Z',
          },
        ],
        metadata: {
          site: 'chatgpt',
          url: 'https://chat.openai.com/c/inconsistent',
          totalMessages: 2,
        },
      };

      mockExtractConversationData.mockReturnValue(inconsistentData);

      const result = await exporter.exportConversation({
        format: 'json',
        validateData: true,
      });

      // Should have warnings about role inconsistency
      expect(result.metadata.parsingErrors.some(error => 
        error.includes('does not start with user') || error.includes('same role')
      )).toBe(true);
    });
  });

  describe('Data Normalization', () => {
    it('should normalize message content', async () => {
      // 🟡 Yellow: Content normalization
      const messyData: ConversationData = {
        title: '   Messy   Title   ',
        messages: [
          {
            role: 'user',
            content: '  Message with\r\n\textra\u00A0whitespace  \n\n\n\n',
            timestamp: '2024-01-15T10:00:00.000Z',
          },
        ],
        metadata: {
          site: 'chatgpt',
          url: 'https://chat.openai.com/c/messy',
          totalMessages: 1,
        },
      };

      mockExtractConversationData.mockReturnValue(messyData);

      const result = await exporter.exportConversation({
        format: 'json',
        validateData: false,
      });

      expect(result.data.title).toBe('Messy Title');
      expect(result.data.messages[0].content).not.toMatch(/\s{2,}/);
      expect(result.data.messages[0].content).not.toMatch(/\n{3,}/);
      expect(result.data.messages[0].content).not.toMatch(/^\s|\s$/);
    });

    it('should normalize timestamps to ISO format', async () => {
      // 🟡 Yellow: Timestamp normalization
      const timestampData: ConversationData = {
        title: 'Timestamp Test',
        messages: [
          {
            role: 'user',
            content: 'Message with custom timestamp',
            timestamp: '2024-01-15 10:30:45',
          },
        ],
        metadata: {
          site: 'chatgpt',
          url: 'https://chat.openai.com/c/timestamp',
          totalMessages: 1,
        },
      };

      mockExtractConversationData.mockReturnValue(timestampData);

      const result = await exporter.exportConversation({
        format: 'json',
        includeTimestamps: true,
        validateData: false,
      });

      expect(result.data.messages[0].timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });
  });

  describe('Format Conversion', () => {
    let mockExportData: ConversationExport;

    beforeEach(() => {
      mockExportData = {
        id: 'test-export-123',
        site: 'chatgpt',
        title: 'Test Export Conversation',
        url: 'https://chat.openai.com/c/test-export',
        exportedAt: '2024-01-15T10:05:00.000Z',
        format: 'json',
        data: createMockConversationData(),
        metadata: {
          messageCount: 2,
          exportVersion: '1.0.0',
          userAgent: 'Mozilla/5.0 Test Browser',
          extractionTime: 1705311900000,
          parsingErrors: [],
          dataIntegrity: true,
        },
      };
    });

    it('should format conversation as Markdown', () => {
      // 🟢 Green: Markdown formatting
      mockExportData.format = 'markdown';
      const markdown = exporter.formatConversationData(mockExportData);

      expect(markdown).toContain('# Test Export Conversation');
      expect(markdown).toContain('## 👤 User');
      expect(markdown).toContain('## 🤖 Assistant');
      expect(markdown).toContain('What is machine learning?');
      expect(markdown).toContain('```python');
      expect(markdown).toContain('sklearn');
      expect(markdown).toContain('## Export Metadata');
    });

    it('should format conversation as plain text', () => {
      // 🟢 Green: Plain text formatting
      mockExportData.format = 'txt';
      const plainText = exporter.formatConversationData(mockExportData);

      expect(plainText).toContain('Test Export Conversation');
      expect(plainText).toContain('[USER]');
      expect(plainText).toContain('[ASSISTANT]');
      expect(plainText).toContain('What is machine learning?');
      expect(plainText).toContain('from sklearn import datasets');
    });

    it('should format conversation as CSV', () => {
      // 🟢 Green: CSV formatting
      mockExportData.format = 'csv';
      const csv = exporter.formatConversationData(mockExportData);

      expect(csv).toContain('Index,Role,Timestamp,Content,MessageId');
      expect(csv).toContain('1,"user"');
      expect(csv).toContain('2,"assistant"');
      expect(csv).toContain('What is machine learning?');
      expect(csv).toMatch(/msg-\d+/);
    });

    it('should format conversation as JSON', () => {
      // 🟢 Green: JSON formatting
      mockExportData.format = 'json';
      const json = exporter.formatConversationData(mockExportData);

      const parsed = JSON.parse(json);
      expect(parsed).toEqual(mockExportData);
      expect(parsed.data.messages).toHaveLength(2);
      expect(parsed.metadata.messageCount).toBe(2);
    });

    it('should handle unsupported formats', () => {
      // 🔴 Red: Unsupported format handling
      mockExportData.format = 'xml' as ExportFormat;

      expect(() => exporter.formatConversationData(mockExportData)).toThrow('Unsupported export format: xml');
    });
  });

  describe('Export Metadata Generation', () => {
    it('should generate unique export IDs', async () => {
      // 🟡 Yellow: Unique ID generation
      const result1 = await exporter.exportConversation({
        format: 'json',
        validateData: false,
      });

      const result2 = await exporter.exportConversation({
        format: 'json',
        validateData: false,
      });

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(/^export_\d+_[a-z0-9]+$/);
      expect(result2.id).toMatch(/^export_\d+_[a-z0-9]+$/);
    });

    it('should include correct metadata', async () => {
      // 🟡 Yellow: Metadata completeness
      const result = await exporter.exportConversation({
        format: 'markdown',
        includeMetadata: true,
        validateData: true,
      });

      expect(result.metadata).toMatchObject({
        messageCount: expect.any(Number),
        exportVersion: '1.0.0',
        userAgent: 'Mozilla/5.0 Test Browser',
        extractionTime: expect.any(Number),
        parsingErrors: expect.any(Array),
        dataIntegrity: expect.any(Boolean),
      });

      expect(result.exportedAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.url).toBe('https://chat.openai.com/c/test-conversation');
    });
  });

  describe('Error Handling', () => {
    it('should handle parser errors gracefully', async () => {
      // 🔴 Red: Parser error handling
      mockExtractConversationData.mockImplementation(() => {
        throw new Error('Parser failure');
      });

      await expect(
        exporter.exportConversation({
          format: 'json',
          validateData: false,
        })
      ).rejects.toThrow('Export failed: Parser failure');
    });

    it('should handle empty conversation data', async () => {
      // 🔴 Red: Empty data handling
      mockExtractConversationData.mockReturnValue({
        title: 'Empty Conversation',
        messages: [],
        metadata: {
          site: 'chatgpt',
          url: 'https://chat.openai.com/c/empty',
          totalMessages: 0,
        },
      });

      const result = await exporter.exportConversation({
        format: 'json',
        validateData: true,
      });

      // Should handle empty conversations gracefully
      expect(result.data.messages).toHaveLength(0);
      expect(result.metadata.messageCount).toBe(0);
    });

    it('should handle validation errors appropriately', async () => {
      // 🔴 Red: Validation error handling
      mockExtractConversationData.mockReturnValue({
        title: '', // Invalid empty title
        messages: [],
        metadata: {
          site: 'chatgpt',
          url: 'https://chat.openai.com/c/invalid',
          totalMessages: 0,
        },
      });

      await expect(
        exporter.exportConversation({
          format: 'json',
          validateData: true,
        })
      ).rejects.toThrow('Data validation failed');
    });
  });
});