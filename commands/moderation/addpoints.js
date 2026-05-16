const { SlashCommandBuilder } = require('discord.js');
const Member = require('../../models/Member');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addpoints')
		.setDescription('Add points to a user')
		.addIntegerOption(option => option.setName('amount').setDescription('Number of points to add').setRequired(true))
		.addUserOption(option => option.setName('user').setDescription('User to add points to')),

	async execute(interaction) {
		await interaction.deferReply({ ephemeral: false });

		try {
			const targetUser = interaction.options.getUser('user') || interaction.user;
			const points = interaction.options.getInteger('amount');

			if (!Number.isInteger(points) || points === 0) {
				return interaction.editReply({ content: 'Please provide a non-zero integer for points.' });
			}

			let member = await Member.findOne({ userId: targetUser.id });

			if (member) {
				member.xp = (member.xp ?? 0) + points;
				member.lastActiveDate = new Date();
				await member.save();
			} else {
				member = new Member({
					userId: targetUser.id,
					name: targetUser.username,
					xp: points,
					activityScore: points > 0 ? 1 : 0,
					joinDate: new Date(),
					lastActiveDate: new Date(),
				});
				
				await member.save();
			}

			return interaction.editReply({ content: `✅ ${points > 0 ? 'Added' : 'Removed'} ${Math.abs(points)} points ${targetUser.id === interaction.user.id ? 'to yourself' : `to ${targetUser.tag}`}.` });
		} catch (error) {
			console.error('AddPoints error:', error);
			return interaction.editReply({ content: '❌ Error adding points.' });
		}
	},
};
