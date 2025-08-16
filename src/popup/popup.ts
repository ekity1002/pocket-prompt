// Popup script for Pocket-Prompt Chrome Extension

import type { ChromeMessage, ChromeResponse, CreatePromptRequest } from '@/types';
import { CopyButton } from '../components/ui/CopyButton';
import { DeleteButton } from '../components/ui/DeleteButton';
import { toast } from '../components/ui/ToastNotification';
import { PromptCreateModal } from '../components/prompt/PromptCreateModal';

console.log('Pocket-Prompt Popup loaded');

// DOM elements - will be initialized after DOM loads
let settingsBtn: HTMLButtonElement | null = null;
let exportBtn: HTMLButtonElement | null = null;
let promptList: HTMLDivElement | null = null;
let addPromptBtn: HTMLButtonElement | null = null;

// UI component instances management
const copyButtons = new Map<string, CopyButton>();
const deleteButtons = new Map<string, DeleteButton>();

// Initialize popup
document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup(): Promise<void> {
  console.log('Initializing popup...');

  try {
    // Initialize DOM elements
    initializeDOMElements();

    // Setup event listeners
    setupEventListeners();

    await loadPrompts();
    await checkChatGPTTab();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showError('初期化に失敗しました');
  }
}

function initializeDOMElements(): void {
  settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
  exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
  promptList = document.getElementById('promptList') as HTMLDivElement;
  addPromptBtn = document.getElementById('addPromptBtn') as HTMLButtonElement;
}

function setupEventListeners(): void {
  // Check if elements exist before adding listeners
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettings);
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportChatGPTConversation);
  }

  if (addPromptBtn) {
    addPromptBtn.addEventListener('click', createNewPrompt);
  }
}

async function loadPrompts(): Promise<void> {
  // Show loading state
  showLoadingState();

  const message: ChromeMessage = {
    type: 'GET_PROMPTS',
    requestId: generateRequestId(),
    timestamp: new Date(),
  };

  try {
    const response = await sendMessageToBackground(message);

    if (response.success && response.data) {
      const { prompts, totalCount } = response.data as {
        prompts: Array<{
          id: string;
          title: string;
          content: string;
          usageCount?: number;
          lastUsedAt?: string;
        }>;
        totalCount: number;
      };
      renderPrompts(prompts, totalCount);
    } else {
      showError(response.error?.message || 'プロンプトの読み込みに失敗しました');
    }
  } catch (error) {
    console.error('Failed to load prompts:', error);
    showError('プロンプトの読み込みに失敗しました');
  }
}

function renderPrompts(
  prompts: Array<{
    id: string;
    title: string;
    content: string;
    usageCount?: number;
    lastUsedAt?: string;
  }>,
  totalCount: number
): void {
  // Clear existing copy buttons
  clearCopyButtons();

  if (totalCount === 0) {
    if (promptList) {
      promptList.innerHTML = `
        <div class="empty-state">
          <p>プロンプトがまだありません</p>
          <p style="font-size: 12px;">最初のプロンプトを作成しましょう</p>
        </div>
      `;
    }
    return;
  }

  const promptsHtml = prompts
    .map(
      (prompt) => `
        <div class="prompt-item" data-id="${prompt.id}" tabindex="0" role="button" aria-label="プロンプト: ${escapeHtml(prompt.title)}">
          <div class="prompt-content">
            <div class="prompt-title">${escapeHtml(prompt.title)}</div>
            <div class="prompt-preview">${escapeHtml(prompt.content.substring(0, 80))}...</div>
            ${
              prompt.usageCount !== undefined || prompt.lastUsedAt
                ? `
              <div class="prompt-meta">
                ${prompt.usageCount !== undefined ? `<span>使用回数: ${prompt.usageCount}</span>` : ''}
                ${prompt.lastUsedAt ? `<span>最終使用: ${formatLastUsed(prompt.lastUsedAt)}</span>` : ''}
              </div>
            `
                : ''
            }
          </div>
          <div class="prompt-actions"></div>
        </div>
      `
    )
    .join('');

  if (promptList) {
    promptList.innerHTML = promptsHtml;
    // Setup copy buttons and event listeners
    setupPromptInteractions(prompts);
  }
}

async function copyPrompt(promptId: string): Promise<void> {
  const message: ChromeMessage = {
    type: 'COPY_PROMPT',
    data: { promptId },
    requestId: generateRequestId(),
    timestamp: new Date(),
  };

  try {
    const response = await sendMessageToBackground(message);

    if (response.success && response.data) {
      const { content, title } = response.data as { content: string; title: string };

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(content);
        toast.success(`「${title}」をクリップボードにコピーしました`);
      } catch (clipboardError) {
        // Fallback for older browsers or permission issues
        console.warn('Clipboard API failed, using fallback:', clipboardError);

        // Create temporary textarea for fallback copy
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);

        try {
          textarea.select();
          document.execCommand('copy');
          toast.success(`「${title}」をクリップボードにコピーしました`);
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError);
          toast.error('クリップボードへのコピーに失敗しました');
        } finally {
          document.body.removeChild(textarea);
        }
      }

      // Note: Removed loadPrompts() to avoid reordering prompts on click
    } else {
      const errorMessage = response.error?.message || 'コピーに失敗しました';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Failed to copy prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'コピーに失敗しました';
    toast.error(errorMessage);
    throw error;
  }
}

function createNewPrompt(): void {
  console.log('Creating new prompt...');

  const modal = new PromptCreateModal({
    onSave: async (promptData: CreatePromptRequest) => {
      const message: ChromeMessage = {
        type: 'SAVE_PROMPT',
        data: promptData,
        requestId: generateRequestId(),
        timestamp: new Date(),
      };

      const response = await sendMessageToBackground(message);

      if (!response.success) {
        const errorMessage = response.error?.message || 'プロンプトの保存に失敗しました';
        throw new Error(errorMessage);
      }

      // Success - reload prompts to show the new one
      await loadPrompts();
      toast.success('プロンプトを作成しました');
    },
    onCancel: () => {
      console.log('Prompt creation cancelled');
    },
  });

  modal.show();
}

async function deletePrompt(promptId: string): Promise<void> {
  const message: ChromeMessage = {
    type: 'DELETE_PROMPT',
    data: { id: promptId },
    requestId: generateRequestId(),
    timestamp: new Date(),
  };

  try {
    const response = await sendMessageToBackground(message);

    if (response.success) {
      toast.success('プロンプトを削除しました');
      // Reload prompts to reflect deletion
      await loadPrompts();
    } else {
      const errorMessage = response.error?.message || 'プロンプトの削除に失敗しました';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Failed to delete prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'プロンプトの削除に失敗しました';
    toast.error(errorMessage);
    throw error;
  }
}

async function editPrompt(promptId: string): Promise<void> {
  try {
    // Get prompt data from background
    const message: ChromeMessage = {
      type: 'GET_PROMPT',
      data: { id: promptId },
      requestId: generateRequestId(),
      timestamp: new Date(),
    };

    const response = await sendMessageToBackground(message);

    if (response.success && response.data) {
      const promptData = response.data as {
        id: string;
        title: string;
        content: string;
        tags: string[];
      };

      // Create modal with existing data
      const modal = new PromptCreateModal({
        onSave: async (updatedPromptData: CreatePromptRequest) => {
          const updateMessage: ChromeMessage = {
            type: 'UPDATE_PROMPT',
            data: {
              id: promptId,
              updates: updatedPromptData,
            },
            requestId: generateRequestId(),
            timestamp: new Date(),
          };

          const updateResponse = await sendMessageToBackground(updateMessage);

          if (!updateResponse.success) {
            const errorMessage = updateResponse.error?.message || 'プロンプトの更新に失敗しました';
            throw new Error(errorMessage);
          }

          // Reload prompts to reflect changes
          await loadPrompts();
          toast.success('プロンプトを更新しました');
        },
        onCancel: () => {
          console.log('Prompt edit cancelled');
        },
        initialData: {
          title: promptData.title,
          content: promptData.content,
          tags: promptData.tags,
        },
      });

      modal.show();
    } else {
      const errorMessage = response.error?.message || 'プロンプトの取得に失敗しました';
      toast.error(errorMessage);
    }
  } catch (error) {
    console.error('Failed to edit prompt:', error);
    toast.error('プロンプトの編集に失敗しました');
  }
}

function openSettings(): void {
  openOptions();
}

function openOptions(): void {
  chrome.runtime.openOptionsPage();
}

async function checkChatGPTTab(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    const isChatGPT =
      currentTab?.url?.includes('chatgpt.com') || currentTab?.url?.includes('chat.openai.com');

    if (exportBtn) {
      if (isChatGPT) {
        exportBtn.style.display = 'flex';
      } else {
        exportBtn.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Failed to check ChatGPT tab:', error);
    if (exportBtn) {
      exportBtn.style.display = 'none';
    }
  }
}

async function exportChatGPTConversation(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (
      !currentTab?.url?.includes('chatgpt.com') &&
      !currentTab?.url?.includes('chat.openai.com')
    ) {
      toast.error('ChatGPTページでのみ利用可能です');
      return;
    }

    if (!currentTab?.id) {
      toast.error('タブ情報を取得できませんでした');
      return;
    }

    const message: ChromeMessage = {
      type: 'EXPORT_CONVERSATION',
      data: {
        format: 'markdown',
        tabId: currentTab.id,
      },
      requestId: generateRequestId(),
      timestamp: new Date(),
    };

    console.log('Sending export message:', message);
    console.log('Message data details:', {
      tabId: message.data.tabId,
      format: message.data.format,
      type: message.type,
    });
    const response = await sendMessageToBackground(message);
    console.log('Export response:', response);
    console.log('Error details:', response.error);

    if (response.success && response.data?.downloadInfo) {
      const downloadInfo = response.data.downloadInfo;
      toast.success(`${downloadInfo.filename} をダウンロードしました`);
    } else if (response.success) {
      toast.success('会話をエクスポートしました');
    } else {
      const errorMessage = response.error?.message || 'エクスポートに失敗しました';
      toast.error(errorMessage);
    }
  } catch (error) {
    console.error('Failed to export conversation:', error);
    toast.error('エクスポートに失敗しました');
  }
}

async function sendMessageToBackground(message: ChromeMessage): Promise<ChromeResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: ChromeResponse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function escapeHtml(unsafe: string): string {
  const replacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return unsafe.replace(/[&<>"']/g, (char) => replacements[char as keyof typeof replacements]);
}

function setupPromptInteractions(
  prompts: Array<{ id: string; title: string; content: string }>
): void {
  if (!promptList) return;

  const promptItems = promptList.querySelectorAll('.prompt-item');

  for (const item of promptItems) {
    const promptId = item.getAttribute('data-id');
    if (!promptId) continue;

    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) continue;

    // Create copy button for each prompt item
    const copyButton = new CopyButton({
      promptId,
      onCopy: copyPrompt,
      variant: 'inline',
    });

    // Create delete button for each prompt item  
    const deleteButton = new DeleteButton({
      promptId,
      promptTitle: prompt.title,
      onDelete: deletePrompt,
      variant: 'inline',
    });

    // Store references for cleanup
    copyButtons.set(promptId, copyButton);
    deleteButtons.set(promptId, deleteButton);

    // Append buttons to prompt actions container in the correct order
    const actionsContainer = item.querySelector('.prompt-actions');
    if (actionsContainer) {
      // Add delete button first, then copy button (delete button next to copy)
      actionsContainer.appendChild(deleteButton.getElement());
      actionsContainer.appendChild(copyButton.getElement());
    }

    // Add keyboard navigation support  
    item.addEventListener('keydown', (e: Event) => {
      const keyboardEvent = e as KeyboardEvent;
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        // Change behavior: open edit modal instead of copying
        editPrompt(promptId);
      }
    });

    // Change click event to open edit modal instead of copying
    item.addEventListener('click', (e) => {
      // Only trigger edit if not clicking on buttons
      if (
        !e.target ||
        (!(e.target as Element).closest('.copy-button') &&
          !(e.target as Element).closest('.delete-button'))
      ) {
        editPrompt(promptId);
      }
    });
  }
}

function clearCopyButtons(): void {
  // Clean up existing UI component instances
  for (const copyButton of copyButtons.values()) {
    copyButton.destroy();
  }
  copyButtons.clear();

  for (const deleteButton of deleteButtons.values()) {
    deleteButton.destroy();
  }
  deleteButtons.clear();
}

function showLoadingState(): void {
  if (promptList) {
    promptList.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>プロンプトを読み込んでいます...</p>
      </div>
    `;
  }
}

function formatLastUsed(lastUsedAt: string): string {
  try {
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return '今';
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return '---';
  }
}

// Removed unused showSuccess function

function showError(message: string): void {
  console.error('Error:', message);
  toast.error(message);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  clearCopyButtons();
});
