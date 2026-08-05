const form = document.querySelector('.js-search-form');
const select = form.querySelector('.js-search-engine-select');
const selectWrapper = form.querySelector('.select-wrapper');
const input = form.querySelector('.js-search-input');
const button = form.querySelector('.search-button');
const themeSelect = document.querySelector('.js-theme-select');
const THEME_STORAGE_KEY = 'new-tab-theme';
const DEFAULT_THEME = 'islands-dark';

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
        formAction: 'https://yandex.ru/search/',
        inputName: 'text',
        wrapperClass: 'select-wrapper--yandex',
        selectClass: 'search-engine-select--yandex',
        buttonClass: 'search-button--yandex',
    },
    google: {
        formAction: 'https://www.google.com/search',
        inputName: 'q',
        wrapperClass: 'select-wrapper--google',
        selectClass: 'search-engine-select--google',
        buttonClass: 'search-button--google',
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
}

onSelectChange();
setTheme(getInitialTheme());

select.addEventListener('change', onSelectChange);

themeSelect.addEventListener('change', () => {
    setTheme(themeSelect.value);
});

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const engine = select.value;
    updateFormAttributes(engine);

    form.submit();
});
