/**
 * One-time script to create the first v3 admin user.
 * Run from the repo root:
 *   node scripts/create-first-admin.mjs
 *
 * Reads Firebase credentials from packages/web/.env.local
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import readline from 'readline';

// ── Load .env.local ───────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../packages/web/.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '');
}

// ── Init Firebase Admin ───────────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert({
    project_id: env.FIREBASE_PROJECT_ID,
    private_key_id: env.FIREBASE_PRIVATE_KEY_ID,
    private_key: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: env.FIREBASE_CLIENT_EMAIL,
    client_id: env.FIREBASE_CLIENT_ID,
    auth_uri: env.FIREBASE_AUTH_URI,
    token_uri: env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: env.FIREBASE_CLIENT_CERT_URL,
  }),
});

const auth = admin.auth();
const db = admin.firestore();

// ── Prompt helper ─────────────────────────────────────────────────────────────
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n── Create First v3 Admin ──────────────────────────────────────\n');

  const email = (await prompt('Email [francisco.foyain@northhighland.com]: ')) || 'francisco.foyain@northhighland.com';
  const name = (await prompt('Display name [Francisco Foyain]: ')) || 'Francisco Foyain';
  const password = await prompt('Password (min 6 chars): ');

  if (!password || password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  // Check if user already exists in Firebase Auth
  let uid;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    console.log(`\nFirebase Auth user already exists (uid: ${uid}). Reusing.`);
    // Update password in case it changed
    await auth.updateUser(uid, { password, displayName: name });
  } catch {
    // Create new Firebase Auth user
    const created = await auth.createUser({ email, password, displayName: name });
    uid = created.uid;
    console.log(`\nCreated Firebase Auth user (uid: ${uid}).`);
  }

  // Upsert v3_users document
  const userRef = db.collection('v3_users').doc(uid);
  const existing = await userRef.get();

  if (existing.exists) {
    await userRef.update({ role: 'admin', active: true, name });
    console.log('Updated existing v3_users document → role: admin, active: true');
  } else {
    await userRef.set({
      uid,
      email: email.toLowerCase(),
      name,
      role: 'admin',
      active: true,
      createdAt: new Date(),
      lastLogin: null,
    });
    console.log('Created v3_users document → role: admin');
  }

  console.log('\n✓ Done! You can now log in at /auth/login with:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: (the one you just set)\n`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
