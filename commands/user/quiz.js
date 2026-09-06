const { SlashCommandBuilder } = require('discord.js');
const quizService = require('../../services/quizService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quiz')
        .setDescription('Test your tech knowledge! Win XP points for correct answers or face a funny DARE!')
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('Select the quiz category')
                .setRequired(false)
                .addChoices(
                    { name: '🎲 Random Tech', value: 'Random' },
                    { name: '🛡️ Cybersecurity', value: 'Cybersecurity' },
                    { name: '💻 Web Development', value: 'Web Development' },
                    { name: '⚙️ Programming & Data Structures', value: 'Data Structures' },
                    { name: '🌐 Tamil Tech (தமிழில் கேள்விகள்)', value: 'Tamil' }
                )
        ),

    async execute(interaction) {
        try {
            const topic = interaction.options.getString('topic') || 'Random';
            const lang = topic === 'Tamil' ? 'ta' : 'en';

            await quizService.askQuestion({
                interaction,
                channel: interaction.channel,
                user: interaction.user,
                topic,
                lang,
            });
        } catch (error) {
            console.error('[SlashCommand: quiz] Error starting quiz:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '❌ Failed to start quiz challenge. Please try again!' }).catch(() => {});
            } else {
                await interaction.reply({ content: '❌ Failed to start quiz challenge. Please try again!', ephemeral: true }).catch(() => {});
            }
        }
    },
};
