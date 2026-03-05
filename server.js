const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const HISTORY_FILE = path.join(__dirname, 'test-history.json');

// Раздаем статику дашборда
app.use(express.static('public'));

// Инициализация файла с историей тестов при его отсутствии
const initHistory = () => {
    if (!fs.existsSync(HISTORY_FILE)) {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
    }
};

// Эндпоинты API

// Получение истории запусков
app.get('/api/history', (req, res) => {
    initHistory();
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    res.json(history);
});

// Запуск Playwright тестов (child_process)
app.post('/api/run-tests', (req, res) => {
    // Выполняем Playwright через npx.cmd для Windows-совместимости
    const cmd = process.platform === 'win32' ? 'npx.cmd playwright test --reporter=json' : 'npx playwright test --reporter=json';

    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        initHistory();
        const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));

        const timestamp = new Date().toISOString();
        let reportData = null;
        let isSuccess = false;

        try {
            // Playwright выводит JSON отчет в stdout
            // Ищем начало JSON объекта для обхода возможных консольных выводов перед отчетом
            const jsonStartIndex = stdout.indexOf('{');
            if (jsonStartIndex !== -1) {
                const jsonString = stdout.substring(jsonStartIndex);
                reportData = JSON.parse(jsonString);

                const stats = reportData.stats || {};
                isSuccess = stats.unexpected === 0;

                // Сохраняем полный отчет для дебага (опционально)
                fs.writeFileSync(path.join(__dirname, 'debug-report.json'), JSON.stringify(reportData, null, 2));

                // Рекурсивный парсинг тестов (учет вложенных test.describe блоков)
                const parsedTests = [];
                const extractSpecs = (suitesArray) => {
                    if (!suitesArray) return;
                    suitesArray.forEach(suite => {
                        if (suite.specs) {
                            suite.specs.forEach(spec => {
                                const testTitle = spec.title;
                                let testStatus = 'skipped';
                                let duration = 0;
                                let errorMessage = null;
                                let stdoutLines = [];

                                // Берем первый результат из возможных ретраев
                                if (spec.tests && spec.tests.length > 0 && spec.tests[0].results && spec.tests[0].results.length > 0) {
                                    const result = spec.tests[0].results[0];
                                    testStatus = result.status;
                                    duration = result.duration || 0;

                                    if (result.stdout && result.stdout.length > 0) {
                                        // Приводим stdout логи к плоскому массиву строк
                                        stdoutLines = result.stdout.map(item => item.text ? item.text.trim() : String(item)).filter(Boolean);
                                    }

                                    if (result.error && result.error.message) {
                                        // Удаляем ANSI escape sequences (цвета консоли Playwright)
                                        errorMessage = result.error.message.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
                                    }
                                }

                                parsedTests.push({
                                    name: testTitle,
                                    status: testStatus,
                                    duration: duration,
                                    error: errorMessage,
                                    logs: stdoutLines
                                });
                            });
                        }
                        // Обход вложенных блоков test.describe
                        if (suite.suites) {
                            extractSpecs(suite.suites);
                        }
                    });
                };

                if (reportData.suites) {
                    extractSpecs(reportData.suites);
                }

                const newRun = {
                    id: Date.now(),
                    date: timestamp,
                    duration: stats.duration || 0,
                    expected: stats.expected || 0,
                    unexpected: stats.unexpected || 0,
                    status: isSuccess ? 'passed' : 'failed',
                    flaky: stats.flaky || 0,
                    details: parsedTests
                };

                history.unshift(newRun);
                fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

                return res.json({ success: true, run: newRun, raw: reportData });
            }
        } catch (e) {
            console.error("Parse error:", e);
        }

        // Запасной ответ на случай падения парсера или отсутствия JSON отчета
        const failedRun = {
            id: Date.now(),
            date: timestamp,
            status: 'failed',
            error: 'Test execution failed completely',
            stdout: stdout,
            stderr: stderr
        };

        history.unshift(failedRun);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

        res.status(500).json({ success: false, run: failedRun });
    });
});

app.listen(PORT, () => {
    console.log(`Test Dashboard is running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop.`);
});
