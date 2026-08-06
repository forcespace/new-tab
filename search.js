const form = document.querySelector('.js-search-form');
const input = form.querySelector('.js-search-input');
const themeSelect = document.querySelector('.js-theme-select');
const defaultSearchEngineSelect = document.querySelector('.js-default-search-engine-select');
const uiFontSizeSelect = document.querySelector('.js-ui-font-size-select');
const uiFontFamilySelect = document.querySelector('.js-ui-font-family-select');
const searchEngineFilters = document.querySelector('.js-search-engine-filters');
const suggestionsContainer = document.querySelector('.js-search-suggestions');
const bookmarksTreeContainer = document.querySelector('.js-bookmarks-tree');
const ideMain = document.querySelector('.ide-main');
const toolWindow = document.querySelector('.tool-window');
const toolWindowTitle = document.querySelector('.js-tool-window-title');
const toolWindowToggle = document.querySelector('.js-tool-window-toggle');
const toolWindowStripe = document.querySelector('.js-tool-window-stripe');
const toolWindowResizer = document.querySelector('.js-tool-window-resizer');
const bookmarkContextMenu = document.querySelector('.js-bookmark-context-menu');
const resetSearchPopupLayoutButton = document.querySelector('.js-reset-search-popup-layout');
const editorTabs = document.querySelectorAll('.js-editor-tab');
const editorPanes = document.querySelectorAll('.js-editor-pane');
const THEME_STORAGE_KEY = 'new-tab-theme';
const SEARCH_HISTORY_STORAGE_KEY = 'new-tab-search-history';
const TOOL_WINDOW_COLLAPSED_STORAGE_KEY = 'new-tab-tool-window-collapsed';
const TOOL_WINDOW_WIDTH_STORAGE_KEY = 'new-tab-tool-window-width';
const BOOKMARKS_EXPANDED_STORAGE_KEY = 'new-tab-bookmarks-expanded-folders';
const DEFAULT_SEARCH_ENGINE_STORAGE_KEY = 'new-tab-default-search-engine';
const UI_FONT_SIZE_STORAGE_KEY = 'new-tab-ui-font-size';
const UI_FONT_FAMILY_STORAGE_KEY = 'new-tab-ui-font-family';
const SEARCH_POPUP_POSITION_STORAGE_KEY = 'new-tab-search-popup-position';
const DEFAULT_THEME = 'islands-dark';
const DEFAULT_SEARCH_ENGINE = 'yandex';
const DEFAULT_TOOL_WINDOW_WIDTH = 238;
const MIN_TOOL_WINDOW_WIDTH = 180;
const MAX_TOOL_WINDOW_WIDTH_RATIO = 0.55;
const DEFAULT_UI_FONT_SIZE = 'default';
const DEFAULT_UI_FONT_FAMILY = 'system';
const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE = 180;
const SEARCH_HISTORY_LIMIT = 12;
const DOUBLE_SHIFT_THRESHOLD = 500;
const BOOKMARK_FOLDER_ANIMATION_DURATION = 300;
const FALLBACK_SUFFIXES = [
    'официальный сайт',
    'документация',
    'github',
    'stackoverflow',
    'примеры',
    'на русском',
];

let suggestionAbortController = null;
let suggestionDebounceTimer = null;
let toolWindowResizeState = null;
let bookmarksRefreshTimer = null;
let expandedBookmarkFolderIds = new Set();
const bookmarkFaviconUrlsCache = new Map();
const bookmarkChildrenAnimationCleanups = new WeakMap();
let hasBookmarksExpansionState = false;
let shouldResetBookmarkFoldersOnOpen = false;
let lastShiftPressedAt = 0;
let currentSearchEngine = DEFAULT_SEARCH_ENGINE;

const THEMES = new Set([
    'islands-dark',
    'islands-light',
    'islands-darcula',
    'dark',
    'light',
    'light-header',
    'darcula',
    'high-contrast',
]);

const LEGACY_THEMES = {
    dark: 'islands-dark',
    light: 'islands-light',
};

const MODIFIERS = {
    yandex: {
        label: 'Яндекс',
        formAction: 'https://yandex.ru/search/',
        inputName: 'text',
        engineColor: '#fc0',
        suggestionUrl: (query) => `https://suggest.yandex.ru/suggest-ff.cgi?part=${encodeURIComponent(query)}`,
    },
    google: {
        label: 'Google',
        formAction: 'https://www.google.com/search',
        inputName: 'q',
        engineColor: '#4285f4',
        suggestionUrl: (query) => `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
    },
    bing: {
        label: 'Bing',
        formAction: 'https://www.bing.com/search',
        inputName: 'q',
        engineColor: '#008373',
    },
    duckduckgo: {
        label: 'DuckDuckGo',
        formAction: 'https://duckduckgo.com/',
        inputName: 'q',
        engineColor: '#de5833',
    },
    yahoo: {
        label: 'Yahoo',
        formAction: 'https://search.yahoo.com/search',
        inputName: 'p',
        engineColor: '#6001d2',
    },
    brave: {
        label: 'Brave',
        formAction: 'https://search.brave.com/search',
        inputName: 'q',
        engineColor: '#fb542b',
    },
    startpage: {
        label: 'Startpage',
        formAction: 'https://www.startpage.com/sp/search',
        inputName: 'query',
        engineColor: '#6573ff',
    },
    ecosia: {
        label: 'Ecosia',
        formAction: 'https://www.ecosia.org/search',
        inputName: 'q',
        engineColor: '#008009',
    },
    baidu: {
        label: 'Baidu',
        formAction: 'https://www.baidu.com/s',
        inputName: 'wd',
        engineColor: '#2932e1',
    },
    naver: {
        label: 'Naver',
        formAction: 'https://search.naver.com/search.naver',
        inputName: 'query',
        engineColor: '#03c75a',
    },
    qwant: {
        label: 'Qwant',
        formAction: 'https://www.qwant.com/',
        inputName: 'q',
        engineColor: '#5c97ff',
    },
    you: {
        label: 'You.com',
        formAction: 'https://you.com/search',
        inputName: 'q',
        engineColor: '#7c3aed',
    }
};

const UI_FONT_SIZES = new Set(['compact', 'default', 'large', 'extra-large']);
const UI_FONT_FAMILIES = new Set(['system', 'inter', 'segoe', 'arial', 'mono']);

function getInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = LEGACY_THEMES[savedTheme] || savedTheme;

    return THEMES.has(theme) ? theme : DEFAULT_THEME;
}

function getInitialSearchEngine() {
    const savedEngine = localStorage.getItem(DEFAULT_SEARCH_ENGINE_STORAGE_KEY);

    return MODIFIERS[savedEngine] ? savedEngine : DEFAULT_SEARCH_ENGINE;
}

function getInitialUiFontSize() {
    const savedFontSize = localStorage.getItem(UI_FONT_SIZE_STORAGE_KEY);

    return UI_FONT_SIZES.has(savedFontSize) ? savedFontSize : DEFAULT_UI_FONT_SIZE;
}

function getInitialUiFontFamily() {
    const savedFontFamily = localStorage.getItem(UI_FONT_FAMILY_STORAGE_KEY);

    return UI_FONT_FAMILIES.has(savedFontFamily) ? savedFontFamily : DEFAULT_UI_FONT_FAMILY;
}

function populateSearchEngineControls() {
    const options = Object.entries(MODIFIERS).map(([value, { label }]) => {
        const option = document.createElement('option');

        option.value = value;
        option.textContent = label;

        return option;
    });

    defaultSearchEngineSelect.replaceChildren(...options.map((option) => option.cloneNode(true)));
    searchEngineFilters.replaceChildren(...Object.entries(MODIFIERS).map(([engine, { label, engineColor }]) => {
        const filter = document.createElement('button');
        const marker = document.createElement('span');

        filter.className = 'search-filter js-search-engine-filter';
        filter.type = 'button';
        filter.dataset.engine = engine;
        filter.setAttribute('aria-pressed', 'false');
        marker.className = 'search-filter-marker';
        marker.style.backgroundColor = engineColor;
        filter.append(marker, label);
        filter.addEventListener('click', () => {
            setSearchEngine(engine);
            input.focus();
        });

        return filter;
    }));
}

function setTheme(theme) {
    if (!THEMES.has(theme)) return;

    document.body.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    themeSelect.value = theme;
}

function setUiFontSize(fontSize) {
    if (!UI_FONT_SIZES.has(fontSize)) return;

    document.body.dataset.uiFontSize = fontSize;
    localStorage.setItem(UI_FONT_SIZE_STORAGE_KEY, fontSize);
    uiFontSizeSelect.value = fontSize;
}

function setUiFontFamily(fontFamily) {
    if (!UI_FONT_FAMILIES.has(fontFamily)) return;

    document.body.dataset.uiFontFamily = fontFamily;
    localStorage.setItem(UI_FONT_FAMILY_STORAGE_KEY, fontFamily);
    uiFontFamilySelect.value = fontFamily;
}

function setDefaultSearchEngine(engine) {
    if (!MODIFIERS[engine]) return;

    localStorage.setItem(DEFAULT_SEARCH_ENGINE_STORAGE_KEY, engine);
    defaultSearchEngineSelect.value = engine;
    setSearchEngine(engine);
}

function setSearchEngine(engine) {
    if (!MODIFIERS[engine]) return;

    currentSearchEngine = engine;
    updateStyles(engine);
    updateFormAttributes(engine);
    scheduleSuggestionsUpdate();
}

function setActiveTab(tab) {
    editorTabs.forEach((editorTab) => {
        const isActive = editorTab.dataset.tab === tab;

        editorTab.classList.toggle('editor-tab--active', isActive);
        editorTab.setAttribute('aria-selected', String(isActive));
    });

    editorPanes.forEach((editorPane) => {
        editorPane.classList.toggle('editor-pane--active', editorPane.dataset.pane === tab);
    });
}

function resetUiSettings() {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(UI_FONT_SIZE_STORAGE_KEY);
    localStorage.removeItem(UI_FONT_FAMILY_STORAGE_KEY);
    localStorage.removeItem(DEFAULT_SEARCH_ENGINE_STORAGE_KEY);
    localStorage.removeItem(SEARCH_POPUP_POSITION_STORAGE_KEY);
    setTheme(DEFAULT_THEME);
    setUiFontSize(DEFAULT_UI_FONT_SIZE);
    setUiFontFamily(DEFAULT_UI_FONT_FAMILY);
    setDefaultSearchEngine(DEFAULT_SEARCH_ENGINE);
    setActiveTab('search');
    input.focus();
}

function focusSearchInput() {
    setActiveTab('search');
    input.focus();
}

function onGlobalKeydown(event) {
    if (event.key === 'Escape') {
        hideBookmarkContextMenu();
        return;
    }

    if (event.key !== 'Shift' || event.repeat) return;

    const now = Date.now();

    if (now - lastShiftPressedAt <= DOUBLE_SHIFT_THRESHOLD) {
        event.preventDefault();
        focusSearchInput();
        lastShiftPressedAt = 0;
        return;
    }

    lastShiftPressedAt = now;
}

function getSearchHistory() {
    try {
        const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY));

        if (!Array.isArray(history)) return [];

        return history.filter((item) => (
            item &&
            typeof item.query === 'string' &&
            typeof item.engine === 'string'
        ));
    } catch (error) {
        return [];
    }
}

function saveSearchHistory(history) {
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, SEARCH_HISTORY_LIMIT)));
}

function updateToolWindowLabels() {
    const isCollapsed = ideMain.classList.contains('ide-main--tool-window-collapsed');
    const collapsedAction = isCollapsed ? 'Развернуть навигацию' : 'Свернуть навигацию';

    toolWindowTitle.textContent = 'Bookmarks';
    toolWindowStripe.textContent = 'Bookmarks';
    toolWindowStripe.setAttribute('aria-label', 'Развернуть навигацию');
    toolWindowToggle.setAttribute('aria-label', collapsedAction);
}

function setToolWindowCollapsed(isCollapsed) {
    const wasCollapsed = ideMain.classList.contains('ide-main--tool-window-collapsed');

    ideMain.classList.toggle('ide-main--tool-window-collapsed', isCollapsed);
    localStorage.setItem(TOOL_WINDOW_COLLAPSED_STORAGE_KEY, String(isCollapsed));
    updateToolWindowLabels();

    if (isCollapsed) {
        collapseAllBookmarkFolders();
    } else if (wasCollapsed) {
        shouldResetBookmarkFoldersOnOpen = true;
        renderBookmarksTree();
    }
}

function getMaxToolWindowWidth() {
    return Math.max(MIN_TOOL_WINDOW_WIDTH, Math.floor(window.innerWidth * MAX_TOOL_WINDOW_WIDTH_RATIO));
}

function clampToolWindowWidth(width) {
    return Math.min(Math.max(width, MIN_TOOL_WINDOW_WIDTH), getMaxToolWindowWidth());
}

function setToolWindowWidth(width, shouldSave = true) {
    const nextWidth = clampToolWindowWidth(width);

    ideMain.style.setProperty('--tool-window-width', `${nextWidth}px`);

    if (shouldSave) {
        localStorage.setItem(TOOL_WINDOW_WIDTH_STORAGE_KEY, String(nextWidth));
    }

    return nextWidth;
}

function initToolWindowWidth() {
    const savedWidth = Number(localStorage.getItem(TOOL_WINDOW_WIDTH_STORAGE_KEY));
    const width = Number.isFinite(savedWidth) && savedWidth > 0 ? savedWidth : DEFAULT_TOOL_WINDOW_WIDTH;

    setToolWindowWidth(width, false);
}

function onToolWindowResizePointerMove(event) {
    if (!toolWindowResizeState) return;

    const nextWidth = toolWindowResizeState.startWidth + event.clientX - toolWindowResizeState.pointerX;

    setToolWindowWidth(nextWidth, false);
}

function stopToolWindowResize() {
    if (!toolWindowResizeState) return;

    const width = parseFloat(getComputedStyle(ideMain).getPropertyValue('--tool-window-width'));

    setToolWindowWidth(width);
    ideMain.classList.remove('ide-main--resizing-tool-window');

    if (toolWindowResizer.hasPointerCapture(toolWindowResizeState.pointerId)) {
        toolWindowResizer.releasePointerCapture(toolWindowResizeState.pointerId);
    }

    toolWindowResizeState = null;
}

function startToolWindowResize(event) {
    if (window.matchMedia('(max-width: 560px)').matches) return;

    event.preventDefault();
    setToolWindowCollapsed(false);

    toolWindowResizeState = {
        pointerId: event.pointerId,
        pointerX: event.clientX,
        startWidth: parseFloat(getComputedStyle(ideMain).getPropertyValue('--tool-window-width')) || DEFAULT_TOOL_WINDOW_WIDTH,
    };

    ideMain.classList.add('ide-main--resizing-tool-window');
    toolWindowResizer.setPointerCapture(event.pointerId);
}

function getBookmarksApi() {
    return globalThis.chrome?.bookmarks || globalThis.browser?.bookmarks || null;
}

function getBookmarksUnavailableMessage() {
    if (!globalThis.chrome && !globalThis.browser) {
        return 'Open as Chrome extension';
    }

    return 'Reload extension to allow bookmarks';
}

function loadExpandedBookmarkFolders() {
    try {
        const folderIds = JSON.parse(localStorage.getItem(BOOKMARKS_EXPANDED_STORAGE_KEY));

        if (!Array.isArray(folderIds)) return;

        expandedBookmarkFolderIds = new Set(folderIds.filter((folderId) => typeof folderId === 'string'));
        hasBookmarksExpansionState = true;
    } catch (error) {
        expandedBookmarkFolderIds = new Set();
        hasBookmarksExpansionState = false;
    }
}

function saveExpandedBookmarkFolders() {
    localStorage.setItem(BOOKMARKS_EXPANDED_STORAGE_KEY, JSON.stringify([...expandedBookmarkFolderIds]));
}

function getBookmarkChildrenCount(node) {
    if (!Array.isArray(node.children)) return 0;

    return node.children.length;
}

function collectDefaultExpandedBookmarkFolders(nodes) {
    if (hasBookmarksExpansionState) return;

    const rootChildren = nodes?.[0]?.children || [];

    rootChildren
        .filter((node) => Array.isArray(node.children))
        .forEach((node) => expandedBookmarkFolderIds.add(node.id));

    hasBookmarksExpansionState = true;
    saveExpandedBookmarkFolders();
}

function getBookmarksBarFolder(rootChildren) {
    const folders = rootChildren.filter((node) => Array.isArray(node.children));

    return folders.find((node) => node.id === '1') ||
        folders.find((node) => /^(bookmarks bar|панель закладок)$/i.test(node.title || '')) ||
        folders[0] ||
        null;
}

function expandBookmarksBarFolderOnly(nodes) {
    const rootChildren = nodes?.[0]?.children || [];
    const bookmarksBarFolder = getBookmarksBarFolder(rootChildren);

    expandedBookmarkFolderIds = bookmarksBarFolder ? new Set([bookmarksBarFolder.id]) : new Set();
    hasBookmarksExpansionState = true;
    saveExpandedBookmarkFolders();
}

function collectBookmarkFolderIds(nodes, folderIds = new Set()) {
    (nodes || []).forEach((node) => {
        if (!Array.isArray(node.children)) return;

        folderIds.add(node.id);
        collectBookmarkFolderIds(node.children, folderIds);
    });

    return folderIds;
}

function collapseBookmarkFolder(node) {
    expandedBookmarkFolderIds.delete(node.id);
    collectBookmarkFolderIds(node.children).forEach((folderId) => {
        expandedBookmarkFolderIds.delete(folderId);
    });
}

function collapseAllBookmarkFolders() {
    if (!expandedBookmarkFolderIds.size) return;

    expandedBookmarkFolderIds.clear();
    saveExpandedBookmarkFolders();
    renderBookmarksTree();
}

function syncExpandedBookmarkFolders(nodes) {
    const folderIds = collectBookmarkFolderIds(nodes);
    const nextExpandedFolderIds = new Set(
        [...expandedBookmarkFolderIds].filter((folderId) => folderIds.has(folderId))
    );

    if (nextExpandedFolderIds.size === expandedBookmarkFolderIds.size) return;

    expandedBookmarkFolderIds = nextExpandedFolderIds;
    saveExpandedBookmarkFolders();
}

function setBookmarksEmptyState(message) {
    const emptyState = document.createElement('div');

    emptyState.className = 'tree-item tree-item--empty';
    emptyState.textContent = message;
    bookmarksTreeContainer.replaceChildren(emptyState);
}

function getBookmarksTree() {
    const bookmarksApi = getBookmarksApi();

    if (!bookmarksApi) {
        return Promise.resolve(null);
    }

    if (globalThis.browser?.bookmarks === bookmarksApi) {
        return bookmarksApi.getTree();
    }

    return new Promise((resolve, reject) => {
        try {
            bookmarksApi.getTree((tree) => {
                const runtimeError = globalThis.chrome?.runtime?.lastError;

                if (runtimeError) {
                    reject(new Error(runtimeError.message));
                    return;
                }

                resolve(tree);
            });
        } catch (error) {
            reject(error);
        }
    });
}

function updateBookmarkNode(id, changes) {
    const bookmarksApi = getBookmarksApi();

    if (!bookmarksApi) {
        return Promise.reject(new Error('Bookmarks API unavailable'));
    }

    if (globalThis.browser?.bookmarks === bookmarksApi) {
        return bookmarksApi.update(id, changes);
    }

    return new Promise((resolve, reject) => {
        bookmarksApi.update(id, changes, (node) => {
            const runtimeError = globalThis.chrome?.runtime?.lastError;

            if (runtimeError) {
                reject(new Error(runtimeError.message));
                return;
            }

            resolve(node);
        });
    });
}

function moveBookmarkNode(id, destination) {
    const bookmarksApi = getBookmarksApi();

    if (!bookmarksApi) {
        return Promise.reject(new Error('Bookmarks API unavailable'));
    }

    if (globalThis.browser?.bookmarks === bookmarksApi) {
        return bookmarksApi.move(id, destination);
    }

    return new Promise((resolve, reject) => {
        bookmarksApi.move(id, destination, (node) => {
            const runtimeError = globalThis.chrome?.runtime?.lastError;

            if (runtimeError) {
                reject(new Error(runtimeError.message));
                return;
            }

            resolve(node);
        });
    });
}

function createBookmarkNode(createDetails) {
    const bookmarksApi = getBookmarksApi();

    if (!bookmarksApi) {
        return Promise.reject(new Error('Bookmarks API unavailable'));
    }

    if (globalThis.browser?.bookmarks === bookmarksApi) {
        return bookmarksApi.create(createDetails);
    }

    return new Promise((resolve, reject) => {
        bookmarksApi.create(createDetails, (node) => {
            const runtimeError = globalThis.chrome?.runtime?.lastError;

            if (runtimeError) {
                reject(new Error(runtimeError.message));
                return;
            }

            resolve(node);
        });
    });
}

function removeBookmarkNode(node) {
    const bookmarksApi = getBookmarksApi();
    const isFolder = Array.isArray(node.children);
    const isEmptyFolder = isFolder && node.children.length === 0;

    if (!bookmarksApi) {
        return Promise.reject(new Error('Bookmarks API unavailable'));
    }

    if (globalThis.browser?.bookmarks === bookmarksApi) {
        return isFolder && !isEmptyFolder ? bookmarksApi.removeTree(node.id) : bookmarksApi.remove(node.id);
    }

    return new Promise((resolve, reject) => {
        const removeCallback = () => {
            const runtimeError = globalThis.chrome?.runtime?.lastError;

            if (runtimeError) {
                reject(new Error(runtimeError.message));
                return;
            }

            resolve();
        };

        if (isFolder && !isEmptyFolder) {
            bookmarksApi.removeTree(node.id, removeCallback);
        } else {
            bookmarksApi.remove(node.id, removeCallback);
        }
    });
}

function collectBookmarkUrls(node) {
    if (node.url) return [node.url];

    return (node.children || []).flatMap(collectBookmarkUrls);
}

function openUrlInCurrentTab(url) {
    window.location.href = url;
}

function openUrlsInNewTabs(urls) {
    urls.forEach((url) => {
        if (globalThis.chrome?.tabs?.create) {
            chrome.tabs.create({ url });
            return;
        }

        window.open(url, '_blank', 'noopener');
    });
}

function openUrlsInNewWindow(urls) {
    if (!urls.length) return;

    if (globalThis.chrome?.windows?.create) {
        chrome.windows.create({ url: urls });
        return;
    }

    openUrlsInNewTabs(urls);
}

function openUrlsInIncognitoWindow(urls) {
    if (!urls.length) return;

    if (globalThis.chrome?.windows?.create) {
        chrome.windows.create({ url: urls, incognito: true });
        return;
    }

    openUrlsInNewWindow(urls);
}

function openBookmarkManager() {
    openUrlsInNewTabs(['chrome://bookmarks/']);
}

async function copyBookmarkUrl(url) {
    if (!navigator.clipboard?.writeText) return;

    await navigator.clipboard.writeText(url);
}

function getBookmarkCreateParentId(node) {
    if (Array.isArray(node.children)) {
        return node.id;
    }

    return node.parentId;
}

async function addBookmarkToNode(node) {
    const parentId = getBookmarkCreateParentId(node);
    const nextUrl = window.prompt('URL', 'https://');

    if (nextUrl === null) return;

    const trimmedUrl = nextUrl.trim();

    if (!trimmedUrl) return;

    const nextTitle = window.prompt('Name', trimmedUrl);

    if (nextTitle === null) return;

    await createBookmarkNode({
        parentId,
        title: nextTitle.trim() || trimmedUrl,
        url: trimmedUrl,
    });

    expandedBookmarkFolderIds.add(parentId);
    saveExpandedBookmarkFolders();
}

async function addFolderToNode(node) {
    const parentId = getBookmarkCreateParentId(node);
    const nextTitle = window.prompt('Folder name', 'New Folder');

    if (nextTitle === null) return;

    const title = nextTitle.trim();

    if (!title) return;

    const folder = await createBookmarkNode({
        parentId,
        title,
    });

    expandedBookmarkFolderIds.add(parentId);
    expandedBookmarkFolderIds.add(folder.id);
    saveExpandedBookmarkFolders();
}

async function sortBookmarkFolderByName(node) {
    if (!Array.isArray(node.children) || node.children.length < 2) return;

    const sortedChildren = [...node.children].sort((firstNode, secondNode) => {
        const firstTitle = firstNode.title || firstNode.url || '';
        const secondTitle = secondNode.title || secondNode.url || '';

        return firstTitle.localeCompare(secondTitle, undefined, {
            numeric: true,
            sensitivity: 'base',
        });
    });

    for (const [index, child] of sortedChildren.entries()) {
        await moveBookmarkNode(child.id, {
            parentId: node.id,
            index,
        });
    }
}

async function editBookmarkNode(node) {
    const nextTitle = window.prompt('Name', node.title || '');

    if (nextTitle === null) return;

    if (node.url) {
        const nextUrl = window.prompt('URL', node.url);

        if (nextUrl === null) return;

        await updateBookmarkNode(node.id, {
            title: nextTitle.trim() || node.title || nextUrl,
            url: nextUrl.trim() || node.url,
        });
        return;
    }

    await updateBookmarkNode(node.id, {
        title: nextTitle.trim() || node.title || 'Folder',
    });
}

async function deleteBookmarkNode(node) {
    const label = node.title || node.url || 'bookmark';
    const message = Array.isArray(node.children)
        ? `Delete folder "${label}" and all bookmarks inside?`
        : `Delete bookmark "${label}"?`;

    if (!window.confirm(message)) return;

    await removeBookmarkNode(node);
}

function hideBookmarkContextMenu() {
    bookmarkContextMenu.hidden = true;
    bookmarkContextMenu.replaceChildren();
}

function createBookmarkContextMenuItem(label, action) {
    const item = document.createElement('button');

    item.className = 'bookmark-context-menu-item';
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.textContent = label;
    item.addEventListener('click', async (event) => {
        event.stopPropagation();
        hideBookmarkContextMenu();

        try {
            await action();
            scheduleBookmarksTreeUpdate();
        } catch (error) {
            window.alert(error.message || 'Bookmark action failed');
            scheduleBookmarksTreeUpdate();
        }
    });

    return item;
}

function createBookmarkContextMenuSeparator() {
    const separator = document.createElement('div');

    separator.className = 'bookmark-context-menu-separator';
    separator.setAttribute('role', 'separator');

    return separator;
}

function canRenameBookmarkNode(node) {
    return !node.unmodifiable && node.parentId !== '0';
}

function canDeleteBookmarkNode(node) {
    return !node.unmodifiable;
}

function compactContextMenuItems(items) {
    return items.filter((item, index, list) => {
        const isSeparator = item.classList.contains('bookmark-context-menu-separator');
        const previousItem = list[index - 1];
        const nextItem = list[index + 1];

        if (!isSeparator) return true;

        return Boolean(previousItem && nextItem) &&
            !previousItem.classList.contains('bookmark-context-menu-separator') &&
            !nextItem.classList.contains('bookmark-context-menu-separator');
    });
}

function getBookmarkContextMenuItems(node) {
    const urls = collectBookmarkUrls(node);
    const isFolder = Array.isArray(node.children);
    const canRename = canRenameBookmarkNode(node);
    const canDelete = canDeleteBookmarkNode(node);
    const canCreate = Boolean(getBookmarkCreateParentId(node));

    if (isFolder) {
        return compactContextMenuItems([
            createBookmarkContextMenuItem('Open All', () => openUrlsInNewTabs(urls)),
            createBookmarkContextMenuItem('Open All in New Window', () => openUrlsInNewWindow(urls)),
            createBookmarkContextMenuItem('Open All in Incognito Window', () => openUrlsInIncognitoWindow(urls)),
            createBookmarkContextMenuSeparator(),
            ...(canCreate ? [
                createBookmarkContextMenuItem('Add Bookmark...', () => addBookmarkToNode(node)),
                createBookmarkContextMenuItem('Add Folder...', () => addFolderToNode(node)),
            ] : []),
            createBookmarkContextMenuSeparator(),
            ...(node.children.length > 1 ? [
                createBookmarkContextMenuItem('Sort by Name', () => sortBookmarkFolderByName(node)),
            ] : []),
            createBookmarkContextMenuSeparator(),
            ...(canRename ? [createBookmarkContextMenuItem('Rename Folder', () => editBookmarkNode(node))] : []),
            ...(canDelete ? [createBookmarkContextMenuItem('Delete Folder', () => deleteBookmarkNode(node))] : []),
            createBookmarkContextMenuSeparator(),
            createBookmarkContextMenuItem('Bookmark Manager', openBookmarkManager),
        ]);
    }

    return compactContextMenuItems([
        createBookmarkContextMenuItem('Open', () => openUrlInCurrentTab(node.url)),
        createBookmarkContextMenuItem('Open in New Tab', () => openUrlsInNewTabs([node.url])),
        createBookmarkContextMenuItem('Open in New Window', () => openUrlsInNewWindow([node.url])),
        createBookmarkContextMenuItem('Open in Incognito Window', () => openUrlsInIncognitoWindow([node.url])),
        createBookmarkContextMenuSeparator(),
        ...(canCreate ? [
            createBookmarkContextMenuItem('Add Bookmark...', () => addBookmarkToNode(node)),
            createBookmarkContextMenuItem('Add Folder...', () => addFolderToNode(node)),
        ] : []),
        createBookmarkContextMenuSeparator(),
        createBookmarkContextMenuItem('Copy URL', () => copyBookmarkUrl(node.url)),
        ...(canRename ? [createBookmarkContextMenuItem('Edit', () => editBookmarkNode(node))] : []),
        ...(canDelete ? [createBookmarkContextMenuItem('Delete', () => deleteBookmarkNode(node))] : []),
        createBookmarkContextMenuSeparator(),
        createBookmarkContextMenuItem('Bookmark Manager', openBookmarkManager),
    ]);
}

function positionBookmarkContextMenu(x, y) {
    const margin = 6;
    const menuRect = bookmarkContextMenu.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - menuRect.width - margin);
    const top = Math.min(y, window.innerHeight - menuRect.height - margin);

    bookmarkContextMenu.style.left = `${Math.max(margin, left)}px`;
    bookmarkContextMenu.style.top = `${Math.max(margin, top)}px`;
}

function showBookmarkContextMenu(event, node) {
    event.preventDefault();
    event.stopPropagation();

    const items = getBookmarkContextMenuItems(node).filter(Boolean);

    if (!items.length) return;

    bookmarkContextMenu.replaceChildren(...items);
    bookmarkContextMenu.hidden = false;
    positionBookmarkContextMenu(event.clientX, event.clientY);
}

function getBookmarkFaviconUrls(url) {
    if (bookmarkFaviconUrlsCache.has(url)) {
        return bookmarkFaviconUrlsCache.get(url);
    }

    const urls = [];
    const faviconBaseUrl = globalThis.chrome?.runtime?.getURL?.('/_favicon/');

    if (faviconBaseUrl) {
        [url, getBookmarkUrlOrigin(url)]
            .filter(Boolean)
            .forEach((pageUrl) => {
                [16, 32].forEach((size) => {
                    urls.push(`${faviconBaseUrl}?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`);
                });
            });
    }

    const uniqueUrls = [...new Set(urls)];

    bookmarkFaviconUrlsCache.set(url, uniqueUrls);

    return uniqueUrls;
}

function getBookmarkUrlOrigin(url) {
    try {
        const parsedUrl = new URL(url);

        return parsedUrl.origin;
    } catch (error) {
        return '';
    }
}

function setBookmarkFolderExpandedState(wrapper, row, isExpanded) {
    const disclosure = row.querySelector('.tree-disclosure');

    wrapper.classList.toggle('bookmark-folder--expanded', isExpanded);
    row.setAttribute('aria-expanded', String(isExpanded));

    if (disclosure) {
        disclosure.textContent = '›';
    }
}

function animateBookmarkChildren(children, isExpanded, onAnimationEnd) {
    const previousCleanup = bookmarkChildrenAnimationCleanups.get(children);

    if (previousCleanup) {
        previousCleanup();
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        children.hidden = !isExpanded;
        children.style.height = '';
        children.style.opacity = '';
        onAnimationEnd?.();
        return;
    }

    let timeoutId = 0;

    const finishAnimation = () => {
        children.removeEventListener('transitionend', handleTransitionEnd);
        clearTimeout(timeoutId);
        bookmarkChildrenAnimationCleanups.delete(children);
        children.classList.remove('bookmark-children--animating');
        children.style.height = '';
        children.style.opacity = '';

        if (!isExpanded) {
            children.hidden = true;
        }

        onAnimationEnd?.();
    };
    const cleanup = () => {
        children.removeEventListener('transitionend', handleTransitionEnd);
        clearTimeout(timeoutId);
        bookmarkChildrenAnimationCleanups.delete(children);
        children.classList.remove('bookmark-children--animating');
    };

    function handleTransitionEnd(event) {
        if (event.target !== children || event.propertyName !== 'height') return;

        finishAnimation();
    }

    bookmarkChildrenAnimationCleanups.set(children, cleanup);
    children.classList.add('bookmark-children--animating');

    if (isExpanded) {
        children.hidden = false;
        children.style.height = '0px';
        children.style.opacity = '0';
        void children.offsetHeight;
        children.style.height = `${children.scrollHeight}px`;
        children.style.opacity = '1';
    } else {
        children.style.height = `${children.scrollHeight}px`;
        children.style.opacity = '1';
        void children.offsetHeight;
        children.style.height = '0px';
        children.style.opacity = '0';
    }

    children.addEventListener('transitionend', handleTransitionEnd);
    timeoutId = window.setTimeout(finishAnimation, BOOKMARK_FOLDER_ANIMATION_DURATION + 80);
}

function renderBookmarkChildren(node, depth, children) {
    if (children.hasChildNodes()) return;

    node.children
        .map((child) => createBookmarkTreeNode(child, depth + 1))
        .forEach((childNode) => children.append(childNode));
}

function createBookmarkFolderRow(node, depth, isExpanded, onToggle) {
    const row = document.createElement('button');
    const disclosure = document.createElement('span');
    const icon = document.createElement('span');
    const title = document.createElement('span');
    const meta = document.createElement('span');

    row.className = 'tree-item bookmark-row bookmark-folder-row';
    row.type = 'button';
    row.style.setProperty('--tree-indent', `${depth * 14}px`);
    row.setAttribute('aria-expanded', String(isExpanded));
    row.title = node.title || 'Folder';
    disclosure.className = 'tree-disclosure';
    disclosure.textContent = '›';
    icon.className = 'tree-icon tree-icon--folder';
    title.className = 'bookmark-title';
    title.textContent = node.title || 'Folder';
    meta.className = 'bookmark-meta';
    meta.textContent = getBookmarkChildrenCount(node);

    row.addEventListener('click', onToggle);
    row.addEventListener('contextmenu', (event) => {
        showBookmarkContextMenu(event, node);
    });

    row.append(disclosure, icon, title, meta);

    return row;
}

function createBookmarkLinkRow(node, depth) {
    const link = document.createElement('a');
    const disclosure = document.createElement('span');
    const icon = document.createElement('span');
    const favicon = document.createElement('img');
    const title = document.createElement('span');
    const faviconUrls = getBookmarkFaviconUrls(node.url);
    let faviconUrlIndex = 0;

    link.className = 'tree-item bookmark-row bookmark-link';
    link.href = node.url;
    link.title = node.url;
    link.style.setProperty('--tree-indent', `${depth * 14}px`);
    disclosure.className = 'tree-disclosure tree-disclosure--empty';
    icon.className = 'tree-icon tree-icon--bookmark bookmark-favicon';
    favicon.alt = '';
    favicon.decoding = 'async';
    title.className = 'bookmark-title';
    title.textContent = node.title || node.url;

    if (faviconUrls.length) {
        favicon.src = faviconUrls[faviconUrlIndex];
        favicon.addEventListener('error', () => {
            faviconUrlIndex += 1;

            if (faviconUrls[faviconUrlIndex]) {
                favicon.src = faviconUrls[faviconUrlIndex];
                return;
            }

            icon.classList.add('bookmark-favicon--failed');
        });
        icon.append(favicon);
    } else {
        icon.classList.add('bookmark-favicon--failed');
    }

    link.addEventListener('contextmenu', (event) => {
        showBookmarkContextMenu(event, node);
    });

    link.append(disclosure, icon, title);

    return link;
}

function createBookmarkTreeNode(node, depth = 0) {
    if (!Array.isArray(node.children)) {
        return createBookmarkLinkRow(node, depth);
    }

    const wrapper = document.createElement('div');
    const isExpanded = expandedBookmarkFolderIds.has(node.id);
    const children = document.createElement('div');

    wrapper.className = 'bookmark-folder';
    children.className = 'bookmark-children';
    children.hidden = !isExpanded;

    if (isExpanded) {
        wrapper.classList.add('bookmark-folder--expanded');
        renderBookmarkChildren(node, depth, children);
    }

    const row = createBookmarkFolderRow(node, depth, isExpanded, () => {
        const shouldExpand = !expandedBookmarkFolderIds.has(node.id);

        if (shouldExpand) {
            expandedBookmarkFolderIds.add(node.id);
            renderBookmarkChildren(node, depth, children);
        } else {
            collapseBookmarkFolder(node);
        }

        saveExpandedBookmarkFolders();
        setBookmarkFolderExpandedState(wrapper, row, shouldExpand);
        animateBookmarkChildren(children, shouldExpand, () => {
            if (!shouldExpand) {
                children.replaceChildren();
            }
        });
    });

    wrapper.prepend(row, children);

    return wrapper;
}

async function renderBookmarksTree() {
    const bookmarksApi = getBookmarksApi();

    if (!bookmarksApi) {
        setBookmarksEmptyState(getBookmarksUnavailableMessage());
        return;
    }

    try {
        const tree = await getBookmarksTree();
        const rootChildren = tree?.[0]?.children || [];

        bookmarksTreeContainer.replaceChildren();

        if (!rootChildren.length) {
            setBookmarksEmptyState('No bookmarks yet');
            return;
        }

        if (shouldResetBookmarkFoldersOnOpen) {
            expandBookmarksBarFolderOnly(tree);
            shouldResetBookmarkFoldersOnOpen = false;
        } else {
            collectDefaultExpandedBookmarkFolders(tree);
        }

        syncExpandedBookmarkFolders(tree);
        rootChildren
            .map((node) => createBookmarkTreeNode(node))
            .forEach((node) => bookmarksTreeContainer.append(node));
    } catch (error) {
        setBookmarksEmptyState('Could not load bookmarks');
    }
}

function scheduleBookmarksTreeUpdate() {
    clearTimeout(bookmarksRefreshTimer);
    bookmarksRefreshTimer = setTimeout(renderBookmarksTree, 80);
}

function bindBookmarkEvents() {
    const bookmarksApi = getBookmarksApi();

    if (!bookmarksApi) return;

    [
        'onCreated',
        'onRemoved',
        'onChanged',
        'onMoved',
        'onChildrenReordered',
        'onImportEnded',
    ].forEach((eventName) => {
        bookmarksApi[eventName]?.addListener(scheduleBookmarksTreeUpdate);
    });
}

function removeSearchHistoryItem(query, engine) {
    const history = getSearchHistory()
        .filter((item) => item.query !== query || item.engine !== engine);

    saveSearchHistory(history);
}

function addSearchHistory(query, engine) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || !MODIFIERS[engine]) return;

    const history = getSearchHistory()
        .filter((item) => item.query.toLowerCase() !== trimmedQuery.toLowerCase() || item.engine !== engine);

    history.unshift({
        query: trimmedQuery,
        engine,
        createdAt: Date.now(),
    });

    saveSearchHistory(history);
}

function updateFormAttributes(engine) {
    if (!MODIFIERS[engine]) return;

    form.action = MODIFIERS[engine].formAction;
    input.name = MODIFIERS[engine].inputName;
}

function updateStyles(engine) {
    const config = MODIFIERS[engine];

    if (!config) return;

    searchEngineFilters.querySelectorAll('.js-search-engine-filter').forEach((filter) => {
        const isActive = filter.dataset.engine === engine;

        filter.classList.toggle('search-filter--active', isActive);
        filter.setAttribute('aria-pressed', String(isActive));
    });
}

function createSuggestionRow({ title, path, iconClass, iconColor, query, active = false, muted = false }) {
    const row = document.createElement(query ? 'button' : 'div');
    const icon = document.createElement('span');
    const titleNode = document.createElement('span');
    const pathNode = document.createElement('span');

    row.className = `suggestion-row${active ? ' suggestion-row--active' : ''}${muted ? ' suggestion-row--muted' : ''}`;
    icon.className = `suggestion-icon ${iconClass}`;
    if (iconColor) {
        icon.style.backgroundColor = iconColor;
    }
    titleNode.className = 'suggestion-title';
    pathNode.className = 'suggestion-path';
    titleNode.textContent = title;
    pathNode.textContent = path;

    if (query) {
        row.type = 'button';
        row.dataset.query = query;
        row.addEventListener('click', () => {
            input.value = query;
            updateFormAttributes(currentSearchEngine);
            form.requestSubmit();
        });
    }

    row.append(icon, titleNode, pathNode);

    return row;
}

function getFallbackSuggestions(query) {
    return FALLBACK_SUFFIXES.map((suffix) => `${query} ${suffix}`);
}

function renderSuggestions(query, suggestions = [], isOffline = false) {
    const engine = MODIFIERS[currentSearchEngine];
    const trimmedQuery = query.trim();

    suggestionsContainer.replaceChildren();

    if (!trimmedQuery) {
        return;
    }

    suggestionsContainer.append(createSuggestionRow({
        title: trimmedQuery,
        path: `search with ${engine.label}`,
        iconClass: 'suggestion-icon--engine',
        iconColor: engine.engineColor,
        query: trimmedQuery,
        active: true,
    }));

    suggestions
        .filter((suggestion) => suggestion.toLowerCase() !== trimmedQuery.toLowerCase())
        .slice(0, SUGGESTION_LIMIT)
        .forEach((suggestion) => {
            suggestionsContainer.append(createSuggestionRow({
                title: suggestion,
                path: engine.label,
                iconClass: 'suggestion-icon--search',
                query: suggestion,
            }));
        });

    if (isOffline) {
        suggestionsContainer.append(createSuggestionRow({
            title: 'Не удалось загрузить подсказки',
            path: 'local fallback',
            iconClass: 'suggestion-icon--warning',
            muted: true,
        }));
    }
}

function parseSuggestionResponse(text) {
    const trimmedText = text.trim();
    let data;

    try {
        data = JSON.parse(trimmedText);
    } catch (jsonError) {
        const arrayStart = trimmedText.indexOf('[');
        const arrayEnd = trimmedText.lastIndexOf(']');

        if (arrayStart === -1 || arrayEnd === -1 || arrayEnd <= arrayStart) {
            throw jsonError;
        }

        data = JSON.parse(trimmedText.slice(arrayStart, arrayEnd + 1));
    }

    if (Array.isArray(data) && Array.isArray(data[1])) {
        return data[1];
    }

    if (Array.isArray(data)) {
        return data;
    }

    return [];
}

async function fetchSuggestions(query, engine, signal) {
    const response = await fetch(MODIFIERS[engine].suggestionUrl(query), { signal });

    if (!response.ok) {
        throw new Error(`Suggest request failed: ${response.status}`);
    }

    const data = await response.text();
    const suggestions = parseSuggestionResponse(data);

    return suggestions.filter((suggestion) => typeof suggestion === 'string');
}

function scheduleSuggestionsUpdate() {
    const query = input.value.trim();
    const engine = currentSearchEngine;

    clearTimeout(suggestionDebounceTimer);

    if (suggestionAbortController) {
        suggestionAbortController.abort();
    }

    renderSuggestions(query);

    if (!query || !MODIFIERS[engine]) return;

    if (!MODIFIERS[engine].suggestionUrl) {
        renderSuggestions(query, getFallbackSuggestions(query));
        return;
    }

    suggestionAbortController = new AbortController();

    suggestionDebounceTimer = setTimeout(async () => {
        try {
            const suggestions = await fetchSuggestions(query, engine, suggestionAbortController.signal);

            renderSuggestions(query, suggestions);
        } catch (error) {
            if (error.name !== 'AbortError') {
                renderSuggestions(query, getFallbackSuggestions(query), true);
            }
        }
    }, SUGGESTION_DEBOUNCE);
}

function onWindowResize() {
    const width = parseFloat(getComputedStyle(ideMain).getPropertyValue('--tool-window-width')) || DEFAULT_TOOL_WINDOW_WIDTH;

    setToolWindowWidth(width, false);
    hideBookmarkContextMenu();
}

function onDocumentClick(event) {
    hideBookmarkContextMenu();

    const isCollapsed = ideMain.classList.contains('ide-main--tool-window-collapsed');

    if (
        isCollapsed ||
        toolWindow.contains(event.target) ||
        toolWindowStripe.contains(event.target) ||
        bookmarkContextMenu.contains(event.target)
    ) {
        return;
    }

    setToolWindowCollapsed(true);
}

populateSearchEngineControls();
currentSearchEngine = getInitialSearchEngine();
defaultSearchEngineSelect.value = currentSearchEngine;
setSearchEngine(currentSearchEngine);
setTheme(getInitialTheme());
setUiFontSize(getInitialUiFontSize());
setUiFontFamily(getInitialUiFontFamily());
initToolWindowWidth();
loadExpandedBookmarkFolders();
renderBookmarksTree();
bindBookmarkEvents();
setToolWindowCollapsed(true);
requestAnimationFrame(() => {
    ideMain.classList.add('ide-main--ready');
});

input.addEventListener('input', scheduleSuggestionsUpdate);

themeSelect.addEventListener('change', () => {
    setTheme(themeSelect.value);
});

defaultSearchEngineSelect.addEventListener('change', () => {
    setDefaultSearchEngine(defaultSearchEngineSelect.value);
});

uiFontSizeSelect.addEventListener('change', () => {
    setUiFontSize(uiFontSizeSelect.value);
});

uiFontFamilySelect.addEventListener('change', () => {
    setUiFontFamily(uiFontFamilySelect.value);
});

editorTabs.forEach((editorTab) => {
    editorTab.addEventListener('click', () => {
        setActiveTab(editorTab.dataset.tab);
    });
});

toolWindowToggle.addEventListener('click', () => {
    setToolWindowCollapsed(!ideMain.classList.contains('ide-main--tool-window-collapsed'));
});

toolWindowStripe.addEventListener('click', () => {
    setToolWindowCollapsed(false);
});

toolWindowResizer.addEventListener('pointerdown', startToolWindowResize);
toolWindowResizer.addEventListener('pointermove', onToolWindowResizePointerMove);
toolWindowResizer.addEventListener('pointerup', stopToolWindowResize);
toolWindowResizer.addEventListener('pointercancel', stopToolWindowResize);
resetSearchPopupLayoutButton.addEventListener('click', resetUiSettings);
bookmarkContextMenu.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});
document.addEventListener('click', onDocumentClick);
window.addEventListener('keydown', onGlobalKeydown);
window.addEventListener('resize', onWindowResize);

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const engine = currentSearchEngine;
    updateFormAttributes(engine);
    addSearchHistory(input.value, engine);

    form.submit();
});
