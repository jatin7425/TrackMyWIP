// api/wip-handler.js
import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

/**
 * Helper: Gets the authenticated username from the session token.
 */
const getUsernameFromToken = (req) => {
    // ... (This helper function is identical) ...
    const { JWT_SECRET } = process.env;
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.username || null;
    } catch (err) {
        return null;
    }
};

export default async function handler(req, res) {
    // --- Handle CORS ---
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // --- Authentication ---
    const authenticatedUser = getUsernameFromToken(req);
    if (!authenticatedUser) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    try {
        // Helper: build Redis key
        const buildKey = (dateString, username) => {
            const user = username || authenticatedUser;
            const date = new Date(dateString);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `wip:${user}:${y}:${m}:${d}`;
        };

        // --- CREATE (POST) ---
        // (Unchanged) - Always applies to the authenticated user
        if (req.method === 'POST') {
            const { date, points } = req.body;
            if (!date || !Array.isArray(points))
                return res.status(400).json({ message: 'Date and points[] are required.' });

            const key = buildKey(date, authenticatedUser);
            await kv.set(key, points);
            return res.status(200).json({ success: true, message: `Saved WIP for ${key}` });
        }

        // --- READ (GET) ---
        // (Logic updated to use the new "access" key)
        if (req.method === 'GET') {
            const { year, month, day, viewUser } = req.query;
            let targetUser;

            if (!viewUser || viewUser === authenticatedUser) {
                // Case 1: User is requesting their own data
                targetUser = authenticatedUser;
            } else {
                // Case 2: User is requesting someone else's data
                const owner = viewUser;

                // Check if the owner's name is in my "access" list
                const myAccessListKey = `access:${authenticatedUser}`;
                const hasAccess = await kv.sismember(myAccessListKey, owner);

                if (!hasAccess) {
                    return res.status(403).json({ message: "Forbidden: You do not have read access to this user's data." });
                }

                // Permission granted!
                targetUser = owner;
            }

            // --- All read operations now use targetUser ---

            // Specific day
            if (year && month && day) {
                const key = `wip:${targetUser}:${year}:${month}:${day}`;
                const data = await kv.get(key);
                return res.status(200).json({ data: { [key]: data || [] } });
            }

            // Whole month
            if (year && month) {
                const pattern = `wip:${targetUser}:${year}:${month}:*`;
                // (Note: kv.keys() can be slow on large datasets.
                // For a production app, you'd want to restructure this.)
                const keys = await kv.keys(pattern);
                const result = {};
                for (const key of keys) {
                    result[key] = await kv.get(key);
                }
                return res.status(200).json({ data: result });
            }

            // Whole year
            if (year) {
                const pattern = `wip:${targetUser}:${year}:*`;
                const keys = await kv.keys(pattern);
                const result = {};
                for (const key of keys) {
                    result[key] = await kv.get(key);
                }
                return res.status(200).json({ data: result });
            }

            // All data (for this user)
            const allKeys = await kv.keys(`wip:${targetUser}:*`);
            const all = {};
            for (const key of allKeys) {
                all[key] = await kv.get(key);
            }
            return res.status(200).json({ data: all });
        }

        // --- UPDATE (PUT) ---
        // (Unchanged) - Always applies to the authenticated user
        if (req.method === 'PUT') {
            const { date, points } = req.body;
            if (!date || !Array.isArray(points))
                return res.status(400).json({ message: 'Date and points[] are required.' });

            const key = buildKey(date, authenticatedUser);
            const existing = await kv.get(key);
            if (!existing)
                return res.status(404).json({ message: `No WIP found for ${key}` });

            await kv.set(key, points);
            return res.status(200).json({ success: true, message: `Updated WIP for ${key}` });
        }

        // --- DELETE ---
        // (Unchanged) - Always applies to the authenticated user
        if (req.method === 'DELETE') {
            const { year, month, day } = req.query;
            let pattern = `wip:${authenticatedUser}`;
            if (year) pattern += `:${year}`;
            if (year && month) pattern += `:${month}`;
            if (year && month && day) pattern += `:${day}`;
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
        console.error('WIP Handler Error:', err);
        return res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
}