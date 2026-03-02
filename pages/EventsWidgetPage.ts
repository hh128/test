import { expect, Locator, Page } from '@playwright/test';

export class EventsWidgetPage {
    readonly page: Page;
    readonly header: Locator;
    readonly eventsCalendarLink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.header = page.locator('h1', { hasText: 'Начните создавать свой календарь мероприятий!' });
        this.eventsCalendarLink = page.locator('a', { hasText: 'календарь мероприятий' });
    }

    async goto() {
        await this.page.goto('https://dev.3snet.info/eventswidget/');
    }

    async verifyPageLoad() {
        await expect(this.page).toHaveTitle(/Конструктор календаря мероприятий/);
    }

    async verifyHeaderAppears() {
        await expect(this.header).toBeVisible();
    }

    async verifyCalendarLink() {
        await expect(this.eventsCalendarLink.first()).toBeVisible();
    }
}
