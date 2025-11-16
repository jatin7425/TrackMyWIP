// /api/extension/connect.js
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';
import { generateToken, hashToken } from '../token-utils.js';

const MONGO_URL = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'wip_tracker';
const JWT_SECRET = process.env.JWT_SECRET;

let db, client;
async function getDb() {
    if (db) return db;
    client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
    return db;
}

function getUsernameFromCookie(req) {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.username || null;
    } catch { return null; }
}

export async function connectExtension(req, res) {
    try {
        const username = getUsernameFromCookie(req);

        if (!username) {
            // Not logged in: show login link
            const html = `
<!doctype html><meta charset="utf-8">
<title>TrackMyWIP — Connect Extension</title>
<style>body{font-family:system-ui;margin:24px}</style>
<h2>Please sign in</h2>
<p>You must be signed in to connect the extension.</p>
<p><a href="/">Open TrackMyWIP</a>, sign in, then click “Connect” again.</p>`;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(200).end(html);
        }

        const db = await getDb();
        const tokens = db.collection('api_tokens');

        // Either reuse a non-revoked token for this user or create a new one
        let tokenDoc = await tokens.findOne({ user: username, revoked: { $ne: true } });
        let rawToken = null;

        if (!tokenDoc) {
            rawToken = generateToken();
            const token_hash = hashToken(rawToken);
            const doc = {
                user: username,
                name: 'Browser Extension (auto)',
                token_hash,
                createdAt: new Date(),
                lastUsedAt: null,
                revoked: false,
                expiresAt: null
            };
            const r = await tokens.insertOne(doc);
            tokenDoc = { ...doc, _id: r.insertedId };
        }

        // If we reused an existing token, we cannot recover the raw token from hash.
        // In that case, rotate to a fresh token for convenience.
        if (!rawToken) {
            rawToken = generateToken();
            const token_hash = hashToken(rawToken);
            await tokens.updateOne(
                { _id: tokenDoc._id },
                { $set: { token_hash, createdAt: new Date(), revoked: false } }
            );
        }

        // Render a tiny HTML page that exposes token via <meta> so content script can read it.
        const html = `
<!doctype html><meta charset="utf-8">
<meta name="tmw-token" content="${rawToken}">
<title>TrackMyWIP — Connected</title>
<style>
  body{font-family:system-ui;margin:24px}
  .card{border:1px solid #ddd;border-radius:10px;padding:16px;max-width:520px}
  code{background:#f6f6f6;padding:2px 6px;border-radius:6px}
</style>
<div class="card">
  <h2>Extension Connected ✅</h2>
  <p>Your browser extension can now read your token securely.</p>
  <p>If this tab didn’t close automatically, you may close it now.</p>
  <p><small>Token will be stored only inside your browser’s extension storage.</small></p>
  <p><small>If you need to revoke it later, open Account → Extension Tokens.</small></p>
  <p><small>User: <code>${username}</code></small></p>
</div>
<script>
  // Fallback broadcast for advanced flows:
  window.postMessage({ type: 'TMW_TOKEN_READY' }, '*');
  document.title = 'TrackMyWIP — Connected';
</script>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).end(html);

    } catch (e) {
        console.error('connect error', e);
        return res.status(500).end('Server error');
    }
}

export async function addPointExtension(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

    const auth = req.headers.authorization || '';
    const raw = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!raw) return res.status(401).json({ error: 'Missing token' });

    const token_hash = hashToken(raw);

    try {
        const db = await getDb();
        const tokens = db.collection('api_tokens');
        const tokenDoc = await tokens.findOne({ token_hash, revoked: { $ne: true } });
        if (!tokenDoc) return res.status(401).json({ error: 'Invalid token' });

        const username = tokenDoc.user;
        const { text } = req.body || {};
        if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const WIP = db.collection('wip_entries');
        await WIP.updateOne(
            { username, date: dateStr },
            {
                $setOnInsert: { username, date: dateStr, year: yyyy, month: mm, day: dd, points: [] },
                $push: { points: text.trim() }
            },
            { upsert: true }
        );

        await tokens.updateOne({ _id: tokenDoc._id }, { $set: { lastUsedAt: new Date() } });

        return res.json({ ok: true });
    } catch (e) {
        console.error('add-point-extension error', e);
        return res.status(500).json({ error: 'Server error' });
    }
}
