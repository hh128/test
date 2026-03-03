import { Locator, Page } from '@playwright/test';

export class EventsWidgetPage {
    readonly page: Page;

    // Шапка
    readonly header: Locator;
    readonly languageSwitcher: Locator;
    readonly langEnOption: Locator;

    // Фильтры
    readonly thematicDropdownBtn: Locator;
    readonly countryDropdownBtn: Locator;
    readonly topicsCheckboxes: Locator;

    // Настройки размеров
    readonly widthInput: Locator;
    readonly heightInput: Locator;
    readonly fullWidthCheckbox: Locator;
    readonly autoHeightCheckbox: Locator;
    readonly generatePreviewBtn: Locator;

    // Результат (iframe + код)
    readonly iframePreview: Locator;
    readonly iframeBody: Locator;
    readonly codeOutputTextarea: Locator;
    readonly copyCodeBtn: Locator;

    // Цветовые темы
    readonly themeGreenRb: Locator;
    readonly themeBlueRb: Locator;
    readonly themeTurquoiseRb: Locator;
    readonly themePurpleRb: Locator;

    constructor(page: Page) {
        this.page = page;

        this.header = page.locator('h1');

        // переключатель языка
        this.languageSwitcher = page.locator('.dropdown-toggle').first();
        this.langEnOption = page.locator('.dropdown-menu a', { hasText: /English/i }).first();

        // дропдауны фильтров
        this.thematicDropdownBtn = page.locator('.checkselect[data-select="Выбрать тематику"], .checkselect').first();
        this.countryDropdownBtn = page.locator('.checkselect[data-select="Все страны"], .checkselect').nth(1);
        this.topicsCheckboxes = this.page.locator('label.custom-checkbox input[type="checkbox"]');

        // инпуты размеров
        this.widthInput = page.locator('input[name="width"]');
        this.heightInput = page.locator('input[name="height"]');

        // Надежный поиск по тексту, так как чекбоксы перекрыты/кастомные
        this.fullWidthCheckbox = page.getByText('на всю ширину контейнера');
        this.autoHeightCheckbox = page.getByText('на всю высоту блока');

        // Темы (привязываемся к value, так надежнее)
        this.themeGreenRb = page.locator('label.radio').filter({ has: page.locator('input[type="radio"][value="green"]') });
        this.themeBlueRb = page.locator('label.radio').filter({ has: page.locator('input[type="radio"][value="blue"]') });
        this.themeTurquoiseRb = page.locator('label.radio').filter({ has: page.locator('input[type="radio"][value="turquoise"]') });
        this.themePurpleRb = page.locator('label.radio').filter({ has: page.locator('input[type="radio"][value="purple"]') });

        // кнопка генерации и сам айфрейм
        this.generatePreviewBtn = page.locator('button', { hasText: /Сгенерировать превью|Generate preview/i }).first();
        this.iframePreview = page.locator('iframe#3snet-frame');
        this.iframeBody = this.iframePreview.contentFrame().locator('body');

        // текстовое поле с готовым скриптом
        this.codeOutputTextarea = page.locator('textarea#code, #code');
        this.copyCodeBtn = page.locator('#code-copy-button, .copy_btn').first();
    }

    async goto() {
        await this.page.goto('');
    }

    async selectTopic(topicName: string) {
        await this.thematicDropdownBtn.click();
        // Используем чек на лейбле, Playwright сам кликает по ассоциативному инпуту, 
        // Force нужен, так как клик/чек может перехватываться стилями
        await this.page.locator('label.custom-checkbox', { hasText: topicName }).check({ force: true });
    }

    async setSize(width: string, height: string) {
        await this.widthInput.fill(width);
        await this.heightInput.fill(height);
    }
}
