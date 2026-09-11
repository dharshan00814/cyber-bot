#!/usr/bin/env node
/**
 * VAPID Key Generator for Cyber Bot Web Push Notifications
 * Generates RFC 8292 compliant ECDH (P-256) VAPID key pairs using native Node.js crypto.
 * 
 * Usage:
 *   node scripts/generate-vapid-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateVapidKeys() {
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.generateKeys();

    const publicKey = ecdh.getPublicKey('base64url');
    const privateKey = ecdh.getPrivateKey('base64url');

    return {
        publicKey,
        privateKey,
    };
}

const keys = generateVapidKeys();
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@cyberbot.community';

console.log('\n======================================================');
console.log('  CYBER BOT - VAPID KEYS FOR WEB PUSH NOTIFICATIONS');
console.log('======================================================\n');
console.log('VAPID_PUBLIC_KEY:');
console.log(`  ${keys.publicKey}\n`);
console.log('VAPID_PRIVATE_KEY (Keep SECRET - Edge Function only!):');
console.log(`  ${keys.privateKey}\n`);
console.log('VAPID_SUBJECT:');
console.log(`  ${subject}\n`);
console.log('------------------------------------------------------');
console.log('1. Add to .env (for local dashboard/backend):');
console.log(`   VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`   VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`   VAPID_SUBJECT=${subject}`);
console.log('\n2. Add to Supabase Edge Function Secrets:');
console.log(`   npx supabase secrets set VAPID_PUBLIC_KEY=${keys.publicKey} VAPID_PRIVATE_KEY=${keys.privateKey} VAPID_SUBJECT=${subject}`);
console.log('======================================================\n');

module.exports = { generateVapidKeys };
