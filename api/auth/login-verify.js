import jwt from "jsonwebtoken";
import { serialize } from "cookie";
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

    const { username, otp } = req.body;
    if (!username || !otp) return res.status(400).json({ success: false, message: "Username and OTP required" });

    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET) return res.status(500).json({ success: false, message: "JWT Secret not configured." });

    const db = await getDb();
    const otps = db.collection("otps");
    try {
        const storedOtpData = await otps.findOne({ username });
        if (!storedOtpData) return res.status(401).json({ success: false, message: "OTP not found or expired" });
        if (storedOtpData.code !== otp) return res.status(401).json({ success: false, message: "Invalid OTP" });
        if (storedOtpData.expiresAt < Date.now()) return res.status(401).json({ success: false, message: "OTP has expired" });

        await otps.deleteOne({ username });

        const token = jwt.sign(
            { username: username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        const sessionCookie = serialize('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            path: '/',
            maxAge: 24 * 60 * 60,
        });
        res.setHeader('Set-Cookie', sessionCookie);

        return res.status(200).json({ success: true, message: "Login successful" });
    } catch (err) {
        console.error("Login Verify Error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}
