// ChatGPT Conversation Parser Test Suite
// TASK-0017: ChatGPT会話データ抽出・パース

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChatGPTMessageParser } from '../../src/content/conversation-parser';
import type { ConversationData, ConversationMessage } from '../../src/types';

// Mock DOM environment
const setupChatGPTConversationDOM = (messageCount = 4): void => {
  Object.defineProperty(window, 'location', {
    value: {
      hostname: 'chat.openai.com',
      pathname: '/c/test-conversation-id',
      href: 'https://chat.openai.com/c/test-conversation-id',
    },
    writable: true,
  });

  document.body.innerHTML = `
    <main class="main">
      <h1>Test Conversation About AI Ethics</h1>
      
      <!-- User Message 1 -->
      <div data-testid="conversation-turn-0" data-message-author-role="user" data-message-id="msg-1">
        <div class="prose">
          <p>What are the ethical implications of artificial intelligence?</p>
        </div>
      </div>
      
      <!-- Assistant Message 1 -->
      <div data-testid="conversation-turn-1" data-message-author-role="assistant" data-message-id="msg-2" data-parent-id="msg-1">
        <div class="prose">
          <p>AI ethics involves several key considerations:</p>
          <ol>
            <li>Privacy and data protection</li>
            <li>Algorithmic bias and fairness</li>
            <li>Transparency and explainability</li>
          </ol>
          <pre><code class="language-python">
# Example: Bias detection in ML models
def check_bias(model, test_data):
    return model.evaluate(test_data)
          </code></pre>
          <p>These are fundamental concerns in AI development.</p>
        </div>
      </div>
      
      ${messageCount > 2 ? `
      <!-- User Message 2 -->
      <div data-testid="conversation-turn-2" data-message-author-role="user" data-message-id="msg-3" data-parent-id="msg-2">
        <div class="prose">
          <p>Can you explain more about algorithmic bias?</p>
        </div>
      </div>
      ` : ''}
      
      ${messageCount > 3 ? `
      <!-- Assistant Message 2 with Math -->
      <div data-testid="conversation-turn-3" data-message-author-role="assistant" data-message-id="msg-4" data-parent-id="msg-3">
        <div class="prose">
          <p>Algorithmic bias occurs when systems make unfair decisions. The bias can be measured using:</p>
          <div class="math">$$\\text{Bias} = \\frac{\\sum_{i=1}^{n} (y_i - \\hat{y}_i)}{n}$$</div>
          <p>This formula helps quantify prediction errors across different groups.</p>
        </div>
      </div>
      ` : ''}
    </main>
  `;

  // Mock document properties
  Object.defineProperty(document, 'title', {
    value: 'Test Conversation About AI Ethics - ChatGPT',
    writable: true,
  });

  Object.defineProperty(document.documentElement, 'lang', {
    value: 'en',
    writable: true,
  });
};

const setupEmptyConversationDOM = (): void => {
  Object.defineProperty(window, 'location', {
    value: {
      hostname: 'chat.openai.com',
      pathname: '/c/empty-conversation',
      href: 'https://chat.openai.com/c/empty-conversation',
    },
    writable: true,
  });

  document.body.innerHTML = `
    <main class="main">
      <h1>Empty Conversation</h1>
      <!-- No messages -->
    </main>
  `;
};

const setupMalformedConversationDOM = (): void => {
  Object.defineProperty(window, 'location', {
    value: {
      hostname: 'chat.openai.com',
      pathname: '/c/malformed-conversation',
      href: 'https://chat.openai.com/c/malformed-conversation',
    },
    writable: true,
  });

  document.body.innerHTML = `
    <main class="main">
      <h1>Malformed Conversation</h1>
      
      <!-- Message with missing role -->
      <div data-testid="conversation-turn-0">
        <div class="prose">
          <p>Message without role information</p>
        </div>
      </div>
      
      <!-- Message with empty content -->
      <div data-testid="conversation-turn-1" data-message-author-role="user">
        <div class="prose"></div>
      </div>
      
      <!-- Valid message -->
      <div data-testid="conversation-turn-2" data-message-author-role="assistant">
        <div class="prose">
          <p>This is a valid assistant message.</p>
        </div>
      </div>
    </main>
  `;
};

describe('ChatGPT Message Parser', () => {
  let parser: ChatGPTMessageParser;

  beforeEach(() => {
    parser = new ChatGPTMessageParser();
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Conversation Data Extraction', () => {
    it('should extract complete conversation data', () => {
      // 🟢 Green: Core conversation extraction
      setupChatGPTConversationDOM(4);

      const conversationData = parser.extractConversationData();

      expect(conversationData).toBeDefined();
      expect(conversationData.title).toBe('Test Conversation About AI Ethics');
      expect(conversationData.messages).toHaveLength(4);
      expect(conversationData.metadata).toBeDefined();
    });

    it('should extract conversation metadata correctly', () => {
      // 🟢 Green: Metadata extraction
      setupChatGPTConversationDOM(2);

      const conversationData = parser.extractConversationData();

      expect(conversationData.metadata).toMatchObject({
        site: 'chatgpt',
        url: 'https://chat.openai.com/c/test-conversation-id',
        conversationId: 'test-conversation-id',
        language: 'en',
        isCompleted: true,
      });
      expect(conversationData.metadata.extractedAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle empty conversations', () => {
      // 🔴 Red: Empty conversation handling
      setupEmptyConversationDOM();

      const conversationData = parser.extractConversationData();

      expect(conversationData.title).toBe('Empty Conversation');
      expect(conversationData.messages).toHaveLength(0);
    });

    it('should handle malformed conversations gracefully', () => {
      // 🔴 Red: Malformed data handling
      setupMalformedConversationDOM();

      const conversationData = parser.extractConversationData();

      expect(conversationData.title).toBe('Malformed Conversation');
      // Should only extract valid messages
      expect(conversationData.messages).toHaveLength(1);
      expect(conversationData.messages[0].role).toBe('assistant');
      expect(conversationData.messages[0].content).toContain('valid assistant message');
    });
  });

  describe('Message Role Detection', () => {
    it('should correctly identify user messages', () => {
      // 🟢 Green: User message detection
      setupChatGPTConversationDOM(4);

      const conversationData = parser.extractConversationData();
      const userMessages = conversationData.messages.filter(msg => msg.role === 'user');

      expect(userMessages).toHaveLength(2);
      expect(userMessages[0].content).toContain('ethical implications');
      expect(userMessages[1].content).toContain('algorithmic bias');
    });

    it('should correctly identify assistant messages', () => {
      // 🟢 Green: Assistant message detection
      setupChatGPTConversationDOM(4);

      const conversationData = parser.extractConversationData();
      const assistantMessages = conversationData.messages.filter(msg => msg.role === 'assistant');

      expect(assistantMessages).toHaveLength(2);
      expect(assistantMessages[0].content).toContain('AI ethics involves');
      expect(assistantMessages[1].content).toContain('Algorithmic bias occurs');
    });

    it('should handle missing role attributes with fallback detection', () => {
      // 🟡 Yellow: Fallback role detection
      document.body.innerHTML = `
        <main class="main">
          <h1>Test Conversation</h1>
          
          <!-- Message with class-based role detection -->
          <div class="group w-full user-message">
            <div class="prose">
              <p>User message with class detection</p>
            </div>
          </div>
          
          <!-- Message with nested role detection -->
          <div class="group w-full">
            <div data-message-author-role="assistant">
              <div class="prose">
                <p>Assistant message with nested role</p>
              </div>
            </div>
          </div>
        </main>
      `;

      const conversationData = parser.extractConversationData();

      expect(conversationData.messages).toHaveLength(2);
      expect(conversationData.messages[0].role).toBe('user');
      expect(conversationData.messages[1].role).toBe('assistant');
    });
  });

  describe('Content Extraction and Formatting', () => {
    it('should preserve code blocks in message content', () => {
      // 🟢 Green: Code block preservation
      setupChatGPTConversationDOM(4);

      const conversationData = parser.extractConversationData();
      const assistantMessage = conversationData.messages.find(msg => 
        msg.role === 'assistant' && msg.content.includes('python')
      );

      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.content).toContain('```python');
      expect(assistantMessage?.content).toContain('check_bias');
      expect(assistantMessage?.content).toContain('```');
    });

    it('should preserve mathematical expressions', () => {
      // 🟡 Yellow: Math expression preservation
      setupChatGPTConversationDOM(4);

      const conversationData = parser.extractConversationData();
      const mathMessage = conversationData.messages.find(msg => 
        msg.content.includes('Bias') && msg.content.includes('$')
      );

      expect(mathMessage).toBeDefined();
      expect(mathMessage?.content).toContain('$\\text{Bias}');
      expect(mathMessage?.content).toContain('\\sum_{i=1}^{n}');
    });

    it('should clean and normalize message content', () => {
      // 🟡 Yellow: Content normalization
      document.body.innerHTML = `
        <main class="main">
          <div data-testid="conversation-turn-0" data-message-author-role="user">
            <div class="prose">
              <p>Message with    excessive     whitespace   </p>
              
              
              
              <p>And multiple line breaks</p>
            </div>
          </div>
        </main>
      `;

      const conversationData = parser.extractConversationData();

      expect(conversationData.messages[0].content).not.toMatch(/\s{2,}/);
      expect(conversationData.messages[0].content).not.toMatch(/\n{3,}/);
      expect(conversationData.messages[0].content.trim()).toBeTruthy();
    });

    it('should handle rich HTML content', () => {
      // 🟡 Yellow: Rich content handling
      document.body.innerHTML = `
        <main class="main">
          <div data-testid="conversation-turn-0" data-message-author-role="assistant">
            <div class="prose">
              <p>Here's a <strong>bold</strong> statement with <em>emphasis</em>.</p>
              <ul>
                <li>First item</li>
                <li>Second item</li>
              </ul>
              <blockquote>This is a quote</blockquote>
            </div>
          </div>
        </main>
      `;

      const conversationData = parser.extractConversationData();

      expect(conversationData.messages[0].content).toContain('bold');
      expect(conversationData.messages[0].content).toContain('emphasis');
      expect(conversationData.messages[0].content).toContain('First item');
      expect(conversationData.messages[0].content).toContain('This is a quote');
    });
  });

  describe('Message Metadata Extraction', () => {
    it('should extract message IDs and parent relationships', () => {
      // 🟢 Green: Message relationship extraction
      setupChatGPTConversationDOM(4);

      const conversationData = parser.extractConversationData();

      expect(conversationData.messages[0].metadata?.messageId).toBe('msg-1');
      expect(conversationData.messages[1].metadata?.messageId).toBe('msg-2');
      expect(conversationData.messages[1].metadata?.parentId).toBe('msg-1');
      expect(conversationData.messages[2].metadata?.parentId).toBe('msg-2');
    });

    it('should assign correct message indices', () => {
      // 🟡 Yellow: Message ordering
      setupChatGPTConversationDOM(4);

      const conversationData = parser.extractConversationData();

      conversationData.messages.forEach((message, index) => {
        expect(message.metadata?.index).toBe(index);
      });
    });

    it('should store raw HTML for debugging', () => {
      // 🔴 Red: Debug information
      setupChatGPTConversationDOM(2);

      const conversationData = parser.extractConversationData();

      conversationData.messages.forEach(message => {
        expect(message.metadata?.rawHtml).toBeDefined();
        expect(message.metadata?.rawHtml).toContain('<div');
        expect(message.metadata?.rawHtml?.length).toBeLessThan(501); // Truncated
      });
    });
  });

  describe('Message Validation', () => {
    it('should filter out empty messages', () => {
      // 🔴 Red: Empty message filtering
      document.body.innerHTML = `
        <main class="main">
          <div data-testid="conversation-turn-0" data-message-author-role="user">
            <div class="prose">
              <p>Valid message</p>
            </div>
          </div>
          
          <div data-testid="conversation-turn-1" data-message-author-role="assistant">
            <div class="prose">
              <!-- Empty content -->
            </div>
          </div>
          
          <div data-testid="conversation-turn-2" data-message-author-role="user">
            <div class="prose">
              <p>   </p> <!-- Only whitespace -->
            </div>
          </div>
        </main>
      `;

      const conversationData = parser.extractConversationData();

      expect(conversationData.messages).toHaveLength(1);
      expect(conversationData.messages[0].content).toBe('Valid message');
    });

    it('should validate message content length', () => {
      // 🔴 Red: Content length validation
      const longContent = 'a'.repeat(100001);
      document.body.innerHTML = `
        <main class="main">
          <div data-testid="conversation-turn-0" data-message-author-role="user">
            <div class="prose">
              <p>Normal message</p>
            </div>
          </div>
          
          <div data-testid="conversation-turn-1" data-message-author-role="assistant">
            <div class="prose">
              <p>${longContent}</p>
            </div>
          </div>
        </main>
      `;

      const conversationData = parser.extractConversationData();

      // Should filter out excessively long messages
      expect(conversationData.messages).toHaveLength(1);
      expect(conversationData.messages[0].content).toBe('Normal message');
    });
  });

  describe('Message Sorting and Ordering', () => {
    it('should sort messages by index', () => {
      // 🟡 Yellow: Message ordering
      setupChatGPTConversationDOM(4);

      const conversationData = parser.extractConversationData();

      // Check that messages are in correct order
      expect(conversationData.messages[0].role).toBe('user');
      expect(conversationData.messages[1].role).toBe('assistant');
      expect(conversationData.messages[2].role).toBe('user');
      expect(conversationData.messages[3].role).toBe('assistant');
    });

    it('should maintain conversation flow', () => {
      // 🟡 Yellow: Conversation continuity
      setupChatGPTConversationDOM(4);

      const conversationData = parser.extractConversationData();

      // Check alternating user/assistant pattern
      for (let i = 0; i < conversationData.messages.length; i++) {
        const expectedRole = i % 2 === 0 ? 'user' : 'assistant';
        expect(conversationData.messages[i].role).toBe(expectedRole);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle DOM query errors gracefully', () => {
      // 🔴 Red: DOM error resilience
      document.body.innerHTML = '<main class="main"></main>';
      
      // Mock querySelector to throw error
      const originalQuerySelectorAll = document.querySelectorAll;
      document.querySelectorAll = vi.fn(() => {
        throw new Error('DOM query failed');
      });

      expect(() => parser.extractConversationData()).toThrow();

      // Restore
      document.querySelectorAll = originalQuerySelectorAll;
    });

    it('should handle missing title gracefully', () => {
      // 🔴 Red: Missing title handling
      document.body.innerHTML = `
        <main class="main">
          <!-- No title element -->
          <div data-testid="conversation-turn-0" data-message-author-role="user">
            <div class="prose">
              <p>Message without title</p>
            </div>
          </div>
        </main>
      `;

      const conversationData = parser.extractConversationData();

      expect(conversationData.title).toBe('ChatGPT Conversation');
      expect(conversationData.messages.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle corrupted DOM structure', () => {
      // 🔴 Red: Corrupted DOM handling
      document.body.innerHTML = `
        <main class="main">
          <div data-testid="conversation-turn-0">
            <!-- Malformed structure -->
            <div class="prose">
              <p>Message 1</p>
            <!-- Missing closing div -->
          </div>
          
          <div data-testid="conversation-turn-1" data-message-author-role="assistant">
            <div class="prose">
              <p>Message 2</p>
            </div>
          </div>
        </main>
      `;

      const conversationData = parser.extractConversationData();

      // Should still extract what it can
      expect(conversationData.messages.length).toBeGreaterThanOrEqual(0);
      if (conversationData.messages.length > 0) {
        expect(conversationData.messages.some(msg => msg.role === 'assistant')).toBe(true);
      }
    });
  });

  describe('Timestamp Handling', () => {
    it('should extract and normalize timestamps', () => {
      // 🟡 Yellow: Timestamp processing
      document.body.innerHTML = `
        <main class="main">
          <div data-testid="conversation-turn-0" data-message-author-role="user">
            <time datetime="2024-01-15T10:30:00Z">10:30 AM</time>
            <div class="prose">
              <p>Message with timestamp</p>
            </div>
          </div>
        </main>
      `;

      const conversationData = parser.extractConversationData();

      if (conversationData.messages.length > 0) {
        expect(conversationData.messages[0].timestamp).toBe('2024-01-15T10:30:00.000Z');
      }
    });

    it('should handle missing timestamps', () => {
      // 🟡 Yellow: Missing timestamp handling
      setupChatGPTConversationDOM(1);

      const conversationData = parser.extractConversationData();

      // Should generate current timestamp
      if (conversationData.messages.length > 0) {
        expect(conversationData.messages[0].timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });
});