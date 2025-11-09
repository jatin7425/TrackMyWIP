// api/auth/login-verify.js
import { kv } from "@vercel/kv";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST")
        return res.status(405).json({ message: "Method not allowed" });

    const { username, otp } = req.body;
    if (!username || !otp)
        return res.status(400).json({ success: false, message: "Username and OTP required" });

    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET)
        return res.status(500).json({ success: false, message: "JWT Secret not configured." });

    try {
        const storedOtpData = await kv.get(`otp:${username}`);

        if (!storedOtpData) {
            return res.status(401).json({ success: false, message: "OTP not found or expired" });
        }

        if (storedOtpData.code !== otp) {
            return res.status(401).json({ success: false, message: "Invalid OTP" });
        }

        if (storedOtpData.expiresAt < Date.now()) {
            return res.status(401).json({ success: false, message: "OTP has expired" });
        }

        // --- Success ---
        // 1. Delete the used OTP
        await kv.del(`otp:${username}`);

        // 2. Create a session token (JWT)
        const token = jwt.sign(
            { username: username }, // Payload
            JWT_SECRET,             // Secret
            { expiresIn: '24h' }    // Expiry
        );

        // 3. Set the token in a secure, httpOnly cookie
        const sessionCookie = serialize('auth_token', token, {
            httpOnly: true,                 // Prevents client-side JS from accessing it
            secure: process.env.NODE_ENV !== 'development', // Use 'secure' in production (HTTPS)
            path: '/',                      // Available for the whole site
            maxAge: 24 * 60 * 60,           // 24 hours in seconds
        });

        res.setHeader('Set-Cookie', sessionCookie);
        return res.status(200).json({ success: true, message: "Login successful" });

    } catch (err) {
        console.error("Login Verify Error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}