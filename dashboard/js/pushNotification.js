/**
 * Cyber Bot - Client Web Push Notification Manager
 * Native Web Push API + Service Worker Registration
 */

const pushNotification = {
    vapidPublicKey: null,
    registration: null,

    /**
     * Convert Base64 URL safe string to Uint8Array for PushManager
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    },

    /**
     * Check if browser supports Service Workers & Push Notifications
     */
    isSupported() {
        return (
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window
        );
    },

    /**
     * Initialize Web Push UI and check existing subscription status
     */
    async init() {
        const btn = document.getElementById('push-notification-btn');
        if (!btn) return;

        if (!this.isSupported()) {
            console.warn('[Web Push] Browser does not support Push API');
            btn.style.display = 'none';
            return;
        }

        // Register Service Worker
        try {
            this.registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            console.log('[Web Push] Service Worker registered with scope:', this.registration.scope);
        } catch (err) {
            console.error('[Web Push] Service Worker registration failed:', err);
        }

        // Check current subscription status
        await this.checkCurrentStatus();

        btn.addEventListener('click', () => this.handleButtonClick());
    },

    /**
     * Check current permission and active subscription
     */
    async checkCurrentStatus() {
        const btn = document.getElementById('push-notification-btn');
        if (!btn) return;

        if (Notification.permission === 'denied') {
            this.renderButtonState(btn, 'denied');
            return;
        }

        if (Notification.permission === 'granted' && this.registration) {
            try {
                const sub = await this.registration.pushManager.getSubscription();
                if (sub) {
                    this.renderButtonState(btn, 'enabled');
                    return;
                }
            } catch (e) {
                console.warn('[Web Push] Error reading existing subscription:', e);
            }
        }

        this.renderButtonState(btn, 'prompt');
    },

    /**
     * Update button text, icon, and styling according to state
     */
    renderButtonState(btn, state) {
        btn.dataset.pushState = state;

        if (state === 'enabled') {
            btn.innerHTML = '<span class="push-btn-icon">✓</span><span class="push-btn-text">Notifications Enabled</span>';
            btn.className = 'btn btn-secondary btn-sm push-notification-btn state-enabled';
            btn.title = 'Push notifications are active on this device.';
            btn.disabled = true;
            btn.style.opacity = '0.85';
            btn.style.cursor = 'default';
        } else if (state === 'denied') {
            btn.innerHTML = '<span class="push-btn-icon">🚫</span><span class="push-btn-text">Notifications Blocked</span>';
            btn.className = 'btn btn-secondary btn-sm push-notification-btn state-blocked';
            btn.title = 'Notifications are blocked. Please enable them in your browser settings.';
            btn.disabled = false;
        } else if (state === 'subscribing') {
            btn.innerHTML = '<span class="loading-spinner push-btn-icon" style="width:14px;height:14px;display:inline-block;"></span><span class="push-btn-text">Enabling...</span>';
            btn.disabled = true;
        } else {
            btn.innerHTML = '<span class="push-btn-icon">🔔</span><span class="push-btn-text">Enable Notifications</span>';
            btn.className = 'btn btn-primary btn-sm push-notification-btn state-prompt';
            btn.title = 'Receive instant alerts on this device when events are created.';
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    },

    /**
     * Handle user clicking the notification button
     */
    async handleButtonClick() {
        const btn = document.getElementById('push-notification-btn');

        if (Notification.permission === 'denied') {
            alert('Notifications are blocked.\nPlease enable notifications for this site in your browser settings, then reload the page.');
            return;
        }

        if (btn.dataset.pushState === 'enabled') {
            return;
        }

        this.renderButtonState(btn, 'subscribing');

        try {
            // 1. Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                this.renderButtonState(btn, 'denied');
                if (typeof app !== 'undefined' && app.toast) {
                    app.toast('Notification permission was not granted.', 'warning');
                }
                return;
            }

            // 2. Fetch VAPID Public Key
            if (!this.vapidPublicKey) {
                const response = await fetch('/api/dashboard/push/vapid-public-key');
                if (!response.ok) {
                    throw new Error('Failed to retrieve VAPID public key from server');
                }
                const data = await response.json();
                this.vapidPublicKey = data.publicKey;
            }

            if (!this.vapidPublicKey) {
                throw new Error('VAPID public key is empty or not configured');
            }

            // 3. Ensure Service Worker ready with safety timeout
            let registration = this.registration;
            if (!registration) {
                try {
                    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                    this.registration = registration;
                } catch (regErr) {
                    console.warn('[Web Push] Retry register failed:', regErr);
                }
            }

            try {
                registration = await Promise.race([
                    navigator.serviceWorker.ready,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Service Worker took too long to activate. Please ensure sw.js is deployed.')), 7000)
                    )
                ]);
                this.registration = registration;
            } catch (readyErr) {
                console.warn('[Web Push] SW ready timeout, using registration directly:', readyErr.message);
                if (!registration) {
                    throw readyErr;
                }
            }

            const convertedVapidKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

            // 4. Subscribe via Push API
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey,
                });
            }

            const subJson = subscription.toJSON();

            // 5. Send subscription to server / Supabase
            const subscribeResponse = await fetch('/api/dashboard/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    p256dh: subJson.keys?.p256dh,
                    auth: subJson.keys?.auth,
                    userAgent: navigator.userAgent,
                }),
            });

            if (!subscribeResponse.ok) {
                const errorData = await subscribeResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save subscription on server');
            }

            this.renderButtonState(btn, 'enabled');

            if (typeof app !== 'undefined' && app.toast) {
                app.toast('🔔 Push notifications enabled on this device!', 'success');
            } else {
                alert('Push notifications enabled successfully!');
            }
        } catch (error) {
            console.error('[Web Push] Error enabling push notifications:', error);
            this.renderButtonState(btn, 'prompt');
            if (typeof app !== 'undefined' && app.toast) {
                app.toast(`Failed to enable notifications: ${error.message}`, 'error');
            } else {
                alert(`Failed to enable notifications: ${error.message}`);
            }
        }
    },
};

window.pushNotification = pushNotification;

document.addEventListener('DOMContentLoaded', () => {
    pushNotification.init();
});
