const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Playlist = require('../../models/Playlist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeplaylist')
        .setDescription('Remove a scheduled playlist')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The exact title of the playlist to remove')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const title = interaction.options.getString('title');
        
        try {
            const deleted = await Playlist.findOneAndDelete({ title: title, channelId: interaction.channelId });

            if (!deleted) {
                return interaction.editReply({ content: `Playlist "${title}" not found in this channel.` });
            }

            await interaction.editReply(`Playlist **${deleted.title}** has been removed.`);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Error removing playlist.' });
        }
    },
};
