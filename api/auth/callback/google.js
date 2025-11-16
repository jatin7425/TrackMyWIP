import { MongoClient } from 'mongodb';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';

const MONGO_URL = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'wip_tracker';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    // parse code from querystring
    const urlBase = req.headers.host ? `https://${req.headers.host}` : 'http://localhost';
    const full = new URL(req.url, urlBase);
    const code = full.searchParams.get('code');
    if (!code) return res.status(400).json({ message: 'Missing code' });

    const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, JWT_SECRET } = process.env;
    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !JWT_SECRET) {
      return res.status(500).json({ message: 'OAuth or JWT not configured' });
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) {
      console.error('Token exchange failed', tokenJson);
      return res.status(400).json({ message: 'Token exchange failed' });
    }

    // Get user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` }
    });
    const profile = await userInfoRes.json();
    const email = profile.email;
    if (!email) return res.status(400).json({ message: 'Email not available from provider' });

    // Upsert user in DB
    const db = await getDb();
    const users = db.collection('users');
    let user = await users.findOne({ email });
    if (!user) {
      // create a new user. Use email as username to keep it unique.
      const username = email;
      const newUser = { username, email, name: profile.name, oauthProvider: 'google', createdAt: Date.now() };
      const r = await users.insertOne(newUser);
      user = { ...newUser, _id: r.insertedId };
    }

    // Issue JWT and set cookie
    const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    const sessionCookie = serialize('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      maxAge: 24 * 60 * 60,
      sameSite: 'lax'
    });
    res.setHeader('Set-Cookie', sessionCookie);

    // Redirect to app
    res.writeHead(302, { Location: '/view-wips' });
    return res.end();
  } catch (err) {
    console.error('Google callback error:', err);
    return res.status(500).json({ message: 'OAuth callback error' });
  }
}
