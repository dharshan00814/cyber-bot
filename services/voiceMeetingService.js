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
const quizService = require('./quizService');
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

        try {
            console.log(`[VoiceMeeting] Waiting for connection READY state in ${voiceChannel.name}...`);
            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
            console.log(`[VoiceMeeting] Connection is READY in ${voiceChannel.name}`);
        } catch (connErr) {
            console.error(`[VoiceMeeting] Failed to reach READY state in ${voiceChannel.name}:`, connErr.message);
            try { connection.destroy(); } catch (e) {}
            throw new Error(`Failed to establish voice connection: ${connErr.message}`);
        }

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
        if (!this.activeMeeting) return;
        if (!this.activeStreams) this.activeStreams = new Set();
        if (this.activeStreams.has(userId)) return;

        this.activeStreams.add(userId);

        try {
            const opusStream = this.activeMeeting.receiver.subscribe(userId, {
                end: {
                    behavior: EndBehaviorType.AfterSilence,
                    duration: 1000,
                },
            });

            const opusDecoder = new prism.opus.Decoder({
                rate: 48000,
                channels: 2,
                frameSize: 960,
            });

            const pcmChunks = [];
            let totalBytes = 0;
            let finished = false;

            const finishCapture = async () => {
                if (finished) return;
                finished = true;
                this.activeStreams.delete(userId);
                clearTimeout(safetyTimeout);

                if (pcmChunks.length === 0 || totalBytes < 15000) {
                    // Less than ~0.1 seconds of audio
                    return;
                }

                const member = guild ? guild.members.cache.get(userId) : null;
                const username = member ? (member.displayName || member.user.username) : 'Student';

                console.log(`[VoiceMeeting] Captured ${totalBytes} bytes of voice audio from ${username} (${userId})`);
                const pcmBuffer = Buffer.concat(pcmChunks);
                const wavBuffer = speechService.pcmToWav(pcmBuffer, 48000, 2, 16);

                await this.processRecordedAudio(userId, username, wavBuffer);
            };

            opusStream.pipe(opusDecoder);

            opusDecoder.on('data', (chunk) => {
                pcmChunks.push(chunk);
                totalBytes += chunk.length;
            });

            opusDecoder.on('end', finishCapture);
            opusDecoder.on('finish', finishCapture);
            opusDecoder.on('close', finishCapture);

            opusStream.on('end', () => {
                setTimeout(finishCapture, 250);
            });
            opusStream.on('close', () => {
                setTimeout(finishCapture, 250);
            });
            opusStream.on('error', (err) => {
                console.warn('[VoiceMeeting] Opus stream error:', err.message);
                finishCapture();
            });
            opusDecoder.on('error', (err) => {
                console.warn('[VoiceMeeting] Opus decoder error:', err.message);
                finishCapture();
            });

            // 20-second max safety timeout for a single speech turn
            const safetyTimeout = setTimeout(() => {
                try { opusStream.destroy(); } catch (e) {}
                finishCapture();
            }, 20000);
        } catch (e) {
            this.activeStreams.delete(userId);
            console.warn('[VoiceMeeting] Error capturing audio stream:', e.message);
        }
    }

    stopSpeaking() {
        if (!this.activeMeeting) {
            return { success: false, message: 'No active meeting' };
        }

        console.log('[VoiceMeeting] ⏹️ Stopping speech and clearing audio queue immediately...');
        this.audioQueue = [];

        if (this.activeMeeting.player) {
            try {
                this.activeMeeting.player.stop(true);
            } catch (e) {
                console.warn('[VoiceMeeting] Error stopping audio player:', e.message);
            }
        }

        this.isPlayingAudio = false;
        this.activeMeeting.isBotSpeaking = false;

        return {
            success: true,
            message: 'Immediately stopped speaking',
        };
    }

    async processRecordedAudio(userId, username, wavBuffer) {
        if (!this.activeMeeting) return;

        console.log(`[VoiceMeeting] Sending ${wavBuffer.length} bytes to Gemini STT for ${username}...`);
        const transcriptionResult = await speechService.transcribeAudioWithGemini(wavBuffer);

        if (!transcriptionResult || !transcriptionResult.success) {
            console.warn(`[VoiceMeeting] Audio from ${username} (${wavBuffer.length} bytes): ${transcriptionResult?.error || 'No speech detected'}`);
            if (!process.env.GEMINI_API_KEY && !process.env.AI_API_KEY && !this.geminiWarningGiven) {
                this.geminiWarningGiven = true;
                if (this.activeMeeting.textChannelId) {
                    const textChannel = client.channels.cache.get(this.activeMeeting.textChannelId);
                    if (textChannel && textChannel.isTextBased()) {
                        textChannel.send('🎙️ **Voice Heard!** To have Cyber Bot transcribe voice and answer doubts aloud in Discord, configure a valid **GEMINI_API_KEY** in `.env`.').catch(() => {});
                    }
                }
            }
            return;
        }

        const transcript = (transcriptionResult.transcript || '').trim();
        if (!transcript || transcript.length < 2 || transcript.toLowerCase() === 'empty') {
            return; // Silence or background noise
        }

        console.log(`[VoiceMeeting] Transcribed from ${username}: "${transcript}" (botMentioned=${transcriptionResult.isBotMentioned}, isDoubt=${transcriptionResult.isDoubt})`);

        // 1. Check for immediate STOP command (e.g. "stop", "stop talking", "bot stop", "போதும்", "நிறுத்து")
        if (aiDoubtService.isStopRequested(transcript)) {
            console.log(`[VoiceMeeting] ⏹️ STOP command received from ${username}: "${transcript}". Halting speech immediately.`);
            this.stopSpeaking();
            if (this.activeMeeting.textChannelId) {
                const textChannel = client.channels.cache.get(this.activeMeeting.textChannelId);
                if (textChannel && textChannel.isTextBased()) {
                    textChannel.send(`⏹️ **Stopped speaking** (interrupted by ${username})`).catch(() => {});
                }
            }
            return;
        }

        // 1.5. Check if member is answering an active Quiz & Dare session
        const activeQuiz = this.activeMeeting.textChannelId
            ? quizService.getActiveSession(this.activeMeeting.textChannelId)
            : null;

        if (activeQuiz) {
            const parsed = quizService.parseAnswerInput(transcript, activeQuiz.questionData);
            if (parsed) {
                console.log(`[VoiceMeeting] 🧠 Spoken quiz answer detected from ${username}: "${transcript}"`);
                const quizResult = await quizService.submitAnswer({
                    channelId: this.activeMeeting.textChannelId,
                    userId,
                    user: { id: userId, username, displayName: username },
                    answerInput: transcript,
                    isVoice: true,
                });

                if (quizResult && quizResult.handled) {
                    if (quizResult.spokenResult) {
                        await this.speak(quizResult.spokenResult, {
                            type: quizResult.isCorrect ? 'quiz_correct' : 'quiz_dare',
                            author: 'Cyber Bot',
                        });
                    }
                    return;
                }
            }
        }

        // 1.6. Check if member is requesting a question / quiz ("Cyber Bot, ask me a question", "quiz me", "கேள்வி கேளுங்க")
        if (quizService.isQuizRequest(transcript)) {
            console.log(`[VoiceMeeting] 🧠 Spoken quiz challenge requested by ${username}: "${transcript}"`);
            const isTamil = aiDoubtService.isTamilText(transcript);
            const textChannel = this.activeMeeting.textChannelId
                ? client.channels.cache.get(this.activeMeeting.textChannelId)
                : null;

            const quizAskResult = await quizService.askQuestion({
                channel: textChannel,
                user: { id: userId, username, displayName: username },
                topic: isTamil ? 'Tamil' : 'Random',
                lang: isTamil ? 'ta' : 'en',
                isVoice: true,
            });

            if (quizAskResult && quizAskResult.spokenQuestion) {
                await this.speak(quizAskResult.spokenQuestion, {
                    type: 'quiz_question',
                    author: 'Cyber Bot',
                });
            }
            return;
        }

        const botId = client.user ? client.user.id : null;
        const isBotAddressed = transcriptionResult.isBotMentioned || aiDoubtService.isBotMentioned(transcript, process.env.WAKE_WORD, botId, { client });

        // Intent detection:
        // 1. Explicitly addressing the bot (e.g. "Cyber Bot, ...", "MeetingBot ...", "Bot ...")
        // 2. Gemini STT flagged it as a doubt/question
        // 3. Phrased as a technical doubt/question (what is, explain, how does, can you, etc.)
        // 4. Tamil question phrasing (ரெக்கர்ஷன் என்றால் என்ன, enna, epdi, doubt, etc.)
        const questionRegex = /\b(what\s+is|what\s+are|what's|explain|how\s+does|how\s+do|how\s+to|why\s+is|why\s+do|why\s+does|can\s+you|could\s+you|tell\s+me|i\s+have\s+a\s+doubt|my\s+doubt|difference\s+between|define)\b/i;
        const tamilQuestionRegex = /\b(enna|epdi|eppadi|solli\s*thanga|vilakkunga|oru\s*doubt|doubt)\b|[\u0B80-\u0BFF]/i;

        const isDoubtPhrase = questionRegex.test(transcript) || tamilQuestionRegex.test(transcript) || transcript.includes('?');

        const isQuestion = isBotAddressed || transcriptionResult.isDoubt || (isDoubtPhrase && transcript.split(/\s+/).length >= 2);

        const cleanQuestion = (transcriptionResult.doubtText && transcriptionResult.doubtText.trim().length > 3)
            ? transcriptionResult.doubtText.trim()
            : aiDoubtService.cleanDoubtText(transcript, {
                wakeWord: process.env.WAKE_WORD,
                botId,
                client,
            });

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

        if (isQuestion) {
            console.log(`[VoiceMeeting] Spoken question detected from ${username}: "${cleanQuestion || transcript}"`);
            await this.handleDoubtClarification(cleanQuestion || transcript, username, transcriptEntry);
        } else {
            console.log(`[VoiceMeeting] Ambient conversation from ${username} (not a doubt): "${transcript}"`);
        }
    }

    async handleDoubtClarification(doubtQuestion, username, transcriptEntry = null) {
        if (!this.activeMeeting) return;

        try {
            console.log(`[VoiceMeeting] Generating spoken AI answer for ${username}: "${doubtQuestion}"...`);
            const answerResult = await aiDoubtService.solveDoubt(doubtQuestion);
            const answer = answerResult.spokenAnswer || answerResult.answer;

            console.log(`[VoiceMeeting] Answer generated (${answer.length} chars). Speaking aloud in voice...`);

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
                            { name: `Question by ${username}`, value: doubtQuestion.substring(0, 1024) },
                            { name: 'Explanation', value: answer.substring(0, 1024) }
                        )
                        .setColor(0x10b981)
                        .setFooter({ text: `Language: ${answerResult.isTamil ? 'Tamil (தமிழ்)' : 'English'} • Source: ${answerResult.provider} • 🔊 Speaking in voice meeting` })
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
            const voice = meta.voice || this.activeMeeting.ttsVoice || process.env.TTS_VOICE || 'en-US-ChristopherNeural';
            console.log(`[VoiceMeeting] Synthesizing speech (${text.length} chars) with voice: ${voice}...`);
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

            console.log(`[VoiceMeeting] Playing audio: "${item.text.substring(0, 60)}..."`);
            const resource = createAudioResource(item.filePath);
            this.activeMeeting.player.play(resource);

            // Clean up file when done
            let cleaned = false;
            const checkDone = () => {
                if (cleaned) return;
                cleaned = true;
                clearTimeout(watchdog);
                speechService.cleanupTempAudio(item.filePath);
            };

            const watchdog = setTimeout(() => {
                console.warn('[VoiceMeeting] Audio playback watchdog triggered, resetting state.');
                if (this.activeMeeting) {
                    this.activeMeeting.isBotSpeaking = false;
                }
                this.isPlayingAudio = false;
                checkDone();
                this.processAudioQueue();
            }, 60000);

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
