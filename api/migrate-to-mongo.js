// api/migrate-to-mongo.js

import { kv } from "@vercel/kv";
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

export default async function handler(req, res) {
    if (req.method !== "POST")
        return res.status(405).json({ message: "Method not allowed" });

    try {
        const db = await getDb();

        const usersCol = db.collection("users");
        const otpsCol = db.collection("otps");
        const wipsCol = db.collection("wip_entries");
        const shareCol = db.collection("access_lists");

        // -------------------------------
        // USERS
        // -------------------------------
        const userKeys = await kv.keys("user:*");
        for (const key of userKeys) {
            const user = await kv.get(key);
            if (user?.username) {
                await usersCol.updateOne(
                    { username: user.username },
                    { $set: user },
                    { upsert: true }
                );
            }
        }

        // -------------------------------
        // OTPs
        // -------------------------------
        const otpKeys = await kv.keys("otp:*");
        for (const key of otpKeys) {
            const otp = await kv.get(key);
            const username = key.split(":")[1];

            await otpsCol.updateOne(
                { username },
                { $set: { username, ...otp } },
                { upsert: true }
            );
        }

        // -------------------------------
        // WIP ENTRIES
        //
        // KV key format:
        // wip:username:YYYY:MM:DD
        // -------------------------------
        const wipKeys = await kv.keys("wip:*");
        for (const key of wipKeys) {
            const parts = key.split(":");
            if (parts.length !== 5) continue;  // invalid key

            const [, username, year, month, day] = parts;

            const points = await kv.get(key) || [];

            await wipsCol.updateOne(
                { username, date: `${year}-${month}-${day}` },
                {
                    $set: {
                        username,
                        date: `${year}-${month}-${day}`,
                        year: Number(year),
                        month,
                        day,
                        points: Array.isArray(points) ? points : []
                    }
                },
                { upsert: true }
            );
        }

        // -------------------------------
        // ACCESS LISTS
        //
        // KV structure:
        // access:USERNAME is a SET of allowed users.
        // -------------------------------
        const accessKeys = await kv.keys("access:*");
        for (const key of accessKeys) {
            const owner = key.split(":")[1];
            const allowedUsers = await kv.smembers(key);

            await shareCol.updateOne(
                { owner },
                { $set: { owner, allowed_users: allowedUsers || [] } },
                { upsert: true }
            );
        }

        return res.status(200).json({
            success: true,
            message: "Mongo migration completed successfully."
        });

    } catch (err) {
        console.error("Migration error:", err);
        return res.status(500).json({
            success: false,
            message: "Migration failed",
            error: err.message
        });
    }
}
