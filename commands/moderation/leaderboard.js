const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Member = require('../../models/Member.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('View the top members by XP points'),
	async execute(interaction) {
		try {
			const members = await Member.find().exec();
			if (!members || members.length === 0) {
				return interaction.editReply({ content: '📭 No members tracked yet.' });
			}

			// Sort by XP descending
			members.sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
			const topMembers = members.slice(0, 10);

			const leaderboard = topMembers.map((member, index) => {
				const rank = index + 1;
				const name = member.name || member.userId || 'Unknown';
				const xp = member.xp ?? 0;
				return `\`${rank.toString().padStart(2, ' ')}.\` **${name}** - ${xp} XP`;
			}).join('\n');

			const embed = new EmbedBuilder()
				.setTitle('🏆 Leaderboard - Top 10 Members')
				.setDescription(leaderboard)
				.setColor(0x00ff00)
				.setFooter({ text: `Total tracked: ${members.length}` })
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('Leaderboard error:', error);
			await interaction.editReply({ content: '❌ Error fetching leaderboard.' });
		}
	},
};
