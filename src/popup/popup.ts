// Popup script for Pocket-Prompt Chrome Extension

import type { ChromeMessage, ChromeResponse } from '@/types';
import { CopyButton } from '../components/ui/CopyButton';
import { toast } from '../components/ui/ToastNotification';

console.log('Pocket-Prompt Popup loaded');

// DOM elements
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
const promptList = document.getElementById('promptList') as HTMLDivElement;
const addPromptBtn = document.getElementById('addPromptBtn') as HTMLButtonElement;

// Copy button instances management
const copyButtons = new Map<string, CopyButton>();

// Event listeners
settingsBtn.addEventListener('click', openSettings);
addPromptBtn.addEventListener('click', createNewPrompt);

// Initialize popup
document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup(): Promise<void> {
  console.log('Initializing popup...');

  try {
    await loadPrompts();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showError('初期化に失敗しました');
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
    promptList.innerHTML = `
      <div class="empty-state">
        <p>プロンプトがまだありません</p>
        <p style="font-size: 12px;">最初のプロンプトを作成しましょう</p>
      </div>
    `;
    return;
  }

  const promptsHtml = prompts
    .map(
      (prompt) => `
        <div class="prompt-item" data-id="${prompt.id}" tabindex="0" role="button" aria-label="プロンプト: ${escapeHtml(prompt.title)}">
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
      `
    )
    .join('');

  promptList.innerHTML = promptsHtml;

  // Setup copy buttons and event listeners
  setupPromptInteractions(prompts);
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

    if (response.success) {
      toast.success('プロンプトをコピーしました');
      // Update usage statistics
      await loadPrompts();
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
  // TODO: Open prompt creation dialog or navigate to options page
  openOptions();
}

function openSettings(): void {
  openOptions();
}

function openOptions(): void {
  chrome.runtime.openOptionsPage();
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
  const promptItems = promptList.querySelectorAll('.prompt-item');

  for (const item of promptItems) {
    const promptId = item.getAttribute('data-id');
    if (!promptId) continue;

    // Create copy button for each prompt item
    const copyButton = new CopyButton({
      promptId,
      onCopy: copyPrompt,
      variant: 'default',
    });

    // Store reference for cleanup
    copyButtons.set(promptId, copyButton);

    // Append copy button to prompt item
    item.appendChild(copyButton.getElement());

    // Add keyboard navigation support
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        copyPrompt(promptId);
      }
    });

    // Remove click event from prompt item to avoid conflicts
    item.addEventListener('click', (e) => {
      // Only trigger copy if not clicking on the copy button
      if (!e.target || !(e.target as Element).closest('.copy-button')) {
        copyPrompt(promptId);
      }
    });
  }
}

function clearCopyButtons(): void {
  // Clean up existing copy button instances
  for (const copyButton of copyButtons.values()) {
    copyButton.destroy();
  }
  copyButtons.clear();
}

function showLoadingState(): void {
  promptList.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>プロンプトを読み込んでいます...</p>
    </div>
  `;
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

function showSuccess(message: string): void {
  console.log('Success:', message);
  toast.success(message);
}

function showError(message: string): void {
  console.error('Error:', message);
  toast.error(message);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  clearCopyButtons();
});
