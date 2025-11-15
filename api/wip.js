import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { MongoClient } from "mongodb";

const MONGO_URL = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "wip_tracker";

let client;
let db;

async function getDb() {
    if (db) return db;

    client = new MongoClient(MONGO_URL);
    await client.connect();

    db = client.db(DB_NAME);
    return db;
}

// ------------------ AUTH HELPER ------------------
const getUsernameFromToken = (req) => {
    const { JWT_SECRET } = process.env;
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.username || null;
    } catch {
        return null;
    }
};

// ------------------ MAIN HANDLER ------------------
export default async function handler(req, res) {
    // --- CORS ---
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // --- AUTH ---
    const authenticatedUser = getUsernameFromToken(req);
    if (!authenticatedUser) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // --- DB INIT ---
    const db = await getDb();
    const WIP = db.collection('wip_entries');
    const ACCESS = db.collection('access_lists');

    try {
        // ------------------------------------------------------
        // CREATE (POST)
        // ------------------------------------------------------
        if (req.method === 'POST') {
            const { date, points } = req.body;

            if (!date || !Array.isArray(points)) {
                return res.status(400).json({ message: 'date and points[] required' });
            }

            const d = new Date(date);
            const doc = {
                username: authenticatedUser,
                date,
                year: d.getFullYear(),
                month: String(d.getMonth() + 1).padStart(2, '0'),
                day: String(d.getDate()).padStart(2, '0'),
                points
            };

            await WIP.updateOne(
                { username: authenticatedUser, date },
                { $set: doc },
                { upsert: true }
            );

            return res.json({ success: true });
        }

        // ------------------------------------------------------
        // READ (GET)
        // ------------------------------------------------------
        if (req.method === 'GET') {
            const { year, month, day, viewUser } = req.query;

            let targetUser;

            if (!viewUser || viewUser === authenticatedUser) {
                targetUser = authenticatedUser;
            } else {
                // Permission check -- viewer should be allowed by the owner (viewUser).
                // Find the access list for the owner we want to view, then check
                // whether the authenticated viewer is present in that owner's allowed_users.
                const accessDoc = await ACCESS.findOne({ owner: viewUser });

                const allowed = accessDoc?.allowed_users?.includes(authenticatedUser);
                if (!allowed) {
                    return res.status(403).json({ message: 'Forbidden' });
                }

                targetUser = viewUser;
            }

            const filter = { username: targetUser };

            if (year) filter.year = Number(year);
            if (month) filter.month = month;
            if (day) filter.day = day;

            const items = await WIP.find(filter).toArray();

            return res.json({ data: items });
        }

        // ------------------------------------------------------
        // UPDATE (PUT)
        // ------------------------------------------------------
        if (req.method === 'PUT') {
            const { date, points } = req.body;

            if (!date || !Array.isArray(points)) {
                return res.status(400).json({ message: 'date and points[] required' });
            }

            const existing = await WIP.findOne({ username: authenticatedUser, date });
            if (!existing) {
                return res.status(404).json({ message: 'No entry found' });
            }

            await WIP.updateOne(
                { username: authenticatedUser, date },
                { $set: { points } }
            );

            return res.json({ success: true });
        }

        // ------------------------------------------------------
        // DELETE
        // ------------------------------------------------------
        if (req.method === 'DELETE') {
            const { year, month, day } = req.query;

            const filter = { username: authenticatedUser };

            if (year) filter.year = Number(year);
            if (month) filter.month = month;
            if (day) filter.day = day;

            const result = await WIP.deleteMany(filter);

            return res.json({ success: true, deleted: result.deletedCount });
        }

        // Invalid
        return res.status(405).send("Method Not Allowed");

    } catch (err) {
        console.error("Mongo Handler Error:", err);
        return res.status(500).json({ message: 'Internal Error' });
    }
}
