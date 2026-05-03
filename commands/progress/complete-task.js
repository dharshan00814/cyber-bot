const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Member = require('../../models/Member');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('complete-task')
        .setDescription('Mark a cybersecurity task/milestone as complete and earn 5 points')
        .addStringOption(option =>
            option.setName('task')
                .setDescription('Name of the task you completed (e.g., "Learn SQL Injection", "Complete Networking Module")')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const taskName = interaction.options.getString('task');

        try {
            let member = await Member.findOne({ userId });

            // Create member if doesn't exist
            if (!member) {
                member = new Member({
                    userId,
                    name: interaction.user.username,
                    role: 'beginner'
                });
            }

            // Check if task already completed
            const taskExists = member.completedTasks.some(task => 
                task.taskName.toLowerCase() === taskName.toLowerCase()
            );

            if (taskExists) {
                return interaction.editReply({
                    content: `❌ You've already completed this task! Choose a new one to continue earning points.`,
                    ephemeral: true
                });
            }

            // Add task completion
            const pointsEarned = 5;
            member.completedTasks.push({
                taskName,
                pointsEarned,
            });

            // Update member stats
            member.xp += pointsEarned;
            member.activityScore += pointsEarned;
            member.lastActiveDate = new Date();

            // Check for promotion
            let promotionMessage = '';
            if (member.xp >= 100 && member.role === 'beginner') {
                member.role = 'intermediate';
                promotionMessage = '\n🎉 **You leveled up to Intermediate!**';
            } else if (member.xp >= 300 && member.role === 'intermediate') {
                member.role = 'leader';
                promotionMessage = '\n🎉 **You leveled up to Leader!**';
            }

            await member.save();

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Task Completed!')
                .setDescription(`Great job completing: **${taskName}**`)
                .addFields(
                    { name: '📍 Points Earned', value: `+${pointsEarned} XP`, inline: true },
                    { name: '📊 Total XP', value: `${member.xp} XP`, inline: true },
                    { name: '🏆 Tasks Completed', value: `${member.completedTasks.length}`, inline: true }
                )
                .setFooter({ text: `Role: ${member.role}` });

            await interaction.editReply({ 
                embeds: [embed],
                content: promotionMessage || undefined
            });

        } catch (error) {
            console.error('Error completing task:', error);
            await interaction.editReply({ 
                content: '❌ Error completing task. Please try again.', 
                ephemeral: true 
            });
        }
    },
};
