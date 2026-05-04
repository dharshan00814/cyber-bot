const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Member = require('../../models/Member.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('members')
		.setDescription('View guild member statistics'),
	async execute(interaction) {
		try {
			const guild = interaction.guild;
			const totalMembers = guild.memberCount;
			const trackedMembers = await Member.find().exec();
			const trackedCount = trackedMembers.length;
			const trackedPercentage = totalMembers > 0 ? Math.round((trackedCount / totalMembers) * 100) : 0;

			const embed = new EmbedBuilder()
				.setTitle('👥 Member Statistics')
				.addFields(
					{ name: 'Total Guild Members', value: `${totalMembers.toLocaleString()}`, inline: true },
					{ name: 'Tracked Members', value: `${trackedCount.toLocaleString()}`, inline: true },
					{ name: 'Tracked %', value: `${trackedPercentage}%`, inline: true }
				)
				.setColor(0x0099ff)
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('Members error:', error);
			await interaction.editReply({ content: '❌ Error fetching member stats.' });
		}
	},
};
