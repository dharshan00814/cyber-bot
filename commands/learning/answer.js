const { SlashCommandBuilder } = require('discord.js');
const Member = require('../../models/Member');

// We will need to access the map from quiz.js
const { activeQuizzes } = require('./quiz');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('answer')
        .setDescription('Answer the active quiz')
        .addIntegerOption(option =>
            option.setName('option')
                .setDescription('The option number (e.g., 1, 2, 3)')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const userId = interaction.user.id;
        const answer = interaction.options.getInteger('option');

        if (!activeQuizzes.has(userId)) {
            return interaction.editReply({ content: 'You do not have an active quiz! Use `/quiz` first.' });
        }

        const session = activeQuizzes.get(userId);

        if (session.correctOptionIndex === answer) {
            activeQuizzes.delete(userId);
            
            // Reward member
            try {
                let member = await Member.findOne({ userId });
                if (member) {
                    member.xp += 5;
                    member.activityScore += 2;
                    await member.save();
                }
            } catch(e) { console.error(e); }

            await interaction.editReply('✅ **Correct!** You earned +5 XP.');
        } else {
            activeQuizzes.delete(userId);
            await interaction.editReply('❌ **Incorrect!** Keep learning and try again.');
        }
    },
};
