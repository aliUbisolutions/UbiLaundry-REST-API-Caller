#!/usr/bin/env node
// Reset (or create) a local user's password directly in the data store.
//
// Passwords are stored as bcrypt hashes and cannot be recovered — this
// overwrites the hash for a user so you can sign in again.
//
// Usage (run from the project root, same machine/volume as the app's data):
//   node scripts/reset-password.mjs --list
//   node scripts/reset-password.mjs <username> <newPassword>
//   node scripts/reset-password.mjs <username> <newPassword> --create-admin
//
// The data directory is DATA_DIR if set (as in Docker), otherwise ./data.

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const args = process.argv.slice(2);
const createAdmin = args.includes('--create-admin');
const positional = args.filter(a => !a.startsWith('--'));

console.log(`Data directory: ${DATA_DIR}`);
const users = readUsers();

if (args.includes('--list') || (positional.length === 0 && !createAdmin)) {
  if (users.length === 0) {
    console.log('\nNo users found. To create one, run:\n  node scripts/reset-password.mjs <username> <password> --create-admin\n');
    console.log('(Or delete the data store\'s users.json and reopen the app to run first-time setup.)');
  } else {
    console.log('\nExisting users:');
    for (const u of users) console.log(`  - ${u.username} (${u.profile})`);
    console.log('\nTo reset one:\n  node scripts/reset-password.mjs <username> <newPassword>\n');
  }
  process.exit(0);
}

const [username, newPassword] = positional;
if (!username || !newPassword) {
  fail('Usage: node scripts/reset-password.mjs <username> <newPassword> [--create-admin]');
}

const hash = bcrypt.hashSync(newPassword, 10);
const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

if (idx === -1) {
  if (!createAdmin) {
    console.error(`\n✖ No user named "${username}".`);
    if (users.length) console.error(`  Existing users: ${users.map(u => u.username).join(', ')}`);
    console.error('  Add --create-admin to create it as an admin, or run with --list.\n');
    process.exit(1);
  }
  users.push({
    id: genId(),
    username,
    passwordHash: hash,
    profile: 'admin',
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    serverEnvAccess: 'all',
    allowedEndpoints: 'all',
  });
  writeUsers(users);
  console.log(`\n✓ Created admin user "${username}". You can now sign in with the new password.\n`);
} else {
  users[idx].passwordHash = hash;
  writeUsers(users);
  console.log(`\n✓ Password reset for "${users[idx].username}" (${users[idx].profile}). You can now sign in with the new password.\n`);
}
