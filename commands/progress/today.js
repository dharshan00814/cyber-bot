const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Progress = require('../../models/Progress');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('today')
        .setDescription('See today\'s progress from all members'),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const progresses = await Progress.find({ date: { $gte: startOfDay } }).populate('userId');
            
            if (progresses.length === 0) {
                return interaction.editReply('No progress logged today yet.');
            }

            const embed = new EmbedBuilder()
                .setTitle('Today\'s Cybersecurity Progress')
                .setColor('#0099ff');

            for (const prog of progresses) {
                // To display usernames properly, we fetch them if possible or just use a mention
                embed.addFields({ name: `User <@${prog.userId}>`, value: prog.text });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Error fetching today\'s progress.' });
        }
    },
};
