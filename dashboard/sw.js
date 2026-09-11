/**
 * Cyber Bot - Native Web Push Service Worker
 * Standard W3C Push API / Service Worker Specification
 */

self.addEventListener('install', (event) => {
    // Activate worker immediately without waiting for old workers to shut down
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Take immediate control of all open pages within scope
    event.waitUntil(self.clients.claim());
});

/**
 * Handle incoming Web Push message
 */
self.addEventListener('push', (event) => {
    let payload = {
        title: '🔔 New Event',
        body: 'A new community event has been scheduled!',
        url: '/',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
    };

    if (event.data) {
        try {
            const data = event.data.json();
            payload = {
                ...payload,
                ...data,
            };
        } catch (e) {
            // Fallback for non-JSON string payloads
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192.png',
        badge: payload.badge || '/icons/badge-72.png',
        tag: payload.tag || `cyberbot-event-${Date.now()}`,
        data: payload.data || { url: payload.url || '/' },
        renotify: true,
        requireInteraction: false,
        vibrate: [150, 75, 150],
        actions: [
            {
                action: 'open-event',
                title: 'View Event Details',
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
            },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

/**
 * Handle user tapping/clicking the notification
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there is already a window open with this application
            for (const client of clientList) {
                if ('focus' in client) {
                    if (client.url.includes(self.location.origin)) {
                        client.focus();
                        if ('navigate' in client && targetUrl !== '/') {
                            client.navigate(targetUrl);
                        }
                        return;
                    }
                }
            }

            // If no active window is open, open a new browser window/tab to the event page
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
