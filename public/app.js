const runBtn = document.getElementById('runBtn');
const loader = document.getElementById('loader');
const btnText = document.getElementById('btnText');
const historyBody = document.getElementById('historyBody');

const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

function toggleDetails(id) {
    const detailsRow = document.getElementById(`details-${id}`);
    const toggleIcon = document.getElementById(`toggle-${id}`);

    if (detailsRow) {
        const isOpen = detailsRow.classList.toggle('open');
        if (toggleIcon) {
            toggleIcon.innerText = isOpen ? '▼' : '▶';
        }
    }
}

async function fetchHistory() {
    try {
        const res = await fetch('/api/history');
        const data = await res.json();
        renderDashboard(data);
    } catch (err) {
        console.error('Network Error:', err);
    }
}

function renderDashboard(history) {
    historyBody.innerHTML = '';

    if (!history || history.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="5" class="empty-state">No execution history found. Run the suite to generate data.</td></tr>`;
        return;
    }

    const lastRun = history[0];
    document.getElementById('lastRunTime').innerText = `Last Run: ${formatDate(lastRun.date)}`;
    document.getElementById('valPassed').innerText = lastRun.expected || 0;
    document.getElementById('valFailed').innerText = lastRun.unexpected || 0;
    document.getElementById('valDuration').innerText = lastRun.duration ? (lastRun.duration / 1000).toFixed(1) + 's' : '-';

    history.forEach(run => {
        const isSuccess = run.status === 'passed';
        const statusClass = isSuccess ? 'status-passed' : 'status-failed';
        const statusText = isSuccess ? 'Passed' : 'Failed';
        const duration = run.duration ? (run.duration / 1000).toFixed(1) + 's' : '-';
        const passedCount = run.expected !== undefined ? run.expected : '-';
        const failedCount = run.unexpected !== undefined ? run.unexpected : '-';

        const tr = document.createElement('tr');
        tr.className = 'history-row cursor-pointer';
        tr.onclick = () => toggleDetails(run.id);

        const hasDetails = run.details && run.details.length > 0;
        const toggleHtml = hasDetails ? `<span class="toggle-icon" id="toggle-${run.id}">▶</span>` : '';

        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${toggleHtml}
                    ${formatDate(run.date)}
                </div>
            </td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td><span class="text-success">${passedCount}</span></td>
            <td><span class="text-danger">${failedCount}</span></td>
            <td>${duration}</td>
        `;
        historyBody.appendChild(tr);

        if (hasDetails) {
            const detailsTr = document.createElement('tr');
            detailsTr.id = `details-${run.id}`;
            detailsTr.className = 'details-row';

            let detailsHTML = `<td colspan="5"><div class="details-content"><div class="test-list">`;

            run.details.forEach(test => {
                const isTestPassed = test.status === 'expected' || test.status === 'passed';
                const iconClass = isTestPassed ? 'icon-success' : 'icon-danger';
                // Встраиваем SVG иконки для статусов (Octicons)
                const icon = isTestPassed
                    ? `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-check"><path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path></svg>`
                    : `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-x"><path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path></svg>`;

                const testDuration = test.duration ? `<span class="test-duration">${(test.duration / 1000).toFixed(1)}s</span>` : '';

                let detailsExtras = '';

                if (test.logs && test.logs.length > 0) {
                    const logsHtml = test.logs.map((log, index) => {
                        const safeLog = log.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        // Помечаем последний шаг упавшего теста как место сбоя
                        const isFailedStep = !isTestPassed && index === test.logs.length - 1;

                        const colorStyle = isFailedStep ? 'color: var(--danger); font-weight: 600;' : 'color: var(--text-muted);';
                        const failMarker = isFailedStep ? ' [FAILED AT THIS STEP]' : '';

                        return `<div style="font-size: 0.75rem; ${colorStyle} margin-top: 4px; padding-left: 24px; font-family: monospace;">${safeLog}${failMarker}</div>`;
                    }).join('');
                    detailsExtras += `<div style="margin-top: 4px;">${logsHtml}</div>`;
                }

                if (!isTestPassed && test.error) {
                    // Экранирование HTML-сущностей для безопасного рендеринга лога ошибки в DOM
                    const safeError = test.error.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    detailsExtras += `<pre class="error-log">${safeError}</pre>`;
                }

                detailsHTML += `
                    <div class="test-item">
                        <div class="test-header">
                            <span class="test-icon ${iconClass}">${icon}</span>
                            <span class="test-name">${test.name}</span>
                            ${testDuration}
                        </div>
                        ${detailsExtras}
                    </div>
                `;
            });

            detailsHTML += `</div></div></td>`;
            detailsTr.innerHTML = detailsHTML;
            historyBody.appendChild(detailsTr);
        }
    });
}

async function runTests() {
    runBtn.disabled = true;
    btnText.innerText = 'Running E2E tests...';
    loader.style.display = 'inline-block';

    try {
        const response = await fetch('/api/run-tests', { method: 'POST' });
        if (!response.ok) {
            console.error("Test suite failed to launch properly", await response.text());
        }
    } catch (err) {
        console.error('Failed to trigger execution:', err);
    }

    runBtn.disabled = false;
    btnText.innerText = 'Run Test Suite';
    loader.style.display = 'none';

    fetchHistory();
}

// Init
window.addEventListener('DOMContentLoaded', fetchHistory);
