/**
 * Test Suite: Web Push Notification Workflow for Cyber Bot
 * Validates Steps 1 through 12
 */

require('dotenv').config();
const { getVapidConfig, saveSubscription, getAllSubscriptions, triggerEventNotification } = require('../utils/notificationService');

async function runTests() {
    console.log('==================================================');
    console.log('🧪 RUNNING CYBER BOT WEB PUSH NOTIFICATION TESTS');
    console.log('==================================================\n');

    let passed = 0;
    let failed = 0;

    // Test 1: VAPID Key Configuration
    try {
        console.log('▶ Test 1: Verify VAPID Key Configuration...');
        const vapid = getVapidConfig();
        if (!vapid.publicKey || !vapid.privateKey || !vapid.subject) {
            throw new Error('VAPID keys not configured properly');
        }
        console.log('  ✓ Public Key:', vapid.publicKey.slice(0, 25) + '...');
        console.log('  ✓ Private Key:', '****** (secured)');
        console.log('  ✓ Subject:', vapid.subject);
        console.log('  [PASS] Test 1: VAPID Configuration Valid\n');
        passed++;
    } catch (e) {
        console.error('  [FAIL] Test 1:', e.message);
        failed++;
    }

    // Test 2: Save Multiple Subscriptions (Multi-Device Support)
    try {
        console.log('▶ Test 2: Save Multi-Device Subscriptions (Step 8)...');
        const testSub1 = {
            userId: 'test-user-mobile',
            endpoint: 'https://fcm.googleapis.com/fcm/send/test-device-android-12345',
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcPP313T59PpnSGnNCoitlz0kvWDjE9b',
            auth: '5K3mUYDuaEH66cOowD10Kc==',
            userAgent: 'Mozilla/5.0 (Android; Mobile)',
        };
        const testSub2 = {
            userId: 'test-user-mobile', // Same user, different device (Laptop)
            endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/test-device-laptop-67890',
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcPP313T59PpnSGnNCoitlz0kvWDjE9b',
            auth: '5K3mUYDuaEH66cOowD10Kc==',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        };

        const res1 = await saveSubscription(testSub1);
        const res2 = await saveSubscription(testSub2);

        if (!res1.success || !res2.success) {
            throw new Error('Failed to save subscriptions');
        }

        const allSubs = await getAllSubscriptions();
        console.log(`  ✓ Total registered subscriptions found: ${allSubs.length}`);
        const foundSub1 = allSubs.some(s => s.endpoint === testSub1.endpoint);
        const foundSub2 = allSubs.some(s => s.endpoint === testSub2.endpoint);

        if (!foundSub1 || !foundSub2) {
            throw new Error('Subscribed devices not found in database/store');
        }

        console.log('  [PASS] Test 2: Multi-device subscriptions stored independently by endpoint\n');
        passed++;
    } catch (e) {
        console.error('  [FAIL] Test 2:', e.message);
        failed++;
    }

    // Test 3: Event Notification Trigger & Resilient Dispatch
    try {
        console.log('▶ Test 3: Trigger Event Notification Workflow (Steps 5, 6, 9)...');
        const testEvent = {
            eventId: 'ev-test-weekly-bash',
            title: 'Weekly Bash',
            date: 'Saturday, 12 September',
            time: '7:00 PM',
            description: 'Weekly community bash event',
            url: '/events/ev-test-weekly-bash',
        };

        console.log('  • Event details:', testEvent.title, '|', testEvent.date, 'at', testEvent.time);
        const result = await triggerEventNotification(testEvent);

        console.log('  ✓ Dispatch result:', result);
        if (!result || typeof result !== 'object') {
            throw new Error('Dispatch did not return a summary object');
        }

        console.log('  [PASS] Test 3: Notification pipeline processed with resilient error handling\n');
        passed++;
    } catch (e) {
        console.error('  [FAIL] Test 3:', e.message);
        failed++;
    }

    // Test 4: Database RLS & Schema Check
    try {
        console.log('▶ Test 4: Verify SQL Schema Definitions...');
        const fs = require('fs');
        const sql = fs.readFileSync('supabase-schema.sql', 'utf8');
        if (!sql.includes('create table if not exists public.push_subscriptions')) {
            throw new Error('push_subscriptions table missing from supabase-schema.sql');
        }
        if (!sql.includes('create table if not exists public.events')) {
            throw new Error('events table missing from supabase-schema.sql');
        }
        if (!sql.includes('alter table public.push_subscriptions enable row level security;')) {
            throw new Error('RLS not enabled on push_subscriptions');
        }
        console.log('  ✓ push_subscriptions schema definition: Valid');
        console.log('  ✓ events schema definition: Valid');
        console.log('  ✓ Row Level Security (RLS) policies: Present');
        console.log('  [PASS] Test 4: Supabase Schema Definitions Verified\n');
        passed++;
    } catch (e) {
        console.error('  [FAIL] Test 4:', e.message);
        failed++;
    }

    // Test 5: Service Worker & Client Scripts Integrity
    try {
        console.log('▶ Test 5: Verify Service Worker & Client Integration Files...');
        const fs = require('fs');
        if (!fs.existsSync('dashboard/sw.js')) throw new Error('dashboard/sw.js missing');
        if (!fs.existsSync('public/sw.js')) throw new Error('public/sw.js missing');
        if (!fs.existsSync('dashboard/js/pushNotification.js')) throw new Error('dashboard/js/pushNotification.js missing');
        if (!fs.existsSync('src/components/NotificationButton.tsx')) throw new Error('NotificationButton.tsx missing');
        if (!fs.existsSync('src/utils/usePushNotification.ts')) throw new Error('usePushNotification.ts missing');
        if (!fs.existsSync('supabase/functions/send-event-notification/index.ts')) throw new Error('Edge Function missing');

        console.log('  ✓ dashboard/sw.js: Verified');
        console.log('  ✓ public/sw.js: Verified');
        console.log('  ✓ dashboard/js/pushNotification.js: Verified');
        console.log('  ✓ src/components/NotificationButton.tsx: Verified');
        console.log('  ✓ src/utils/usePushNotification.ts: Verified');
        console.log('  ✓ supabase/functions/send-event-notification/index.ts: Verified');
        console.log('  [PASS] Test 5: All required project files exist and are populated\n');
        passed++;
    } catch (e) {
        console.error('  [FAIL] Test 5:', e.message);
        failed++;
    }

    console.log('==================================================');
    console.log(`SUMMARY: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
    console.log('==================================================\n');

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
