import { test, expect } from '../fixtures/eventsFixture';

test.describe('Тестирование виджета мероприятий 3Snet', () => {

    test('Дефолтная загрузка страницы и смена языка', async ({ eventsPage, page }) => {
        // чекаем тайтл при старте
        await expect(page).toHaveTitle(/Конструктор календаря мероприятий/);

        // меняем язык на английский
        await eventsPage.languageSwitcher.click();
        await eventsPage.langEnOption.click();

        // проверяем, что урл и заголовок обновились
        await page.waitForURL('**/en/eventswidget/');
        await expect(page).toHaveTitle(/Events calendar constructor/i);
        await expect(page.locator('h1')).toContainText('Events calendar');
    });

    test('Отлов JS-ошибок в консоли при генерации виджета', async ({ eventsPage, page }) => {
        const consoleErrors: Error[] = [];
        page.on('pageerror', (err) => consoleErrors.push(err));
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(new Error(msg.text()));
        });

        // Клацаем по форме
        await eventsPage.setSize('600', '400');
        await eventsPage.fullWidthCheckbox.click({ force: true });
        await eventsPage.generatePreviewBtn.click();

        // ждем пока айфрейм прогрузится
        await expect(eventsPage.iframePreview).toBeVisible();

        // убеждаемся, что в консоль ничего не упало
        expect(consoleErrors).toHaveLength(0);
    });

    test('Проверка блокировки полей ввода размеров', async ({ eventsPage }) => {
        // По умолчанию поля активны
        await expect(eventsPage.widthInput).toBeEnabled();
        await expect(eventsPage.heightInput).toBeEnabled();

        // Ставим галочки
        await eventsPage.fullWidthCheckbox.click({ force: true });
        await eventsPage.autoHeightCheckbox.click({ force: true });

        // Проверяем, что поля заблокировались
        await expect(eventsPage.widthInput).toBeDisabled();
        await expect(eventsPage.heightInput).toBeDisabled();

        // Снимаем галочки
        await eventsPage.fullWidthCheckbox.click({ force: true });
        await eventsPage.autoHeightCheckbox.click({ force: true });

        // Поля снова активны
        await expect(eventsPage.widthInput).toBeEnabled();
        await expect(eventsPage.heightInput).toBeEnabled();
    });

    test('Проверка подстановки параметров в iframe (Network/API)', async ({ eventsPage }) => {
        // прокликиваем пару тематик
        await eventsPage.selectTopic('Affiliate');
        await eventsPage.selectTopic('SEO');

        // Кликнем вне дропдауна, чтобы он закрылся и обновился текст (опционально)
        await eventsPage.header.click();

        // Проверяем, что текст кнопки обновился на счетчик
        await expect(eventsPage.thematicDropdownBtn).toContainText('Выбрано: 2');

        await eventsPage.generatePreviewBtn.click();
        await expect(eventsPage.iframePreview).toBeVisible();

        await expect(eventsPage.iframePreview).toHaveAttribute('src', /event_type=/);

        const codeOutput = await eventsPage.codeOutputTextarea.inputValue();
        expect(codeOutput).toContain('event_type=');
    });

    // дата-дривен тестик для тем
    const themes = [
        { name: 'Green', locator: (p: import('../page-objects/EventsWidgetPage').EventsWidgetPage) => p.themeGreenRb, colorVal: 'green' },
        { name: 'Blue', locator: (p: import('../page-objects/EventsWidgetPage').EventsWidgetPage) => p.themeBlueRb, colorVal: 'blue' },
        { name: 'Turquoise', locator: (p: import('../page-objects/EventsWidgetPage').EventsWidgetPage) => p.themeTurquoiseRb, colorVal: 'turquoise' },
        { name: 'Purple', locator: (p: import('../page-objects/EventsWidgetPage').EventsWidgetPage) => p.themePurpleRb, colorVal: 'purple' },
    ];

    for (const theme of themes) {
        test(`Проверка выбора цветовой темы: ${theme.name}`, async ({ eventsPage }) => {
            // кликаем по радиокнопке
            await theme.locator(eventsPage).click({ force: true });

            // тема должна моментально подставиться в код
            const codeOutput = await eventsPage.codeOutputTextarea.inputValue();
            expect(codeOutput).toContain(`theme=${theme.colorVal}`);
        });
    }

    test('Проверка системного буфера обмена (Copy API)', async ({ eventsPage, context, page }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await eventsPage.generatePreviewBtn.click();
        await expect(eventsPage.codeOutputTextarea).not.toBeEmpty();

        const expectedText = await eventsPage.codeOutputTextarea.inputValue();

        await eventsPage.copyCodeBtn.click();

        // Читаем из буфера ОС
        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

        // Нормализуем HTML-сущности на случай автозамен в textarea
        const normalizedExpected = expectedText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');
        const normalizedClipboard = clipboardText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');

        expect(normalizedClipboard).toEqual(normalizedExpected);
    });
});
