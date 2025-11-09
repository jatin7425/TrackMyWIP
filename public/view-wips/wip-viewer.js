// view-wips/wip-viewer.js
document.addEventListener('DOMContentLoaded', () => {
    const wipContainer = document.getElementById('wip-container');
    const filterBar = document.getElementById('filter-bar');
    const filterInput = document.getElementById('filter-input');

    // --- NEW: Get filter dropdowns ---
    const yearFilter = document.getElementById('year-filter');
    const monthFilter = document.getElementById('month-filter');
    const exportBtn = document.getElementById('export-csv-btn');

    /**
     * --- NEW: Populates the Year and Month dropdowns ---
     */
    const populateDropdowns = () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11

        // Populate Months (Jan-Dec, values 1-12)
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        months.forEach((month, index) => {
            const option = new Option(month, index + 1); // value is 1-12
            monthFilter.add(option);
        });

        // Populate Years (e.g., current year + 5 past years)
        for (let i = 0; i <= 5; i++) {
            const year = currentYear - i;
            const option = new Option(year, year);
            yearFilter.add(option);
        }

        // Set dropdowns to the current month and year
        yearFilter.value = currentYear;
        monthFilter.value = currentMonth + 1; // Our values are 1-12
    };

    /**
     * --- MODIFIED: Loads WIPs based on dropdowns ---
     */
    const loadWips = async () => {
        // Get values from the dropdowns
        const year = yearFilter.value;
        const month = String(monthFilter.value).padStart(2, '0');

        wipContainer.innerHTML = '<p class="loading">Loading WIPs...</p>'; // Show loading message

        try {
            // Fetch using the selected year and month
            const response = await fetch(`${window.location.origin}/api/wip?year=${year}&month=${month}`);
            if (!response.ok) throw new Error('Failed to fetch WIPs');

            const result = await response.json();
            console.log("Fetched WIP data:", result);
            renderWips(result.data);
        } catch (err) {
            console.error(err);
            if (err.name === 'AbortError') return; // Fetch was aborted

            // Check if user might be logged out (401 Unauthorized)
            if (err.message.includes('401')) {
                wipContainer.innerHTML = '<p class="error">You are not logged in. <a href="/home.html">Please log in</a>.</p>';
            } else {
                wipContainer.innerHTML = '<p class="error">Could not load WIPs.</p>';
            }
        }
    };

    /**
     * --- renderWips (No changes needed) ---
     * This function remains the same as your previous version.
     */
    const renderWips = (data) => {
        wipContainer.innerHTML = '';

        if (!data || Object.keys(data).length === 0) {
            wipContainer.innerHTML = '<p>No WIPs found for this month.</p>';
            return;
        }

        const sortedKeys = Object.keys(data).sort((a, b) => {
            const [, , y1, m1, d1] = a.split(':');
            const [, , y2, m2, d2] = b.split(':');
            return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
        });

        sortedKeys.forEach(key => {
            const points = data[key];
            const [, , y, m, d] = key.split(':');
            const dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

            const displayDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const entryDiv = document.createElement('div');
            entryDiv.className = 'wip-entry';

            const headerContainer = document.createElement('div');
            headerContainer.className = 'wip-header-container';

            const dateHeader = document.createElement('h2');
            dateHeader.className = 'wip-date';
            dateHeader.textContent = displayDate;

            const copyButton = document.createElement('button');
            copyButton.textContent = 'Copy';
            copyButton.className = 'copy-wip-btn';
            copyButton.title = 'Copy to clipboard';
            copyButton.onclick = () => {
                const markdownText = [
                    displayDate, '', ...points.map(point => `- ${point}`)
                ].join('\n');

                navigator.clipboard.writeText(markdownText).then(() => {
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                    alert('Failed to copy');
                });
            };

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-wip-btn';
            deleteButton.title = 'Delete this entry';
            deleteButton.onclick = async () => {
                if (!confirm(`Are you sure you want to delete all WIPs for ${displayDate}?`)) {
                    return;
                }
                try {
                    const response = await fetch(`/api/wip?year=${y}&month=${m}&day=${d}`, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    if (response.ok) {
                        alert('WIP deleted successfully!');
                        entryDiv.remove();
                    } else {
                        throw new Error(result.message || 'Failed to delete');
                    }
                } catch (err) {
                    console.error('Delete failed:', err);
                    alert(`Error: ${err.message}`);
                }
            };

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'wip-button-group';
            buttonGroup.appendChild(copyButton);
            buttonGroup.appendChild(deleteButton);

            headerContainer.appendChild(dateHeader);
            headerContainer.appendChild(buttonGroup);

            const wipList = document.createElement('ul');
            wipList.className = 'wip-list';

            points.forEach(point => {
                const li = document.createElement('li');
                li.className = 'wip-item';
                li.textContent = point;
                wipList.appendChild(li);
            });

            entryDiv.appendChild(headerContainer);
            entryDiv.appendChild(wipList);
            wipContainer.appendChild(entryDiv);

            entryDiv.dataset.text = (displayDate + ' ' + points.join(' ')).toLowerCase();
        });
    };

    // --- Filter and Shortcut functions (No changes needed) ---
    const handleFilterShortcut = (e) => {
        if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            filterBar.classList.toggle('visible');
            if (filterBar.classList.contains('visible')) filterInput.focus();
            else filterInput.blur();
        }
    };
    const handleFilterInput = () => {
        const query = filterInput.value.toLowerCase();
        document.querySelectorAll('.wip-entry').forEach(entry => {
            entry.style.display = entry.dataset.text.includes(query) ? 'block' : 'none';
        });
    };

    // --- Export CSV functions (No changes needed) ---
    const convertJsonToCsv = (data) => {
        let csv = 'Date,Username,WIP\n';
        const sortedKeys = Object.keys(data).sort();
        for (const key of sortedKeys) {
            const parts = key.split(':');
            if (parts.length < 5) continue;
            const username = parts[1];
            const date = `${parts[2]}-${parts[3]}-${parts[4]}`;
            const points = data[key];
            points.forEach(point => {
                const sanitizedPoint = `"${point.replace(/"/g, '""')}"`;
                csv += `${date},${username},${sanitizedPoint}\n`;
            });
        }
        return csv;
    };
    const downloadCsv = (csvContent) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'wip_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Export Button Listener ---
    exportBtn.addEventListener('click', async () => {
        if (!confirm('This will export all of your WIP data. Continue?')) {
            return;
        }
        exportBtn.textContent = 'Exporting...';
        exportBtn.disabled = true;
        try {
            const response = await fetch('/api/wip'); // Fetch ALL data
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to fetch');
            const data = result.data;
            if (!data || Object.keys(data).length === 0) {
                alert('No data to export.');
                return;
            }
            const csvContent = convertJsonToCsv(data);
            downloadCsv(csvContent);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. Please check the console.');
        } finally {
            exportBtn.textContent = 'Export All to Excel (CSV)';
            exportBtn.disabled = false;
        }
    });


    // --- MODIFIED: Initialize Page ---
    populateDropdowns(); // 1. Set up dropdowns first
    loadWips();          // 2. Load data for default selection

    // 3. Add listeners
    yearFilter.addEventListener('change', loadWips);
    monthFilter.addEventListener('change', loadWips);
    document.addEventListener('keydown', handleFilterShortcut);
    filterInput.addEventListener('input', handleFilterInput);
});