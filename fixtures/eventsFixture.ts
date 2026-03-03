import { test as base } from '@playwright/test';
import { EventsWidgetPage } from '../page-objects/EventsWidgetPage';

type MyFixtures = {
    eventsPage: EventsWidgetPage;
};

export const test = base.extend<MyFixtures>({
    eventsPage: async ({ page }, use) => {
        // инициализируем page objects
        const eventsPage = new EventsWidgetPage(page);

        // переходим на страницу до начала самого теста
        await eventsPage.goto();

        // отдаем готовый инстанс в спеки
        await use(eventsPage);
    },
});

export { expect } from '@playwright/test';
