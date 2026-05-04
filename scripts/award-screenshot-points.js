const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const Member = require('../models/Member');
require('dotenv').config();

/**
 * Script to award 10 points to all members who have submitted screenshots
 * in a specific channel or to all guild members
 * 
 * Usage:
 * node scripts/award-screenshot-points.js [CHANNEL_ID] [POINTS]
 * 
 * Examples:
 * node scripts/award-screenshot-points.js 1497882232843669514 10  (awards 10 points to members in channel)
 * node scripts/award-screenshot-points.js                          (awards 10 points to all guild members)
 */

const TRACK_GUILD_ID = '1497878851693318204';
const CHANNEL_ID = process.argv[2] || '1497882232843669514';  // Default to provided channel ID
const POINTS_TO_AWARD = parseInt(process.argv[3]) || 10;

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
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.MessageContent,
        ],
    });

    client.once('ready', async () => {
        console.log('✅ Discord client ready');
        try {
            await awardScreenshotPoints(client);
            console.log('✅ Points awarded successfully.');
            console.log('\n' + '='.repeat(60));
            await displayLeaderboard(client);
            console.log('='.repeat(60) + '\n');
            console.log('✅ Leaderboard displayed. Exiting.');
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

async function awardScreenshotPoints(client) {
    try {
        const guild = await client.guilds.fetch(TRACK_GUILD_ID);
        if (!guild) {
            console.error(`❌ Guild not found: ${TRACK_GUILD_ID}`);
            return;
        }

        console.log(`📍 Guild found: ${guild.name}`);

        // Try to fetch the channel
        let channel;
        try {
            channel = await client.channels.fetch(CHANNEL_ID);
        } catch (err) {
            console.warn(`⚠️  Channel ${CHANNEL_ID} not found or not accessible. Awarding points to all guild members.`);
            await awardPointsToAllMembers(guild);
            return;
        }

        if (!channel) {
            console.warn('⚠️  Channel not found. Awarding points to all guild members.');
            await awardPointsToAllMembers(guild);
            return;
        }

        // If it's a text channel, get members who submitted messages
        if (channel.type === ChannelType.GuildText) {
            console.log(`📢 Channel found: ${channel.name}`);
            await awardPointsFromChannel(channel, guild);
        } else {
            console.warn('⚠️  Channel is not a text channel. Awarding points to all guild members.');
            await awardPointsToAllMembers(guild);
        }
    } catch (err) {
        console.error('❌ Error in awardScreenshotPoints:', err.message);
        throw err;
    }
}

async function awardPointsFromChannel(channel, guild) {
    try {
        console.log(`\n🔍 Fetching messages from ${channel.name}...`);

        // Fetch recent messages (up to 100)
        const messages = await channel.messages.fetch({ limit: 100 });
        const memberIds = new Set();

        for (const message of messages.values()) {
            // Only count messages from non-bot users
            if (!message.author.bot) {
                // Check if message has attachments (screenshots/images)
                if (message.attachments.size > 0) {
                    memberIds.add(message.author.id);
                    console.log(`  📸 ${message.author.username} - ${message.attachments.size} attachment(s)`);
                }
            }
        }

        if (memberIds.size === 0) {
            console.log('⚠️  No messages with attachments found in this channel.');
            return;
        }

        console.log(`\n💰 Awarding ${POINTS_TO_AWARD} points to ${memberIds.size} member(s)...`);

        let successCount = 0;
        for (const userId of memberIds) {
            try {
                let member = await Member.findOne({ userId });

                if (member) {
                    member.xp = (member.xp ?? 0) + POINTS_TO_AWARD;
                    member.activityScore = (member.activityScore ?? 0) + 1;
                    member.lastActiveDate = new Date();
                    await member.save();
                } else {
                    // Create new member record if doesn't exist
                    const guildMember = await guild.members.fetch(userId);
                    const newMember = new Member({
                        userId: userId,
                        name: guildMember.user.username,
                        joinDate: new Date(),
                        xp: POINTS_TO_AWARD,
                        activityScore: 1,
                        lastActiveDate: new Date(),
                    });
                    await newMember.save();
                }
                console.log(`  ✅ User ${userId} awarded ${POINTS_TO_AWARD} points`);
                successCount++;
            } catch (err) {
                console.error(`  ❌ Error awarding points to member ${userId}:`, err.message);
            }
        }

        console.log(`\n📊 Summary: Successfully awarded points to ${successCount}/${memberIds.size} members`);
    } catch (err) {
        console.error('❌ Error in awardPointsFromChannel:', err.message);
        throw err;
    }
}

async function awardPointsToAllMembers(guild) {
    try {
        console.log('\n👥 Fetching all guild members...');
        const guildMembers = await guild.members.fetch();
        let successCount = 0;

        for (const guildMember of guildMembers.values()) {
            if (guildMember.user?.bot) continue;

            try {
                const userId = guildMember.user.id;
                let member = await Member.findOne({ userId });

                if (member) {
                    member.xp = (member.xp ?? 0) + POINTS_TO_AWARD;
                    member.activityScore = (member.activityScore ?? 0) + 1;
                    member.lastActiveDate = new Date();
                    await member.save();
                } else {
                    const newMember = new Member({
                        userId: userId,
                        name: guildMember.user.username,
                        joinDate: new Date(),
                        xp: POINTS_TO_AWARD,
                        activityScore: 1,
                        lastActiveDate: new Date(),
                    });
                    await newMember.save();
                }
                successCount++;
            } catch (err) {
                console.error(`❌ Error awarding points to member ${guildMember.user?.id}:`, err.message);
            }
        }

        console.log(`\n📊 Summary: Successfully awarded ${POINTS_TO_AWARD} points to ${successCount} members`);
    } catch (err) {
        console.error('❌ Error in awardPointsToAllMembers:', err.message);
        throw err;
    }
}

async function displayLeaderboard(client, topN = 10) {
    try {
        console.log(`\n🏆 TOP ${topN} LEADERBOARD 🏆\n`);

        // Fetch all members and sort by XP
        const members = await Member.find().exec();
        
        if (!members || members.length === 0) {
            console.log('📭 No members found in database.');
            return;
        }

        // Sort by XP in descending order
        members.sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));

        // Get top N members
        const topMembers = members.slice(0, topN);

        // Try to fetch Discord member names for better display
        let guild;
        try {
            guild = await client.guilds.fetch(TRACK_GUILD_ID);
        } catch (err) {
            console.warn('⚠️  Could not fetch guild. Using stored names.');
        }

        // Create leaderboard display
        const leaderboard = topMembers.map((member, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            const xp = member.xp ?? 0;
            const activityScore = member.activityScore ?? 0;
            
            // Pad name to 25 characters for alignment
            const name = (member.name || 'Unknown').padEnd(25);
            
            return `${medal} ${name} | XP: ${xp.toString().padStart(5)} | Activity: ${activityScore.toString().padStart(3)}`;
        });

        console.log(leaderboard.join('\n'));
        console.log(`\n📊 Total Members Tracked: ${members.length}`);

    } catch (err) {
        console.error('❌ Error displaying leaderboard:', err.message);
    }
}

main();
