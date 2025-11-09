// api/auth/login-start.js
import { kv } from "@vercel/kv";
import crypto from "crypto";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST")
        return res.status(405).json({ message: "Method not allowed" });

    const { username } = req.body;
    if (!username)
        return res.status(400).json({ success: false, message: "Username required" });

    try {
        const user = await kv.get(`user:${username}`);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Generate a 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10-minute expiry

        // Store the OTP in KV
        await kv.set(`otp:${username}`, { code: otp, expiresAt }, { ex: 600 }); // 10 min expiry

        // --- Real-World Step ---
        // Here you would use an SMS API (like Twilio) to send:
        // `await sendSms(user.mobile, `Your WIP Tracker login code is: ${otp}`);`
        // --- End Real-World Step ---

        return res.status(200).json({
            success: true,
            message: "OTP has been sent to your mobile.",
            otpForTesting: otp // ⚠️ REMOVE THIS IN PRODUCTION. For testing only.
        });

    } catch (err) {
        console.error("Login Start Error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}