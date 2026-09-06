const quizService = require('../services/quizService');

async function testInteractions() {
    console.log('Testing interaction handling and button responses...');

    const mockChannelId = 'btn-test-ch';
    const mockUserId = 'btn-user-1';

    let lastReply = null;
    const mockInteraction = {
        channelId: mockChannelId,
        user: { id: mockUserId, username: 'ButtonUser', displayName: 'Button User' },
        customId: 'quiz_opt_0_session123',
        reply: async (payload) => {
            lastReply = payload;
            return payload;
        },
    };

    // Ask question
    const mockChannel = {
        id: mockChannelId,
        send: async () => ({ id: 'msg-999' }),
    };

    await quizService.askQuestion({
        channel: mockChannel,
        user: mockInteraction.user,
        topic: 'Web Development',
    });

    const session = quizService.getActiveSession(mockChannelId);
    console.log('Session created with correctIndex:', session.questionData.correctIndex);

    // Test clicking correct button
    mockInteraction.customId = `quiz_opt_${session.questionData.correctIndex}_session123`;
    const submitResult = await quizService.submitAnswer({
        channelId: mockChannelId,
        userId: mockUserId,
        interaction: mockInteraction,
    });

    console.log('Button click result isCorrect:', submitResult.isCorrect);
    console.log('Embed sent title:', lastReply?.embeds?.[0]?.data?.title);

    if (submitResult.isCorrect && lastReply) {
        console.log('✅ Button interaction test passed!');
    } else {
        console.error('❌ Button interaction test failed!');
        process.exit(1);
    }
}

testInteractions().catch(console.error);
