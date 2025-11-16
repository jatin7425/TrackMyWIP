// Backup of current `login-start.js` (deprecated/otp). This is a copy of the active file
// at the time of the conservative cleanup. It is kept as a backup in case you need
// to restore the previous OTP-based login behavior.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    return res.status(410).json({
        success: false,
        message: 'Deprecated: OTP auth removed. Use Google SSO via /api/auth/login-google.'
    });
}
