import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

// NOTE: This module centralizes auth route handlers so we can expose a single
// Serverless Function for all /api/auth/* endpoints (reduces Vercel function count).

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

// OTP/signup routes have been removed entirely. This module only exposes
// session and OAuth-related handlers.

export async function checkSessionHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { auth_token } = req.cookies || {};
    const { JWT_SECRET } = process.env;
    if (!auth_token || !JWT_SECRET) {
      return res.status(200).json({ loggedIn: false });
    }
    const decoded = jwt.verify(auth_token, JWT_SECRET);
    return res.status(200).json({ loggedIn: true, user: { username: decoded.username } });
  } catch (err) {
    console.error('Session check error:', err && err.message ? err.message : err);
    return res.status(200).json({ loggedIn: false });
  }
}

export async function logoutHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  try {
    const sessionCookie = serialize('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax'
    });
    res.setHeader('Set-Cookie', sessionCookie);
    return res.status(200).json({ success: true, message: 'Logged out' });
  } catch (err) {
    console.error('Logout Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function meHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'Missing token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    return res.status(200).json({ user: decoded });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Google OAuth handlers (redirect and callback)
export async function loginGoogleHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { CLIENT_ID, REDIRECT_URI } = process.env;
  if (!CLIENT_ID || !REDIRECT_URI) {
    return res.status(500).json({ message: 'OAuth not configured' });
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account'
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.writeHead(302, { Location: url });
  return res.end();
}

export async function callbackGoogleHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
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
      const username = email;
      const newUser = { username, email, name: profile.name, oauthProvider: 'google', createdAt: Date.now() };
      const r = await users.insertOne(newUser);
      user = { ...newUser, _id: r.insertedId };
    }

    const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    const sessionCookie = serialize('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      maxAge: 24 * 60 * 60,
      sameSite: 'lax'
    });
    res.setHeader('Set-Cookie', sessionCookie);

    res.writeHead(302, { Location: '/view-wips' });
    return res.end();
  } catch (err) {
    console.error('Google callback error:', err);
    return res.status(500).json({ message: 'OAuth callback error' });
  }
}
