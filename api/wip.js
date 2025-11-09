import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

/**
 * Helper: Gets the authenticated username from the session token.
 * Returns null if not authenticated.
 */
const getUsernameFromToken = (req) => {
    const { JWT_SECRET } = process.env;
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.username || null;
    } catch (err) {
        return null; // Token is invalid or expired
    }
};

export default async function handler(req, res) {
    // --- Handle CORS ---
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*'); // More secure CORS
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow cookies

    if (req.method === 'OPTIONS') return res.status(200).end();

    // --- Authentication ---
    const username = getUsernameFromToken(req);
    if (!username) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    try {
        // Helper: build Redis key (now includes username)
        const buildKey = (dateString) => {
            const date = new Date(dateString);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            // NEW KEY STRUCTURE
            return `wip:${username}:${y}:${m}:${d}`;
        };

        // --- CREATE (POST) ---
        if (req.method === 'POST') {
            const { date, points } = req.body; // Username now comes from session

            if (!date || !Array.isArray(points))
                return res.status(400).json({ message: 'Date and points[] are required.' });

            const key = buildKey(date);
            await kv.set(key, points);

            return res.status(200).json({ success: true, message: `Saved WIP for ${key}` });
        }

        // --- READ (GET) ---
        if (req.method === 'GET') {
            const { year, month, day } = req.query; // Username comes from session

            // 1️⃣ Specific day
            if (year && month && day) {
                const key = `wip:${username}:${year}:${month}:${day}`;
                const data = await kv.get(key);
                return res.status(200).json({ data: { [key]: data || [] } });
            }

            // 2️⃣ Whole month
            if (year && month) {
                const pattern = `wip:${username}:${year}:${month}:*`;
                const keys = await kv.keys(pattern);
                const result = {};
                for (const key of keys) {
                    result[key] = await kv.get(key);
                }
                return res.status(200).json({ data: result });
            }

            // 3️⃣ Whole year
            if (year) {
                const pattern = `wip:${username}:${year}:*`;
                const keys = await kv.keys(pattern);
                const result = {};
                for (const key of keys) {
                    result[key] = await kv.get(key);
                }
                return res.status(200).json({ data: result });
            }

            // 4️⃣ All data (for this user)
            const allKeys = await kv.keys(`wip:${username}:*`);
            const all = {};
            for (const key of allKeys) {
                all[key] = await kv.get(key);
            }
            return res.status(200).json({ data: all });
        }

        // --- UPDATE (PUT) ---
        if (req.method === 'PUT') {
            const { date, points } = req.body; // Username comes from session
            if (!date || !Array.isArray(points))
                return res.status(400).json({ message: 'Date and points[] are required.' });

            const key = buildKey(date);
            const existing = await kv.get(key);
            if (!existing)
                return res.status(404).json({ message: `No WIP found for ${key}` });

            await kv.set(key, points);
            return res.status(200).json({ success: true, message: `Updated WIP for ${key}` });
        }

        // --- DELETE ---
        if (req.method === 'DELETE') {
            const { year, month, day } = req.query; // Username comes from session

            // Build pattern based on user and provided queries
            let pattern = `wip:${username}`;
            if (year) pattern += `:${year}`;
            if (year && month) pattern += `:${month}`;
            if (year && month && day) pattern += `:${day}`;

            // Only add wildcard if not deleting a specific day
            if (!day) pattern += '*';

            const keys = await kv.keys(pattern);
            if (keys.length === 0)
                return res.status(404).json({ message: 'No matching keys found.' });

            for (const key of keys) await kv.del(key);

            return res.status(200).json({ success: true, message: `Deleted ${keys.length} record(s).` });
        }

        // --- Invalid Method ---
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (err) {
        console.error('KV Error:', err);
        return res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
}