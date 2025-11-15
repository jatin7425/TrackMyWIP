// component/sidebar.js

document.addEventListener('DOMContentLoaded', () => {

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
        console.warn('Sidebar element #sidebar not found; sidebar script will not run.');
        return;
    }

    // --- 1. Code to build the list ---
    const loadsidebar = () => {
        const navigationItems = [
            { href: '/add-wip', title: 'Add WIP' },
            { href: '/view-wips', title: 'View WIPs' },
            { href: '/shared-wips', title: 'Shared WIPs' },
        ];
        const nav = document.createElement('nav');
        const ul = document.createElement('ul');
        nav.appendChild(ul);
        sidebar.appendChild(nav);

        const loadContent = (href, title) => {
            const li = document.createElement('li');
            li.textContent = title;
            li.onclick = () => {
                window.location.href = href;
            }
            ul.appendChild(li);
        };
        navigationItems.forEach(item => loadContent(item.href, item.title));

        // --- Footer with username + logout icon ---
        const footer = document.createElement('div');
        footer.className = 'sidebar-footer';

        // Logout icon button (left of username)
        const logoutIconBtn = document.createElement('button');
        logoutIconBtn.type = 'button';
        logoutIconBtn.className = 'logout-icon-btn';
        logoutIconBtn.title = 'Logout';
        // simple SVG icon
        logoutIconBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M16 17L21 12L16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        // Username text container
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'sidebar-username';
        usernameSpan.textContent = '';

        logoutIconBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to logout?')) return;
            try {
                const resp = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                if (resp.ok) {
                    window.location.href = '/';
                } else {
                    const data = await resp.json().catch(() => null);
                    alert(data?.message || 'Logout failed');
                }
            } catch (err) {
                console.error('Logout failed', err);
                alert('Logout failed');
            }
        });

        footer.appendChild(logoutIconBtn);
        footer.appendChild(usernameSpan);

    // Place footer at the bottom of the sidebar (after nav)
    sidebar.appendChild(footer);

    // Debug: ensure footer appended
    // (leave this console.log for a short period to help diagnose rendering issues)
    console.log('Sidebar footer appended');

        // Populate username by asking the server
        (async function loadUsername() {
            try {
                const res = await fetch('/api/auth/check-session', { method: 'GET', credentials: 'include' });
                const data = await res.json();
                if (res.ok && data.loggedIn && data.user?.username) {
                    usernameSpan.textContent = data.user.username;
                } else {
                    usernameSpan.textContent = '';
                }
            } catch (err) {
                // fail silently
                usernameSpan.textContent = '';
            }
        })();
    };
    loadsidebar();

    // --- 2. Toggle Button Logic ---
    const toggleButton = document.getElementById('sidebar-toggle');

    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-hidden');
        });
    } else {
        console.error("Sidebar or Toggle Button not found!");
    }
});