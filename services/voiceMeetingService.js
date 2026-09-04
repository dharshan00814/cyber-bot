const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    EndBehaviorType,
    NoSubscriberBehavior,
} = require('@discordjs/voice');
const prism = require('prism-media');
const { EmbedBuilder } = require('discord.js');
const client = require('../utils/client');
const speechService = require('./speechService');
const aiDoubtService = require('./aiDoubtService');
const MeetingSession = require('../models/MeetingSession');
const Attendance = require('../models/Attendance');
const Member = require('../models/Member');

class VoiceMeetingService {
    constructor() {
        this.activeMeeting = null;
        this.audioQueue = [];
        this.isPlayingAudio = false;
    }

    isActive() {
        return !!(this.activeMeeting && this.activeMeeting.connection);
    }

    getStatus() {
        if (!this.activeMeeting) {
            return {
                active: false,
                meeting: null,
            };
        }

        const elapsedSeconds = Math.floor((Date.now() - this.activeMeeting.startTime.getTime()) / 1000);
        const participants = Array.from(this.activeMeeting.participants.values());

        return {
            active: true,
            guildId: this.activeMeeting.guildId,
            channelId: this.activeMeeting.channelId,
            channelName: this.activeMeeting.channelName,
            textChannelId: this.activeMeeting.textChannelId,
            startTime: this.activeMeeting.startTime,
            elapsedSeconds,
            isBotSpeaking: this.activeMeeting.isBotSpeaking,
            participantCount: participants.length,
            participants,
            recentTranscripts: this.activeMeeting.transcripts.slice(-20),
        };
    }

    getAvailableVoiceChannels(guildId) {
        const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
        if (!guild) return [];

        const voiceChannels = [];
        guild.channels.cache.forEach(channel => {
            // ChannelType.GuildVoice is 2, ChannelType.GuildStageVoice is 13
            if (channel.type === 2 || channel.type === 13) {
                voiceChannels.push({
                    id: channel.id,
                    name: channel.name,
                    membersCount: channel.members ? channel.members.size : 0,
                    guildId: guild.id,
                    guildName: guild.name,
                });
            }
        });

        return voiceChannels;
    }

    async joinMeeting({ guildId, channelId, textChannelId = null, voice = null }) {
        if (this.isActive()) {
            if (this.activeMeeting.channelId === channelId) {
                return { success: true, message: 'Already connected to this voice meeting channel.', meeting: this.getStatus() };
            }
            await this.leaveMeeting();
        }

        const guild = client.guilds.cache.get(guildId) || client.guilds.cache.first();
        if (!guild) {
            throw new Error('Discord guild not found or bot has not joined any guild yet.');
        }

        const voiceChannel = guild.channels.cache.get(channelId);
        if (!voiceChannel) {
            throw new Error(`Voice channel ${channelId} not found.`);
        }

        const textChannel = (textChannelId ? guild.channels.cache.get(textChannelId) : null)
            || (voiceChannel.isTextBased && voiceChannel.isTextBased() ? voiceChannel : null)
            || guild.channels.cache.find(c => c.isTextBased && c.isTextBased());

        console.log(`[VoiceMeeting] Joining voice channel: ${voiceChannel.name} (${voiceChannel.id})`);

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });

        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
            if (this.activeMeeting) {
                this.activeMeeting.isBotSpeaking = false;
            }
            this.isPlayingAudio = false;
            this.processAudioQueue();
        });

        player.on('error', (err) => {
            console.error('[VoiceMeeting] Audio player error:', err.message);
            if (this.activeMeeting) {
                this.activeMeeting.isBotSpeaking = false;
            }
            this.isPlayingAudio = false;
            this.processAudioQueue();
        });

        const meetingData = {
            guildId: guild.id,
            guildName: guild.name,
            channelId: voiceChannel.id,
            channelName: voiceChannel.name,
            textChannelId: textChannel ? textChannel.id : null,
            connection,
            player,
            receiver: connection.receiver,
            startTime: new Date(),
            participants: new Map(),
            transcripts: [],
            isBotSpeaking: false,
            ttsVoice: voice || process.env.TTS_VOICE || 'en-US-ChristopherNeural',
        };

        this.activeMeeting = meetingData;

        // Initialize current participants in voice channel
        voiceChannel.members.forEach(member => {
            if (!member.user.bot) {
                this.registerParticipant(member.user);
            }
        });

        // Setup speaking & audio stream events
        this.setupVoiceReceiver(connection.receiver, guild);

        // Announce greeting in voice
        await this.speak(
            "Hello everyone! I have joined the voice meeting. Mention my name Cyber Bot or say பாட் to ask doubts in English or Tamil. I am tracking your attendance.",
            { type: 'bot_greeting', author: 'Cyber Bot' }
        );

        // Send text embed notification if text channel available
        if (textChannel && textChannel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setTitle('🎙️ AI Voice Meeting Assistant Connected')
                .setDescription(`Connected to **${voiceChannel.name}**\n` +
                    `- **Voice Tracking**: Active (Attendance & activity recorded)\n` +
                    `- **AI Doubt Clarification**: Mention **"Cyber Bot"** or **"சைபர் பாட்"** to ask doubts in **English or Tamil**!\n` +
                    `- **Smart Silence**: Bot only replies when addressed by name, letting members converse freely.\n\n` +
                    `*Say "Cyber Bot, what is recursion?" or "சைபர் பாட், ரெக்கர்ஷன் என்றால் என்ன?" to get spoken answers!*`)
                .setColor(0x00d4ff)
                .setTimestamp();
            textChannel.send({ embeds: [embed] }).catch(() => {});
        }

        // Auto record initial attendance
        this.recordMeetingAttendance();

        return {
            success: true,
            message: `Successfully joined ${voiceChannel.name}`,
            meeting: this.getStatus(),
        };
    }

    registerParticipant(user) {
        if (!this.activeMeeting || !user || user.bot) return null;

        if (!this.activeMeeting.participants.has(user.id)) {
            this.activeMeeting.participants.set(user.id, {
                userId: user.id,
                username: user.username,
                displayName: user.globalName || user.username,
                avatar: user.displayAvatarURL ? user.displayAvatarURL() : null,
                isSpeaking: false,
                speakCount: 0,
                totalSpokenMs: 0,
                joinedAt: new Date(),
                lastSpokeAt: null,
            });
            // Mark attendance
            this.recordUserAttendance(user.id, user.username);
        }

        return this.activeMeeting.participants.get(user.id);
    }

    async recordUserAttendance(userId, username) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let member = await Member.findOne({ userId });
            if (!member) {
                member = new Member({
                    userId,
                    name: username || 'Meeting Participant',
                    role: 'beginner',
                    xp: 10,
                });
                await member.save();
            }

            const existingAttendance = await Attendance.findOne({
                memberId: userId,
                meetingName: this.activeMeeting ? this.activeMeeting.channelName : 'Voice Meeting',
            });

            if (!existingAttendance) {
                const att = new Attendance({
                    memberId: userId,
                    status: 'present',
                    meetingName: this.activeMeeting ? this.activeMeeting.channelName : 'Voice Meeting',
                    checkInTime: new Date(),
                    notes: 'Attended AI Voice Meeting',
                });
                await att.save();
                console.log(`[VoiceMeeting] Attendance marked present for: ${username} (${userId})`);
            }
        } catch (e) {
            console.warn('[VoiceMeeting] Error auto-recording attendance:', e.message);
        }
    }

    async recordMeetingAttendance() {
        if (!this.activeMeeting) return;
        for (const [userId, participant] of this.activeMeeting.participants.entries()) {
            await this.recordUserAttendance(userId, participant.username);
        }
    }

    setupVoiceReceiver(receiver, guild) {
        receiver.speaking.on('start', (userId) => {
            if (!this.activeMeeting) return;

            const member = guild.members.cache.get(userId);
            if (member && member.user && !member.user.bot) {
                const participant = this.registerParticipant(member.user);
                if (participant) {
                    participant.isSpeaking = true;
                    participant.speakStartTime = Date.now();
                }
            }

            this.captureUserAudioStream(userId, guild);
        });

        receiver.speaking.on('end', (userId) => {
            if (!this.activeMeeting) return;

            const participant = this.activeMeeting.participants.get(userId);
            if (participant && participant.isSpeaking) {
                participant.isSpeaking = false;
                if (participant.speakStartTime) {
                    const duration = Date.now() - participant.speakStartTime;
                    participant.totalSpokenMs += duration;
                    participant.speakCount += 1;
                    participant.lastSpokeAt = new Date();
                    delete participant.speakStartTime;
                }
            }
        });
    }

    captureUserAudioStream(userId, guild) {
        if (!this.activeMeeting || this.activeMeeting.isBotSpeaking) return;
        if (!this.activeStreams) this.activeStreams = new Set();
        if (this.activeStreams.has(userId)) return;

        this.activeStreams.add(userId);

        try {
            const opusStream = this.activeMeeting.receiver.subscribe(userId, {
                end: {
                    behavior: EndBehaviorType.AfterSilence,
                    duration: 800,
                },
            });

            const opusDecoder = new prism.opus.Decoder({
                rate: 48000,
                channels: 2,
                frameSize: 960,
            });

            const pcmChunks = [];
            let totalBytes = 0;

            opusStream.pipe(opusDecoder);

            opusDecoder.on('data', (chunk) => {
                pcmChunks.push(chunk);
                totalBytes += chunk.length;
            });

            opusDecoder.on('end', async () => {
                this.activeStreams.delete(userId);
                if (pcmChunks.length === 0 || totalBytes < 15000) {
                    // Less than ~0.2 seconds of speech or background noise
                    return;
                }

                const member = guild ? guild.members.cache.get(userId) : null;
                const username = member ? (member.displayName || member.user.username) : 'Student';

                const pcmBuffer = Buffer.concat(pcmChunks);
                const wavBuffer = speechService.pcmToWav(pcmBuffer, 48000, 2, 16);

                await this.processRecordedAudio(userId, username, wavBuffer);
            });

            opusDecoder.on('error', (err) => {
                this.activeStreams.delete(userId);
            });
        } catch (e) {
            this.activeStreams.delete(userId);
            console.warn('[VoiceMeeting] Error capturing audio stream:', e.message);
        }
    }

    async processRecordedAudio(userId, username, wavBuffer) {
        if (!this.activeMeeting) return;

        // Try transcribing with Gemini
        const transcriptionResult = await speechService.transcribeAudioWithGemini(wavBuffer);

        if (!transcriptionResult || !transcriptionResult.success) {
            console.warn(`[VoiceMeeting] Audio captured from ${username} (${wavBuffer.length} bytes), but could not transcribe: ${transcriptionResult?.error || 'Transcription failed'}`);
            if (transcriptionResult?.error === 'GEMINI_API_KEY not configured' && !this.geminiWarningGiven) {
                this.geminiWarningGiven = true;
                if (this.activeMeeting.textChannelId) {
                    const textChannel = client.channels.cache.get(this.activeMeeting.textChannelId);
                    if (textChannel && textChannel.isTextBased()) {
                        textChannel.send('🎙️ **Voice Heard!** To have the bot transcribe your Discord voice and answer automatically, add a free **GEMINI_API_KEY** in `.env` (free at https://aistudio.google.com). Or use the Live Web Mic on the dashboard!').catch(() => {});
                    }
                }
            }
            return;
        }

        if (transcriptionResult.transcript) {
            const transcript = transcriptionResult.transcript.trim();
            if (!transcript) return;

            const botId = client.user ? client.user.id : null;
            const isBotAddressed = transcriptionResult.isBotMentioned || aiDoubtService.isBotMentioned(transcript, process.env.WAKE_WORD, botId);

            const isQuestion = isBotAddressed && (transcriptionResult.isDoubt || aiDoubtService.isDoubt(transcript, process.env.WAKE_WORD, botId));
            const doubtQuestion = transcriptionResult.doubtText || transcript;

            const transcriptEntry = {
                id: `tr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                timestamp: new Date(),
                userId,
                username,
                text: transcript,
                isDoubt: isQuestion,
                type: isQuestion ? 'doubt' : 'speech',
                botAnswer: null,
            };

            this.activeMeeting.transcripts.push(transcriptEntry);

            // ONLY reply if the bot was explicitly addressed by name!
            if (isQuestion) {
                console.log(`[VoiceMeeting] Question addressed to bot from ${username}: "${doubtQuestion}"`);
                await this.handleDoubtClarification(doubtQuestion, username, transcriptEntry);
            } else {
                console.log(`[VoiceMeeting] Conversation logged from ${username} (bot not addressed): "${transcript}"`);
            }
        }
    }

    async handleDoubtClarification(doubtQuestion, username, transcriptEntry = null) {
        if (!this.activeMeeting) return;

        try {
            console.log(`[VoiceMeeting] Solving doubt for ${username}...`);
            const answerResult = await aiDoubtService.solveDoubt(doubtQuestion);
            const answer = answerResult.spokenAnswer;

            if (transcriptEntry) {
                transcriptEntry.botAnswer = answer;
            } else {
                this.activeMeeting.transcripts.push({
                    id: `tr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    timestamp: new Date(),
                    userId: 'bot',
                    username: 'Cyber Bot',
                    text: `Doubt: ${doubtQuestion}`,
                    isDoubt: true,
                    type: 'doubt',
                    botAnswer: answer,
                });
            }

            // Post in Discord text channel if connected
            if (this.activeMeeting.textChannelId) {
                const textChannel = client.channels.cache.get(this.activeMeeting.textChannelId);
                if (textChannel && textChannel.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setTitle('💡 Doubt Clarified / சந்தேகம் தெளிவுபடுத்தப்பட்டது')
                        .addFields(
                            { name: `Question by ${username}`, value: doubtQuestion },
                            { name: 'Explanation', value: answer }
                        )
                        .setColor(0x10b981)
                        .setFooter({ text: `Language: ${answerResult.isTamil ? 'Tamil (தமிழ்)' : 'English'} • Source: ${answerResult.provider}` })
                        .setTimestamp();
                    textChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }

            // Speak the answer aloud in the meeting room (auto-uses Tamil voice if Tamil)
            const speakMeta = {
                type: 'doubt_answer',
                author: 'Cyber Bot',
                question: doubtQuestion,
            };
            if (answerResult.isTamil) {
                speakMeta.voice = 'ta-IN-PallaviNeural';
            }

            await this.speak(answer, speakMeta);

            return answerResult;
        } catch (err) {
            console.error('[VoiceMeeting] Error solving doubt:', err.message);
        }
    }

    async askDoubt(question, askedByUser = 'Admin') {
        if (!this.isActive()) {
            throw new Error('No active voice meeting is currently running. Please join a voice channel first.');
        }

        return await this.handleDoubtClarification(question, askedByUser);
    }

    async speak(text, meta = {}) {
        if (!this.activeMeeting) return;

        try {
            const voice = this.activeMeeting.ttsVoice || process.env.TTS_VOICE || 'en-US-ChristopherNeural';
            const { filePath } = await speechService.synthesizeSpeechToFile(text, { voice });

            this.audioQueue.push({
                filePath,
                text,
                meta,
            });

            this.processAudioQueue();
        } catch (e) {
            console.error('[VoiceMeeting] Error synthesizing speech for queue:', e.message);
        }
    }

    processAudioQueue() {
        if (this.isPlayingAudio || this.audioQueue.length === 0 || !this.activeMeeting) {
            return;
        }

        const item = this.audioQueue.shift();
        if (!item || !item.filePath) return;

        try {
            this.isPlayingAudio = true;
            this.activeMeeting.isBotSpeaking = true;

            const resource = createAudioResource(item.filePath);
            this.activeMeeting.player.play(resource);

            // Clean up file when done
            const checkDone = () => {
                speechService.cleanupTempAudio(item.filePath);
            };

            this.activeMeeting.player.once(AudioPlayerStatus.Idle, checkDone);
        } catch (err) {
            console.error('[VoiceMeeting] Error playing audio resource:', err.message);
            this.isPlayingAudio = false;
            if (this.activeMeeting) {
                this.activeMeeting.isBotSpeaking = false;
            }
            speechService.cleanupTempAudio(item.filePath);
            this.processAudioQueue();
        }
    }

    async leaveMeeting() {
        if (!this.activeMeeting) {
            return { success: false, message: 'No active meeting to leave.' };
        }

        const currentMeeting = this.activeMeeting;
        const guildId = currentMeeting.guildId;
        const channelName = currentMeeting.channelName;
        const durationSeconds = Math.floor((Date.now() - currentMeeting.startTime.getTime()) / 1000);

        console.log(`[VoiceMeeting] Leaving meeting channel ${channelName} after ${durationSeconds}s`);

        // Final attendance check
        await this.recordMeetingAttendance();

        // Goodbye speech
        try {
            await this.speak(
                `Meeting concluded. Thank you everyone for participating. Attendance and transcripts have been safely recorded. Goodbye!`,
                { type: 'bot_farewell' }
            );

            // Give audio time to speak before disconnecting
            await new Promise((resolve) => setTimeout(resolve, 3500));
        } catch (e) {
            // Proceed with disconnect
        }

        // Save MeetingSession to database
        try {
            const participantsArray = Array.from(currentMeeting.participants.values()).map(p => ({
                userId: p.userId,
                username: p.username,
                displayName: p.displayName,
                speakCount: p.speakCount,
                totalSpokenSeconds: Math.round(p.totalSpokenMs / 1000),
                attendedAt: p.joinedAt,
            }));

            const sessionRecord = new MeetingSession({
                guildId: currentMeeting.guildId,
                channelId: currentMeeting.channelId,
                channelName: currentMeeting.channelName,
                startTime: currentMeeting.startTime,
                endTime: new Date(),
                durationSeconds,
                participants: participantsArray,
                transcripts: currentMeeting.transcripts,
                status: 'ended',
            });

            await sessionRecord.save();
            console.log(`[VoiceMeeting] Meeting session successfully saved to database. Records: ${participantsArray.length} attendees.`);
        } catch (err) {
            console.error('[VoiceMeeting] Error saving meeting session:', err.message);
        }

        // Destroy connection
        try {
            if (currentMeeting.connection) {
                currentMeeting.connection.destroy();
            }
        } catch (e) {
            // Ignore disconnect error
        }

        this.activeMeeting = null;
        this.audioQueue = [];
        this.isPlayingAudio = false;

        return {
            success: true,
            message: `Meeting in ${channelName} concluded. Duration: ${durationSeconds} seconds.`,
            durationSeconds,
        };
    }
}

const voiceMeetingService = new VoiceMeetingService();
module.exports = voiceMeetingService;
