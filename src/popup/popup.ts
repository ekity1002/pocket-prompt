// Popup script for Pocket-Prompt Chrome Extension

import type { ChromeMessage, ChromeResponse } from '@/types';

console.log('Pocket-Prompt Popup loaded');

// DOM elements
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
const promptList = document.getElementById('promptList') as HTMLDivElement;
const addPromptBtn = document.getElementById('addPromptBtn') as HTMLButtonElement;

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
  const message: ChromeMessage = {
    type: 'GET_PROMPTS',
    requestId: generateRequestId(),
    timestamp: new Date(),
  };

  try {
    const response = await sendMessageToBackground(message);

    if (response.success && response.data) {
      const { prompts, totalCount } = response.data as {
        prompts: Array<{ id: string; title: string; content: string }>;
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
  prompts: Array<{ id: string; title: string; content: string }>,
  totalCount: number
): void {
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
        <div class="prompt-item" data-id="${prompt.id}">
          <div class="prompt-title">${escapeHtml(prompt.title)}</div>
          <div class="prompt-preview">${escapeHtml(prompt.content.substring(0, 50))}...</div>
        </div>
      `
    )
    .join('');

  promptList.innerHTML = promptsHtml;

  // Add click listeners to prompt items
  const promptItems = promptList.querySelectorAll('.prompt-item');
  for (const item of promptItems) {
    item.addEventListener('click', () => {
      const promptId = item.getAttribute('data-id');
      if (promptId) {
        copyPrompt(promptId);
      }
    });
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

    if (response.success) {
      showSuccess('プロンプトをコピーしました');
      // Update usage statistics
      await loadPrompts();
    } else {
      showError(response.error?.message || 'コピーに失敗しました');
    }
  } catch (error) {
    console.error('Failed to copy prompt:', error);
    showError('コピーに失敗しました');
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

function showSuccess(message: string): void {
  console.log('Success:', message);
  // TODO: Show toast notification
}

function showError(message: string): void {
  console.error('Error:', message);
  // TODO: Show error notification
}
