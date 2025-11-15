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

    const { username, mobile } = req.body;
    if (!username || !mobile) return res.status(400).json({ message: "Username and mobile required" });

    const db = await getDb();
    const users = db.collection("users");
    const existingUser = await users.findOne({ username });
    if (existingUser) return res.status(409).json({ message: "Username already taken." });

    const tempPassword = crypto.randomBytes(3).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const user = { username, mobile, tempPassword, expiresAt };
    await users.insertOne(user);

    return res.status(200).json({
        message: "Temporary password generated. Valid for 24h.",
        tempPassword
    });
}
