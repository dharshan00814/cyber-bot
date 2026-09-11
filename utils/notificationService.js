const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const { getSupabaseClient } = require('./supabaseStore');

// Local storage fallback for push subscriptions
const localStorePath = path.join(__dirname, 'localStore.json');

function getVapidConfig() {
    return {
        publicKey: process.env.VAPID_PUBLIC_KEY || 'BFuDObSykDy5VEp9DIfzMLVamc2WzQPYlk6RO-JmxsR90uE0wRZMSsfqL_Jf6vuol_4AeiRLFPoMGdig98T3rTQ',
        privateKey: process.env.VAPID_PRIVATE_KEY || 'sK3mUYDuaEH66cOowD10KcTa8i6x6qXuuCeziOJy99Y',
        subject: process.env.VAPID_SUBJECT || 'mailto:admin@cyberbot.community',
    };
}

// Initialize web-push if keys are available
try {
    const config = getVapidConfig();
    if (config.publicKey && config.privateKey) {
        webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    }
} catch (err) {
    console.warn('[NotificationService] VAPID initialization note:', err.message);
}

/**
 * Save or update a device push subscription
 */
async function saveSubscription({ userId, endpoint, p256dh, auth, userAgent }) {
    if (!endpoint || !p256dh || !auth) {
        throw new Error('Subscription requires endpoint, p256dh, and auth parameters');
    }

    const effectiveUserId = userId || 'anonymous-device';
    const now = new Date().toISOString();

    const supabase = getSupabaseClient();
    let savedInSupabase = false;

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('push_subscriptions')
                .upsert(
                    {
                        user_id: effectiveUserId,
                        endpoint,
                        p256dh,
                        auth,
                        user_agent: userAgent || '',
                        updated_at: now,
                    },
                    { onConflict: 'endpoint' }
                );

            if (!error) {
                savedInSupabase = true;
            } else {
                console.warn('[NotificationService] Supabase subscription upsert warning:', error.message);
            }
        } catch (e) {
            console.warn('[NotificationService] Supabase connection error:', e.message);
        }
    }

    // Always maintain local fallback store sync
    try {
        if (fs.existsSync(localStorePath)) {
            const store = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
            if (!store.push_subscriptions) {
                store.push_subscriptions = [];
            }

            const existingIdx = store.push_subscriptions.findIndex(s => s.endpoint === endpoint);
            const entry = {
                id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                user_id: effectiveUserId,
                endpoint,
                p256dh,
                auth,
                user_agent: userAgent || '',
                created_at: existingIdx >= 0 ? store.push_subscriptions[existingIdx].created_at : now,
                updated_at: now,
            };

            if (existingIdx >= 0) {
                store.push_subscriptions[existingIdx] = entry;
            } else {
                store.push_subscriptions.push(entry);
            }

            fs.writeFileSync(localStorePath, JSON.stringify(store, null, 2), 'utf8');
        }
    } catch (e) {
        console.error('[NotificationService] Local store subscription sync error:', e.message);
    }

    return { success: true, savedInSupabase };
}

/**
 * Retrieve all active push subscriptions from Supabase or local fallback
 */
async function getAllSubscriptions() {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('push_subscriptions')
                .select('id, user_id, endpoint, p256dh, auth');

            if (!error && Array.isArray(data) && data.length > 0) {
                return data;
            }
        } catch (e) {
            console.warn('[NotificationService] Error reading subscriptions from Supabase:', e.message);
        }
    }

    // Local store fallback
    try {
        if (fs.existsSync(localStorePath)) {
            const store = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
            return store.push_subscriptions || [];
        }
    } catch (e) {
        console.error('[NotificationService] Local store read error:', e.message);
    }

    return [];
}

/**
 * Remove expired or invalid subscription from database and local store
 */
async function removeExpiredSubscription(endpoint) {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        } catch (e) {
            console.warn('[NotificationService] Failed to delete from Supabase:', e.message);
        }
    }

    try {
        if (fs.existsSync(localStorePath)) {
            const store = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
            if (store.push_subscriptions) {
                store.push_subscriptions = store.push_subscriptions.filter(s => s.endpoint !== endpoint);
                fs.writeFileSync(localStorePath, JSON.stringify(store, null, 2), 'utf8');
            }
        }
    } catch (e) {
        console.error('[NotificationService] Local store deletion error:', e.message);
    }
}

/**
 * Trigger event notification workflow:
 * 1. Calls Supabase Edge Function 'send-event-notification'
 * 2. Falls back to direct native Web Push if Edge Function is offline / not yet deployed
 */
async function triggerEventNotification({ eventId, title, date, time, description, url }) {
    const payload = {
        eventId: eventId || `ev-${Date.now()}`,
        title: title || 'Community Event',
        date: date || 'Today',
        time: time || 'Soon',
        description: description || '',
        url: url || `/events/${eventId || ''}`,
    };

    const supabase = getSupabaseClient();

    // 1. Attempt Supabase Edge Function invocation
    if (supabase && typeof supabase.functions?.invoke === 'function') {
        try {
            console.log(`[NotificationService] Invoking Supabase Edge Function 'send-event-notification' for event: ${payload.title}`);
            const { data, error } = await supabase.functions.invoke('send-event-notification', {
                body: payload,
                headers: {
                    'x-dashboard-auth': process.env.DASHBOARD_PASSWORD || 'admin123',
                },
            });

            if (!error && data && data.success) {
                console.log('[NotificationService] Edge Function dispatched successfully:', data);
                return { source: 'edge-function', ...data };
            }

            if (error) {
                console.warn('[NotificationService] Edge Function error, falling back to direct Web Push:', error.message);
            }
        } catch (edgeErr) {
            console.warn('[NotificationService] Edge Function invoke failed, proceeding with direct push fallback:', edgeErr.message);
        }
    }

    // 2. Direct Node.js Web Push Fallback
    const subscriptions = await getAllSubscriptions();
    if (subscriptions.length === 0) {
        console.log('[NotificationService] No active push subscriptions found.');
        return { success: true, sent: 0, failed: 0, removed: 0, message: 'No registered devices' };
    }

    const notificationData = JSON.stringify({
        title: `🔔 New Event`,
        body: `${payload.title}\n\n📅 ${payload.date}\n⏰ ${payload.time}${payload.description ? `\n\n${payload.description}` : ''}`,
        url: payload.url,
        data: {
            eventId: payload.eventId,
            url: payload.url,
            timestamp: Date.now(),
        },
    });

    let sent = 0;
    let failed = 0;
    let removed = 0;

    const pushPromises = subscriptions.map(async (sub) => {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                },
                notificationData,
                { TTL: 86400, urgency: 'high' }
            );
            sent++;
        } catch (err) {
            const status = err.statusCode || err.status;
            if (status === 404 || status === 410) {
                await removeExpiredSubscription(sub.endpoint);
                removed++;
            } else {
                failed++;
                console.warn(`[NotificationService] Push delivery failed for ${sub.endpoint.slice(0, 30)}:`, err.message);
            }
        }
    });

    await Promise.allSettled(pushPromises);

    const summary = {
        success: true,
        sent,
        failed,
        removed,
        total: subscriptions.length,
        source: 'backend-webpush',
    };

    console.log('[NotificationService] Direct Web Push completed:', summary);
    return summary;
}

module.exports = {
    getVapidConfig,
    saveSubscription,
    getAllSubscriptions,
    triggerEventNotification,
};
