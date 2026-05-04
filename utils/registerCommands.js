const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function registerCommands(client) {
    const commands = [];
    const foldersPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(foldersPath)) return;

    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const applicationId = client.application?.id || process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID || process.env.CLIENT_ID;

    if (!applicationId) {
        console.error('Could not determine the Discord application ID for command registration.');
        return;
    }

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        let data;
        if (guildId) {
            data = await rest.put(
                Routes.applicationGuildCommands(applicationId, guildId),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} guild (/) commands.`);
        } else {
            data = await rest.put(
                Routes.applicationCommands(applicationId),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} global (/) commands.`);
        }
    } catch (error) {
        console.error(error);
    }
}

module.exports = registerCommands;
