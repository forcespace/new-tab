const form = document.querySelector('.js-search-form');
const select = form.querySelector('.js-search-engine-select');
const selectWrapper = form.querySelector('.select-wrapper');
const input = form.querySelector('.js-search-input');
const button = form.querySelector('.search-button');
const themeSelect = document.querySelector('.js-theme-select');
const suggestionsContainer = document.querySelector('.js-search-suggestions');
const THEME_STORAGE_KEY = 'new-tab-theme';
const DEFAULT_THEME = 'islands-dark';
const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE = 180;
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
        wrapperClass: 'select-wrapper--yandex',
        selectClass: 'search-engine-select--yandex',
        buttonClass: 'search-button--yandex',
        iconClass: 'suggestion-icon--yandex',
        suggestionUrl: (query) => `https://suggest.yandex.ru/suggest-ff.cgi?part=${encodeURIComponent(query)}`,
    },
    google: {
        label: 'Google',
        formAction: 'https://www.google.com/search',
        inputName: 'q',
        wrapperClass: 'select-wrapper--google',
        selectClass: 'search-engine-select--google',
        buttonClass: 'search-button--google',
        iconClass: 'suggestion-icon--google',
        suggestionUrl: (query) => `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
    }
};

function getInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = LEGACY_THEMES[savedTheme] || savedTheme;

    return THEMES.has(theme) ? theme : DEFAULT_THEME;
}

function setTheme(theme) {
    if (!THEMES.has(theme)) return;

    document.body.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    themeSelect.value = theme;
}

function updateFormAttributes(engine) {
    if (!MODIFIERS[engine]) return;

    form.action = MODIFIERS[engine].formAction;
    input.name = MODIFIERS[engine].inputName;
}

function updateStyles(engine) {
    Object.values(MODIFIERS).forEach(({ wrapperClass, selectClass, buttonClass }) => {
        selectWrapper.classList.remove(wrapperClass);
        select.classList.remove(selectClass);
        button.classList.remove(buttonClass);
    });

    if (MODIFIERS[engine]) {
        selectWrapper.classList.add(MODIFIERS[engine].wrapperClass);
        select.classList.add(MODIFIERS[engine].selectClass);
        button.classList.add(MODIFIERS[engine].buttonClass);
    }
}

function onSelectChange() {
    const engine = select.value;
    updateStyles(engine);
    updateFormAttributes(engine);
    scheduleSuggestionsUpdate();
}

function createSuggestionRow({ title, path, iconClass, query, active = false, muted = false }) {
    const row = document.createElement(query ? 'button' : 'div');
    const icon = document.createElement('span');
    const titleNode = document.createElement('span');
    const pathNode = document.createElement('span');

    row.className = `suggestion-row${active ? ' suggestion-row--active' : ''}${muted ? ' suggestion-row--muted' : ''}`;
    icon.className = `suggestion-icon ${iconClass}`;
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
        iconClass: engine.iconClass,
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

onSelectChange();
setTheme(getInitialTheme());

select.addEventListener('change', onSelectChange);

input.addEventListener('input', scheduleSuggestionsUpdate);

themeSelect.addEventListener('change', () => {
    setTheme(themeSelect.value);
});

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const engine = select.value;
    updateFormAttributes(engine);

    form.submit();
});
