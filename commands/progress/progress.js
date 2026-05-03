const { SlashCommandBuilder } = require('discord.js');
const Progress = require('../../models/Progress');
const Member = require('../../models/Member');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('Log your daily cybersecurity progress')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('What did you learn today?')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const text = interaction.options.getString('text');
        const userId = interaction.user.id;

        try {
            let member = await Member.findOne({ userId });
            if (!member) {
                // Auto add to clan as beginner if they log progress
                member = new Member({
                    userId,
                    name: interaction.user.username,
                    role: 'beginner'
                });
            }

            const newProgress = new Progress({
                userId,
                text,
            });

            await newProgress.save();

            // Update stats
            const now = new Date();
            const lastActive = member.lastActiveDate;
            
            if (lastActive) {
                const diffTime = Math.abs(now - lastActive);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays === 1) {
                    member.streak += 1;
                } else if (diffDays > 1) {
                    member.streak = 1;
                }
            } else {
                member.streak = 1;
            }

            member.lastActiveDate = now;
            member.activityScore += 10;
            member.xp += 20;

            // Simple rank update based on XP
            if (member.xp >= 100 && member.role === 'beginner') {
                member.role = 'intermediate';
                await interaction.channel.send(`🎉 ${interaction.user} leveled up to **Intermediate**!`);
            }

            await member.save();

            await interaction.editReply(`Progress logged! Keep it up. Streak: ${member.streak} 🔥`);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'There was an error saving your progress.' });
        }
    },
};
