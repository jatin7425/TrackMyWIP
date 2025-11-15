document.addEventListener('DOMContentLoaded', () => {
    // --- API Endpoints ---
    const SHARE_API = '/api/wip-share';
    const WIP_API = '/api/wip';

    // --- Global State ---
    let currentUserBeingViewed = null; // Stores the username we are viewing

    // --- Element References ---
    // Share Management View
    const shareManagementSection = document.getElementById('share-management-section');
    const shareForm = document.getElementById('share-form');
    const usernameInput = document.getElementById('share-username-input');
    const shareMessage = document.getElementById('share-message');
    const gaveAccessList = document.getElementById('i-gave-access-list');
    const canAccessList = document.getElementById('i-can-access-list');

    // WIP Viewer View
    const wipViewerSection = document.getElementById('wip-viewer-section');
    const backToShareBtn = document.getElementById('back-to-share-btn');
    const viewingUsernameEl = document.getElementById('viewing-username');
    const wipFetchForm = document.getElementById('wip-fetch-form');
    const wipYearSelect = document.getElementById('wip-year');
    const wipMonthSelect = document.getElementById('wip-month');
    const wipDataContainer = document.getElementById('wip-data-container');

    // ===================================
    // == VIEW SWITCHING LOGIC
    // ===================================

    function showShareManagementView() {
        shareManagementSection.classList.remove('hidden');
        wipViewerSection.classList.add('hidden');
        currentUserBeingViewed = null;
        wipDataContainer.innerHTML = '<div class="empty-state">Select a year and month to load data.</div>';
    }

    function showWipViewer(username) {
        currentUserBeingViewed = username;
        viewingUsernameEl.textContent = username;
        shareManagementSection.classList.add('hidden');
        wipViewerSection.classList.remove('hidden');

        // Pre-select current month/year
        const now = new Date();
        wipYearSelect.value = now.getFullYear();
        wipMonthSelect.value = String(now.getMonth() + 1).padStart(2, '0');
    }

    // ===================================
    // == SHARE MANAGEMENT LOGIC
    // ===================================

    // Fetches both share lists from the API and renders them.
    async function loadShareData() {
        gaveAccessList.innerHTML = '<div class="loader">Loading...</div>';
        canAccessList.innerHTML = '<div class="loader">Loading...</div>';

        try {
            const response = await fetch(SHARE_API, {
                method: 'GET',
                credentials: 'include'
            });
            if (response.status === 401) {
                window.location.href = '/login'; // Adjust path if needed
                return;
            }
            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            renderGaveAccessList(data.iGaveAccessTo);
            renderCanAccessList(data.iCanAccess);
        } catch (error) {
            const errorMsg = `<div class="empty-state error">Error: ${error.message}</div>`;
            gaveAccessList.innerHTML = errorMsg;
            canAccessList.innerHTML = errorMsg;
        }
    }

    // Renders the "I Gave Access" list (with Revoke buttons).
    function renderGaveAccessList(users) {
        gaveAccessList.innerHTML = ''; // Clear loader
        if (users.length === 0) {
            gaveAccessList.innerHTML = '<div class="empty-state">You have not shared your WIP with any users.</div>';
            return;
        }
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'user-item';
            item.innerHTML = `
                <span>${user}</span>
                <button class="revoke-btn" data-user="${user}">Revoke</button>
            `;
            gaveAccessList.appendChild(item);
        });
    }

    // Renders the "I Can Access" list (with View WIP buttons).
    function renderCanAccessList(users) {
        canAccessList.innerHTML = ''; // Clear loader
        if (users.length === 0) {
            canAccessList.innerHTML = '<div class="empty-state">No users have shared their WIP with you.</div>';
            return;
        }
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'user-item';
            item.innerHTML = `
                <span>${user}</span>
                <button class="view-btn" data-user="${user}">View WIP</button>
            `;
            canAccessList.appendChild(item);
        });
    }

    // Handles the "Grant Access" form submission (POST).
    shareForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        if (!username) return;

        try {
            const response = await fetch(SHARE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ shareWithUser: username })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            showShareMessage(result.message, 'success');
            usernameInput.value = '';
            loadShareData(); // Refresh lists
        } catch (error) {
            showShareMessage(error.message, 'error');
        }
    });

    // Handles "Revoke" button clicks (DELETE) via event delegation.
    gaveAccessList.addEventListener('click', async (e) => {
        if (!e.target.classList.contains('revoke-btn')) return;
        const username = e.target.dataset.user;
        if (!confirm(`Are you sure you want to revoke access for ${username}?`)) return;

        try {
            const response = await fetch(SHARE_API, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ revokeUser: username })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            showShareMessage(result.message, 'success');
            loadShareData(); // Refresh lists
        } catch (error) {
            showShareMessage(error.message, 'error');
        }
    });

    // Handles "View WIP" button clicks (switches view) via event delegation.
    canAccessList.addEventListener('click', (e) => {
        if (!e.target.classList.contains('view-btn')) return;
        const username = e.target.dataset.user;
        showWipViewer(username);
    });

    // ===================================
    // == WIP VIEWER LOGIC
    // ===================================

    // Handles the "Fetch WIP" form submission.
    wipFetchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const year = wipYearSelect.value;
        const month = wipMonthSelect.value;

        if (!currentUserBeingViewed || !year || !month) return;

        wipDataContainer.innerHTML = '<div class="loader">Fetching WIP data...</div>';

        try {
            // Call the GET /api/wip-handler endpoint
            const query = `?viewUser=${currentUserBeingViewed}&year=${year}&month=${month}`;
            const response = await fetch(`${WIP_API}${query}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.status === 401) throw new Error('Unauthorized. Please log in again.');
            if (response.status === 403) throw new Error('Forbidden. You may no longer have access.');

            const result = await response.json();
            if (response.status !== 200) throw new Error(result.message || 'Failed to fetch data');

            renderWipData(result.data);

        } catch (error) {
            wipDataContainer.innerHTML = `<div class="empty-state error">Error: ${error.message}</div>`;
        }
    });

    /**
     * Renders the fetched WIP data into the container.
     * @param {Array<object>} data - The data array, e.g., [{date: "2025-11-03", points: [...], ...}]
     */
    function renderWipData(data) {
        wipDataContainer.innerHTML = ''; // Clear loader

        // Ensure data is an array
        if (!Array.isArray(data)) {
            wipDataContainer.innerHTML = '<div class="empty-state error">Invalid data format received.</div>';
            return;
        }

        if (data.length === 0) {
            wipDataContainer.innerHTML = '<div class="empty-state">No WIP data found for this period.</div>';
            return;
        }

        // Sort the array of objects by the 'date' property
        const sortedEntries = data.sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedEntries.forEach(entry => {
            // **CHANGE: Extract date and points directly from the entry object**
            const dateStr = entry.date;
            const points = entry.points;

            if (!points || points.length === 0) return; // Skip empty days

            // The date is already in YYYY-MM-DD format
            const date = new Date(dateStr + 'T12:00:00'); // Use T12:00:00 to avoid local timezone issues
            const displayDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const card = document.createElement('div');
            card.className = 'wip-day-card';

            const btnGroup = document.createElement('div');
            btnGroup.className = 'wip-button-group';

            const header = document.createElement('div');
            header.className = 'wip-header';

            const title = document.createElement('h4');
            title.textContent = displayDate;
            header.appendChild(title);

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


            btnGroup.appendChild(copyBtn);
            header.appendChild(btnGroup);

            const list = document.createElement('ul');
            points.forEach(point => {
                const li = document.createElement('li');
                li.textContent = point;
                list.appendChild(li);
            });
            card.appendChild(header);
            card.appendChild(list);
            wipDataContainer.appendChild(card);
        });
    }

    // Shows a temporary message in the grant access form.
    function showShareMessage(message, type) {
        shareMessage.textContent = message;
        shareMessage.className = `message ${type}`;
        setTimeout(() => { shareMessage.className = 'message'; }, 3000);
    }

    // --- Initial Load ---
    backToShareBtn.addEventListener('click', showShareManagementView);
    loadShareData();
});