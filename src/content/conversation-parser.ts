// ChatGPT Conversation Data Extraction and Parsing System
// TASK-0017: ChatGPT会話データ抽出・パース

import type {
  ConversationMessage,
  ConversationData,
  MessageMetadata,
  ConversationMetadata,
  SupportedAISite,
} from '@/types';

// ChatGPT Message Parsing Configuration
interface MessageParsingConfig {
  selectors: {
    messageContainer: string[];
    userMessage: string[];
    assistantMessage: string[];
    messageContent: string[];
    messageTimestamp: string[];
    codeBlocks: string[];
    mathExpressions: string[];
  };
  attributes: {
    roleIndicators: string[];
    messageId: string[];
    parentId: string[];
  };
  patterns: {
    timestampFormats: RegExp[];
    codeBlockDelimiters: RegExp[];
    mathDelimiters: RegExp[];
  };
}

const CHATGPT_MESSAGE_CONFIG: MessageParsingConfig = {
  selectors: {
    messageContainer: [
      '[data-testid^="conversation-turn"]',
      '.group.w-full',
      '[data-message-author-role]',
      '.conversation-turn',
    ],
    userMessage: [
      '[data-message-author-role="user"]',
      '[data-testid*="user"]',
      '.user-message',
      '.whitespace-pre-wrap',
    ],
    assistantMessage: [
      '[data-message-author-role="assistant"]',
      '[data-testid*="assistant"]',
      '.assistant-message',
      '.markdown.prose',
    ],
    messageContent: [
      '.prose',
      '.whitespace-pre-wrap',
      '.message-content',
      'p',
      'div[data-message-content]',
    ],
    messageTimestamp: ['[data-timestamp]', '.message-time', 'time', '.timestamp'],
    codeBlocks: ['pre code', '.code-block', '[data-language]', 'code'],
    mathExpressions: ['.math', '.katex', '[data-math]', '.latex'],
  },
  attributes: {
    roleIndicators: ['data-message-author-role', 'data-author', 'role', 'data-role'],
    messageId: ['data-message-id', 'data-id', 'id', 'data-testid'],
    parentId: ['data-parent-id', 'data-parent', 'data-reply-to'],
  },
  patterns: {
    timestampFormats: [
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      /\d{1,2}:\d{2}\s*[AP]M/i,
      /\d{1,2}\/\d{1,2}\/\d{4}/,
    ],
    codeBlockDelimiters: [/```[\s\S]*?```/g, /`[^`]+`/g, /<code>[\s\S]*?<\/code>/gi],
    mathDelimiters: [/\$\$[\s\S]*?\$\$/g, /\$[^$]+\$/g, /\\begin\{[\s\S]*?\\end\{/g],
  },
};

// Enhanced Message Parser for ChatGPT
export class ChatGPTMessageParser {
  private config: MessageParsingConfig;
  private site: SupportedAISite = 'chatgpt';

  constructor(config: MessageParsingConfig = CHATGPT_MESSAGE_CONFIG) {
    this.config = config;
  }

  /**
   * Extract complete conversation data from the page
   */
  public extractConversationData(): ConversationData {
    try {
      const messages = this.extractAllMessages();
      const metadata = this.extractConversationMetadata();
      const title = this.extractConversationTitle();

      return {
        title,
        messages,
        metadata,
      };
    } catch (error) {
      console.error('Failed to extract conversation data:', error);
      throw new Error(
        `Conversation extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract all messages from the conversation
   */
  private extractAllMessages(): ConversationMessage[] {
    const messageElements = this.findMessageElements();
    const messages: ConversationMessage[] = [];

    messageElements.forEach((element, index) => {
      try {
        const message = this.parseMessageElement(element, index);
        if (message && this.validateMessage(message)) {
          messages.push(message);
        }
      } catch (error) {
        console.warn(`Failed to parse message at index ${index}:`, error);
      }
    });

    return this.sortMessagesByOrder(messages);
  }

  /**
   * Find all message elements in the DOM
   */
  private findMessageElements(): Element[] {
    const elements: Element[] = [];

    for (const selector of this.config.selectors.messageContainer) {
      try {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          elements.push(...Array.from(found));
          break; // Use first successful selector
        }
      } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
      }
    }

    return this.deduplicateElements(elements);
  }

  /**
   * Parse individual message element
   */
  private parseMessageElement(element: Element, index: number): ConversationMessage | null {
    try {
      const role = this.determineMessageRole(element);
      if (!role) return null;

      const content = this.extractMessageContent(element);
      if (!content || !content.trim()) return null;

      const timestamp = this.extractMessageTimestamp(element);
      const metadata = this.extractMessageMetadata(element, index);

      return {
        role,
        content: this.cleanMessageContent(content),
        timestamp,
        metadata,
      };
    } catch (error) {
      console.warn(`Failed to parse message element at index ${index}:`, error);
      return null;
    }
  }

  /**
   * Determine message role (user or assistant)
   */
  private determineMessageRole(element: Element): 'user' | 'assistant' | null {
    // Check role attributes
    for (const attr of this.config.attributes.roleIndicators) {
      const roleValue = element.getAttribute(attr);
      if (roleValue === 'user' || roleValue === 'assistant') {
        return roleValue;
      }
    }

    // Check selector matching
    if (this.matchesSelectors(element, this.config.selectors.userMessage)) {
      return 'user';
    }
    if (this.matchesSelectors(element, this.config.selectors.assistantMessage)) {
      return 'assistant';
    }

    // Heuristic: check for common patterns
    const textContent = element.textContent?.toLowerCase() || '';
    const classList = element.className.toLowerCase();

    if (classList.includes('user') || element.closest('[data-message-author-role="user"]')) {
      return 'user';
    }
    if (
      classList.includes('assistant') ||
      classList.includes('ai') ||
      element.closest('[data-message-author-role="assistant"]')
    ) {
      return 'assistant';
    }

    return null;
  }

  /**
   * Extract message content with rich formatting preservation
   */
  private extractMessageContent(element: Element): string {
    // Try content-specific selectors first
    for (const selector of this.config.selectors.messageContent) {
      const contentElement = element.querySelector(selector);
      if (contentElement) {
        return this.extractRichContent(contentElement);
      }
    }

    // Fallback to element's own content
    return this.extractRichContent(element);
  }

  /**
   * Extract rich content preserving code blocks and formatting
   */
  private extractRichContent(element: Element): string {
    let content = '';

    // Process child nodes to preserve structure
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text.trim()) {
          content += text;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as Element;

        // Handle code blocks specially
        if (this.matchesSelectors(elem, this.config.selectors.codeBlocks)) {
          const lang =
            elem.getAttribute('data-language') || elem.className.match(/language-(\w+)/)?.[1] || '';
          const code = elem.textContent || '';
          content += `\`\`\`${lang}\n${code}\n\`\`\`\n`;
          // Skip children as we've processed the code block
          walker.currentNode = elem;
          continue;
        }

        // Handle math expressions
        if (this.matchesSelectors(elem, this.config.selectors.mathExpressions)) {
          const math = elem.textContent || '';
          content += `$${math}$`;
          continue;
        }

        // Handle line breaks and paragraphs
        if (elem.tagName === 'BR') {
          content += '\n';
        } else if (['P', 'DIV'].includes(elem.tagName) && elem.textContent?.trim()) {
          if (content && !content.endsWith('\n')) {
            content += '\n';
          }
        }
      }
    }

    return content.trim();
  }

  /**
   * Extract message timestamp
   */
  private extractMessageTimestamp(element: Element): string | undefined {
    // Try timestamp selectors
    for (const selector of this.config.selectors.messageTimestamp) {
      const timeElement = element.querySelector(selector);
      if (timeElement) {
        const timeValue =
          timeElement.getAttribute('datetime') ||
          timeElement.getAttribute('data-timestamp') ||
          timeElement.textContent;

        if (timeValue && this.isValidTimestamp(timeValue)) {
          return this.normalizeTimestamp(timeValue);
        }
      }
    }

    // Extract from text content using patterns
    const textContent = element.textContent || '';
    for (const pattern of this.config.patterns.timestampFormats) {
      const match = textContent.match(pattern);
      if (match) {
        return this.normalizeTimestamp(match[0]);
      }
    }

    // Fallback to current time
    return new Date().toISOString();
  }

  /**
   * Extract message metadata
   */
  private extractMessageMetadata(element: Element, index: number): MessageMetadata {
    const metadata: MessageMetadata = {
      index,
    };

    // Extract IDs
    for (const attr of this.config.attributes.messageId) {
      const id = element.getAttribute(attr);
      if (id) {
        metadata.messageId = id;
        break;
      }
    }

    for (const attr of this.config.attributes.parentId) {
      const parentId = element.getAttribute(attr);
      if (parentId) {
        metadata.parentId = parentId;
        break;
      }
    }

    // Extract model information from nearby elements
    const modelInfo = this.extractModelInfo(element);
    if (modelInfo) {
      metadata.model = modelInfo;
    }

    // Store raw HTML for debugging
    metadata.rawHtml = element.outerHTML.substring(0, 500);

    return metadata;
  }

  /**
   * Extract conversation metadata
   */
  private extractConversationMetadata(): ConversationMetadata {
    const metadata: ConversationMetadata = {
      site: this.site,
      url: window.location.href,
      extractedAt: new Date().toISOString(),
      extractionVersion: '1.0.0',
    };

    // Extract conversation ID from URL
    const urlMatch = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
    if (urlMatch) {
      metadata.conversationId = urlMatch[1];
    }

    // Detect language
    metadata.language = document.documentElement.lang || 'en';

    // Check if conversation is completed
    metadata.isCompleted = !this.hasTypingIndicator();

    return metadata;
  }

  /**
   * Extract conversation title
   */
  private extractConversationTitle(): string {
    const titleSelectors = [
      'h1',
      '[data-testid="conversation-title"]',
      '.conversation-title',
      'title',
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return 'ChatGPT Conversation';
  }

  /**
   * Utility methods
   */
  private matchesSelectors(element: Element, selectors: string[]): boolean {
    return selectors.some((selector) => {
      try {
        return element.matches(selector) || element.querySelector(selector) !== null;
      } catch {
        return false;
      }
    });
  }

  private deduplicateElements(elements: Element[]): Element[] {
    const seen = new Set<Element>();
    return elements.filter((el) => {
      if (seen.has(el)) return false;
      seen.add(el);
      return true;
    });
  }

  private validateMessage(message: ConversationMessage): boolean {
    return !!(
      (
        message.content.trim() &&
        (message.role === 'user' || message.role === 'assistant') &&
        message.content.length > 0 &&
        message.content.length < 100000
      ) // Reasonable limit
    );
  }

  private sortMessagesByOrder(messages: ConversationMessage[]): ConversationMessage[] {
    return messages.sort((a, b) => {
      // Sort by index if available
      if (a.metadata?.index !== undefined && b.metadata?.index !== undefined) {
        return a.metadata.index - b.metadata.index;
      }

      // Sort by timestamp if available
      if (a.timestamp && b.timestamp) {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }

      return 0;
    });
  }

  private cleanMessageContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
      .trim();
  }

  private isValidTimestamp(timestamp: string): boolean {
    return !isNaN(Date.parse(timestamp)) && timestamp.length > 8;
  }

  private normalizeTimestamp(timestamp: string): string {
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private extractModelInfo(element: Element): string | undefined {
    // Look for model indicators in nearby elements
    const modelIndicators = ['gpt-4', 'gpt-3.5', 'claude', 'gemini', 'ChatGPT'];

    const searchText = element.textContent?.toLowerCase() || '';
    for (const indicator of modelIndicators) {
      if (searchText.includes(indicator.toLowerCase())) {
        return indicator;
      }
    }

    return undefined;
  }

  private hasTypingIndicator(): boolean {
    const typingSelectors = [
      '.typing-indicator',
      '[data-testid*="typing"]',
      '.loading',
      '.generating',
    ];

    return typingSelectors.some((selector) => document.querySelector(selector) !== null);
  }
}

export default ChatGPTMessageParser;
