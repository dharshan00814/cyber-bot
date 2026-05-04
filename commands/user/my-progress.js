const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Member = require('../../models/Member.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('my-progress')
		.setDescription('View your personal progress and XP'),
	async execute(interaction) {
		try {
			const userId = interaction.user.id;
			let member = await Member.findOne({ userId });

			if (!member) {
				return interaction.editReply({ content: '📊 No progress tracked for you yet. Be active to earn XP!' });
			}

			// Simple level calc: level = floor(sqrt(xp / 100))
			const level = Math.floor(Math.sqrt((member.xp || 0) / 100)) || 0;
			const xp = member.xp || 0;

			const embed = new EmbedBuilder()
				.setTitle(`📊 ${interaction.user.username}'s Progress`)
				.setThumbnail(interaction.user.displayAvatarURL())
				.addFields(
					{ name: 'XP', value: `${xp.toLocaleString()}`, inline: true },
					{ name: 'Level', value: `${level}`, inline: true },
					{ name: 'Last Active', value: member.lastActiveDate ? `<t:${Math.floor(new Date(member.lastActiveDate).getTime() / 1000)}:R>` : 'Never', inline: true }
				)
				.setColor(0xff9900)
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('My Progress error:', error);
			await interaction.editReply({ content: '❌ Error fetching your progress.' });
		}
	},
};
