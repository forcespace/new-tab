const form = document.querySelector('.js-search-form');
const select = form.querySelector('.js-search-engine-select');
const selectWrapper = form.querySelector('.select-wrapper');
const input = form.querySelector('.js-search-input');
const button = form.querySelector('.search-button');
const themeSelect = document.querySelector('.js-theme-select');
const defaultSearchEngineSelect = document.querySelector('.js-default-search-engine-select');
const uiFontSizeSelect = document.querySelector('.js-ui-font-size-select');
const uiFontFamilySelect = document.querySelector('.js-ui-font-family-select');
const suggestionsContainer = document.querySelector('.js-search-suggestions');
const searchHistoryContainer = document.querySelector('.js-search-history');
const ideMain = document.querySelector('.ide-main');
const toolWindowToggle = document.querySelector('.js-tool-window-toggle');
const toolWindowStripe = document.querySelector('.js-tool-window-stripe');
const editorTabs = document.querySelectorAll('.js-editor-tab');
const editorPanes = document.querySelectorAll('.js-editor-pane');
const THEME_STORAGE_KEY = 'new-tab-theme';
const SEARCH_HISTORY_STORAGE_KEY = 'new-tab-search-history';
const TOOL_WINDOW_COLLAPSED_STORAGE_KEY = 'new-tab-tool-window-collapsed';
const DEFAULT_SEARCH_ENGINE_STORAGE_KEY = 'new-tab-default-search-engine';
const UI_FONT_SIZE_STORAGE_KEY = 'new-tab-ui-font-size';
const UI_FONT_FAMILY_STORAGE_KEY = 'new-tab-ui-font-family';
const DEFAULT_THEME = 'islands-dark';
const DEFAULT_SEARCH_ENGINE = 'yandex';
const DEFAULT_UI_FONT_SIZE = 'default';
const DEFAULT_UI_FONT_FAMILY = 'system';
const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE = 180;
const SEARCH_HISTORY_LIMIT = 12;
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

function populateSearchEngineSelects() {
    const options = Object.entries(MODIFIERS).map(([value, { label }]) => {
        const option = document.createElement('option');

        option.value = value;
        option.textContent = label;

        return option;
    });

    select.replaceChildren(...options.map((option) => option.cloneNode(true)));
    defaultSearchEngineSelect.replaceChildren(...options.map((option) => option.cloneNode(true)));
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
    select.value = engine;
    onSelectChange();
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

function setToolWindowCollapsed(isCollapsed) {
    ideMain.classList.toggle('ide-main--tool-window-collapsed', isCollapsed);
    toolWindowToggle.setAttribute(
        'aria-label',
        isCollapsed ? 'Развернуть историю поиска' : 'Свернуть историю поиска'
    );
    localStorage.setItem(TOOL_WINDOW_COLLAPSED_STORAGE_KEY, String(isCollapsed));
}

function removeSearchHistoryItem(query, engine) {
    const history = getSearchHistory()
        .filter((item) => item.query !== query || item.engine !== engine);

    saveSearchHistory(history);
    renderSearchHistory();
}

function createHistoryRow({ query, engine }) {
    const row = document.createElement('div');
    const searchButton = document.createElement('button');
    const deleteButton = document.createElement('button');
    const icon = document.createElement('span');
    const title = document.createElement('span');
    const meta = document.createElement('span');

    row.className = 'tree-item search-history-item';
    searchButton.className = 'history-link';
    searchButton.type = 'button';
    deleteButton.className = 'history-delete';
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', `Удалить запрос: ${query}`);
    deleteButton.textContent = '×';
    icon.className = 'tree-icon tree-icon--search';
    icon.style.backgroundColor = MODIFIERS[engine]?.engineColor || '';
    title.className = 'history-query';
    meta.className = 'history-engine';
    title.textContent = query;
    meta.textContent = MODIFIERS[engine]?.label || engine;

    searchButton.addEventListener('click', () => {
        if (MODIFIERS[engine]) {
            select.value = engine;
            onSelectChange();
        }

        input.value = query;
        updateFormAttributes(select.value);
        form.requestSubmit();
    });

    deleteButton.addEventListener('click', () => {
        removeSearchHistoryItem(query, engine);
        input.focus();
    });

    searchButton.append(icon, title, meta);
    row.append(searchButton, deleteButton);

    return row;
}

function renderSearchHistory() {
    const history = getSearchHistory();

    searchHistoryContainer.replaceChildren();

    if (!history.length) {
        const emptyState = document.createElement('div');

        emptyState.className = 'tree-item tree-item--empty';
        emptyState.textContent = 'No searches yet';
        searchHistoryContainer.append(emptyState);
        return;
    }

    history.forEach((item, index) => {
        const row = createHistoryRow(item);

        row.classList.toggle('tree-item--active', index === 0);
        searchHistoryContainer.append(row);
    });
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
    renderSearchHistory();
}

function updateFormAttributes(engine) {
    if (!MODIFIERS[engine]) return;

    form.action = MODIFIERS[engine].formAction;
    input.name = MODIFIERS[engine].inputName;
}

function updateStyles(engine) {
    const config = MODIFIERS[engine];

    if (!config) return;

    selectWrapper.style.setProperty('--engine-color', config.engineColor);
    select.style.borderColor = config.engineColor;
    button.style.borderColor = config.engineColor;
}

function onSelectChange() {
    const engine = select.value;
    updateStyles(engine);
    updateFormAttributes(engine);
    scheduleSuggestionsUpdate();
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
            updateFormAttributes(select.value);
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
    const engine = MODIFIERS[select.value];
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
    const engine = select.value;

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

populateSearchEngineSelects();
select.value = getInitialSearchEngine();
defaultSearchEngineSelect.value = select.value;
onSelectChange();
setTheme(getInitialTheme());
setUiFontSize(getInitialUiFontSize());
setUiFontFamily(getInitialUiFontFamily());
renderSearchHistory();
setToolWindowCollapsed(localStorage.getItem(TOOL_WINDOW_COLLAPSED_STORAGE_KEY) === 'true');

select.addEventListener('change', onSelectChange);

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

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const engine = select.value;
    updateFormAttributes(engine);
    addSearchHistory(input.value, engine);

    form.submit();
});
