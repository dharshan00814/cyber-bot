const { Events, ActivityType, Collection } = require('discord.js');
const registerCommands = require('../utils/registerCommands');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        await registerCommands(client);
        
        // Load commands into client.commands Collection
        client.commands = new Collection();
        const foldersPath = path.join(__dirname, '../commands');
        
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
                    }
                }
            }
            console.log(`✅ Loaded ${client.commands.size} commands into Collection.`);
        } else {
            console.warn('❌ commands/ folder not found.');
        }
        
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
