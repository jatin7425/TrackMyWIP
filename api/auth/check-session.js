import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "GET")
        return res.status(405).json({ message: "Method not allowed" });

    try {
        const { auth_token } = req.cookies || {};
        const { JWT_SECRET } = process.env;

        if (!auth_token || !JWT_SECRET) {
            return res.status(200).json({ loggedIn: false });
        }

        // Verify the JWT from the cookie
        const decoded = jwt.verify(auth_token, JWT_SECRET);

        return res.status(200).json({
            loggedIn: true,
            user: { username: decoded.username },
        });
    } catch (err) {
        // If verification fails (e.g. expired or invalid token)
        console.error("Session check error:", err.message);
        return res.status(200).json({ loggedIn: false });
    }
}
