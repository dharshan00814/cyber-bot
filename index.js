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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'dashboard')));

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'cyber-bot-dashboard-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}

app.use('/api/dashboard', requireAuth, dashboardRoutes);

app.get('/api/auth/check', (req, res) => {
    res.json({ authenticated: !!(req.session && req.session.isAdmin) });
});

app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.DASHBOARD_PASSWORD || 'admin123';

    if (password === adminPassword) {
        req.session.isAdmin = true;
        req.session.loginTime = new Date();
        return res.json({ success: true, message: 'Login successful' });
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Dashboard available at: http://localhost:${PORT}`);
});

connectDB();

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

client.on('error', error => {
    console.error('Client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);

module.exports = app;
