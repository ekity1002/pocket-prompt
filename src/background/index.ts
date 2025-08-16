// Background script for Pocket-Prompt Chrome Extension
// Manifest V3 Service Worker
// TASK-0018: ChatGPT会話データ管理実装

import type {
  ChromeMessage,
  ChromeResponse,
  ConversationExport,
  ExportFormat,
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptSearchOptions,
} from '@/types';
import { ConversationManager } from '@/core/conversation-manager';
import { PromptManager } from '@/core/prompt-manager';
import { PromptStorageAdapter } from '@/core/prompt-storage-adapter';

console.log('Pocket-Prompt Background Script loaded');

// Initialize managers
const conversationManager = new ConversationManager();
const promptStorageAdapter = new PromptStorageAdapter();
const promptManager = new PromptManager(promptStorageAdapter);

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Pocket-Prompt installed:', details.reason);

  // Initialize default settings on first install
  if (details.reason === 'install') {
    initializeDefaultSettings();
  }
});

// Handle messages from popup, options, and content scripts
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  console.log('Background received message:', message.type);
  console.log('Full message:', message);
  console.log('Sender:', sender);

  // Handle async responses
  handleMessage(message, sender)
    .then((response: ChromeResponse) => {
      console.log('Background sending response:', response);
      sendResponse(response);
    })
    .catch((error: Error) => {
      console.error('Background error:', error);
      const errorResponse = {
        success: false,
        error: {
          code: 'BACKGROUND_ERROR',
          message: error.message,
        },
        timestamp: new Date(),
        requestId: message.requestId,
      };
      console.log('Background sending error response:', errorResponse);
      sendResponse(errorResponse);
    });

  // Return true to indicate we'll respond asynchronously
  return true;
});

async function handleMessage(
  message: ChromeMessage,
  sender: chrome.runtime.MessageSender
): Promise<ChromeResponse> {
  const { type, requestId } = message;

  switch (type) {
    case 'GET_PROMPTS':
      return await handleGetPrompts(message);

    case 'SAVE_PROMPT':
      return await handleSavePrompt(message);

    case 'UPDATE_PROMPT':
      return await handleUpdatePrompt(message);

    case 'DELETE_PROMPT':
      return await handleDeletePrompt(message);

    case 'COPY_PROMPT':
      return await handleCopyPrompt(message);

    case 'SEARCH_PROMPTS':
      return await handleSearchPrompts(message);

    case 'EXPORT_CONVERSATION':
      console.log('About to call handleExportConversation');
      return await handleExportConversation(message, sender);

    case 'SAVE_CONVERSATION':
      return await handleSaveConversation(message);

    case 'GET_CONVERSATIONS':
      return await handleGetConversations(message);

    case 'UPDATE_CONVERSATION':
      return await handleUpdateConversation(message);

    case 'DELETE_CONVERSATION':
      return await handleDeleteConversation(message);

    case 'GET_CONVERSATION_DATA':
      return await handleGetConversationData(message);

    case 'GET_STORAGE_STATS':
      return await handleGetStorageStats(message);

    case 'BULK_OPERATIONS':
      return await handleBulkOperations(message);

    case 'SYNC_DATA':
      return await handleSyncData(message, sender);

    case 'GET_PAGE_INFO':
      return await handlePageInfoRequest(message, sender);

    default:
      return {
        success: false,
        error: {
          code: 'UNKNOWN_MESSAGE_TYPE',
          message: `Unknown message type: ${type}`,
        },
        timestamp: new Date(),
        requestId,
      };
  }
}

// Handle conversation export and auto-save
async function handleExportConversation(
  message: ChromeMessage,
  sender: chrome.runtime.MessageSender
): Promise<ChromeResponse> {
  try {
    console.log('handleExportConversation called with:', {
      messageData: message.data,
      senderTab: sender.tab,
      senderTabId: sender.tab?.id,
    });

    // Try to get tab ID from sender first, then from message data
    const tabId = sender.tab?.id || (message.data as any)?.tabId;

    console.log('Resolved tabId:', tabId);

    if (!tabId) {
      throw new Error('No tab ID available for content script communication');
    }

    const exportOptions = (message.data as {
      format: ExportFormat;
      autoSave?: boolean;
      tags?: string[];
      isFavorite?: boolean;
      tabId?: number;
    }) || { format: 'json' as ExportFormat, autoSave: false };

    // Request conversation data from content script
    const conversationResponse = await chrome.tabs.sendMessage(tabId, {
      type: 'EXPORT_CONVERSATION',
      data: exportOptions,
      timestamp: new Date(),
      requestId: message.requestId,
    });

    if (!conversationResponse || !conversationResponse.success) {
      throw new Error(
        conversationResponse?.error?.message || 'Failed to extract conversation data'
      );
    }

    const conversationData = conversationResponse.data;

    // Format data based on export format
    let formattedData: string;
    let filename: string;
    let mimeType: string;

    const title = conversationData.title || 'ChatGPT_Conversation';
    const timestamp = new Date().toISOString().slice(0, 10);

    switch (exportOptions.format) {
      case 'markdown':
        formattedData = formatAsMarkdown(conversationData);
        filename = `${title}_${timestamp}.md`;
        mimeType = 'text/markdown';
        break;
      case 'json':
        formattedData = JSON.stringify(conversationData, null, 2);
        filename = `${title}_${timestamp}.json`;
        mimeType = 'application/json';
        break;
      case 'txt':
        formattedData = formatAsPlainText(conversationData);
        filename = `${title}_${timestamp}.txt`;
        mimeType = 'text/plain';
        break;
      default:
        formattedData = JSON.stringify(conversationData, null, 2);
        filename = `${title}_${timestamp}.json`;
        mimeType = 'application/json';
    }

    // Create data URL using base64 encoding for better compatibility
    const encodedData = btoa(unescape(encodeURIComponent(formattedData)));
    const dataUrl = `data:${mimeType};charset=utf-8;base64,${encodedData}`;

    try {
      // Use Chrome Downloads API to download from data URL
      await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true,
      });

      console.log('Download initiated successfully:', filename);
    } catch (downloadError) {
      console.error('Download failed:', downloadError);
      throw new Error('ファイルのダウンロードに失敗しました');
    }

    // Auto-save to storage if requested
    if (exportOptions.autoSave && conversationData) {
      const saveResult = await conversationManager.saveConversation(
        conversationData as ConversationExport,
        exportOptions.tags || [],
        exportOptions.isFavorite || false
      );

      const response: ChromeResponse = {
        success: saveResult.success,
        data: {
          exportData: conversationData,
          saveResult,
          downloadInfo: { filename, format: exportOptions.format },
        },
        timestamp: new Date(),
        requestId: message.requestId,
      };

      if (!saveResult.success) {
        response.error = { code: 'SAVE_ERROR', message: saveResult.error || 'Save failed' };
      }

      return response;
    }

    return {
      success: true,
      data: {
        exportData: conversationData,
        downloadInfo: { filename, format: exportOptions.format },
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    throw new Error(
      `Failed to export conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Format conversation data as Markdown
function formatAsMarkdown(conversationData: any): string {
  const title = conversationData.title || 'ChatGPT Conversation';
  const timestamp = new Date().toISOString();

  let markdown = `# ${title}\n\n`;
  markdown += `**Exported:** ${timestamp}\n`;
  markdown += `**Source:** ${conversationData.url || 'Unknown'}\n\n`;

  if (conversationData.messages && Array.isArray(conversationData.messages)) {
    conversationData.messages.forEach((message: any) => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      markdown += `## ${role}\n\n${message.content}\n\n`;
    });
  }

  return markdown;
}

// Format conversation data as plain text
function formatAsPlainText(conversationData: any): string {
  const title = conversationData.title || 'ChatGPT Conversation';
  const timestamp = new Date().toISOString();

  let text = `${title}\n`;
  text += `Exported: ${timestamp}\n`;
  text += `Source: ${conversationData.url || 'Unknown'}\n\n`;
  text += '='.repeat(50) + '\n\n';

  if (conversationData.messages && Array.isArray(conversationData.messages)) {
    conversationData.messages.forEach((message: any) => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      text += `${role}:\n${message.content}\n\n`;
      text += '-'.repeat(30) + '\n\n';
    });
  }

  return text;
}

// Handle conversation saving
async function handleSaveConversation(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const saveData = message.data as {
      exportData: ConversationExport;
      tags?: string[];
      isFavorite?: boolean;
    };

    if (!saveData?.exportData) {
      throw new Error('No export data provided for saving');
    }

    const result = await conversationManager.saveConversation(
      saveData.exportData,
      saveData.tags || [],
      saveData.isFavorite || false
    );

    const response: ChromeResponse = {
      success: result.success,
      data: { id: result.id },
      timestamp: new Date(),
      requestId: message.requestId,
    };

    if (!result.success) {
      response.error = { code: 'SAVE_ERROR', message: result.error || 'Save failed' };
    }

    return response;
  } catch (error) {
    throw new Error(
      `Failed to save conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Handle conversation retrieval
async function handleGetConversations(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const query =
      (message.data as Parameters<typeof conversationManager.getConversations>[0]) || {};
    const result = await conversationManager.getConversations(query);

    return {
      success: true,
      data: result,
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    throw new Error(
      `Failed to get conversations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Handle conversation update
async function handleUpdateConversation(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const updateData = message.data as {
      id: string;
      updates: Parameters<typeof conversationManager.updateConversation>[1];
    };

    if (!updateData?.id || !updateData.updates) {
      throw new Error('Invalid update data provided');
    }

    const result = await conversationManager.updateConversation(updateData.id, updateData.updates);

    const response: ChromeResponse = {
      success: result.success,
      data: { updated: result.success },
      timestamp: new Date(),
      requestId: message.requestId,
    };

    if (!result.success) {
      response.error = { code: 'UPDATE_ERROR', message: result.error || 'Update failed' };
    }

    return response;
  } catch (error) {
    throw new Error(
      `Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Handle conversation deletion
async function handleDeleteConversation(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const deleteData = message.data as { id: string };

    if (!deleteData?.id) {
      throw new Error('No conversation ID provided for deletion');
    }

    const result = await conversationManager.deleteConversation(deleteData.id);

    const response: ChromeResponse = {
      success: result.success,
      data: { deleted: result.success },
      timestamp: new Date(),
      requestId: message.requestId,
    };

    if (!result.success) {
      response.error = { code: 'DELETE_ERROR', message: result.error || 'Delete failed' };
    }

    return response;
  } catch (error) {
    throw new Error(
      `Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Handle conversation data retrieval
async function handleGetConversationData(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const requestData = message.data as { id: string };

    if (!requestData?.id) {
      throw new Error('No conversation ID provided');
    }

    const result = await conversationManager.getConversationData(requestData.id);

    return {
      success: true,
      data: result,
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    throw new Error(
      `Failed to get conversation data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Handle storage statistics
async function handleGetStorageStats(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const stats = await conversationManager.getStorageStats();

    return {
      success: true,
      data: stats,
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    throw new Error(
      `Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Handle bulk operations
async function handleBulkOperations(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const operations = message.data as Parameters<typeof conversationManager.bulkOperations>[0];

    if (!operations) {
      throw new Error('No operations provided for bulk processing');
    }

    const result = await conversationManager.bulkOperations(operations);

    const response: ChromeResponse = {
      success: result.success,
      data: result,
      timestamp: new Date(),
      requestId: message.requestId,
    };

    if (!result.success) {
      response.error = { code: 'BULK_ERROR', message: 'Bulk operation failed' };
    }

    return response;
  } catch (error) {
    throw new Error(
      `Failed to perform bulk operations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Handle data synchronization
async function handleSyncData(
  message: ChromeMessage,
  sender: chrome.runtime.MessageSender
): Promise<ChromeResponse> {
  try {
    const syncData = message.data as {
      event: string;
      site?: string;
      url?: string;
      [key: string]: any;
    };

    console.log('Data sync event:', syncData);

    // Handle different sync events
    switch (syncData.event) {
      case 'conversation_updated':
        // Auto-export and save if enabled
        if (sender.tab?.id && (await isAutoSaveEnabled())) {
          try {
            await handleAutoSaveConversation(sender.tab.id, syncData);
          } catch (error) {
            console.warn('Auto-save failed:', error);
          }
        }
        break;

      case 'page_navigation':
        // Handle navigation events
        console.log('Page navigation detected:', syncData.url);
        break;

      default:
        console.log('Unknown sync event:', syncData.event);
    }

    return {
      success: true,
      data: { acknowledged: true },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    throw new Error(
      `Failed to handle sync data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Handle page info requests
async function handlePageInfoRequest(
  message: ChromeMessage,
  sender: chrome.runtime.MessageSender
): Promise<ChromeResponse> {
  try {
    return {
      success: true,
      data: {
        tabId: sender.tab?.id,
        url: sender.tab?.url,
        title: sender.tab?.title,
        ready: true,
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    throw new Error(
      `Failed to get page info: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Auto-save conversation when conversation is updated
async function handleAutoSaveConversation(tabId: number, syncData: any): Promise<void> {
  try {
    // Request current conversation data
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'EXPORT_CONVERSATION',
      data: { format: 'json', autoSave: false },
      timestamp: new Date(),
      requestId: `auto-save-${Date.now()}`,
    });

    if (response?.success && response.data) {
      // Save with auto-generated tags
      const autoTags = generateAutoTags(syncData);
      const result = await conversationManager.saveConversation(
        response.data as ConversationExport,
        autoTags,
        false
      );

      if (result.success) {
        console.log('Auto-saved conversation:', result.id);

        // Notify popup if open
        notifyPopup('conversation_auto_saved', { id: result.id });
      } else {
        console.warn('Auto-save failed:', result.error);
      }
    }
  } catch (error) {
    console.error('Auto-save conversation failed:', error);
  }
}

// Check if auto-save is enabled
async function isAutoSaveEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get('settings');
    return result['settings']?.autoSave || false;
  } catch {
    return false; // Default disabled
  }
}

// Generate auto tags based on sync data
function generateAutoTags(syncData: any): string[] {
  const tags = ['auto-saved'];

  if (syncData.site) {
    tags.push(syncData.site);
  }

  if (syncData.url) {
    try {
      const url = new URL(syncData.url);
      tags.push(url.hostname);
    } catch {
      // Invalid URL, skip
    }
  }

  return tags;
}

// Notify popup of events
function notifyPopup(event: string, data: any): void {
  chrome.runtime
    .sendMessage({
      type: 'BACKGROUND_EVENT',
      data: { event, ...data },
      timestamp: new Date(),
      requestId: `bg-event-${Date.now()}`,
    })
    .catch(() => {
      // Popup not open, ignore
    });
}

async function initializeDefaultSettings(): Promise<void> {
  const defaultSettings = {
    theme: 'auto',
    language: 'ja',
    features: {
      tagManagement: false,
      searchFiltering: false,
      aiSiteIntegration: false,
      cloudSync: false,
      multiAiSupport: false,
    },
  };

  await chrome.storage.local.set({
    settings: defaultSettings,
    metadata: {
      version: '0.1.0',
      dataSize: 0,
      encryptionEnabled: false,
    },
  });

  console.log('Default settings initialized');
}

// ========================================
// PROMPT MANAGEMENT HANDLERS
// TASK-0020: Background Script プロンプト管理統合
// ========================================

/**
 * Handle GET_PROMPTS message
 */
async function handleGetPrompts(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const searchOptions = (message.data as PromptSearchOptions) || {};
    const prompts = await promptManager.searchPrompts(searchOptions);

    // Also get storage stats for UI display
    const stats = await promptStorageAdapter.getStorageStats();

    return {
      success: true,
      data: {
        prompts: prompts.map((p) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          tags: p.tags,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          usageCount: p.metadata.usageCount,
          lastUsedAt: p.metadata.lastUsedAt,
        })),
        totalCount: stats.totalPrompts,
        storageInfo: {
          usedSpace: stats.storageUsage,
          availableSpace: stats.availableSpace,
          totalPrompts: stats.totalPrompts,
        },
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'GET_PROMPTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get prompts',
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  }
}

/**
 * Handle SAVE_PROMPT message
 */
async function handleSavePrompt(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const promptData = message.data as CreatePromptRequest;

    if (!promptData) {
      throw new Error('No prompt data provided');
    }

    const savedPrompt = await promptManager.createPrompt(promptData);

    return {
      success: true,
      data: {
        prompt: {
          id: savedPrompt.id,
          title: savedPrompt.title,
          content: savedPrompt.content,
          tags: savedPrompt.tags,
          createdAt: savedPrompt.createdAt,
          updatedAt: savedPrompt.updatedAt,
          usageCount: savedPrompt.metadata.usageCount,
          lastUsedAt: savedPrompt.metadata.lastUsedAt,
        },
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SAVE_PROMPT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to save prompt',
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  }
}

/**
 * Handle UPDATE_PROMPT message
 */
async function handleUpdatePrompt(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const updateData = message.data as { id: string; updates: UpdatePromptRequest };

    if (!updateData?.id || !updateData.updates) {
      throw new Error('Invalid update data provided');
    }

    const updatedPrompt = await promptManager.updatePrompt(updateData.id, updateData.updates);

    return {
      success: true,
      data: {
        prompt: {
          id: updatedPrompt.id,
          title: updatedPrompt.title,
          content: updatedPrompt.content,
          tags: updatedPrompt.tags,
          createdAt: updatedPrompt.createdAt,
          updatedAt: updatedPrompt.updatedAt,
          usageCount: updatedPrompt.metadata.usageCount,
          lastUsedAt: updatedPrompt.metadata.lastUsedAt,
        },
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UPDATE_PROMPT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update prompt',
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  }
}

/**
 * Handle DELETE_PROMPT message
 */
async function handleDeletePrompt(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const deleteData = message.data as { id: string };

    if (!deleteData?.id) {
      throw new Error('No prompt ID provided for deletion');
    }

    const deleted = await promptManager.deletePrompt(deleteData.id);

    if (!deleted) {
      throw new Error('Prompt not found or could not be deleted');
    }

    return {
      success: true,
      data: { deleted: true, promptId: deleteData.id },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'DELETE_PROMPT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete prompt',
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  }
}

/**
 * Handle COPY_PROMPT message - copies prompt to clipboard and records usage
 */
async function handleCopyPrompt(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const copyData = message.data as { promptId: string };

    if (!copyData?.promptId) {
      throw new Error('No prompt ID provided for copying');
    }

    // Get the prompt
    const prompt = await promptManager.getPrompt(copyData.promptId);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    // Record usage (increment usage count and update last used timestamp)
    await promptManager.recordUsage(copyData.promptId);

    // Note: Clipboard writing will be handled by the content script or popup
    // Background script cannot directly access clipboard API in Manifest V3

    return {
      success: true,
      data: {
        content: prompt.content,
        promptId: copyData.promptId,
        title: prompt.title,
        usageCount: prompt.metadata.usageCount + 1, // New usage count
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'COPY_PROMPT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to copy prompt',
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  }
}

/**
 * Handle SEARCH_PROMPTS message
 */
async function handleSearchPrompts(message: ChromeMessage): Promise<ChromeResponse> {
  try {
    const searchOptions = message.data as PromptSearchOptions;

    if (!searchOptions) {
      throw new Error('No search options provided');
    }

    const results = await promptManager.searchPrompts(searchOptions);

    return {
      success: true,
      data: {
        prompts: results.map((p) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          tags: p.tags,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          usageCount: p.metadata.usageCount,
          lastUsedAt: p.metadata.lastUsedAt,
        })),
        totalCount: results.length,
        query: searchOptions,
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SEARCH_PROMPTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to search prompts',
      },
      timestamp: new Date(),
      requestId: message.requestId,
    };
  }
}
