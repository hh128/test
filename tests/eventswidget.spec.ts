import { test, expect } from '@playwright/test';
import { EventsWidgetPage } from '../pages/EventsWidgetPage';

test.describe('Events Widget Page Tests', () => {
    let eventsWidgetPage: EventsWidgetPage;

    test.beforeEach(async ({ page }) => {
        eventsWidgetPage = new EventsWidgetPage(page);
        await eventsWidgetPage.goto();
    });

    test('should load the events widget page with correct title', async () => {
        await eventsWidgetPage.verifyPageLoad();
    });

    test('should display the main header', async () => {
        await eventsWidgetPage.verifyHeaderAppears();
    });

    test('should contain a link to the events calendar', async () => {
        await eventsWidgetPage.verifyCalendarLink();
    });
});
