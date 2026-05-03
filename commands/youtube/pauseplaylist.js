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
        const title = interaction.options.getString('title');
        
        try {
            const playlist = await Playlist.findOneAndUpdate(
                { title: title, channelId: interaction.channelId },
                { status: 'paused' },
                { new: true }
            );

            if (!playlist) {
                return interaction.reply({ content: `Playlist "${title}" not found in this channel.`, ephemeral: true });
            }

            await interaction.reply(`Playlist **${playlist.title}** has been paused.`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Error pausing playlist.', ephemeral: true });
        }
    },
};
