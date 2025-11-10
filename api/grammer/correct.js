

async function correctGrammarServer(text) {
    try {
        const API_KEY = "";
        const response = await fetch('https://api.linguix.com/api/v1/checker', {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            console.error('Linguix API error:', response.status, response.statusText);
            return text;
        }

        const data = await response.json();

        // Linguix returns array of matches
        const matches = data.matches || [];
        return applyCorrections(text, matches);
    } catch (error) {
        console.error('Error calling Linguix API:', error.message);
        return text;
    }
}

function applyCorrections(text, matches) {
    let corrected = text;
    for (const match of matches.reverse()) {
        const replacement = match.replacement || '';
        const offset = match.offset || 0;
        const length = match.length || 0;
        corrected =
            corrected.slice(0, offset) + replacement + corrected.slice(offset + length);
    }
    return corrected;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { text } = req.body;
        if (!text)
            return res.status(400).json({ message: 'Text is required for correction.' });

        const correctedText = await correctGrammarServer(text);
        console.log('Corrected Text:', correctedText);

        return res.status(200).json({ success: true, text: correctedText });
    } catch (err) {
        console.error('Grammar Correction Error:', err);
        return res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
}
