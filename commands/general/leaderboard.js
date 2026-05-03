const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Member = require('../../models/Member');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the activity leaderboard'),
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const members = await Member.find().sort({ activityScore: -1 }).limit(10);
            
            if (members.length === 0) {
                return interaction.editReply('No members found.');
            }

            const embed = new EmbedBuilder()
                .setTitle('Top 10 Cybersecurity Clan Members')
                .setColor('#ffd700');

            let description = '';
            members.forEach((m, index) => {
                description += `**${index + 1}. ${m.name}** - Score: ${m.activityScore} | XP: ${m.xp} | Streak: ${m.streak}🔥\n`;
            });

            embed.setDescription(description);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Error loading leaderboard.', ephemeral: true });
        }
    },
};
