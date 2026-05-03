async function handleError(interaction, error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    
    const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
    
    try {
        if (interaction.deferred) {
            await interaction.editReply(errorMessage);
        } else if (interaction.replied) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    } catch (err) {
        console.error('Error sending error message:', err);
    }
}

module.exports = { handleError };
