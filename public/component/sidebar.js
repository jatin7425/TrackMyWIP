// component/sidebar.js

document.addEventListener('DOMContentLoaded', () => {

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
        console.warn('Sidebar element #sidebar not found; sidebar script will not run.');
        return;
    }

    const loadSidebar = () => {

        // -------------------------------
        // NAVIGATION
        // -------------------------------
        const navigationItems = [
            { href: '/add-wip', title: 'Add WIP' },
            { href: '/view-wips', title: 'View WIPs' },
            { href: '/shared-wips', title: 'Shared WIPs' },
            // { href: '/get-extension', title: 'Extension' },
        ];

        const nav = document.createElement('nav');
        const ul = document.createElement('ul');
        nav.appendChild(ul);
        sidebar.appendChild(nav);

        const loadItem = (href, title) => {
            const li = document.createElement('li');
            li.textContent = title;
            li.onclick = () => window.location.href = href;
            ul.appendChild(li);
        };

        navigationItems.forEach(item => loadItem(item.href, item.title));

        // -------------------------------
        // FOOTER (2 BUTTONS)
        // -------------------------------
        const footer = document.createElement('div');
        footer.className = "sidebar-footer";

        const btnWrap = document.createElement("div");
        btnWrap.style.display = "flex";
        btnWrap.style.flexDirection = "column";
        btnWrap.style.width = "100%";
        btnWrap.style.gap = "8px";

        // 1️⃣ USERNAME + LOGOUT BUTTON
        const userLogoutBtn = document.createElement('button');
        userLogoutBtn.type = "button";
        userLogoutBtn.className = "tmw-user-logout-btn";
        userLogoutBtn.innerHTML = `
            <span class="tmw-user-label">Loading...</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M16 17L21 12L16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        userLogoutBtn.addEventListener("click", async () => {
            if (!confirm("Logout?")) return;
            const r = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            if (r.ok) window.location.href = "/";
            else alert("Logout failed");
        });

        // 2️⃣ SUPPORT BUTTON
        const supportBtn = document.createElement("button");
        supportBtn.type = "button";
        supportBtn.className = "tmw-support-btn2";
        supportBtn.textContent = "Support ❤️";

        // Append both buttons
        btnWrap.appendChild(userLogoutBtn);
        btnWrap.appendChild(supportBtn);
        footer.appendChild(btnWrap);

        sidebar.appendChild(footer);

        console.log("Sidebar footer applied");

        // -------------------------------
        // SUPPORT MODAL
        // -------------------------------
            function createSupportModal() {
                const overlay = document.createElement("div");
                overlay.id = "support-overlay";
                overlay.className = "support-overlay";

                const modal = document.createElement("div");
                modal.className = "support-modal";

                modal.innerHTML = `
                <h3>Support TrackMyWIP ❤️</h3>
                <p>If this tool saves your time, please help keep it alive.</p>

                <img id="support-upi-qr" width="220" style="margin: 12px auto;" />

                <p><b>UPI:</b> <span id="support-upi-id" style="font-family: monospace;"></span></p>

                <div class="support-actions">
                    <button id="support-copy">Copy</button>
                    <button id="support-close">Close</button>
                </div>
            `;

                overlay.appendChild(modal);
                document.body.appendChild(overlay);

                const closeModal = () => {
                    try {
                        if (overlay && overlay.parentNode) document.body.removeChild(overlay);
                    } catch (e) {
                        // ignore
                    }
                    // allow recreating the modal on next click
                    modalInstance = null;
                };

                document.getElementById("support-close").onclick = closeModal;
                overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

                document.getElementById("support-copy").onclick = async () => {
                    const upi = document.getElementById("support-upi-id").innerText;
                    await navigator.clipboard.writeText(upi);
                    alert("UPI Copied");
                };

                return { overlay, modal };
            }

        let modalInstance = null;

        supportBtn.addEventListener("click", async () => {
            if (!modalInstance) modalInstance = createSupportModal();

            const resp = await fetch('/api/auth/support-upi');
            const data = resp.ok ? await resp.json() : {};

            const idEl = document.getElementById("support-upi-id");
            const qrEl = document.getElementById("support-upi-qr");

            idEl.textContent = data.upi || "(not configured)";
            if (data.qr) qrEl.src = data.qr;
        });

        // -------------------------------
        // LOAD USERNAME
        // -------------------------------
        (async function loadUsername() {
            try {
                const res = await fetch('/api/auth/check-session', {
                    method: "GET",
                    credentials: "include"
                });
                const data = await res.json();

                const label = document.querySelector(".tmw-user-label");

                if (res.ok && data.loggedIn && data.user?.username) {
                    label.textContent = data.user.username;
                } else {
                    label.textContent = "User";
                }
            } catch {
                const label = document.querySelector(".tmw-user-label");
                if (label) label.textContent = "User";
            }
        })();

    };

    loadSidebar();

    // Sidebar Toggle
    const toggleButton = document.getElementById('sidebar-toggle');
    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-hidden');
        });
    }
});
