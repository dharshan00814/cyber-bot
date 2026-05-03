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
        const title = interaction.options.getString('title');
        
        try {
            const deleted = await Playlist.findOneAndDelete({ title: title, channelId: interaction.channelId });

            if (!deleted) {
                return interaction.reply({ content: `Playlist "${title}" not found in this channel.`, ephemeral: true });
            }

            await interaction.reply(`Playlist **${deleted.title}** has been removed.`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Error removing playlist.', ephemeral: true });
        }
    },
};
