import { t } from '@/i18n';
import { createPlugin } from '@/utils';

import style from './style.css?inline';

const magGlassSvg = `
<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
  <path
    d="M16.296 16.996a8 8 0 11.707-.708l3.909 3.91-.707.707-3.909-3.909zM18 11a7 7 0 00-14 0 7 7 0 1014 0z"
    fill="currentColor"
    stroke="currentColor"
    stroke-width="0.5"
    fill-rule="evenodd"
    clip-rule="evenodd"
  />
</svg>`;

const templates = {
  'sidebarSearchWrapper': `
        <div id="ps4ytm-sidebar-wrapper" class="ps4ytm-wrapper">
            <span class="search-icon" aria-hidden="true">
                ${magGlassSvg}
            </span>
            <input type="text" class="ps4ytm-input" id="sidebar-playlist-search-input" placeholder="Search playlists" autocomplete="off">
        </div>
    `,
  'sidebar-no-playlists-message': `
       <div id="sidebar-no-playlists-message">No playlists found</div>
    `,
  'dialogSearchWrapper': `
        <div id="ps4ytm-dialog-wrapper" class="ps4ytm-wrapper">
            <span class="search-icon" aria-hidden="true">
                ${magGlassSvg}
            </span>
            <input type="text" class="ps4ytm-input" id="playlist-search-input" placeholder="Search playlists" autocomplete="off">
        </div>
    `,
  'dialog-no-playlists-message': `
        <div id="no-playlists-message">No playlists found</div>
    `,
};

const loadTemplate = (templateName: keyof typeof templates) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    templates[templateName].trim(),
    'text/html',
  );
  return doc.body.firstElementChild as HTMLElement;
};

let isDialogVisible = false;
let sidebarObserver: MutationObserver | null = null;
let dialogObserver: MutationObserver | null = null;
let boundFocusListener: ((e: KeyboardEvent) => void) | null = null;

function initializeSidebarPlaylistFilter() {
  const playlistSection = document.querySelector(
    'ytmusic-guide-section-renderer:nth-of-type(2)',
  );

  if (
    !playlistSection ||
    playlistSection.querySelector('#sidebar-playlist-search-input')
  ) {
    return;
  }

  const playlistsContainer = playlistSection.querySelector('#items');
  const recentItems = playlistSection.querySelectorAll(
    'ytmusic-guide-entry-renderer',
  );
  let insertAfterElement: Element | null = null;

  const newPlaylistButton = playlistSection.querySelector('#buttons');
  if (recentItems.length >= 4) {
    insertAfterElement = recentItems[3];
  } else if (newPlaylistButton) {
    insertAfterElement = newPlaylistButton;
  }

  if (!playlistsContainer || !insertAfterElement) {
    return;
  }

  const wrapper = loadTemplate('sidebarSearchWrapper');
  const searchInput = wrapper.querySelector(
    '#sidebar-playlist-search-input',
  ) as HTMLInputElement;
  const noResultsMessage = loadTemplate('sidebar-no-playlists-message');

  insertAfterElement.insertAdjacentElement('afterend', wrapper);
  playlistsContainer.insertAdjacentElement('afterend', noResultsMessage);

  const handleFilter = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value.toLowerCase().trim();

    const playlistItems = playlistsContainer.querySelectorAll(
      'ytmusic-guide-entry-renderer',
    );
    let visibleCount = 0;

    playlistItems.forEach((item, index) => {
      if (index < 4) return;
      const titleElement = item.querySelector('.title');

      if (titleElement) {
        const title = titleElement.textContent?.toLowerCase() || '';
        const isVisible = title.includes(searchTerm);
        (item as HTMLElement).style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
      }
    });

    if (searchTerm && visibleCount === 0) {
      noResultsMessage.style.display = 'block';
    } else {
      noResultsMessage.style.display = 'none';
    }
  };

  searchInput.addEventListener('input', handleFilter);
}

const initializePlaylistFilter = () => {
  const dialog = document.querySelector('ytmusic-add-to-playlist-renderer');
  if (!dialog || dialog.querySelector('#playlist-search-input')) {
    return;
  }

  const playlistsContainer = dialog.querySelector('#playlists');

  if (!playlistsContainer) {
    return;
  }

  const recentItems = playlistsContainer.querySelectorAll(
    'ytmusic-playlist-add-to-option-renderer',
  );
  let insertAfterElement: Element | null = null;

  if (recentItems.length >= 4) {
    insertAfterElement = recentItems[3];
  } else if (recentItems.length > 0) {
    insertAfterElement = recentItems[recentItems.length - 1];
  }

  const wrapper = loadTemplate('dialogSearchWrapper');
  const searchInput = wrapper.querySelector(
    '#playlist-search-input',
  ) as HTMLInputElement;
  const noResultsMessage = loadTemplate('dialog-no-playlists-message');

  if (insertAfterElement) {
      insertAfterElement.insertAdjacentElement('afterend', wrapper);
  } else {
      playlistsContainer.insertAdjacentElement('afterbegin', wrapper);
  }

  playlistsContainer.insertAdjacentElement('afterend', noResultsMessage);

  const handleFilter = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value.toLowerCase().trim();

    const playlistItems = playlistsContainer.querySelectorAll(
      'ytmusic-playlist-add-to-option-renderer',
    );
    let visibleCount = 0;

    playlistItems.forEach((item, index) => {
      if (index < 4) return;
      const titleElem = item.querySelector('#title');
      if (titleElem) {
        const title = titleElem.getAttribute('title')?.toLowerCase() || '';
        const isVisible = title.includes(searchTerm);
        (item as HTMLElement).style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
      }
    });

    if (searchTerm && visibleCount === 0) {
      noResultsMessage.style.display = 'block';
    } else {
      noResultsMessage.style.display = 'none';
    }
  };

  searchInput.addEventListener('input', handleFilter);
  searchInput.focus();
};

function checkDialogState() {
  const dialogElement = document.querySelector('tp-yt-paper-dialog:has(ytmusic-add-to-playlist-renderer)');
  const isNowVisible =
    dialogElement && (dialogElement as HTMLElement).style.display !== 'none';

  if (isNowVisible && !isDialogVisible) {
    isDialogVisible = true;
    window.dispatchEvent(new CustomEvent('playlistDialogDisplayed'));
  } else if (!isNowVisible && isDialogVisible) {
    isDialogVisible = false;
    window.dispatchEvent(new CustomEvent('playlistDialogHidden'));
  }
}

const resetFilter = () => {
  const searchInput = document.getElementById(
    'playlist-search-input',
  ) as HTMLInputElement;
  if (searchInput) {
    searchInput.value = '';
  }
  const noResultsMessage = document.getElementById('no-playlists-message');
  if (noResultsMessage) {
    noResultsMessage.style.display = 'none';
  }
  const playlistsContainer = document.getElementById('playlists');
  if (playlistsContainer) {
    playlistsContainer.style.display = '';
  }

  const playlistItems = document.querySelectorAll(
      'ytmusic-playlist-add-to-option-renderer',
  );
  playlistItems.forEach((item) => {
      (item as HTMLElement).style.display = '';
  });
};

export default createPlugin({
  name: () => t('plugins.playlist-search.name'),
  description: () => t('plugins.playlist-search.description'),
  restartNeeded: false,
  config: {
    enabled: false,
  },
  stylesheets: [style],
  renderer: {
    start() {
      setTimeout(initializeSidebarPlaylistFilter, 1000);

      sidebarObserver = new MutationObserver(() => {
        initializeSidebarPlaylistFilter();
      });

      sidebarObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      window.addEventListener(
        'playlistDialogDisplayed',
        initializePlaylistFilter,
      );
      window.addEventListener('playlistDialogHidden', resetFilter);

      dialogObserver = new MutationObserver(() => {
        checkDialogState();
      });
      // A better approach is to observe ytmusic-popup-container if it exists.
      const popupContainer = document.querySelector('ytmusic-popup-container') || document.body;
      dialogObserver.observe(popupContainer, {
        childList: true,
        subtree: true,
        attributeFilter: ['style'],
      });

      boundFocusListener = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
          const dialogSearchInput = document.getElementById(
            'playlist-search-input',
          ) as HTMLInputElement;
          const sidebarSearchInput = document.getElementById(
            'sidebar-playlist-search-input',
          ) as HTMLInputElement;

          if (isDialogVisible && dialogSearchInput && document.activeElement !== dialogSearchInput) {
              e.preventDefault();
              dialogSearchInput.focus();
          } else if (!isDialogVisible && sidebarSearchInput && document.activeElement !== sidebarSearchInput) {
            e.preventDefault();
            sidebarSearchInput.focus();
          }
        }
      };
      document.addEventListener('keydown', boundFocusListener);
    },
    stop() {
      if (sidebarObserver) sidebarObserver.disconnect();
      if (dialogObserver) dialogObserver.disconnect();

      window.removeEventListener(
        'playlistDialogDisplayed',
        initializePlaylistFilter,
      );
      window.removeEventListener('playlistDialogHidden', resetFilter);
      if (boundFocusListener) {
        document.removeEventListener('keydown', boundFocusListener);
      }

      document.getElementById('ps4ytm-sidebar-wrapper')?.remove();
      document.getElementById('sidebar-no-playlists-message')?.remove();
      document.getElementById('ps4ytm-dialog-wrapper')?.remove();
      document.getElementById('no-playlists-message')?.remove();

      const sidebarItems = document.querySelectorAll(
          'ytmusic-guide-entry-renderer',
      );
      sidebarItems.forEach((item) => {
          (item as HTMLElement).style.display = '';
      });

      const dialogItems = document.querySelectorAll(
          'ytmusic-playlist-add-to-option-renderer',
      );
      dialogItems.forEach((item) => {
          (item as HTMLElement).style.display = '';
      });
    },
  },
});
