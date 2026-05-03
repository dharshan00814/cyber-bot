const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getPlaylistVideos, getPlaylistInfo } = require('../../services/youtube');
const Playlist = require('../../models/Playlist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addplaylist')
        .setDescription('Add a YouTube playlist to be scheduled daily')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('The YouTube playlist URL')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply();
        const url = interaction.options.getString('url');

        try {
            // Extract playlist ID from URL
            const urlObj = new URL(url);
            const playlistId = urlObj.searchParams.get('list');

            if (!playlistId) {
                return interaction.editReply('Invalid YouTube playlist URL. Please provide a valid link containing "list="');
            }

            const info = await getPlaylistInfo(playlistId);
            const videos = await getPlaylistVideos(playlistId);

            if (videos.length === 0) {
                return interaction.editReply('No videos found in this playlist.');
            }

            const newPlaylist = new Playlist({
                url: url,
                channelId: interaction.channelId, // We use the Discord channel where it was created
                playlistId: playlistId,
                title: info.title,
                videos: videos,
                addedBy: interaction.user.id
            });

            await newPlaylist.save();

            await interaction.editReply(`Successfully added playlist **${info.title}** containing ${videos.length} videos. One video will be posted daily at 6 PM.`);
        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error adding the playlist. Ensure the URL is correct and public/unlisted.');
        }
    },
};
