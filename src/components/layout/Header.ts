// Header Layout Component
// Clean Architecture - Presentation Layer

export interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  actions?: HTMLElement[];
  onSettingsClick?: () => void;
  className?: string;
}

export function createHeader(props: HeaderProps): HTMLElement {
  const header = document.createElement('header');
  header.className = getHeaderClasses(props);

  // Create container
  const container = document.createElement('div');
  container.className = 'flex items-center justify-between h-full px-4';

  // Left side - Logo and title
  const leftSide = document.createElement('div');
  leftSide.className = 'flex items-center space-x-3';

  if (props.showLogo !== false) {
    const logo = document.createElement('div');
    logo.className = 'flex items-center';
    logo.innerHTML = `
      <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
    `;
    leftSide.appendChild(logo);
  }

  if (props.title) {
    const title = document.createElement('h1');
    title.className = 'text-lg font-semibold text-gray-900';
    title.textContent = props.title;
    leftSide.appendChild(title);
  }

  container.appendChild(leftSide);

  // Right side - Actions
  const rightSide = document.createElement('div');
  rightSide.className = 'flex items-center space-x-2';

  // Add custom actions
  if (props.actions) {
    props.actions.forEach((action) => {
      rightSide.appendChild(action);
    });
  }

  // Add settings button
  if (props.onSettingsClick) {
    const settingsButton = document.createElement('button');
    settingsButton.className =
      'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';
    settingsButton.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    `;
    settingsButton.addEventListener('click', props.onSettingsClick);
    rightSide.appendChild(settingsButton);
  }

  container.appendChild(rightSide);
  header.appendChild(container);

  return header;
}

function getHeaderClasses(props: HeaderProps): string {
  const baseClasses = 'bg-white border-b border-gray-200 h-14';
  return `${baseClasses} ${props.className || ''}`;
}
