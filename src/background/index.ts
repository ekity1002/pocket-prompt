// Background script for Pocket-Prompt Chrome Extension
// Manifest V3 Service Worker
// TASK-0018: ChatGPT会話データ管理実装

import type { ChromeMessage, ChromeResponse, ConversationExport, ExportFormat } from '@/types';
import { ConversationManager } from '@/core/conversation-manager';

console.log('Pocket-Prompt Background Script loaded');

// Initialize conversation manager
const conversationManager = new ConversationManager();

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

  // Handle async responses
  handleMessage(message, sender)
    .then((response: ChromeResponse) => {
      sendResponse(response);
    })
    .catch((error: Error) => {
      sendResponse({
        success: false,
        error: {
          code: 'BACKGROUND_ERROR',
          message: error.message,
        },
        timestamp: new Date(),
        requestId: message.requestId,
      });
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
      return {
        success: true,
        data: { prompts: [], totalCount: 0 },
        timestamp: new Date(),
        requestId,
      };

    case 'SAVE_PROMPT':
      return {
        success: true,
        data: { saved: true },
        timestamp: new Date(),
        requestId,
      };

    case 'EXPORT_CONVERSATION':
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
    if (!sender.tab?.id) {
      throw new Error('No tab ID available for content script communication');
    }

    const exportOptions = (message.data as {
      format: ExportFormat;
      autoSave?: boolean;
      tags?: string[];
      isFavorite?: boolean;
    }) || { format: 'json' as ExportFormat, autoSave: false };

    // Request conversation data from content script
    const conversationResponse = await chrome.tabs.sendMessage(sender.tab.id, {
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

    // Auto-save to storage if requested
    if (exportOptions.autoSave && conversationResponse.data) {
      const saveResult = await conversationManager.saveConversation(
        conversationResponse.data as ConversationExport,
        exportOptions.tags || [],
        exportOptions.isFavorite || false
      );

      return {
        success: saveResult.success,
        data: {
          exportData: conversationResponse.data,
          saveResult,
        },
        error: saveResult.success
          ? undefined
          : { code: 'SAVE_ERROR', message: saveResult.error || 'Save failed' },
        timestamp: new Date(),
        requestId: message.requestId,
      };
    }

    return {
      success: true,
      data: conversationResponse.data,
      timestamp: new Date(),
      requestId: message.requestId,
    };
  } catch (error) {
    throw new Error(
      `Failed to export conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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

    return {
      success: result.success,
      data: { id: result.id },
      error: result.success
        ? undefined
        : { code: 'SAVE_ERROR', message: result.error || 'Save failed' },
      timestamp: new Date(),
      requestId: message.requestId,
    };
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

    return {
      success: result.success,
      data: { updated: result.success },
      error: result.success
        ? undefined
        : { code: 'UPDATE_ERROR', message: result.error || 'Update failed' },
      timestamp: new Date(),
      requestId: message.requestId,
    };
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

    return {
      success: result.success,
      data: { deleted: result.success },
      error: result.success
        ? undefined
        : { code: 'DELETE_ERROR', message: result.error || 'Delete failed' },
      timestamp: new Date(),
      requestId: message.requestId,
    };
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

    return {
      success: result.success,
      data: result,
      error: result.success ? undefined : { code: 'BULK_ERROR', message: 'Bulk operation failed' },
      timestamp: new Date(),
      requestId: message.requestId,
    };
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
    return result.settings?.autoSave || false;
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
