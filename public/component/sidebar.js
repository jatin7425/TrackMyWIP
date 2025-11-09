// component/sidebar.js

document.addEventListener('DOMContentLoaded', () => {

    const sidebar = document.getElementById('sidebar');

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