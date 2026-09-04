const { Events } = require('discord.js');
const Member = require('../models/Member');
const Progress = require('../models/Progress');

const TRACKED_PROGRESS_CHANNEL_ID = process.env.PROGRESS_CHANNEL_ID || '1497882232843669514';
const TRACKED_PROGRESS_CHANNEL_NAMES = new Set(['students-progress']);
const POINTS_PER_PROGRESS_POST = 10;
const BONUS_POINTS_FOR_DAILY_ALERT = 5;

function resolveProgressChannel(channel) {
    if (!channel) {
        return null;
    }

    if (TRACKED_PROGRESS_CHANNEL_ID && channel.id === TRACKED_PROGRESS_CHANNEL_ID) {
        return channel;
    }

    const parentChannel = channel.parent ?? channel.parentChannel ?? null;
    if (parentChannel && TRACKED_PROGRESS_CHANNEL_ID && parentChannel.id === TRACKED_PROGRESS_CHANNEL_ID) {
        return parentChannel;
    }

    if (TRACKED_PROGRESS_CHANNEL_NAMES.has((channel.name || '').toLowerCase())) {
        return channel;
    }

    if (parentChannel && TRACKED_PROGRESS_CHANNEL_NAMES.has((parentChannel.name || '').toLowerCase())) {
        return parentChannel;
    }

    return null;
}

function buildProgressText(message) {
    const content = message.content?.trim();
    const attachmentCount = message.attachments.size;

    if (content && attachmentCount > 0) {
        return `${content} [${attachmentCount} attachment(s)]`;
    }

    if (content) {
        return content;
    }

    if (attachmentCount > 0) {
        return `${attachmentCount} attachment(s)`;
    }

    return 'Progress update';
}

async function awardProgressPoints(message, trackedChannel) {
    const userId = message.author.id;
    const displayName = message.member?.displayName || message.author.username;
    const progressText = buildProgressText(message);
    const channelName = trackedChannel?.name || message.channel.name || 'progress';
    const today = new Date().toDateString();

    let member = await Member.findOne({ userId });
    let shouldAwardPoints = false;
    let shouldAlert = false;

    if (member) {
        member.name = displayName;
        member.lastActiveDate = new Date();
        member.completedTasks = Array.isArray(member.completedTasks) ? member.completedTasks : [];
        
        // Check if member has already earned points today
        const lastPointsDate = member.lastPointsDate ? new Date(member.lastPointsDate).toDateString() : null;
        if (lastPointsDate !== today) {
            shouldAwardPoints = true;
            member.lastPointsDate = new Date();
            member.xp = (member.xp ?? 0) + POINTS_PER_PROGRESS_POST;
            member.activityScore = (member.activityScore ?? 0) + 1;
            member.completedTasks.push({
                taskName: `Progress update in ${channelName}`,
                completedDate: new Date(),
                pointsEarned: POINTS_PER_PROGRESS_POST,
            });
        }
        
        // Check if member has been alerted today
        const lastAlertDate = member.lastAlertDate ? new Date(member.lastAlertDate).toDateString() : null;
        if (lastAlertDate !== today && shouldAwardPoints) {
            shouldAlert = true;
            member.lastAlertDate = new Date();
            // Award bonus points for daily alert
            member.xp = (member.xp ?? 0) + BONUS_POINTS_FOR_DAILY_ALERT;
            member.completedTasks.push({
                taskName: 'Daily alert bonus',
                completedDate: new Date(),
                pointsEarned: BONUS_POINTS_FOR_DAILY_ALERT,
            });
        }
        
        await member.save();
    } else {
        member = new Member({
            userId,
            name: displayName,
            joinDate: new Date(),
            xp: POINTS_PER_PROGRESS_POST + BONUS_POINTS_FOR_DAILY_ALERT,
            activityScore: 1,
            lastActiveDate: new Date(),
            lastPointsDate: new Date(),
            lastAlertDate: new Date(),
            completedTasks: [
                {
                    taskName: `Progress update in ${channelName}`,
                    completedDate: new Date(),
                    pointsEarned: POINTS_PER_PROGRESS_POST,
                },
                {
                    taskName: 'Daily alert bonus',
                    completedDate: new Date(),
                    pointsEarned: BONUS_POINTS_FOR_DAILY_ALERT,
                }
            ],
        });
        await member.save();
        shouldAwardPoints = true;
        shouldAlert = true;
    }

    const progress = new Progress({
        userId,
        date: new Date(),
        text: progressText,
    });
    await progress.save();

    // Send alert to channel only once per member per day when they first post
    if (shouldAlert && trackedChannel.isTextBased()) {
        try {
            await trackedChannel.send(`🎉 Great work <@${userId}>! Keep up the progress! (+${POINTS_PER_PROGRESS_POST + BONUS_POINTS_FOR_DAILY_ALERT} points)`);
        } catch (err) {
            console.error('Error sending alert to channel:', err);
        }
    } else if (shouldAwardPoints === false && trackedChannel.isTextBased()) {
        // Notify member they already earned points today
        try {
            await trackedChannel.send(`ℹ️ <@${userId}> already earned points today! Come back tomorrow for more points.`);
        } catch (err) {
            console.error('Error sending info message:', err);
        }
    }

    return member;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (!message.guild || message.author.bot) {
            return;
        }

        // Natural Doubt Handling: If user mentions bot in chat (e.g. "Cyber bot, what is recursion?" or "பாட், recursion na enna?"), answer without requiring commands!
        const aiDoubtService = require('../services/aiDoubtService');
        const voiceMeetingService = require('../services/voiceMeetingService');
        const speechService = require('../services/speechService');
        const fs = require('fs');
        const botId = message.client.user?.id;

        if (aiDoubtService.isBotMentioned(message.content, process.env.WAKE_WORD, botId)) {
            try {
                const doubtResult = await aiDoubtService.solveDoubt(message.content);
                const answer = doubtResult.spokenAnswer;

                // 1. If user is in a voice channel, auto-connect bot to their voice channel so it can speak directly to them!
                const userVoiceChannel = message.member?.voice?.channel;
                if (userVoiceChannel) {
                    if (!voiceMeetingService.isActive() || (voiceMeetingService.activeMeeting && voiceMeetingService.activeMeeting.channelId !== userVoiceChannel.id)) {
                        try {
                            await voiceMeetingService.joinMeeting({
                                guildId: message.guild.id,
                                channelId: userVoiceChannel.id,
                                textChannelId: message.channel.id,
                            });
                        } catch (joinErr) {
                            console.warn('[MessageCreate] Auto-joining voice channel failed:', joinErr.message);
                        }
                    }
                }

                // 2. Synthesize spoken voice audio (Edge TTS / Google TTS with Tamil neural voice if Tamil)
                const voice = doubtResult.isTamil ? 'ta-IN-PallaviNeural' : undefined;
                let audioFilePath = null;
                try {
                    const synthResult = await speechService.synthesizeSpeechToFile(answer, { voice });
                    audioFilePath = synthResult.filePath;
                } catch (ttsErr) {
                    console.warn('[MessageCreate] Spoken speech synthesis error:', ttsErr.message);
                }

                // 3. If bot is in a voice channel, speak the answer aloud live!
                if (voiceMeetingService.isActive()) {
                    const speakMeta = {
                        type: 'doubt_answer',
                        author: message.member?.displayName || message.author.username,
                        question: doubtResult.question,
                    };
                    if (doubtResult.isTamil) {
                        speakMeta.voice = 'ta-IN-PallaviNeural';
                    }
                    await voiceMeetingService.speak(answer, speakMeta);
                }

                // 4. Send Discord reply with text embed AND playable spoken audio file attached
                const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setTitle('💡 Doubt Clarified / சந்தேகம் தெளிவுபடுத்தப்பட்டது')
                    .addFields(
                        { name: 'Question / கேள்வி', value: doubtResult.question || message.content },
                        { name: 'Spoken Explanation / விளக்கம்', value: answer }
                    )
                    .setColor(0x10b981)
                    .setFooter({
                        text: `Language: ${doubtResult.isTamil ? 'Tamil (தமிழ்)' : 'English'} • Source: ${doubtResult.provider} • 🔊 Speaking reply aloud`
                    })
                    .setTimestamp();

                const replyPayload = { embeds: [embed] };
                if (audioFilePath && fs.existsSync(audioFilePath)) {
                    replyPayload.files = [
                        new AttachmentBuilder(audioFilePath, {
                            name: doubtResult.isTamil ? 'cyber_bot_tamil_speech.mp3' : 'cyber_bot_speech.mp3',
                            description: 'Spoken voice explanation',
                        }),
                    ];
                }

                await message.reply(replyPayload);
                return;
            } catch (err) {
                console.error('[MessageCreate] Error clarifying doubt:', err);
            }
        }

        const trackedChannel = resolveProgressChannel(message.channel);

        if (!trackedChannel) {
            return;
        }

        try {
            const member = await awardProgressPoints(message, trackedChannel);
            await message.react('✅');

            await message.reply({
                content: `Tracked ${member.name}'s progress in ${trackedChannel.name} and awarded ${POINTS_PER_PROGRESS_POST} points.`,
            });
        } catch (error) {
            console.error('Error tracking progress message:', error);
        }
    },
};