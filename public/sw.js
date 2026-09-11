/**
 * Cyber Bot / Community Web App - Native Web Push Service Worker
 * Path: public/sw.js
 */

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

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
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192.png',
        badge: payload.badge || '/icons/badge-72.png',
        tag: payload.tag || `event-${Date.now()}`,
        data: payload.data || { url: payload.url || '/' },
        renotify: true,
        requireInteraction: false,
        vibrate: [150, 75, 150],
        actions: [
            { action: 'open-event', title: 'View Event Details' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client && client.url.includes(self.location.origin)) {
                    client.focus();
                    if ('navigate' in client && targetUrl !== '/') {
                        client.navigate(targetUrl);
                    }
                    return;
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
