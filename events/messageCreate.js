const { Events } = require('discord.js');
const Member = require('../models/Member');
const Progress = require('../models/Progress');
const aiDoubtService = require('../services/aiDoubtService');
const voiceMeetingService = require('../services/voiceMeetingService');
const quizService = require('../services/quizService');

const TRACKED_PROGRESS_CHANNEL_ID = process.env.PROGRESS_CHANNEL_ID || '1497882232843669514';
const TRACKED_PROGRESS_CHANNEL_NAMES = new Set(['students-progress', 'students-progess']);
const POINTS_PER_PROGRESS_POST = 10;
const BONUS_POINTS_FOR_DAILY_ALERT = 5;

/**
 * Splits text into chunks of at most maxLength characters without breaking words.
 */
function splitMessage(text, { maxLength = 1950 } = {}) {
    if (!text || typeof text !== 'string') return [''];
    if (text.length <= maxLength) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        // 1. Try splitting at paragraph boundary
        let splitIdx = remaining.lastIndexOf('\n\n', maxLength);
        // 2. Try splitting at single line break
        if (splitIdx === -1 || splitIdx < maxLength / 3) {
            splitIdx = remaining.lastIndexOf('\n', maxLength);
        }
        // 3. Try splitting after a sentence period
        if (splitIdx === -1 || splitIdx < maxLength / 3) {
            splitIdx = remaining.lastIndexOf('. ', maxLength);
            if (splitIdx !== -1) splitIdx += 1; // Include the period
        }
        // 4. Try splitting at space
        if (splitIdx === -1 || splitIdx < maxLength / 3) {
            splitIdx = remaining.lastIndexOf(' ', maxLength);
        }
        // 5. Fallback: hard cut
        if (splitIdx === -1 || splitIdx <= 0) {
            splitIdx = maxLength;
        }

        chunks.push(remaining.substring(0, splitIdx).trim());
        remaining = remaining.substring(splitIdx).trim();
    }

    return chunks.filter(c => c.length > 0);
}

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
        // Ignore messages sent by bots and direct messages outside guilds
        if (!message.guild || message.author.bot) {
            return;
        }

        // 0. Check for answers to an active Quiz & Dare challenge in this channel
        const activeQuiz = quizService.getActiveSession(message.channel.id);
        if (activeQuiz) {
            const parsed = quizService.parseAnswerInput(message.content, activeQuiz.questionData);
            if (parsed) {
                const quizResult = await quizService.submitAnswer({
                    channelId: message.channel.id,
                    userId: message.author.id,
                    user: message.author,
                    answerInput: message.content,
                });

                if (quizResult && quizResult.handled) {
                    if (voiceMeetingService && voiceMeetingService.isActive() && quizResult.spokenResult) {
                        voiceMeetingService.speak(quizResult.spokenResult, {
                            type: quizResult.isCorrect ? 'quiz_correct' : 'quiz_dare',
                            author: message.member?.displayName || message.author.username,
                        }).catch(() => {});
                    }
                    return;
                }
            }
        }

        // Check for direct Question & Dare request without explicit mention (e.g. "ask me a question", "quiz me", "கேள்வி கேளுங்க")
        if (quizService.isQuizRequest(message.content)) {
            const isTamil = aiDoubtService.isTamilText(message.content);
            const quizResult = await quizService.askQuestion({
                channel: message.channel,
                user: message.author,
                topic: isTamil ? 'Tamil' : 'Random',
                lang: isTamil ? 'ta' : 'en',
            });

            if (quizResult && voiceMeetingService && voiceMeetingService.isActive() && quizResult.spokenQuestion) {
                voiceMeetingService.speak(quizResult.spokenQuestion, {
                    type: 'quiz_question',
                    author: 'Cyber Bot',
                }).catch(() => {});
            }
            return;
        }

        // 1. Natural Doubt Handling: Check if member is talking directly to the bot
        if (aiDoubtService.isBotMentioned(message)) {
            try {
                // Send typing indicator so the member immediately sees the bot is working
                await message.channel.sendTyping().catch(() => {});

                // Extract clean question without bot mentions or wake words
                const cleanQuestion = aiDoubtService.cleanDoubtText(message.content, {
                    botId: message.client.user?.id,
                    client: message.client,
                    guild: message.guild,
                });

                // Check for immediate STOP command (e.g. "@MeetingBot stop", "stop", "stop talking")
                if (aiDoubtService.isStopRequested(cleanQuestion || message.content)) {
                    if (voiceMeetingService && voiceMeetingService.isActive()) {
                        voiceMeetingService.stopSpeaking();
                    }
                    await message.reply({
                        content: '⏹️ Stopped speaking.',
                        allowedMentions: { repliedUser: true },
                    });
                    return;
                }

                // Check for Question & Dare request when mentioning the bot (e.g. "@MeetingBot ask me a question", "quiz me")
                if (quizService.isQuizRequest(cleanQuestion || message.content)) {
                    const isTamil = aiDoubtService.isTamilText(cleanQuestion || message.content);
                    const quizResult = await quizService.askQuestion({
                        channel: message.channel,
                        user: message.author,
                        topic: isTamil ? 'Tamil' : 'Random',
                        lang: isTamil ? 'ta' : 'en',
                    });

                    if (quizResult && voiceMeetingService && voiceMeetingService.isActive() && quizResult.spokenQuestion) {
                        voiceMeetingService.speak(quizResult.spokenQuestion, {
                            type: 'quiz_question',
                            author: 'Cyber Bot',
                        }).catch(() => {});
                    }
                    return;
                }

                // If the user only pinged/mentioned the bot with no actual question
                if (!cleanQuestion || cleanQuestion.length === 0) {
                    const botName = message.guild?.members?.me?.displayName || message.client.user?.username || 'Bot';
                    await message.reply({
                        content: `👋 Hello <@${message.author.id}>! How can I help you? Ask me any technical question or doubt (e.g. \`@${botName} what is an API?\`).`,
                        allowedMentions: { repliedUser: true },
                    });
                    return;
                }

                // Generate AI answer using Gemini or intelligent local knowledge base fallback
                const doubtResult = await aiDoubtService.solveDoubt(cleanQuestion, {
                    lang: aiDoubtService.isTamilText(message.content) ? 'ta' : 'en',
                });

                const answer = doubtResult.answer || doubtResult.spokenAnswer || "I'm sorry, I couldn't generate an explanation for that.";

                // Safely split into chunks <= 1950 characters to stay within Discord's 2000-character limit
                const chunks = splitMessage(answer, { maxLength: 1950 });
                for (let i = 0; i < chunks.length; i++) {
                    if (i === 0) {
                        await message.reply({
                            content: chunks[i],
                            allowedMentions: { repliedUser: true },
                        });
                    } else {
                        await message.channel.send({
                            content: chunks[i],
                        });
                    }
                }

                // If a voice meeting is currently running, also speak the explanation aloud asynchronously
                if (voiceMeetingService && voiceMeetingService.isActive()) {
                    try {
                        const speakMeta = {
                            type: 'doubt_answer',
                            author: message.member?.displayName || message.author.username,
                            question: cleanQuestion,
                        };
                        if (doubtResult.isTamil) {
                            speakMeta.voice = 'ta-IN-PallaviNeural';
                        }
                        voiceMeetingService.speak(doubtResult.spokenAnswer || answer, speakMeta).catch(err => {
                            console.warn('[MessageCreate] Speaking in active voice meeting failed:', err.message);
                        });
                    } catch (voiceErr) {
                        console.warn('[MessageCreate] Voice meeting speak error:', voiceErr.message);
                    }
                }

                return; // Handled doubt; do not fall through to progress tracking
            } catch (err) {
                console.error('[MessageCreate] Error clarifying doubt:', err);
                try {
                    await message.reply({
                        content: "Sorry, I couldn't process that question right now. Please try again.",
                        allowedMentions: { repliedUser: true },
                    });
                } catch (replyErr) {
                    console.error('[MessageCreate] Failed to send error response:', replyErr);
                }
                return;
            }
        }

        // 2. Progress Tracking System in designated channels
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