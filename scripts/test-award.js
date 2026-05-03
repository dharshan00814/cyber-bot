const { Client, GatewayIntentBits } = require('discord.js');
const { awardDailyPoints } = require('../services/scheduler');

async function main() {
    const token = process.env.DISCORD_TOKEN;

    if (!token) {
        console.error('DISCORD_TOKEN is not set in environment. Set it and re-run.');
        process.exit(1);
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

    client.once('ready', async () => {
        console.log('Discord client ready. Running awardDailyPoints...');
        try {
            await awardDailyPoints(client);
            console.log('awardDailyPoints completed. Exiting.');
        } catch (e) {
            console.error('Error running awardDailyPoints:', e);
        } finally {
            client.destroy();
            process.exit(0);
        }
    });

    client.on('error', err => console.error('Client error:', err));

    await client.login(token);
}

main();
