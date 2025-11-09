// api/auth/signup.js

import { kv } from "@vercel/kv";
import crypto from "crypto";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST")
        return res.status(405).json({ message: "Method not allowed" });

    const { username, mobile } = req.body;
    if (!username || !mobile)
        return res.status(400).json({ message: "Username and mobile required" });

    // Check if user already exists
    const existingUser = await kv.get(`user:${username}`);
    if (existingUser) {
        return res.status(409).json({ message: "Username already taken." });
    }

    const tempPassword = crypto.randomBytes(3).toString("hex"); // 6-char code
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h

    const user = { username, mobile, tempPassword, expiresAt };

    await kv.set(`user:${username}`, user);

    return res.status(200).json({
        message: "Temporary password generated. Valid for 24h.",
        tempPassword, // return for now (you can later send via SMS)
    });
}