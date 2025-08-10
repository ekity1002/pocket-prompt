// Sidebar Layout Component
// Clean Architecture - Presentation Layer

export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  active?: boolean;
  badge?: string | number;
}

export interface SidebarProps {
  items: SidebarItem[];
  isCollapsed?: boolean;
  onToggle?: () => void;
  className?: string;
  width?: string;
}

export function createSidebar(props: SidebarProps): HTMLElement {
  const sidebar = document.createElement('aside');
  sidebar.className = getSidebarClasses(props);

  if (props.width) {
    sidebar.style.width = props.width;
  }

  // Create header with toggle button
  if (props.onToggle) {
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between p-4 border-b border-gray-200';

    if (!props.isCollapsed) {
      const title = document.createElement('h2');
      title.className = 'font-semibold text-gray-900';
      title.textContent = 'Menu';
      header.appendChild(title);
    }

    const toggleButton = document.createElement('button');
    toggleButton.className =
      'p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded';
    toggleButton.innerHTML = props.isCollapsed
      ? `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
        </svg>
      `
      : `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
        </svg>
      `;
    toggleButton.addEventListener('click', props.onToggle);
    header.appendChild(toggleButton);

    sidebar.appendChild(header);
  }

  // Create navigation
  const nav = document.createElement('nav');
  nav.className = 'flex-1 p-2 space-y-1';

  props.items.forEach((item) => {
    const navItem = createSidebarItem(item, props.isCollapsed);
    nav.appendChild(navItem);
  });

  sidebar.appendChild(nav);

  return sidebar;
}

function createSidebarItem(item: SidebarItem, isCollapsed?: boolean): HTMLElement {
  const button = document.createElement('button');
  button.className = getSidebarItemClasses(item);
  button.addEventListener('click', item.onClick);

  const content = document.createElement('div');
  content.className = 'flex items-center';

  // Add icon
  if (item.icon) {
    const icon = document.createElement('div');
    icon.className = `flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`;
    icon.innerHTML = item.icon;
    content.appendChild(icon);
  }

  // Add label (hidden when collapsed)
  if (!isCollapsed) {
    const label = document.createElement('span');
    label.className = 'flex-1 text-left';
    label.textContent = item.label;
    content.appendChild(label);

    // Add badge
    if (item.badge) {
      const badge = document.createElement('span');
      badge.className =
        'ml-2 px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full';
      badge.textContent = item.badge.toString();
      content.appendChild(badge);
    }
  }

  button.appendChild(content);

  // Tooltip for collapsed state
  if (isCollapsed) {
    button.title = item.label;
  }

  return button;
}

function getSidebarClasses(props: SidebarProps): string {
  const baseClasses = 'flex flex-col bg-white border-r border-gray-200 transition-all duration-200';
  const widthClass = props.isCollapsed ? 'w-16' : 'w-64';

  return `${baseClasses} ${widthClass} ${props.className || ''}`;
}

function getSidebarItemClasses(item: SidebarItem): string {
  const baseClasses =
    'w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500';

  const stateClasses = item.active
    ? 'bg-primary-100 text-primary-900'
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';

  return `${baseClasses} ${stateClasses}`;
}
