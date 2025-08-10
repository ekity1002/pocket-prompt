// Core business logic for AI site connectivity
// Handles integration with various AI chat platforms

import type { 
  SupportedAISite, 
  AISiteInfo,
  TextInsertionOptions 
} from '@/types';

/**
 * Core AI Site Connector Service
 * Handles business logic for AI site integration
 */
export class AISiteConnector {
  private currentSite: SupportedAISite | null = null;

  /**
   * Detect current AI site
   */
  detectCurrentSite(): SupportedAISite | null {
    const hostname = window.location.hostname;

    if (hostname.includes('chat.openai.com')) {
      this.currentSite = 'chatgpt';
      return 'chatgpt';
    }
    
    if (hostname.includes('claude.ai')) {
      this.currentSite = 'claude';
      return 'claude';
    }
    
    if (hostname.includes('gemini.google.com')) {
      this.currentSite = 'gemini';
      return 'gemini';
    }

    this.currentSite = null;
    return null;
  }

  /**
   * Get current site information
   */
  getCurrentSiteInfo(): AISiteInfo | null {
    if (!this.currentSite) {
      return null;
    }

    const siteInfo: Record<SupportedAISite, AISiteInfo> = {
      chatgpt: {
        name: 'ChatGPT',
        url: 'https://chat.openai.com',
        provider: 'OpenAI',
        supportsExport: true,
        supportsTextInsertion: true,
        textareaSelector: 'textarea[placeholder*="Send a message"]',
        conversationSelector: '[data-testid^="conversation-turn-"]',
        features: ['conversation-export', 'text-insertion', 'prompt-injection'],
      },
      claude: {
        name: 'Claude',
        url: 'https://claude.ai',
        provider: 'Anthropic',
        supportsExport: true,
        supportsTextInsertion: true,
        textareaSelector: 'div[contenteditable="true"]',
        conversationSelector: '[data-testid="chat-turn"]',
        features: ['conversation-export', 'text-insertion', 'prompt-injection'],
      },
      gemini: {
        name: 'Gemini',
        url: 'https://gemini.google.com',
        provider: 'Google',
        supportsExport: true,
        supportsTextInsertion: true,
        textareaSelector: 'textarea[placeholder*="Enter a prompt here"]',
        conversationSelector: '.conversation-container .message',
        features: ['conversation-export', 'text-insertion', 'prompt-injection'],
      },
    };

    return siteInfo[this.currentSite];
  }

  /**
   * Insert text into AI site's input field
   */
  async insertText(text: string, options: TextInsertionOptions = {}): Promise<boolean> {
    const siteInfo = this.getCurrentSiteInfo();
    if (!siteInfo || !siteInfo.supportsTextInsertion) {
      throw new Error('Text insertion not supported on current site');
    }

    try {
      const inputElement = await this.findInputElement(siteInfo);
      if (!inputElement) {
        throw new Error('Could not find input element');
      }

      // Handle different input types
      if (inputElement.tagName.toLowerCase() === 'textarea') {
        await this.insertIntoTextarea(inputElement as HTMLTextAreaElement, text, options);
      } else if (inputElement.contentEditable === 'true') {
        await this.insertIntoContentEditable(inputElement, text, options);
      } else {
        throw new Error('Unsupported input element type');
      }

      return true;
    } catch (error) {
      console.error('Failed to insert text:', error);
      return false;
    }
  }

  /**
   * Check if current site supports specific feature
   */
  supportsFeature(feature: string): boolean {
    const siteInfo = this.getCurrentSiteInfo();
    return siteInfo?.features.includes(feature) || false;
  }

  /**
   * Get page information
   */
  getPageInfo() {
    return {
      site: this.currentSite,
      url: window.location.href,
      title: document.title,
      hostname: window.location.hostname,
      siteInfo: this.getCurrentSiteInfo(),
    };
  }

  /**
   * Find input element on current site
   */
  private async findInputElement(siteInfo: AISiteInfo): Promise<Element | null> {
    // Wait for element to be available
    for (let i = 0; i < 30; i++) { // 3 seconds max
      const element = document.querySelector(siteInfo.textareaSelector);
      if (element) {
        return element;
      }
      await this.wait(100);
    }
    return null;
  }

  /**
   * Insert text into textarea element
   */
  private async insertIntoTextarea(
    textarea: HTMLTextAreaElement, 
    text: string, 
    options: TextInsertionOptions
  ): Promise<void> {
    const currentValue = textarea.value;
    const cursorPosition = textarea.selectionStart;

    let newValue: string;
    if (options.append) {
      newValue = currentValue + (currentValue ? '\n\n' : '') + text;
    } else if (options.prepend) {
      newValue = text + (currentValue ? '\n\n' : '') + currentValue;
    } else {
      // Insert at cursor position or replace selection
      const before = currentValue.substring(0, cursorPosition);
      const after = currentValue.substring(textarea.selectionEnd);
      newValue = before + text + after;
    }

    // Set new value and trigger events
    textarea.value = newValue;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    // Set cursor position
    const newCursorPosition = options.append 
      ? newValue.length 
      : cursorPosition + text.length;
    textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    textarea.focus();
  }

  /**
   * Insert text into contenteditable element
   */
  private async insertIntoContentEditable(
    element: Element, 
    text: string, 
    options: TextInsertionOptions
  ): Promise<void> {
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);

    if (options.append) {
      element.textContent = (element.textContent || '') + '\n\n' + text;
    } else if (options.prepend) {
      element.textContent = text + '\n\n' + (element.textContent || '');
    } else if (range) {
      // Insert at current selection
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      
      // Move cursor to end of inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      // Fallback: append to end
      element.textContent = (element.textContent || '') + text;
    }

    // Trigger events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Focus element
    if (element instanceof HTMLElement) {
      element.focus();
    }
  }

  /**
   * Wait utility function
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}