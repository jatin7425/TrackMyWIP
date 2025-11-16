import {
    loginGoogleHandler,
    callbackGoogleHandler,
    checkSessionHandler,
    logoutHandler,
    meHandler
} from '../../lib/authHandlers/index.js';
import { supportUPI } from '../../lib/util/index.js';

export default async function handler(req, res) {
    // parse path after /api/auth/
    const urlBase = req.headers.host ? `http://${req.headers.host}` : 'http://localhost';
    const full = new URL(req.url, urlBase);
    const pathname = full.pathname || req.url;
    const parts = pathname.replace(/^\/api\/auth\/?/, '').split('/').filter(Boolean);
    const route = parts.join('/');

    // Helpful runtime log so dev can see which route the dispatcher parsed.
    // This prints in `vercel dev` logs and helps debug 404/mismatch issues.
    try {
        console.log(`Auth dispatcher: parsed route='${route}', method='${req.method}', rawUrl='${req.url}'`);
    } catch (e) {
        // Ignore logging errors in constrained runtimes
    }

    // Dispatch
    try {
        // OTP/signup endpoints removed. Only OAuth/session routes are supported.
        if (route === 'login-google' && req.method === 'GET') return await loginGoogleHandler(req, res);
        if (route === 'check-session' && req.method === 'GET') return await checkSessionHandler(req, res);
        if (route === 'logout' && req.method === 'POST') return await logoutHandler(req, res);
        if (route === 'me' && req.method === 'GET') return await meHandler(req, res);
        if (route === 'support-upi' && req.method === 'GET') return await supportUPI(req, res);

    return res.status(404).json({ message: 'Not found', route, method: req.method });
    } catch (err) {
        console.error('Auth dispatcher error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
}
