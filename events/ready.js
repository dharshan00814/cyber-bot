const { Events } = require('discord.js');
const registerCommands = require('../utils/registerCommands');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        await registerCommands(client);
    },
};
