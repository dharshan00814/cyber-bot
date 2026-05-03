const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Member = require('../../models/Member');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removemember')
        .setDescription('Remove a user from the clan')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to remove')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');

        try {
            const deletedMember = await Member.findOneAndDelete({ userId: targetUser.id });
            if (!deletedMember) {
                return interaction.reply({ content: `${targetUser.username} is not in the clan!`, ephemeral: true });
            }

            await interaction.reply(`Successfully removed **${targetUser.username}** from the clan.`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error removing the member.', ephemeral: true });
        }
    },
};
