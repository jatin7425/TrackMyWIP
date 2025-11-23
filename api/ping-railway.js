export default async function handler(req, res) {
    try {
        // Replace with your actual Railway endpoint
        const RAILWAY_URL = process.env.RAILWAY_URL;

        if (!RAILWAY_URL) {
            return res.status(400).json({ error: "RAILWAY_URL not set" });
        }

        const response = await fetch(RAILWAY_URL, { method: "GET" });
        const text = await response.text();

        return res.status(200).json({
            ok: true,
            message: "Pinged Railway successfully",
            status: response.status,
            response: text.slice(0, 200) // to avoid huge logs
        });

    } catch (err) {
        return res.status(500).json({
            ok: false,
            error: err.message
        });
    }
}
