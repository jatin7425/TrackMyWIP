import { serialize } from "cookie";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Clear the auth_token cookie by setting it expired
    const sessionCookie = serialize("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: "lax",
    });

    res.setHeader("Set-Cookie", sessionCookie);
    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error("Logout Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
