const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Playlist = require('../../models/Playlist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pauseplaylist')
        .setDescription('Pause a scheduled playlist')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The exact title of the playlist to pause')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const title = interaction.options.getString('title');
        
        try {
            const playlist = await Playlist.findOneAndUpdate(
                { title: title, channelId: interaction.channelId },
                { status: 'paused' },
                { new: true }
            );

            if (!playlist) {
                return interaction.editReply({ content: `Playlist "${title}" not found in this channel.` });
            }

            await interaction.editReply(`Playlist **${playlist.title}** has been paused.`);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Error pausing playlist.' });
        }
    },
};
