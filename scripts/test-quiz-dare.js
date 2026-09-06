require('dotenv').config();
const quizService = require('../services/quizService');
const Member = require('../models/Member');

async function runTests() {
    console.log('========================================');
    console.log('🧪 TESTING QUESTION & DARE SYSTEM');
    console.log('========================================\n');

    let allPassed = true;

    // --- TEST 1: Intent Recognition ---
    console.log('--- TEST 1: Intent Detection (isQuizRequest) ---');
    const testPhrases = [
        { text: 'ask me a question', expected: true },
        { text: '@CyberBot ask me a question', expected: true },
        { text: 'quiz me', expected: true },
        { text: 'can you give me a question', expected: true },
        { text: 'test my knowledge', expected: true },
        { text: 'கேள்வி கேளுங்க பாட்', expected: true },
        { text: 'ஒரு கேள்வி கேளுங்கள்', expected: true },
        { text: 'what is an api?', expected: false },
        { text: 'hello bot', expected: false },
    ];

    for (const item of testPhrases) {
        const detected = quizService.isQuizRequest(item.text);
        const pass = detected === item.expected;
        if (!pass) allPassed = false;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] "${item.text}" -> detected: ${detected} (expected: ${item.expected})`);
    }

    // --- TEST 2: Question Generation ---
    console.log('\n--- TEST 2: Question Generation ---');
    try {
        const qEn = await quizService.getQuestion({ isTamil: false, topic: 'Cybersecurity' });
        console.log(`[PASS] English Question: "${qEn.question}"`);
        console.log(`       Options: ${qEn.options.map((o, idx) => `[${['A','B','C','D'][idx]}] ${o}`).join(', ')}`);
        console.log(`       Correct: Option ${qEn.correctLetter} (${qEn.correctText})`);

        const qTa = await quizService.getQuestion({ isTamil: true, topic: 'Tamil' });
        console.log(`[PASS] Tamil Question: "${qTa.question}"`);
        console.log(`       Options: ${qTa.options.map((o, idx) => `[${['A','B','C','D'][idx]}] ${o}`).join(', ')}`);
        console.log(`       Correct: Option ${qTa.correctLetter} (${qTa.correctText})`);
    } catch (err) {
        console.error('[FAIL] Question generation failed:', err);
        allPassed = false;
    }

    // --- TEST 3: Answer Parsing ---
    console.log('\n--- TEST 3: Answer Parsing ---');
    const mockQuestion = {
        options: ['Git', 'Docker', 'Kubernetes', 'Jenkins'],
        correctIndex: 0,
    };

    const parseTests = [
        { input: 'a', expectedIndex: 0 },
        { input: 'Option B', expectedIndex: 1 },
        { input: '3', expectedIndex: 2 },
        { input: 'it\'s option d', expectedIndex: 3 },
        { input: 'git', expectedIndex: 0 },
        { input: 'give up', expectedGiveUp: true },
        { input: 'i don\'t know', expectedGiveUp: true },
        { input: 'தெரியாது', expectedGiveUp: true },
    ];

    for (const pt of parseTests) {
        const parsed = quizService.parseAnswerInput(pt.input, mockQuestion);
        let pass = false;
        if (pt.expectedGiveUp) {
            pass = parsed?.isGiveUp === true;
        } else {
            pass = parsed?.selectedIndex === pt.expectedIndex;
        }
        if (!pass) allPassed = false;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] Input: "${pt.input}" -> parsed:`, parsed);
    }

    // --- TEST 4: Simulated Quiz Flow with Mock Channel & Member ---
    console.log('\n--- TEST 4: Simulated Correct Answer Flow (Award Points) ---');
    const mockChannelId = 'test-channel-999';
    const mockUserId = 'test-user-12345';
    const mockUser = {
        id: mockUserId,
        username: 'TestCoder',
        displayName: 'Test Coder',
    };

    const mockMessagesSent = [];
    const mockChannel = {
        id: mockChannelId,
        send: async (payload) => {
            mockMessagesSent.push(payload);
            return { id: 'mock-msg-1', components: payload.components };
        },
    };

    // 4.1. Start Quiz
    const askResult = await quizService.askQuestion({
        channel: mockChannel,
        user: mockUser,
        topic: 'Cybersecurity',
    });

    console.log(`[PASS] Quiz Session Created. Question: "${askResult.questionData.question}"`);
    console.log(`       Correct Option: ${askResult.questionData.correctLetter}`);

    // Verify session stored
    const activeSession = quizService.getActiveSession(mockChannelId);
    if (activeSession) {
        console.log(`[PASS] Active session found in channel ${mockChannelId}`);
    } else {
        console.log(`[FAIL] Active session NOT found`);
        allPassed = false;
    }

    // 4.2. Submit Correct Answer
    const initialMember = await Member.findOne({ userId: mockUserId });
    const initialXp = initialMember?.xp || 0;

    const correctLetter = activeSession.questionData.correctLetter;
    const answerResult = await quizService.submitAnswer({
        channelId: mockChannelId,
        userId: mockUserId,
        user: mockUser,
        answerInput: correctLetter,
    });

    console.log(`[${answerResult.isCorrect ? 'PASS' : 'FAIL'}] Correct Answer Processed! isCorrect: ${answerResult.isCorrect}`);
    console.log(`       Spoken: "${answerResult.spokenResult}"`);

    // Verify XP incremented
    const updatedMember = await Member.findOne({ userId: mockUserId });
    const newXp = updatedMember?.xp || 0;
    const xpDiff = newXp - initialXp;
    if (xpDiff === 15) {
        console.log(`[PASS] Points Successfully Awarded! +${xpDiff} XP (Total: ${newXp} XP)`);
    } else {
        console.log(`[FAIL] XP difference expected +15, got: +${xpDiff} (new: ${newXp}, old: ${initialXp})`);
        allPassed = false;
    }

    // --- TEST 5: Simulated Incorrect Answer Flow (Assign Dare) ---
    console.log('\n--- TEST 5: Simulated Incorrect Answer Flow (Assign Dare) ---');
    // Start second quiz
    const askResult2 = await quizService.askQuestion({
        channel: mockChannel,
        user: mockUser,
        topic: 'Web Development',
    });

    const activeSession2 = quizService.getActiveSession(mockChannelId);
    const wrongOption = activeSession2.questionData.correctIndex === 0 ? 'B' : 'A';

    const wrongResult = await quizService.submitAnswer({
        channelId: mockChannelId,
        userId: mockUserId,
        user: mockUser,
        answerInput: wrongOption,
    });

    if (!wrongResult.isCorrect && wrongResult.dare) {
        console.log(`[PASS] Wrong Answer Correctly Penalized with DARE!`);
        console.log(`       Dare Assigned: ${wrongResult.dare}`);
        console.log(`       Spoken: "${wrongResult.spokenResult}"`);
    } else {
        console.log(`[FAIL] Wrong answer did not assign dare:`, wrongResult);
        allPassed = false;
    }

    // --- TEST 6: Simulated Give Up Flow (Assign Dare) ---
    console.log('\n--- TEST 6: Simulated Give Up Flow (Assign Dare) ---');
    await quizService.askQuestion({
        channel: mockChannel,
        user: mockUser,
        topic: 'Data Structures',
    });

    const giveUpResult = await quizService.submitAnswer({
        channelId: mockChannelId,
        userId: mockUserId,
        user: mockUser,
        answerInput: 'i give up',
    });

    if (!giveUpResult.isCorrect && giveUpResult.dare) {
        console.log(`[PASS] Give-up Correctly Penalized with DARE!`);
        console.log(`       Dare: ${giveUpResult.dare}`);
    } else {
        console.log(`[FAIL] Give up did not assign dare:`, giveUpResult);
        allPassed = false;
    }

    console.log('\n========================================');
    if (allPassed) {
        console.log('🎉 ALL QUESTION & DARE TESTS PASSED SUCCESSFULLY!');
    } else {
        console.log('❌ SOME TESTS FAILED');
    }
    console.log('========================================');
}

runTests().catch(console.error);
