const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Playlist = require('../../models/Playlist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playliststatus')
        .setDescription('Check the status of scheduled playlists'),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const playlists = await Playlist.find({ channelId: interaction.channelId });

            if (playlists.length === 0) {
                return interaction.editReply('No playlists scheduled for this channel.');
            }

            const embed = new EmbedBuilder()
                .setTitle('Scheduled Playlists')
                .setColor('#206694');

            for (const p of playlists) {
                embed.addFields({
                    name: p.title,
                    value: `Status: **${p.status}**\nProgress: ${p.currentIndex} / ${p.videos.length} videos\nAdded By: <@${p.addedBy}>`
                });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Error fetching playlist status.' });
        }
    },
};
