require('dotenv').config();
const fs = require('fs');
const path = require('path');
const aiDoubtService = require('../services/aiDoubtService');
const speechService = require('../services/speechService');

async function runTests() {
    console.log('=== TEST 1: BOT MENTION & SILENCE RULES (Zero Commands) ===');
    const cases = [
        { text: 'Cyber bot, what is recursion?', expectedMention: true, desc: 'English with "Cyber bot"' },
        { text: 'Hey Bot, can you explain binary search?', expectedMention: true, desc: 'English with "Hey Bot"' },
        { text: 'பாட், recursion na enna?', expectedMention: true, desc: 'Tanglish with "பாட்"' },
        { text: 'சைபர் பாட், SQL Injection பற்றி சொல்லுங்கள்', expectedMention: true, desc: 'Tamil with "சைபர் பாட்"' },
        { text: 'Can anyone help me with binary search?', expectedMention: false, desc: 'General question without bot name (MUST BE SILENT)' },
        { text: 'meeting eppo start aagum?', expectedMention: false, desc: 'Tamil chatter without bot name (MUST BE SILENT)' },
        { text: 'hi everyone good morning', expectedMention: false, desc: 'Greetings without bot name (MUST BE SILENT)' },
    ];

    let allRulesPassed = true;
    for (const c of cases) {
        const isMentioned = aiDoubtService.isBotMentioned(c.text);
        const pass = isMentioned === c.expectedMention;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] "${c.text}" -> Mentioned: ${isMentioned} (Expected: ${c.expectedMention}) - ${c.desc}`);
        if (!pass) allRulesPassed = false;
    }

    console.log('\n=== TEST 2: SPOKEN ANSWER & SPEECH SYNTHESIS (Zero Commands) ===');
    const doubts = [
        {
            text: 'Cyber bot, what is recursion?',
            expectedTamil: false,
        },
        {
            text: 'சைபர் பாட், ரெக்கர்ஷன் என்றால் என்ன?',
            expectedTamil: true,
        },
    ];

    for (const d of doubts) {
        console.log(`\nSolving: "${d.text}"`);
        const result = await aiDoubtService.solveDoubt(d.text);
        console.log(`- Detected Tamil: ${result.isTamil} (Expected: ${d.expectedTamil})`);
        console.log(`- Spoken Answer: "${result.spokenAnswer}"`);

        const voice = result.isTamil ? 'ta-IN-PallaviNeural' : 'en-US-ChristopherNeural';
        console.log(`- Synthesizing TTS Audio with voice: ${voice}...`);
        const synth = await speechService.synthesizeSpeechToFile(result.spokenAnswer, { voice });
        console.log(`- Generated Audio File: ${synth.filePath} (${fs.statSync(synth.filePath).size} bytes)`);

        if (fs.existsSync(synth.filePath) && fs.statSync(synth.filePath).size > 1000) {
            console.log(`- [PASS] Audio successfully generated for voice reply.`);
            speechService.cleanupTempAudio(synth.filePath);
        } else {
            console.error(`- [FAIL] Audio generation failed or file too small.`);
            allRulesPassed = false;
        }
    }

    if (allRulesPassed) {
        console.log('\n>>> ALL ZERO-COMMAND SPOKEN VOICE TESTS PASSED SUCCESSFULLY! <<<');
    } else {
        console.error('\n>>> SOME TESTS FAILED! <<<');
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
