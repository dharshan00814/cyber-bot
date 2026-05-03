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
        await interaction.deferReply({ ephemeral: true });
        const targetUser = interaction.options.getUser('target');

        try {
            const deletedMember = await Member.findOneAndDelete({ userId: targetUser.id });
            if (!deletedMember) {
                return interaction.editReply({ content: `${targetUser.username} is not in the clan!` });
            }

            await interaction.editReply(`Successfully removed **${targetUser.username}** from the clan.`);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'There was an error removing the member.' });
        }
    },
};
