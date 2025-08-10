// Prompt Card Component
// Clean Architecture - Presentation Layer

import type { Prompt } from '@/types';

export interface PromptCardProps {
  prompt: Prompt;
  onEdit?: (prompt: Prompt) => void;
  onDelete?: (promptId: string) => void;
  onCopy?: (prompt: Prompt) => void;
  onUse?: (prompt: Prompt) => void;
  onToggleFavorite?: (promptId: string) => void;
  compact?: boolean;
  showActions?: boolean;
}

export function createPromptCard(props: PromptCardProps): HTMLElement {
  const card = document.createElement('div');
  card.className = getCardClasses(props);

  // Create header
  const header = document.createElement('div');
  header.className = 'flex items-start justify-between mb-2';

  // Title and metadata
  const titleSection = document.createElement('div');
  titleSection.className = 'flex-1 min-w-0';

  const title = document.createElement('h3');
  title.className = 'text-sm font-semibold text-gray-900 truncate';
  title.textContent = props.prompt.title;
  titleSection.appendChild(title);

  if (!props.compact) {
    const metadata = document.createElement('div');
    metadata.className = 'flex items-center mt-1 text-xs text-gray-500 space-x-2';

    // Usage count
    const usageCount = document.createElement('span');
    usageCount.textContent = `${props.prompt.metadata.usageCount} uses`;
    metadata.appendChild(usageCount);

    // Last used
    if (props.prompt.metadata.lastUsedAt) {
      const lastUsed = document.createElement('span');
      lastUsed.textContent = `• Last used ${formatDate(props.prompt.metadata.lastUsedAt)}`;
      metadata.appendChild(lastUsed);
    }

    titleSection.appendChild(metadata);
  }

  header.appendChild(titleSection);

  // Favorite button
  if (props.onToggleFavorite) {
    const favoriteButton = document.createElement('button');
    favoriteButton.className =
      'flex-shrink-0 p-1 text-gray-400 hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded';
    favoriteButton.innerHTML = props.prompt.metadata.isFavorite
      ? `<svg class="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
         </svg>`
      : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
         </svg>`;
    favoriteButton.addEventListener('click', () => props.onToggleFavorite?.(props.prompt.id));
    header.appendChild(favoriteButton);
  }

  card.appendChild(header);

  // Content preview
  if (!props.compact) {
    const content = document.createElement('p');
    content.className = 'text-sm text-gray-600 line-clamp-3 mb-3';
    content.textContent =
      props.prompt.content.length > 150
        ? `${props.prompt.content.substring(0, 150)}...`
        : props.prompt.content;
    card.appendChild(content);
  }

  // Tags
  if (props.prompt.tags.length > 0) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'flex flex-wrap gap-1 mb-3';

    props.prompt.tags.forEach((tag) => {
      const tagElement = document.createElement('span');
      tagElement.className = 'px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full';
      tagElement.textContent = tag;
      tagsContainer.appendChild(tagElement);
    });

    card.appendChild(tagsContainer);
  }

  // Actions
  if (props.showActions !== false) {
    const actions = document.createElement('div');
    actions.className = 'flex items-center justify-end space-x-2 pt-2 border-t border-gray-100';

    // Use button
    if (props.onUse) {
      const useButton = document.createElement('button');
      useButton.className =
        'px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';
      useButton.textContent = 'Use';
      useButton.addEventListener('click', () => props.onUse?.(props.prompt));
      actions.appendChild(useButton);
    }

    // Copy button
    if (props.onCopy) {
      const copyButton = document.createElement('button');
      copyButton.className =
        'px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';
      copyButton.textContent = 'Copy';
      copyButton.addEventListener('click', () => props.onCopy?.(props.prompt));
      actions.appendChild(copyButton);
    }

    // Edit button
    if (props.onEdit) {
      const editButton = document.createElement('button');
      editButton.className =
        'p-1.5 text-gray-400 hover:text-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';
      editButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
      `;
      editButton.addEventListener('click', () => props.onEdit?.(props.prompt));
      actions.appendChild(editButton);
    }

    // Delete button
    if (props.onDelete) {
      const deleteButton = document.createElement('button');
      deleteButton.className =
        'p-1.5 text-gray-400 hover:text-red-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500';
      deleteButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      `;
      deleteButton.addEventListener('click', () => props.onDelete?.(props.prompt.id));
      actions.appendChild(deleteButton);
    }

    card.appendChild(actions);
  }

  return card;
}

function getCardClasses(props: PromptCardProps): string {
  const baseClasses =
    'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200';
  const compactClass = props.compact ? 'p-3' : '';

  return `${baseClasses} ${compactClass}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}
