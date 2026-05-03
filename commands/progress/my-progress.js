const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Member = require('../../models/Member');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('my-progress')
        .setDescription('View your progress and completed tasks'),
    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;

        try {
            const member = await Member.findOne({ userId });

            if (!member) {
                return interaction.editReply('You have not logged any progress yet. Use `/progress` or `/complete-task` to get started!');
            }

            // Create main embed
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`📊 Progress Report - ${member.name}`)
                .setDescription(`Here's your cybersecurity learning journey!`)
                .addFields(
                    { name: '🏆 Role', value: member.role.charAt(0).toUpperCase() + member.role.slice(1), inline: true },
                    { name: '📈 Total XP', value: `${member.xp}`, inline: true },
                    { name: '⭐ Activity Score', value: `${member.activityScore}`, inline: true },
                    { name: '🔥 Current Streak', value: `${member.streak} days`, inline: true },
                    { name: '📅 Joined', value: `<t:${Math.floor(member.joinDate.getTime() / 1000)}:R>`, inline: true },
                    { name: '✅ Tasks Completed', value: `${member.completedTasks.length}`, inline: true }
                );

            // Add completed tasks if any
            if (member.completedTasks.length > 0) {
                const tasksList = member.completedTasks
                    .slice(-10) // Show last 10 tasks
                    .map((task, index) => `${index + 1}. **${task.taskName}** (+${task.pointsEarned} XP)`)
                    .join('\n');

                embed.addFields({
                    name: '📝 Recent Tasks',
                    value: tasksList || 'No tasks completed yet.',
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching progress:', error);
            await interaction.editReply({ 
                content: '❌ Error fetching your progress. Please try again.', 
                ephemeral: true 
            });
        }
    },
};
