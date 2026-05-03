const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Member = require('../../models/Member');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmember')
        .setDescription('Add a user to the clan')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to add')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('role')
                .setDescription('Role of the member')
                .setRequired(true)
                .addChoices(
                    { name: 'Beginner', value: 'beginner' },
                    { name: 'Intermediate', value: 'intermediate' },
                    { name: 'Leader', value: 'leader' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const targetUser = interaction.options.getUser('target');
        const role = interaction.options.getString('role');

        try {
            const existingMember = await Member.findOne({ userId: targetUser.id });
            if (existingMember) {
                return interaction.editReply({ content: `${targetUser.username} is already in the clan!` });
            }

            const newMember = new Member({
                userId: targetUser.id,
                name: targetUser.username,
                role: role
            });

            await newMember.save();
            await interaction.editReply(`Successfully added **${targetUser.username}** to the clan as a **${role}**.`);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'There was an error adding the member.' });
        }
    },
};
