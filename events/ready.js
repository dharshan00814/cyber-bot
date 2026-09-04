const { Events, ActivityType } = require('discord.js');
const registerCommands = require('../utils/registerCommands');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        await registerCommands(client);
        
        client.user.setPresence({
            status: 'online',
            activities: [
                {
                    name: 'tracking student progress',
                    type: ActivityType.Watching,
                },
            ],
        });
    },
};
