import { addPointExtension, connectExtension } from "../../lib/extension/index.js";


export default async function handler(req, res) {
    // parse path after /api/auth/
    const urlBase = req.headers.host ? `http://${req.headers.host}` : 'http://localhost';
    const full = new URL(req.url, urlBase);
    const pathname = full.pathname || req.url;
    const parts = pathname.replace(/^\/api\/auth\/?/, '').split('/').filter(Boolean);
    const route = parts.join('/');
    
    try {
        console.log(`extension dispatcher: parsed route='${route}', method='${req.method}', rawUrl='${req.url}'`);
    } catch (e) {
        // Ignore logging errors in constrained runtimes
    }

    // Dispatch
    try {
        if (route === 'connect') return await connectExtension(req, res);
        if (route === 'add-point-extension') return await addPointExtension(req, res);

        return res.status(404).json({ message: 'Not found', route, method: req.method });
    } catch (err) {
        console.error('Auth dispatcher error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
}
