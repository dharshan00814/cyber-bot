const { Events, Collection } = require('discord.js');
const { handleError } = require('../utils/errorHandling');
const quizService = require('../services/quizService');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle Button Interactions (e.g. Quiz & Dare buttons)
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('quiz_')) {
                try {
                    await quizService.submitAnswer({
                        channelId: interaction.channelId,
                        userId: interaction.user.id,
                        user: interaction.user,
                        interaction,
                    });
                } catch (btnErr) {
                    console.error('[InteractionCreate] Error handling quiz button:', btnErr);
                }
                return;
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        const originalReply = interaction.reply.bind(interaction);
        const originalDeferReply = interaction.deferReply.bind(interaction);

        interaction.reply = async options => {
            if (interaction.deferred || interaction.replied) {
                return interaction.editReply(options);
            }

            return originalReply(options);
        };

        interaction.deferReply = async options => {
            if (interaction.deferred || interaction.replied) {
                return interaction;
            }

            return originalDeferReply(options);
        };

        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply();
            }
        } catch (deferErr) {
            console.warn('[InteractionCreate] Notice on deferReply:', deferErr.message);
        }

        // Cooldown logic
        const { cooldowns } = client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = 3;
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1000);
                return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        try {
            await command.execute(interaction);
        } catch (error) {
            await handleError(interaction, error);
        }
    },
};
