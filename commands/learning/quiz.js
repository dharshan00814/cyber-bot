const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Quiz = require('../../models/Quiz');

// A simple in-memory store for active quiz sessions
const activeQuizzes = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quiz')
        .setDescription('Start a cybersecurity quiz'),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            // Count total quizzes and pick a random one
            const count = await Quiz.countDocuments();
            if (count === 0) {
                // Seed some initial data if empty
                await Quiz.insertMany([
                    {
                        question: 'What does SQL stand for?',
                        options: ['1. Structured Query Language', '2. Standard Query Logic', '3. Simple Question Language', '4. Server Query Language'],
                        correctOptionIndex: 1,
                        topic: 'SQLi'
                    },
                    {
                        question: 'Which port is default for SSH?',
                        options: ['1. 21', '2. 22', '3. 80', '4. 443'],
                        correctOptionIndex: 2,
                        topic: 'Networking'
                    }
                ]);
            }

            const quizzes = await Quiz.aggregate([{ $sample: { size: 1 } }]);
            const quiz = quizzes[0];

            activeQuizzes.set(interaction.user.id, {
                quizId: quiz._id,
                correctOptionIndex: quiz.correctOptionIndex
            });

            const embed = new EmbedBuilder()
                .setTitle(`Quiz: ${quiz.topic}`)
                .setDescription(`**${quiz.question}**\n\n${quiz.options.join('\n')}\n\n*Use \`/answer <option_number>\` to answer!*`)
                .setColor('#ffaa00');

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Error loading quiz.' });
        }
    },
    activeQuizzes // Exporting map to be accessible by answer.js if needed, or we can use global.
};
