const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const voiceMeetingService = require('../../services/voiceMeetingService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meeting')
        .setDescription('AI Voice Meeting Assistant - track voice, attendance, and clear doubts aloud')
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join a voice channel to start tracking voice and answering doubts')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The voice channel to join (defaults to your current voice channel)')
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Disconnect bot from the voice meeting and save attendance records')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ask')
                .setDescription('Ask the bot a doubt or question to explain aloud in the meeting')
                .addStringOption(option =>
                    option
                        .setName('doubt')
                        .setDescription('The question or concept you would like explained')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check active voice meeting status, participants, and duration')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;

        if (!guild) {
            return interaction.editReply({ content: '❌ This command can only be used within a server.' });
        }

        try {
            if (subcommand === 'join') {
                const targetChannel = interaction.options.getChannel('channel') || interaction.member.voice.channel;

                if (!targetChannel) {
                    return interaction.editReply({
                        content: '⚠️ Please join a voice channel first, or select a voice channel option in the command.',
                    });
                }

                await interaction.editReply({ content: `🔄 Connecting to **${targetChannel.name}**...` });

                const result = await voiceMeetingService.joinMeeting({
                    guildId: guild.id,
                    channelId: targetChannel.id,
                    textChannelId: interaction.channelId,
                });

                const embed = new EmbedBuilder()
                    .setTitle('🎙️ Voice Meeting Started')
                    .setDescription(`Cyber Bot is now connected to **${targetChannel.name}**!\n\n` +
                        `• **Voice Tracking:** Active (speaking duration & activity recorded)\n` +
                        `• **Auto Attendance:** Enabled for all attendees\n` +
                        `• **AI Doubt Clarification:** Listening to your voice or type \`/meeting ask <question>\`\n` +
                        `• **Dashboard Control:** Monitor live transcripts and participants at \`http://localhost:3000\``)
                    .setColor(0x00d4ff)
                    .setTimestamp();

                return interaction.editReply({ content: null, embeds: [embed] });
            }

            if (subcommand === 'leave') {
                if (!voiceMeetingService.isActive()) {
                    return interaction.editReply({ content: 'ℹ️ No active voice meeting is currently running.' });
                }

                const result = await voiceMeetingService.leaveMeeting();

                const embed = new EmbedBuilder()
                    .setTitle('🏁 Voice Meeting Concluded')
                    .setDescription(`The voice meeting session has ended.\n\n` +
                        `• **Duration:** ${result.durationSeconds || 0} seconds\n` +
                        `• **Attendance:** Recorded and synced with database\n` +
                        `• **Meeting Log:** Saved to Meeting Sessions`)
                    .setColor(0x10b981)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            if (subcommand === 'ask') {
                const doubt = interaction.options.getString('doubt');

                if (!voiceMeetingService.isActive()) {
                    // Answer in text even if not in voice channel, and let user know how to connect voice
                    const aiDoubtService = require('../../services/aiDoubtService');
                    const answerResult = await aiDoubtService.solveDoubt(doubt);

                    const embed = new EmbedBuilder()
                        .setTitle('💡 Doubt Clarified / சந்தேகம் தெளிவுபடுத்தப்பட்டது')
                        .addFields(
                            { name: 'Question / கேள்வி', value: doubt },
                            { name: 'Explanation / விளக்கம்', value: answerResult.spokenAnswer }
                        )
                        .setColor(0x10b981)
                        .setFooter({ text: `Language: ${answerResult.isTamil ? 'Tamil (தமிழ்)' : 'English'} • Tip: Join a voice channel and run /meeting join to have the bot speak aloud!` })
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] });
                }

                await interaction.editReply({ content: `🤔 Explaining **"${doubt}"** in voice...` });

                const answerResult = await voiceMeetingService.askDoubt(doubt, interaction.member.displayName || interaction.user.username);

                const embed = new EmbedBuilder()
                    .setTitle('🎙️ Spoken Answer in Voice Meeting')
                    .addFields(
                        { name: 'Question / கேள்வி', value: doubt },
                        { name: 'Spoken Explanation / குரல் விளக்கம்', value: answerResult.spokenAnswer }
                    )
                    .setColor(0x10b981)
                    .setFooter({ text: `Language: ${answerResult.isTamil ? 'Tamil (தமிழ்)' : 'English'} • Speaking in voice channel` })
                    .setTimestamp();

                return interaction.editReply({ content: null, embeds: [embed] });
            }

            if (subcommand === 'status') {
                const status = voiceMeetingService.getStatus();

                if (!status.active) {
                    return interaction.editReply({
                        content: '📭 No voice meeting currently active. Use `/meeting join` to start one!',
                    });
                }

                const formatTime = (seconds) => {
                    const m = Math.floor(seconds / 60);
                    const s = seconds % 60;
                    return `${m}m ${s}s`;
                };

                const participantList = status.participants.length > 0
                    ? status.participants.map(p => `• **${p.displayName || p.username}** ${p.isSpeaking ? '🟢 *(Speaking)*' : ''} - ${p.speakCount} turns (${Math.round(p.totalSpokenMs / 1000)}s)`).join('\n')
                    : '*No participants tracked yet*';

                const embed = new EmbedBuilder()
                    .setTitle('🎙️ Live Voice Meeting Status')
                    .addFields(
                        { name: 'Channel', value: `🔊 **${status.channelName}**`, inline: true },
                        { name: 'Elapsed Time', value: `⏱️ ${formatTime(status.elapsedSeconds)}`, inline: true },
                        { name: 'Attendees', value: `👥 ${status.participantCount}`, inline: true },
                        { name: 'Participants & Voice Activity', value: participantList },
                    )
                    .setColor(0x00d4ff)
                    .setFooter({ text: `Bot Speaking: ${status.isBotSpeaking ? 'Yes 🔊' : 'Idle 👂'}` })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }
        } catch (err) {
            console.error('[Command: meeting] Error:', err);
            return interaction.editReply({ content: `❌ Error executing meeting command: ${err.message}` });
        }
    },
};
