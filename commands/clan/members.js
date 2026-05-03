const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Member = require('../../models/Member');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('members')
        .setDescription('List all clan members'),
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const members = await Member.find().sort({ role: -1, activityScore: -1 });
            
            if (members.length === 0) {
                return interaction.editReply('The clan is currently empty.');
            }

            const embed = new EmbedBuilder()
                .setTitle('Cyber Clan Members')
                .setColor('#00ff00');

            let description = '';
            members.forEach((m, index) => {
                description += `**${index + 1}. ${m.name}** - Role: ${m.role} - Streak: ${m.streak} - XP: ${m.xp}\n`;
            });

            embed.setDescription(description);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'There was an error fetching members.', ephemeral: true });
        }
    },
};
