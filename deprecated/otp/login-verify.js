// Backup of current `login-verify.js` (deprecated/otp).
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    return res.status(410).json({ success: false, message: 'Deprecated: OTP verification removed. Authenticate with Google SSO at /api/auth/login-google.' });
}
