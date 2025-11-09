// view-wips/wip-viewer.js
document.addEventListener('DOMContentLoaded', () => {
    const wipContainer = document.getElementById('wip-container');
    const yearFilter = document.getElementById('year-filter');
    const monthFilter = document.getElementById('month-filter');
    const exportBtn = document.getElementById('export-csv-btn');
    const filterInput = document.getElementById('filter-input');

    // Populate months/years
    function populateDropdowns() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        monthFilter.innerHTML = '';
        months.forEach((m, i) => {
            const opt = new Option(m, i + 1);
            monthFilter.appendChild(opt);
        });

        yearFilter.innerHTML = '';
        for (let i = 0; i <= 5; i++) {
            const y = currentYear - i;
            const opt = new Option(y, y);
            yearFilter.appendChild(opt);
        }

        yearFilter.value = currentYear;
        monthFilter.value = now.getMonth() + 1;
    }

    // Helper: show loading or message
    function showMessage(msg, cls = 'loading') {
        wipContainer.innerHTML = `<p class="${cls}">${msg}</p>`;
    }

    // Fetch & render WIPs
    async function loadWips() {
        const year = yearFilter.value;
        const month = String(monthFilter.value).padStart(2, '0');
        showMessage('Loading WIPs...');
        try {
            const resp = await fetch(`${window.location.origin}/api/wip?year=${year}&month=${month}`);
            if (!resp.ok) {
                // try to read JSON error message
                let msg = 'Failed to fetch WIPs';
                try { const j = await resp.json(); if (j && j.message) msg = j.message; } catch (e) { }
                throw new Error(msg);
            }
            const json = await resp.json();
            renderWips(json.data || {});
        } catch (err) {
            console.error('Load WIPs error', err);
            if (String(err).includes('401')) {
                showMessage('You are not logged in. <a href="/home.html">Please log in</a>.', 'error');
            } else {
                showMessage('Could not load WIPs.', 'error');
            }
        }
    }

    // Convert server data -> sorted keys, then create DOM
    function renderWips(data) {
        wipContainer.innerHTML = '';
        if (!data || Object.keys(data).length === 0) {
            showMessage('No WIPs found for this month.');
            return;
        }

        // Keys format: something like "user:username:YYYY:MM:DD" (matches your previous format)
        const sortedKeys = Object.keys(data).sort((a, b) => {
            const [, , y1, m1, d1] = a.split(':');
            const [, , y2, m2, d2] = b.split(':');
            return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
        });

        sortedKeys.forEach(key => {
            const points = data[key] || [];
            const parts = key.split(':');
            if (parts.length < 5) return;
            const username = parts[1];
            const [, , y, m, d] = parts;
            const dateISO = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const displayDate = new Date(dateISO + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            // Card
            const card = document.createElement('article');
            card.className = 'wip-entry';

            // header row
            const header = document.createElement('div');
            header.className = 'wip-header';

            const dateH = document.createElement('h2');
            dateH.className = 'wip-date';
            dateH.textContent = displayDate;

            const btnGroup = document.createElement('div');
            btnGroup.className = 'wip-button-group';

            // Copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-wip-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.title = 'Copy to clipboard';
            copyBtn.addEventListener('click', async () => {
                const markdown = [displayDate, '', ...points.map(p => `- ${p}`)].join('\n');
                try {
                    await navigator.clipboard.writeText(markdown);
                    const prev = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => copyBtn.textContent = prev, 1800);
                } catch (e) {
                    console.error('Copy failed', e);
                    alert('Copy failed: ' + (e && e.message ? e.message : 'clipboard error'));
                }
            });

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-wip-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.title = 'Delete entry';
            deleteBtn.addEventListener('click', async () => {
                if (!confirm(`Are you sure you want to delete all WIPs for ${displayDate}?`)) return;
                try {
                    const resp = await fetch(`/api/wip?year=${y}&month=${String(m)}&day=${String(d)}`, {
                        method: 'DELETE'
                    });
                    const result = await resp.json().catch(() => ({}));
                    if (!resp.ok) {
                        throw new Error(result.message || 'Delete failed');
                    }
                    // remove card from DOM
                    card.remove();
                    alert('WIP deleted successfully.');
                } catch (err) {
                    console.error('Delete failed', err);
                    alert('Delete failed: ' + (err.message || err));
                }
            });

            // assemble header
            btnGroup.appendChild(copyBtn);
            btnGroup.appendChild(deleteBtn);
            header.appendChild(dateH);
            header.appendChild(btnGroup);

            // list
            const ul = document.createElement('ul');
            ul.className = 'wip-list';
            points.forEach(point => {
                const li = document.createElement('li');
                li.className = 'wip-item';
                li.textContent = point;
                ul.appendChild(li);
            });

            // attach
            card.appendChild(header);
            card.appendChild(ul);
            wipContainer.appendChild(card);

            // for search: combine date + username + points
            card.dataset.text = (displayDate + ' ' + username + ' ' + points.join(' ')).toLowerCase();
        });
    }

    // Search filter
    function handleFilterInput() {
        const q = (filterInput.value || '').toLowerCase().trim();
        document.querySelectorAll('.wip-entry').forEach(card => {
            card.style.display = (!q || card.dataset.text.includes(q)) ? '' : 'none';
        });
    }

    // Keyboard shortcut to focus search (Ctrl+F to match previous behaviour)
    function handleKeyDown(e) {
        if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            filterInput.focus();
            filterInput.select();
        }
    }

    // CSV export helpers
    function convertJsonToCsv(data) {
        let csv = 'Date,Username,WIP\n';
        const keys = Object.keys(data).sort();
        for (const key of keys) {
            const parts = key.split(':');
            if (parts.length < 5) continue;
            const username = parts[1];
            const date = `${parts[2]}-${parts[3]}-${parts[4]}`;
            const points = data[key] || [];
            points.forEach(point => {
                const sanitized = `"${String(point).replace(/"/g, '""')}"`;
                csv += `${date},${username},${sanitized}\n`;
            });
        }
        return csv;
    }
    function downloadCsv(csvContent, filename = 'wip_export.csv') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    exportBtn.addEventListener('click', async () => {
        if (!confirm('This will export all of your WIP data. Continue?')) return;
        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
        try {
            const resp = await fetch('/api/wip');
            let json;
            try { json = await resp.json(); } catch (e) { json = null; }
            if (!resp.ok) {
                throw new Error((json && json.message) ? json.message : 'Failed to fetch WIP export');
            }
            const data = (json && json.data) ? json.data : {};
            if (!data || Object.keys(data).length === 0) {
                alert('No data to export.');
            } else {
                const csv = convertJsonToCsv(data);
                downloadCsv(csv);
            }
        } catch (err) {
            console.error('Export failed', err);
            alert('Export failed. Check console.');
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export All to Excel (CSV)';
        }
    });

    // init
    populateDropdowns();
    loadWips();

    // listeners
    yearFilter.addEventListener('change', loadWips);
    monthFilter.addEventListener('change', loadWips);
    filterInput.addEventListener('input', handleFilterInput);
    document.addEventListener('keydown', handleKeyDown);
});
