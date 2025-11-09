import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const getUsernameFromToken = (req) => {
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // --- Authentication ---
    const authenticatedUser = getUsernameFromToken(req);
    if (!authenticatedUser) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    // Define the keys for our permissions Sets
    // 1. List of users I have given access to:
    const myShareListKey = `share:${authenticatedUser}`;
    // 2. List of users whose data I can access:
    const myAccessListKey = `access:${authenticatedUser}`;

    try {
        // --- GRANT ACCESS (POST) ---
        if (req.method === 'POST') {
            const { shareWithUser } = req.body;
            if (!shareWithUser) {
                return res.status(400).json({ message: 'shareWithUser is required.' });
            }
            if (shareWithUser === authenticatedUser) {
                return res.status(400).json({ message: 'You cannot share with yourself.' });
            }

            // Check if the user we are sharing with actually exists
            const userExists = await kv.exists(`user:${shareWithUser}`);
            if (!userExists) {
                return res.status(404).json({ message: `User '${shareWithUser}' not found.` });
            }

            // Use a transaction to update both lists safely
            const tx = kv.multi();
            // Add user to my "share" list
            tx.sadd(myShareListKey, shareWithUser);
            // Add my name to their "access" list
            tx.sadd(`access:${shareWithUser}`, authenticatedUser);
            await tx.exec();

            return res.status(200).json({ success: true, message: `Successfully shared WIP data with ${shareWithUser}.` });
        }

        // --- LIST SHARES (GET) ---
        // This now returns BOTH lists
        if (req.method === 'GET') {
            const [iGaveAccessTo, iCanAccess] = await Promise.all([
                kv.smembers(myShareListKey),
                kv.smembers(myAccessListKey)
            ]);

            return res.status(200).json({
                success: true,
                iGaveAccessTo, // List of users I shared with
                iCanAccess     // List of users who shared with me
            });
        }

        // --- REVOKE ACCESS (DELETE) ---
        if (req.method === 'DELETE') {
            const { revokeUser } = req.body;
            if (!revokeUser) {
                return res.status(400).json({ message: 'revokeUser is required.' });
            }

            // Use a transaction to update both lists safely
            const tx = kv.multi();
            // Remove user from my "share" list
            tx.srem(myShareListKey, revokeUser);
            // Remove my name from their "access" list
            tx.srem(`access:${revokeUser}`, authenticatedUser);
            await tx.exec();

            return res.status(200).json({ success: true, message: `Stopped sharing WIP data with ${revokeUser}.` });
        }

        // --- Invalid Method ---
        res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'OPTIONS']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (err) {
        console.error('Share API Error:', err);
        return res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
}