// Minimal Google SSO-only client UI
document.addEventListener('DOMContentLoaded', async () => {
    const authContainer = document.getElementById('home-container-right');
    if (!authContainer) return;

    try {
        const res = await fetch('/api/auth/check-session', { method: 'GET' });
        const data = await res.json();
        if (res.ok && data.loggedIn) {
            window.location.href = '/view-wips';
            return;
        }
    } catch (e) {
        console.warn('Session check failed:', e);
    }

    authContainer.innerHTML = `
        <div style="text-align:center;padding:28px;max-width:480px;margin:0 auto;">
            <h2>Sign in to WIP Tracker</h2>
            <p style="color:#64748b">This application uses Google Single Sign-On for authentication.</p>
            <a href="/api/auth/login-google" style="display:inline-block;margin-top:18px;padding:12px 18px;background:#4285F4;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Sign in with Google</a>
        </div>
    `;
});
