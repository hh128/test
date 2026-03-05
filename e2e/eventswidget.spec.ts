import { test, expect } from '../fixtures/eventsFixture';

test.describe('Тестирование виджета мероприятий 3Snet', () => {

    test('Дефолтная загрузка страницы и смена языка', async ({ eventsPage, page }) => {
        console.log('- Открыта главная страница виджета');
        await expect(page).toHaveTitle(/Конструктор календаря мероприятий/);

        console.log('- Переключаем язык интерфейса на английский');
        await eventsPage.languageSwitcher.click();
        await eventsPage.langEnOption.click();

        console.log('- Проверяем корректность обновления URL и перевода');
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

        console.log('- Заполняем форму: Ширина 600, Высота 400');
        await eventsPage.setSize('600', '400');
        await eventsPage.fullWidthCheckbox.click({ force: true });

        console.log('- Генерируем превью виджета');
        await eventsPage.generatePreviewBtn.click();

        console.log('- Ожидаем отрисовки iframe');
        await expect(eventsPage.iframePreview).toBeVisible();

        console.log('- Проверяем список JS-ошибок (должен быть пуст)');
        expect(consoleErrors).toHaveLength(0);
    });

    test('Проверка блокировки полей ввода размеров', async ({ eventsPage }) => {
        console.log('- Проверяем, что поля ввода по умолчанию активны');
        await expect(eventsPage.widthInput).toBeEnabled();
        await expect(eventsPage.heightInput).toBeEnabled();

        console.log('- Устанавливаем галочки "на всю ширину/высоту"');
        await eventsPage.fullWidthCheckbox.click({ force: true });
        await eventsPage.autoHeightCheckbox.click({ force: true });

        console.log('- Подтверждаем, что текстовые поля заблокированы');
        await expect(eventsPage.widthInput).toBeDisabled();
        await expect(eventsPage.heightInput).toBeDisabled();

        console.log('- Снимаем галочки блокировки');
        await eventsPage.fullWidthCheckbox.click({ force: true });
        await eventsPage.autoHeightCheckbox.click({ force: true });

        console.log('- Проверяем, что поля ввода снова доступны');
        await expect(eventsPage.widthInput).toBeEnabled();
        await expect(eventsPage.heightInput).toBeEnabled();
    });

    test('Проверка подстановки параметров в iframe (Network/API)', async ({ eventsPage }) => {
        console.log('- Выбираем несколько тематик (Affiliate, SEO)');
        await eventsPage.selectTopic('Affiliate');
        await eventsPage.selectTopic('SEO');

        console.log('- Закрываем дропдаун фильтров');
        await eventsPage.header.click();

        console.log('- Валидируем счетчик выбранных категорий');
        await expect(eventsPage.thematicDropdownBtn).toContainText('Выбрано: 2');

        console.log('- Генерируем превью и проверяем отрисовку iframe');
        await eventsPage.generatePreviewBtn.click();
        await expect(eventsPage.iframePreview).toBeVisible();

        console.log('- Проверяем подстановку ID тематик в атрибут src iframe');
        await expect(eventsPage.iframePreview).toHaveAttribute('src', /event_type=/);

        console.log('- Валидируем код вставки в textarea');
        const codeOutput = await eventsPage.codeOutputTextarea.inputValue();
        expect(codeOutput).toContain('event_type=');
    });

    // Data-Drivien тестирование графических тем
    const themes = [
        { name: 'Green', locator: (p: import('../page-objects/EventsWidgetPage').EventsWidgetPage) => p.themeGreenRb, colorVal: 'green' },
        { name: 'Blue', locator: (p: import('../page-objects/EventsWidgetPage').EventsWidgetPage) => p.themeBlueRb, colorVal: 'blue' },
        { name: 'Turquoise', locator: (p: import('../page-objects/EventsWidgetPage').EventsWidgetPage) => p.themeTurquoiseRb, colorVal: 'turquoise' },
        { name: 'Purple', locator: (p: import('../page-objects/EventsWidgetPage').EventsWidgetPage) => p.themePurpleRb, colorVal: 'purple' },
    ];

    for (const theme of themes) {
        test(`Проверка выбора цветовой темы: ${theme.name}`, async ({ eventsPage }) => {
            console.log(`- Выбираем тему: ${theme.name}`);
            await theme.locator(eventsPage).click({ force: true });

            console.log('- Проверяем текстовое окошко (код) на наличие нужного параметра');
            const codeOutput = await eventsPage.codeOutputTextarea.inputValue();
            expect(codeOutput).toContain(`theme=${theme.colorVal}`);
        });
    }

    test('Проверка системного буфера обмена (Copy API)', async ({ eventsPage, context, page }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        console.log('- Генерируем виджет');
        await eventsPage.generatePreviewBtn.click();
        await expect(eventsPage.codeOutputTextarea).not.toBeEmpty();

        const expectedText = await eventsPage.codeOutputTextarea.inputValue();

        console.log('- Имитируем нажатие кнопки "Скопировать код"');
        await eventsPage.copyCodeBtn.click();

        console.log('- Читаем данные из системного буфера обмена ОС');
        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

        console.log('- Сравниваем оригинал и скопированный текст');
        const normalizedExpected = expectedText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');
        const normalizedClipboard = clipboardText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');

        expect(normalizedClipboard).toEqual(normalizedExpected);
    });
});
