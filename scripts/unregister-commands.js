const { REST, Routes } = require('discord.js');

async function main() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID; // optional; if present, will clear guild commands

    if (!token) {
        console.error('DISCORD_TOKEN is not set. Set it and re-run.');
        process.exit(1);
    }

    if (!clientId) {
        console.error('CLIENT_ID is not set. Set your application client ID and re-run.');
        process.exit(1);
    }

    const rest = new REST().setToken(token);

    try {
        if (guildId) {
            console.log(`Clearing all guild commands for guild ${guildId}...`);
            const data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: [] },
            );
            console.log(`Cleared ${Array.isArray(data) ? data.length : 0} guild commands.`);
        } else {
            console.log('Clearing all global application commands...');
            const data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: [] },
            );
            console.log(`Cleared ${Array.isArray(data) ? data.length : 0} global commands.`);
        }
        console.log('Done.');
    } catch (err) {
        console.error('Failed to clear commands:', err);
        process.exit(1);
    }
}

main();
