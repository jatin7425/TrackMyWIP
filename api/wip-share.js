import jwt from "jsonwebtoken";
import { parse } from "cookie";
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

const getUsernameFromToken = (req) => {
    const { JWT_SECRET } = process.env;
    const cookies = parse(req.headers.cookie || "");
    const token = cookies.auth_token;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.username || null;
    } catch {
        return null;
    }
};

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") return res.status(200).end();

    const username = getUsernameFromToken(req);
    if (!username) return res.status(401).json({ message: "Unauthorized" });

    const db = await getDb();
    const usersCol = db.collection("users");
    const shareCol = db.collection("shares");

    try {
        // ------- POST → GRANT ACCESS -------
        if (req.method === "POST") {
            const { shareWithUser } = req.body;

            if (!shareWithUser)
                return res.status(400).json({ message: "shareWithUser is required." });

            if (shareWithUser === username)
                return res.status(400).json({ message: "Cannot share with yourself." });

            // Check if target user exists
            const userExists = await usersCol.findOne({ username: shareWithUser });
            if (!userExists)
                return res.status(404).json({ message: `User '${shareWithUser}' not found.` });

            // Update my outbox
            await shareCol.updateOne(
                { username },
                { $addToSet: { iGaveAccessTo: shareWithUser } },
                { upsert: true }
            );

            // Update their inbox
            await shareCol.updateOne(
                { username: shareWithUser },
                { $addToSet: { iCanAccess: username } },
                { upsert: true }
            );

            return res.status(200).json({
                success: true,
                message: `Shared WIP with ${shareWithUser}`
            });
        }

        // ------- GET → LIST WHO I SHARED WITH & WHO SHARED WITH ME -------
        if (req.method === "GET") {
            const doc = await shareCol.findOne({ username });
            return res.status(200).json({
                success: true,
                iGaveAccessTo: doc?.iGaveAccessTo || [],
                iCanAccess: doc?.iCanAccess || [],
            });
        }

        // ------- DELETE → REVOKE ACCESS -------
        if (req.method === "DELETE") {
            const { revokeUser } = req.body;

            if (!revokeUser)
                return res.status(400).json({ message: "revokeUser is required." });

            // Remove from my list
            await shareCol.updateOne(
                { username },
                { $pull: { iGaveAccessTo: revokeUser } }
            );

            // Remove me from theirs
            await shareCol.updateOne(
                { username: revokeUser },
                { $pull: { iCanAccess: username } }
            );

            return res.status(200).json({
                success: true,
                message: `Revoked sharing with ${revokeUser}`
            });
        }

        res.setHeader("Allow", ["GET", "POST", "DELETE", "OPTIONS"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (err) {
        console.error("Share API Error:", err);
        return res.status(500).json({ message: "Server Error" });
    }
}
