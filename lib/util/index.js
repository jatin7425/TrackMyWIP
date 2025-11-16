export async function supportUPI(req, res) {
    const supportUPI = process.env.SUPPORT_UPI;

    if (!supportUPI) {
        return res.status(500).json({ error: "UPI not set" });
    }

    const upiURL = `upi://pay?pa=${supportUPI}&pn=TrackMyWIP&am=20&cu=INR&tn=Support%20TrackMyWIP`;

    res.json({
        upi: supportUPI,
        link: upiURL,
        qr: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiURL)}`
    });
}
