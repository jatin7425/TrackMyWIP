import crypto from "crypto";
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
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: "Username required" });

    const db = await getDb();
    const users = db.collection("users");
    const otps = db.collection("otps");
    const user = await users.findOne({ username });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await otps.updateOne({ username }, { $set: { code: otp, expiresAt } }, { upsert: true });

    return res.status(200).json({
        success: true,
        message: "OTP has been sent to your mobile.",
        otpForTesting: otp // REMOVE THIS IN PRODUCTION
    });
}
