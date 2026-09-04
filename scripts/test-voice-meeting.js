require('dotenv').config();
const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log('=== Starting Voice Meeting System Verification ===\n');

    // 1. Test Doubt Service
    console.log('1. Testing AI Doubt Service...');
    const aiDoubtService = require('../services/aiDoubtService');
    const isDoubtWithoutName = aiDoubtService.isDoubt('What is recursion?'); // false (no bot name)
    const isDoubt2 = aiDoubtService.isDoubt('Hello good morning'); // false
    const isDoubtWithName = aiDoubtService.isDoubt('Cyber bot, explain SQL Injection'); // true (has bot name)

    console.log('   - isDoubt("What is recursion?"):', isDoubtWithoutName, '(Expected: false - no bot mention)');
    console.log('   - isDoubt("Hello good morning"):', isDoubt2, '(Expected: false)');
    console.log('   - isDoubt("Cyber bot, explain SQL Injection"):', isDoubtWithName, '(Expected: true - has bot mention)');

    const doubtResult = await aiDoubtService.solveDoubt('Cyber bot, what is binary search?');
    console.log('   - Doubt solution provider:', doubtResult.provider);
    console.log('   - Spoken explanation:\n     "', doubtResult.spokenAnswer, '"\n');

    if (isDoubtWithoutName || isDoubt2 || !isDoubtWithName || !doubtResult.spokenAnswer) {
        throw new Error('AI Doubt Service test failed!');
    }

    // 2. Test Speech Service (Text-to-Speech)
    console.log('2. Testing Speech Service (TTS)...');
    const speechService = require('../services/speechService');
    const testPhrase = 'Cyber Bot voice assistant is now active and ready to help in the meeting.';
    const ttsResult = await speechService.synthesizeSpeechToFile(testPhrase, { voice: 'en-US-ChristopherNeural' });
    console.log('   - Audio file generated at:', ttsResult.filePath);
    console.log('   - File exists:', fs.existsSync(ttsResult.filePath));
    console.log('   - File size:', fs.statSync(ttsResult.filePath).size, 'bytes');
    console.log('   - Voice engine:', ttsResult.engine);

    if (!fs.existsSync(ttsResult.filePath) || fs.statSync(ttsResult.filePath).size === 0) {
        throw new Error('TTS test failed to produce valid audio file!');
    }
    speechService.cleanupTempAudio(ttsResult.filePath);
    console.log('   - Temp audio cleanup: success\n');

    // 3. Test MeetingSession Model
    console.log('3. Testing MeetingSession Model...');
    const MeetingSession = require('../models/MeetingSession');
    const testSession = new MeetingSession({
        channelName: 'Test Voice Channel',
        durationSeconds: 120,
        participants: [
            { userId: 'u-123', username: 'TestUser', speakCount: 3, totalSpokenSeconds: 24 }
        ],
        transcripts: [
            { text: 'What is an API?', isDoubt: true, botAnswer: 'An API is an Application Programming Interface.' }
        ],
        status: 'ended',
    });
    await testSession.save();
    console.log('   - Saved test meeting session with ID:', testSession._id);

    const retrieved = await MeetingSession.findOne({ _id: testSession._id });
    console.log('   - Retrieved session channel:', retrieved ? retrieved.channelName : 'null');
    console.log('   - Participants count:', retrieved ? retrieved.participants.length : 0);

    // Clean up test session
    await MeetingSession.findOneAndDelete({ _id: testSession._id });
    console.log('   - Cleaned up test session.\n');

    // 4. Test Voice Meeting Service Status
    console.log('4. Testing Voice Meeting Service Status...');
    const voiceMeetingService = require('../services/voiceMeetingService');
    const status = voiceMeetingService.getStatus();
    console.log('   - VoiceMeetingService active state:', status.active);
    console.log('   - Service exports valid methods:', typeof voiceMeetingService.joinMeeting === 'function', typeof voiceMeetingService.askDoubt === 'function');

    console.log('\n=== All Voice Meeting Tests Passed Successfully! ===');
    process.exit(0);
}

runTests().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
