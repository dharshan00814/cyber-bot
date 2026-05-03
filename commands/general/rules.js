const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('View the ethical rules of the cybersecurity clan'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Ethical Guidelines')
            .setColor('#ff0000')
            .setDescription(`**WARNING: Educational Use Only**\n\nAll tools, techniques, and knowledge discussed in this clan are strictly for educational purposes and authorized auditing.\n\n1. Do not attack targets without explicit permission.\n2. Do not use knowledge for malicious intent.\n3. Respect privacy and data confidentiality.\n4. Stay within the boundaries of the law.\n\nFailure to comply will result in immediate ban and report.`);

        await interaction.reply({ embeds: [embed] });
    },
};
