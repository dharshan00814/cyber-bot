const { Client, GatewayIntentBits } = require('discord.js');
const Member = require('../models/Member');
require('dotenv').config();

/**
 * Script to display the leaderboard of all members by XP points
 * 
 * Usage:
 * node scripts/leaderboard.js [TOP_N]
 * 
 * Examples:
 * node scripts/leaderboard.js         (shows top 10 members)
 * node scripts/leaderboard.js 20      (shows top 20 members)
 * node scripts/leaderboard.js 5       (shows top 5 members)
 */

const TRACK_GUILD_ID = '1497878851693318204';
const TOP_N = parseInt(process.argv[2]) || 10;

async function main() {
    const token = process.env.DISCORD_TOKEN;

    if (!token) {
        console.error('❌ DISCORD_TOKEN is not set in environment.');
        process.exit(1);
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
        ],
    });

    client.once('ready', async () => {
        console.log('✅ Discord client ready\n');
        try {
            await displayLeaderboard(client, TOP_N);
        } catch (e) {
            console.error('❌ Error:', e.message);
        } finally {
            client.destroy();
            process.exit(0);
        }
    });

    client.on('error', err => {
        console.error('❌ Client error:', err);
        process.exit(1);
    });

    await client.login(token);
}

async function displayLeaderboard(client, topN = 10) {
    try {
        console.log('='.repeat(80));
        console.log(`🏆 TOP ${topN} LEADERBOARD 🏆`.padStart(45));
        console.log('='.repeat(80));
        console.log('');

        // Fetch all members and sort by XP
        const members = await Member.find().exec();
        
        if (!members || members.length === 0) {
            console.log('📭 No members found in database.');
            console.log('='.repeat(80));
            return;
        }

        // Sort by XP in descending order
        members.sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));

        // Get top N members
        const topMembers = members.slice(0, topN);

        // Create leaderboard display with enhanced formatting
        const headerLine = `${'RANK'.padEnd(6)} ${'NAME'.padEnd(28)} ${'XP'.padEnd(10)} ${'ACTIVITY'.padEnd(10)} ${'JOINED'.padEnd(12)}`;
        console.log(headerLine);
        console.log('-'.repeat(80));

        topMembers.forEach((member, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
            const rankDisplay = `${medal} #${rank}`.padEnd(6);
            const xp = (member.xp ?? 0).toString();
            const activityScore = (member.activityScore ?? 0).toString();
            const name = (member.name || 'Unknown').slice(0, 25).padEnd(28);
            
            // Format join date
            let joinedDate = 'N/A';
            if (member.joinDate) {
                const date = new Date(member.joinDate);
                joinedDate = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: '2-digit'
                });
            }
            
            const line = `${rankDisplay} ${name} ${xp.padEnd(10)} ${activityScore.padEnd(10)} ${joinedDate.padEnd(12)}`;
            console.log(line);
        });

        console.log('-'.repeat(80));
        console.log('');
        console.log(`📊 STATISTICS:`);
        console.log(`   Total Members: ${members.length}`);
        console.log(`   Top Member XP: ${(topMembers[0]?.xp ?? 0)} XP`);
        console.log(`   Average XP: ${(members.reduce((sum, m) => sum + (m.xp ?? 0), 0) / members.length).toFixed(2)} XP`);
        console.log('');
        console.log('='.repeat(80));

    } catch (err) {
        console.error('❌ Error displaying leaderboard:', err.message);
        throw err;
    }
}

main();
