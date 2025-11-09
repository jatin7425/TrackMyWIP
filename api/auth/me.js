import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "supersecret";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization");
    if (req.method === "OPTIONS") return res.status(200).end();

    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Missing token" });

    const token = auth.split(" ")[1];
    try {
        const decoded = jwt.verify(token, SECRET);
        return res.status(200).json({ user: decoded });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
