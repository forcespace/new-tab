const form = document.querySelector('.js-search-form');
const select = form.querySelector('.js-search-engine-select');
const input = form.querySelector('.js-search-input');
const button = form.querySelector('.search-button');

const MODIFIERS = {
    yandex: {
        formAction: 'https://yandex.ru/search/',
        inputName: 'text',
        buttonClass: 'search-button--yandex',
    },
    google: {
        formAction: 'https://www.google.com/search',
        inputName: 'q',
        buttonClass: 'search-button--google',
    }
};

function updateFormAttributes(engine) {
    if (!MODIFIERS[engine]) return;

    form.action = MODIFIERS[engine].formAction;
    input.name = MODIFIERS[engine].inputName;
}

function updateStyles(engine) {
    Object.values(MODIFIERS).forEach(({ buttonClass }) => {
        button.classList.remove(buttonClass);
    });

    if (MODIFIERS[engine]) {
        button.classList.add(MODIFIERS[engine].buttonClass);
    }
}

function onSelectChange() {
    const engine = select.value;
    updateStyles(engine);
    updateFormAttributes(engine);
}

onSelectChange();

select.addEventListener('change', onSelectChange);

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const engine = select.value;
    updateFormAttributes(engine);

    form.submit();
});
