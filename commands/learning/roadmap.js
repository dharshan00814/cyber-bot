const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roadmap')
        .setDescription('View the ethical hacking learning roadmap'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Ethical Hacking Roadmap')
            .setColor('#8a2be2')
            .setDescription('Here is a general path to get started with ethical hacking:')
            .addFields(
                { name: '1. Prerequisites', value: '- Basic Networking (TCP/IP, DNS, OSI Model)\n- Linux Fundamentals (Command line, permissions)\n- Scripting basics (Python, Bash)' },
                { name: '2. Security Fundamentals', value: '- Cryptography basics\n- Identity and Access Management\n- Security protocols' },
                { name: '3. Web Application Security', value: '- OWASP Top 10 (SQLi, XSS, CSRF)\n- Burp Suite basics\n- Web proxies and traffic interception' },
                { name: '4. Network Penetration Testing', value: '- Nmap & Port Scanning\n- Vulnerability Assessment (Nessus)\n- Exploitation (Metasploit)' },
                { name: '5. Advanced Topics', value: '- Privilege Escalation\n- Active Directory Hacking\n- Reverse Engineering & Malware Analysis' },
                { name: 'Practice Platforms', value: 'HackTheBox, TryHackMe, OverTheWire, PortSwigger Academy' }
            );

        await interaction.reply({ embeds: [embed] });
    },
};
