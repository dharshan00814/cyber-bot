const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const pino = require('pino');

let baileysModule = null;
async function getBaileys() {
    if (!baileysModule) {
        baileysModule = await import('@whiskeysockets/baileys');
    }
    return baileysModule;
}

const AUTH_FOLDER = path.join(__dirname, '..', 'auth_info_baileys');

class WhatsAppService {
    constructor() {
        this.sock = null;
        this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
        this.qrCodeRaw = null;
        this.qrCodeDataUrl = null;
        this.user = null;
        this.lastError = null;
        this.groupsCache = [];
        this.lastGroupsFetch = 0;
        this.isInitializing = false;
        this.reconnectTimeout = null;
        this.autoReconnect = true;
    }

    getStatus() {
        return {
            status: this.status,
            connected: this.status === 'connected',
            user: this.user,
            qrCodeDataUrl: this.status === 'qr_ready' ? this.qrCodeDataUrl : null,
            lastError: this.lastError ? this.lastError.message : null,
            groupsCount: this.groupsCache.length,
        };
    }

    async init(autoConnect = true) {
        if (this.isInitializing || this.status === 'connected') {
            return this.getStatus();
        }

        this.isInitializing = true;
        this.status = 'connecting';
        this.lastError = null;

        try {
            const baileys = await getBaileys();
            const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = baileys;

            if (!fs.existsSync(AUTH_FOLDER)) {
                fs.mkdirSync(AUTH_FOLDER, { recursive: true });
            }

            const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
            const logger = pino({ level: 'silent' });

            this.sock = makeWASocket({
                auth: state,
                logger,
                browser: Browsers ? Browsers.windows('Desktop') : ['Cyber Bot', 'Chrome', '1.0.0'],
                syncFullHistory: false,
            });

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    this.qrCodeRaw = qr;
                    this.status = 'qr_ready';
                    try {
                        this.qrCodeDataUrl = await qrcode.toDataURL(qr, {
                            margin: 2,
                            width: 280,
                            color: {
                                dark: '#0f172a',
                                light: '#ffffff',
                            },
                        });
                        console.log('[WhatsApp] New QR code generated. Ready to scan from dashboard or mobile.');
                    } catch (qrErr) {
                        console.error('[WhatsApp] Failed to generate QR data URL:', qrErr);
                    }
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;
                    this.status = 'disconnected';
                    this.qrCodeRaw = null;
                    this.qrCodeDataUrl = null;
                    this.user = null;
                    this.lastError = lastDisconnect?.error || new Error('Connection closed');

                    console.log(`[WhatsApp] Connection closed. Reason: ${statusCode || 'unknown'}, shouldReconnect: ${shouldReconnect}`);

                    if (shouldReconnect && this.autoReconnect) {
                        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
                        this.reconnectTimeout = setTimeout(() => {
                            console.log('[WhatsApp] Attempting reconnect...');
                            this.isInitializing = false;
                            this.init(true).catch(e => console.error('[WhatsApp] Reconnect error:', e));
                        }, 5000);
                    }
                } else if (connection === 'open') {
                    this.status = 'connected';
                    this.qrCodeRaw = null;
                    this.qrCodeDataUrl = null;
                    this.lastError = null;

                    const botId = this.sock.user?.id || '';
                    const phone = botId.split(':')[0] || botId.split('@')[0];
                    this.user = {
                        id: botId,
                        phone,
                        name: this.sock.user?.name || 'Cyber Bot WhatsApp',
                    };

                    console.log(`[WhatsApp] Connected successfully as ${this.user.name} (${this.user.phone})`);

                    // Prefetch groups after short delay to let sync settle
                    setTimeout(() => {
                        this.fetchGroups().catch(err => console.warn('[WhatsApp] Initial group fetch error:', err));
                    }, 3000);
                }
            });

            this.isInitializing = false;
            return this.getStatus();
        } catch (error) {
            console.error('[WhatsApp] Initialization error:', error);
            this.status = 'disconnected';
            this.lastError = error;
            this.isInitializing = false;
            throw error;
        }
    }

    async fetchGroups(forceRefresh = false) {
        if (!this.sock || this.status !== 'connected') {
            return this.groupsCache;
        }

        const now = Date.now();
        if (!forceRefresh && this.groupsCache.length > 0 && now - this.lastGroupsFetch < 60000) {
            return this.groupsCache;
        }

        try {
            const rawGroups = await this.sock.groupFetchAllParticipating();
            const groupsList = Object.entries(rawGroups).map(([jid, meta]) => ({
                jid,
                name: meta.subject || 'Unnamed Group',
                participantsCount: meta.participants ? meta.participants.length : 0,
                desc: meta.desc ? meta.desc.toString() : '',
                owner: meta.owner || null,
            }));

            // Sort alphabetically
            groupsList.sort((a, b) => a.name.localeCompare(b.name));
            this.groupsCache = groupsList;
            this.lastGroupsFetch = now;
            return groupsList;
        } catch (error) {
            console.error('[WhatsApp] Error fetching groups:', error);
            return this.groupsCache;
        }
    }

    async sendGroupReminder(groupJid, messageText) {
        if (!this.sock || this.status !== 'connected') {
            throw new Error('WhatsApp bot is not connected. Please scan the QR code in the dashboard first.');
        }

        if (!groupJid) {
            throw new Error('Group JID is required to send reminder.');
        }

        let normalizedJid = groupJid.trim();
        if (!normalizedJid.includes('@')) {
            normalizedJid = `${normalizedJid}@g.us`;
        }

        if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
            throw new Error('Message text cannot be empty.');
        }

        try {
            const sentMessage = await this.sock.sendMessage(normalizedJid, {
                text: messageText.trim(),
            });

            console.log(`[WhatsApp] Reminder sent successfully to group ${normalizedJid}`);
            return {
                success: true,
                messageId: sentMessage?.key?.id,
                jid: normalizedJid,
                sentAt: new Date(),
            };
        } catch (error) {
            console.error(`[WhatsApp] Failed to send reminder to ${normalizedJid}:`, error);
            throw error;
        }
    }

    async disconnect() {
        this.autoReconnect = false;
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

        try {
            if (this.sock) {
                await this.sock.logout().catch(() => {});
                this.sock.end();
            }
        } catch (err) {
            console.warn('[WhatsApp] Disconnect warning:', err);
        }

        this.sock = null;
        this.status = 'disconnected';
        this.qrCodeRaw = null;
        this.qrCodeDataUrl = null;
        this.user = null;
        this.groupsCache = [];

        // Clear auth folder
        try {
            if (fs.existsSync(AUTH_FOLDER)) {
                fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
            }
        } catch (rmErr) {
            console.warn('[WhatsApp] Could not clean auth folder:', rmErr);
        }

        this.autoReconnect = true;
        return { success: true, message: 'WhatsApp session logged out and cleared.' };
    }
}

const whatsAppService = new WhatsAppService();
module.exports = whatsAppService;
