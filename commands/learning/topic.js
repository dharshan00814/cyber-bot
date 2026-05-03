const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const topics = [
    { title: 'SQL Injection (SQLi)', desc: 'A code injection technique used to attack data-driven applications, inserting malicious SQL statements into entry fields for execution.' },
    { title: 'Cross-Site Scripting (XSS)', desc: 'A vulnerability where attackers inject malicious scripts into web pages viewed by other users.' },
    { title: 'Phishing', desc: 'A cybercrime in which a target is contacted by someone posing as a legitimate institution to lure individuals into providing sensitive data.' },
    { title: 'Networking Fundamentals', desc: 'Understanding OSI model, TCP/IP, DNS, DHCP, and routing is essential for cybersecurity.' },
    { title: 'Buffer Overflow', desc: 'An anomaly where a program, while writing data to a buffer, overruns the buffer\'s boundary and overwrites adjacent memory locations.' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topic')
        .setDescription('Get a random cybersecurity topic to study'),
    async execute(interaction) {
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];

        const embed = new EmbedBuilder()
            .setTitle(`Study Topic: ${randomTopic.title}`)
            .setDescription(randomTopic.desc)
            .setColor('#00ffff');

        await interaction.reply({ embeds: [embed] });
    },
};
