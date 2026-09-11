require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const connectDB = require('./utils/db');
const client = require('./utils/client');
const { startScheduler } = require('./services/scheduler');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure /sw.js is always served with application/javascript and Service-Worker-Allowed header
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'dashboard', 'sw.js'));
});

app.use(express.static(path.join(__dirname, 'dashboard')));

const crypto = require('crypto');

function getAuthSecret() {
    return process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || 'cyber-bot-dashboard-secret-change-in-production';
}

function generateAdminToken() {
    const secret = getAuthSecret();
    const payload = JSON.stringify({ role: 'admin', ts: Date.now() });
    const payloadBase64 = Buffer.from(payload).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
    return `${payloadBase64}.${signature}`;
}

function verifyAdminToken(token) {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payloadBase64, signature] = parts;
    const secret = getAuthSecret();
    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
    if (signature !== expectedSignature) return false;
    try {
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
        const maxAge = 14 * 24 * 60 * 60 * 1000; // 14 days
        if (Date.now() - payload.ts > maxAge) return false;
        return payload.role === 'admin';
    } catch {
        return false;
    }
}

app.use(
    session({
        secret: getAuthSecret(),
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

function requireAuth(req, res, next) {
    // 1. Check session
    if (req.session && req.session.isAdmin) {
        return next();
    }

    // 2. Check Bearer token or x-admin-token (Works 100% on Vercel Serverless & mobile)
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || req.headers['x-dashboard-auth'];
    if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        const adminPassword = process.env.DASHBOARD_PASSWORD || 'admin123';
        if (token === adminPassword || verifyAdminToken(token)) {
            if (req.session) {
                req.session.isAdmin = true;
            }
            return next();
        }
    }

    return res.status(401).json({ error: 'Unauthorized' });
}

// Public Web Push endpoints for community members
app.get('/api/dashboard/push/vapid-public-key', (req, res) => {
    const { getVapidConfig } = require('./utils/notificationService');
    res.json({ publicKey: getVapidConfig().publicKey });
});

app.post('/api/dashboard/push/subscribe', async (req, res) => {
    const { saveSubscription } = require('./utils/notificationService');
    try {
        const { endpoint, p256dh, auth, userAgent, userId } = req.body;
        const result = await saveSubscription({
            endpoint,
            p256dh,
            auth,
            userAgent,
            userId: userId || req.session?.userId || 'community-device',
        });
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.use('/api/dashboard', requireAuth, dashboardRoutes);

app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.json({ authenticated: true });
    }
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || req.headers['x-dashboard-auth'];
    if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        const adminPassword = process.env.DASHBOARD_PASSWORD || 'admin123';
        if (token === adminPassword || verifyAdminToken(token)) {
            return res.json({ authenticated: true });
        }
    }
    res.json({ authenticated: false });
});

app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.DASHBOARD_PASSWORD || 'admin123';

    if (password === adminPassword) {
        if (req.session) {
            req.session.isAdmin = true;
            req.session.loginTime = new Date();
        }
        const token = generateAdminToken();
        return res.json({ success: true, token, message: 'Login successful' });
    }

    return res.status(401).json({ error: 'Invalid password' });
});



app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logout successful' });
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

const PORT = process.env.PORT || 3000;
const isVercel = Boolean(process.env.VERCEL);

connectDB();

if (!isVercel) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Dashboard available at: http://localhost:${PORT}`);
    });

    const foldersPath = path.join(__dirname, 'commands');
    if (fs.existsSync(foldersPath)) {
        const commandFolders = fs.readdirSync(foldersPath);
        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }
    }

    const eventsPath = path.join(__dirname, 'events');
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
        }
    }

    const whatsAppService = require('./services/whatsapp');
    startScheduler(client);

    // Initialize WhatsApp connection in background
    whatsAppService.init(true).catch(err => {
        console.warn('[WhatsApp] Startup initialization note:', err.message);
    });

    async function updateBotHeartbeat() {
        if (!client || !client.isReady()) return;
        try {
            const Setting = require('./models/Settings');
            const statusData = {
                online: true,
                user: client.user ? client.user.tag : 'Cyber Bot',
                guilds: client.guilds?.cache?.size || 0,
                ping: client.ws?.ping ?? 0,
                uptime: client.uptime || 0,
                lastSeen: Date.now(),
            };
            let setting = await Setting.findOne({ key: 'discord_bot_heartbeat' });
            if (!setting) {
                setting = new Setting({
                    key: 'discord_bot_heartbeat',
                    value: JSON.stringify(statusData),
                    category: 'bot',
                });
            } else {
                setting.value = JSON.stringify(statusData);
                setting.updatedAt = new Date();
            }
            await setting.save();
        } catch (err) {
            // Heartbeat update non-blocking
        }
    }

    client.on('error', error => {
        console.error('Client error:', error);
    });

    client.once('ready', () => {
        console.log(`[Discord] Bot connected and ready as ${client.user?.tag}`);
        updateBotHeartbeat();
        setInterval(updateBotHeartbeat, 25000);
    });

    process.on('unhandledRejection', error => {
        console.error('Unhandled rejection:', error);
    });

    if (process.env.DISCORD_TOKEN) {
        client.login(process.env.DISCORD_TOKEN).catch(err => {
            console.warn('[Discord] Bot login note:', err.message);
        });
    }
}

module.exports = app;
