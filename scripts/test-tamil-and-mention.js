require('dotenv').config();
const aiDoubtService = require('../services/aiDoubtService');
const speechService = require('../services/speechService');
const fs = require('fs');

async function runTests() {
    console.log('=== Testing Name Mention Requirement & Tamil Doubt Clarification ===\n');

    // 1. Test Bot Name Requirement (Strict Filtering)
    console.log('1. Testing Bot Name Requirement:');

    // Questions WITHOUT bot name -> MUST BE FALSE
    const noName1 = aiDoubtService.isDoubt('What is recursion?');
    const noName2 = aiDoubtService.isDoubt('Can someone help me with this bug?');
    const noName3 = aiDoubtService.isDoubt('ரெக்கர்ஷன் என்றால் என்ன?');
    const noName4 = aiDoubtService.isDoubt('recursion na enna puriyala');

    console.log('   - "What is recursion?":', noName1, '(Expected: false - no bot mention)');
    console.log('   - "Can someone help me with this bug?":', noName2, '(Expected: false - no bot mention)');
    console.log('   - "ரெக்கர்ஷன் என்றால் என்ன?":', noName3, '(Expected: false - no bot mention)');
    console.log('   - "recursion na enna puriyala":', noName4, '(Expected: false - no bot mention)');

    if (noName1 || noName2 || noName3 || noName4) {
        throw new Error('FAIL: Bot answered a question without being mentioned by name!');
    }

    // Questions WITH bot name -> MUST BE TRUE
    const withName1 = aiDoubtService.isDoubt('Cyber bot, what is recursion?');
    const withName2 = aiDoubtService.isDoubt('Hey bot, explain binary search');
    const withName3 = aiDoubtService.isDoubt('சைபர் பாட், ரெக்கர்ஷன் என்றால் என்ன?');
    const withName4 = aiDoubtService.isDoubt('பாட், SQL injection பற்றி சொல்லுங்க');
    const withName5 = aiDoubtService.isDoubt('Cyber bot, recursion na enna explain pannunga?');

    console.log('   - "Cyber bot, what is recursion?":', withName1, '(Expected: true)');
    console.log('   - "Hey bot, explain binary search":', withName2, '(Expected: true)');
    console.log('   - "சைபர் பாட், ரெக்கர்ஷன் என்றால் என்ன?":', withName3, '(Expected: true)');
    console.log('   - "பாட், SQL injection பற்றி சொல்லுங்க":', withName4, '(Expected: true)');
    console.log('   - "Cyber bot, recursion na enna explain pannunga?":', withName5, '(Expected: true)');

    if (!withName1 || !withName2 || !withName3 || !withName4 || !withName5) {
        throw new Error('FAIL: Bot failed to recognize its name being mentioned!');
    }
    console.log('   -> Name mention check: PASSED!\n');

    // 2. Test Tamil Doubt Clarification
    console.log('2. Testing Tamil Doubt Solving:');
    const tamilDoubt1 = await aiDoubtService.solveDoubt('சைபர் பாட், ரெக்கர்ஷன் என்றால் என்ன?');
    console.log('   - Tamil doubt (Pure Tamil script):');
    console.log('     Language:', tamilDoubt1.language, '| isTamil:', tamilDoubt1.isTamil);
    console.log('     Spoken Answer:\n     "', tamilDoubt1.spokenAnswer, '"');

    if (!tamilDoubt1.isTamil || !/[\u0B80-\u0BFF]/.test(tamilDoubt1.spokenAnswer)) {
        throw new Error('FAIL: Bot did not answer Tamil doubt in Tamil script!');
    }

    const tamilDoubt2 = await aiDoubtService.solveDoubt('Cyber bot, binary search epdi work aagum?');
    console.log('\n   - Tanglish doubt:');
    console.log('     Language:', tamilDoubt2.language, '| isTamil:', tamilDoubt2.isTamil);
    console.log('     Spoken Answer:\n     "', tamilDoubt2.spokenAnswer, '"');

    if (!tamilDoubt2.isTamil || !/[\u0B80-\u0BFF]/.test(tamilDoubt2.spokenAnswer)) {
        throw new Error('FAIL: Bot did not answer Tanglish doubt in Tamil!');
    }

    const englishDoubt = await aiDoubtService.solveDoubt('Cyber bot, what is an API?');
    console.log('\n   - English doubt:');
    console.log('     Language:', englishDoubt.language, '| isTamil:', englishDoubt.isTamil);
    console.log('     Spoken Answer:\n     "', englishDoubt.spokenAnswer, '"');

    if (englishDoubt.isTamil || /[\u0B80-\u0BFF]/.test(englishDoubt.spokenAnswer)) {
        throw new Error('FAIL: Bot answered English question in Tamil!');
    }
    console.log('   -> Tamil & English doubt resolution: PASSED!\n');

    // 3. Test Tamil TTS Synthesis
    console.log('3. Testing Automatic Tamil Voice Selection for Speech:');
    const ttsResult = await speechService.synthesizeSpeechToFile(tamilDoubt1.spokenAnswer);
    console.log('   - Selected voice engine:', ttsResult.engine);
    console.log('   - Selected voice:', ttsResult.voice, '(Expected: ta-IN-PallaviNeural or ta-IN-ValluvarNeural)');
    console.log('   - Audio file exists:', fs.existsSync(ttsResult.filePath));
    console.log('   - File size:', fs.statSync(ttsResult.filePath).size, 'bytes');

    if (!ttsResult.voice.startsWith('ta-') && !ttsResult.voice.includes('ta')) {
        throw new Error('FAIL: Speech service did not automatically switch to Tamil voice for Tamil text!');
    }
    speechService.cleanupTempAudio(ttsResult.filePath);
    console.log('   -> Tamil voice synthesis: PASSED!\n');

    console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
    process.exit(0);
}

runTests().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
