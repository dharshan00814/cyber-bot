const KNOWLEDGE_BASE_EN = {
    'recursion': 'Recursion is a programming technique where a function calls itself to solve smaller instances of the same problem, continuing until it reaches a base condition that stops the calls.',
    'sql injection': 'SQL injection is a security vulnerability where an attacker manipulates SQL queries by inserting malicious input into form fields, allowing unauthorized database access or data theft.',
    'binary search': 'Binary search is an efficient algorithm for finding an item in a sorted list. It repeatedly divides the search interval in half, achieving logarithmic time complexity.',
    'api': 'An API, or Application Programming Interface, is a set of rules and protocols that allows different software applications to communicate and exchange data with each other.',
    'git': 'Git is a distributed version control system that tracks changes in your code, enables branching and merging, and helps teams collaborate smoothly on software projects.',
    'object oriented': 'Object-oriented programming is a coding paradigm based on classes and objects, using principles like encapsulation, inheritance, polymorphism, and abstraction to organize code.',
    'pointers': 'A pointer is a variable that stores the memory address of another variable, allowing direct memory manipulation and efficient data structure implementations in languages like C and C++.',
    'xss': 'Cross-site scripting, or XSS, occurs when malicious scripts are injected into trusted websites and executed in the browsers of unsuspecting users, often compromising sessions or cookies.',
    'cyber security': 'Cybersecurity is the practice of protecting systems, networks, devices, and programs from digital attacks, unauthorized access, and data damage.',
};

const KNOWLEDGE_BASE_TA = {
    'recursion': 'ரெக்கர்ஷன் என்பது ஒரு ஃபங்க்ஷன் தன்னைத்தானே திரும்ப திரும்ப அழைத்துக் கொள்ளும் ஒரு நிரலாக்க முறை. இது பேஸ் கண்டிஷன் வரும் வரை இயங்கி சிக்கலான பிரச்சனைகளை எளிதாக தீர்க்க உதவும்.',
    'sql injection': 'எஸ்கியூஎல் இன்ஜெக்ஷன் என்பது ஒரு தீவிர பாதுகாப்பு குறைபாடு. இதன் மூலம் ஹேக்கர்கள் தவறான தகவலை உள்ளிட்டு டேட்டாபேஸில் உள்ள ரகசிய தகவல்களை திருட முடியும். இதனை தடுக்க பிரிப்பேர்டு ஸ்டேட்மெண்ட்ஸ் பயன்படுத்த வேண்டும்.',
    'binary search': 'பைனரி சர்ச் என்பது வரிசைப்படுத்தப்பட்ட ஒரு பட்டியலில் ஒரு குறிப்பிட்ட உறுப்பை மிக விரைவாக தேடும் அல்காரிதம். இது ஒவ்வொரு முறையும் பட்டியலை பாதியாக பிரித்து தேடுவதால் மிக குறைந்த நேரத்தில் விடையை தரும்.',
    'api': 'ஏபிஐ அல்லது அப்ளிகேஷன் புரோகிராமிங் இன்டர்ஃபேஸ் என்பது இரண்டு வெவ்வேறு மென்பொருள்கள் ஒன்றுடன் ஒன்று எளிதாக தகவல்களை பரிமாறிக் கொள்ள உதவும் ஒரு பாலமாகும்.',
    'git': 'கிட் என்பது உங்கள் கோடிங்கில் செய்யப்படும் அனைத்து மாற்றங்களையும் பாதுகாப்பாக கண்காணிக்கும் ஒரு வெர்ஷன் கண்ட்ரோல் சிஸ்டம். இது குழுவாக இணைந்து வேலை செய்ய மிகவும் உதவுகிறது.',
    'object oriented': 'ஆப்ஜெக்ட் ஓரியண்டட் புரோகிராமிங் என்பது கிளாஸ் மற்றும் ஆப்ஜெக்ட்களை அடிப்படையாகக் கொண்ட ஒரு நிரலாக்க முறை. இதில் என்கேப்சுலேஷன், இன்ஹெரிட்டன்ஸ் போன்ற முக்கிய தத்துவங்கள் உள்ளன.',
    'pointers': 'பாயிண்டர் என்பது கணினி நினைவகத்தில் உள்ள மற்றொரு மாறியின் மெமரி முகவரியை சேமித்து வைக்கும் ஒரு சிறப்பு மாறி ஆகும்.',
    'xss': 'கிராஸ்-சைட் ஸ்கிரிப்டிங் அல்லது எக்ஸ் எஸ் எஸ் என்பது பயனர்களின் உலாவியில் தீங்கிழைக்கும் ஜாவாஸ்கிரிப்ட் கோடுகளை இயக்கி குக்கிகள் மற்றும் அமர்வுகளை திருடும் ஒரு பாதுகாப்பு தாக்குதல்.',
    'cyber security': 'சைபர் செக்யூரிட்டி என்பது கணினிகள், நெட்வொர்க்குகள் மற்றும் தகவல்களை இணையத் தாக்குதல்கள் மற்றும் அத்துமீறல்களில் இருந்து பாதுகாக்கும் நவீன தொழில்நுட்ப பாதுகாப்பு முறை ஆகும்.',
};

function isBotMentioned(text, wakeWord = 'cyber bot', botId = null) {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // 1. Custom configured wake word
    if (wakeWord) {
        const normalizedWake = wakeWord.toLowerCase().trim();
        if (lower.includes(normalizedWake)) return true;
        if (lower.includes(normalizedWake.replace(/\s+/g, ''))) return true;
    }

    // 2. English Bot Names & Calling Patterns
    const englishBotPatterns = [
        /\bcyber\s*bot\b/i,
        /\bhey\s+bot\b/i,
        /\bhi\s+bot\b/i,
        /\bhello\s+bot\b/i,
        /\bbot[,:]?\s+/i,       // "bot, what is..."
        /\s+bot[,?.]?$/i,       // "...explain this bot?"
        /\bbot\b.*\?/i,         // "bot can you explain?"
        /\b(doubt\s+bot|bot\s+doubt)\b/i,
    ];

    if (englishBotPatterns.some(p => p.test(lower))) {
        return true;
    }

    // 3. Tamil Bot Names & Calling Patterns (சைபர் பாட், பாட்)
    const tamilBotPatterns = [
        /சைபர்\s*பாட்/i,
        /ஹே\s*பாட்/i,
        /(?:^|\s+)பாட்(?:[,:?!]|\s+|$)/i,
    ];

    if (tamilBotPatterns.some(p => p.test(trimmed))) {
        return true;
    }

    // 4. Discord User Mention (<@botId> or @Cyber Bot)
    if (botId) {
        if (lower.includes(`<@${botId}>`) || lower.includes(`<@!${botId}>`)) return true;
    }
    if (lower.includes('@cyber bot') || lower.includes('@bot')) return true;

    return false;
}

function isTamilText(text) {
    if (!text || typeof text !== 'string') return false;

    // Check Tamil Unicode characters (U+0B80 to U+0BFF)
    if (/[\u0B80-\u0BFF]/.test(text)) return true;

    // Check Tanglish (Tamil in English alphabet)
    const tanglishPatterns = [
        /\b(na\s+enna|enna\s+na)\b/i,
        /\b(pathi\s+sollunga|solli\s+thanga|vilakkunga)\b/i,
        /\b(epdi|eppadi)\b/i,
        /\b(work\s+aagum|vela\s+seiyum)\b/i,
        /\b(puriyala|puriyave\s+illa)\b/i,
        /\b(solla\s+mudiyuma|solreengala)\b/i,
        /\b(oru\s+doubt|enaku\s+doubt)\b/i,
        /\b(tamil\s*la|thamizh\s*la|tamil|thamizh)\b/i,
        /\b(sollu|sollunga|theriyuma)\b/i,
    ];

    return tanglishPatterns.some(p => p.test(text));
}

function isDoubt(text, wakeWord = 'cyber bot', botId = null, options = {}) {
    if (!text || typeof text !== 'string') return false;

    // If explicitly invoked via command (/meeting ask) or dashboard input, accept directly
    if (options.isExplicit) return true;

    // CRITICAL USER REQUIREMENT:
    // "if i ask any questions it will not replying but i metion with the bot name only then bot reply otherwise none"
    const mentioned = isBotMentioned(text, wakeWord, botId);
    if (!mentioned) {
        return false; // Do not reply unless the bot name is explicitly mentioned!
    }

    return true;
}

function cleanDoubtText(rawText, wakeWord = 'cyber bot') {
    if (!rawText) return '';
    let cleaned = rawText.trim();

    // Strip English wake phrases
    if (wakeWord) {
        const regex = new RegExp(`^hey\\s+${wakeWord}[,:]?\\s*|^${wakeWord}[,:]?\\s*|${wakeWord}[,?]\\s*$`, 'i');
        cleaned = cleaned.replace(regex, '');
    }

    cleaned = cleaned.replace(/^(hey\s+bot|hi\s+bot|hello\s+bot|bot)[,:]?\s*/i, '');
    cleaned = cleaned.replace(/^(i have a doubt[,:]?\s*|can you tell me[,:]?\s*|can you explain[,:]?\s*)/i, '');
    cleaned = cleaned.replace(/[,]?\s*(hey\s+bot|bot)[?.]?$/i, '');

    // Strip Tamil wake phrases
    cleaned = cleaned.replace(/^(சைபர்\s*பாட்|ஹே\s*பாட்|பாட்)[,:]?\s*/i, '');
    cleaned = cleaned.replace(/[,]?\s*(சைபர்\s*பாட்|பாட்)[?.]?$/i, '');
    cleaned = cleaned.replace(/^(எனக்கு\s*ஒரு\s*சந்தேகம்|ஒரு\s*டவுட்)[,:]?\s*/i, '');

    return cleaned.trim() || rawText.trim();
}

function solveWithLocalKnowledge(question, isTamil = false) {
    const lower = question.toLowerCase();
    const kb = isTamil ? KNOWLEDGE_BASE_TA : KNOWLEDGE_BASE_EN;

    for (const [key, answer] of Object.entries(kb)) {
        if (lower.includes(key) || (isTamil && matchesTamilConcept(lower, key))) {
            if (isTamil) {
                return `நல்ல கேள்வி! ${answer} மேலும் ஏதேனும் சந்தேகம் இருந்தால் கேளுங்கள்.`;
            } else {
                return `Great question! ${answer} Let me know if you would like me to elaborate on any specific part.`;
            }
        }
    }

    if (isTamil) {
        return `நல்ல கேள்வி! ${question.replace(/\?+$/, '')} என்பது கணினி அறிவியல் மற்றும் மென்பொருள் உருவாக்கத்தில் ஒரு முக்கிய கருத்து. இது அமைப்புகளை பாதுகாப்பாகவும் சிறப்பாகவும் இயக்க உதவுகிறது. வேறு ஏதேனும் சந்தேகம் இருந்தால் தாராளமாகக் கேளுங்கள்!`;
    }

    return `That is a great question about ${question.replace(/\?+$/, '')}. In simple terms, it is a fundamental technology concept used to build, manage, and scale software systems reliably. Feel free to ask if you want me to break down any specific step!`;
}

function matchesTamilConcept(text, key) {
    const tamilKeywords = {
        'recursion': ['ரெக்கர்ஷன்', 'ரிகர்ஷன்', 'recursion'],
        'sql injection': ['எஸ்கியூஎல்', 'sql injection', 'sql'],
        'binary search': ['பைனரி சர்ச்', 'binary search'],
        'api': ['ஏபிஐ', 'api'],
        'git': ['கிட்', 'git'],
        'pointers': ['பாயிண்டர்', 'pointers', 'pointer'],
        'cyber security': ['சைபர் செக்யூரிட்டி', 'பாதுகாப்பு', 'cyber security'],
    };

    const matches = tamilKeywords[key] || [];
    return matches.some(m => text.includes(m));
}

async function solveDoubt(doubtText, context = {}) {
    const cleanedQuestion = cleanDoubtText(doubtText, context.wakeWord || process.env.WAKE_WORD || 'cyber bot');
    const isTamil = isTamilText(doubtText) || isTamilText(cleanedQuestion) || context.lang === 'ta';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 5 && apiKey !== 'your_gemini_api_key_here') {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.6-flash'];

        let systemPrompt;
        if (isTamil) {
            systemPrompt = `You are Cyber Bot, an encouraging, highly articulate AI mentor and tutor speaking live in a voice meeting to students.
The student has asked you a doubt in TAMIL (or Tanglish): "${cleanedQuestion}".

Guidelines for your answer:
1. You MUST explain the answer in clear, natural, spoken TAMIL (தமிழில் விளக்கம் அளியுங்கள்).
2. Use friendly, spoken Tamil that sounds natural when spoken aloud via Text-to-Speech. You can use standard English tech terms (like recursion, array, loop, deploy, hosting, database) where appropriate.
3. Keep it between 2 and 4 spoken sentences (maximum 60 words) so it is ideal for real-time speech.
4. CRITICAL: DO NOT use markdown (*, #, _, \`), bullet points, emojis, or code blocks. Format your response purely as natural spoken Tamil sentences.
5. Conclude with a warm encouragement in Tamil like "நன்றி! வேறு ஏதேனும் சந்தேகம் இருந்தால் கேளுங்கள்."`;
        } else {
            systemPrompt = `You are Cyber Bot, an encouraging, highly articulate AI mentor and tutor speaking live in a voice meeting to students and teammates.
The student has asked this question or doubt: "${cleanedQuestion}".

Guidelines for your answer:
1. Provide a direct, crystal-clear, and accurate explanation.
2. Keep it between 2 and 4 spoken sentences (maximum 60 words) so it is ideal for real-time speech.
3. CRITICAL: DO NOT use markdown (*, #, _, \`), bullet points, emojis, or code blocks. Format your response purely as natural spoken English that sounds friendly, confident, and professional when read aloud.
4. Conclude with a warm encouragement.`;
        }

        for (const modelName of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(systemPrompt);
                const rawResponse = result.response.text().trim();
                const spokenAnswer = rawResponse.replace(/[*_#`~>]/g, '').trim();

                return {
                    success: true,
                    question: cleanedQuestion,
                    spokenAnswer,
                    isTamil,
                    language: isTamil ? 'ta' : 'en',
                    provider: modelName,
                };
            } catch (err) {
                console.warn(`[AiDoubtService] Model ${modelName} failed (${err.message?.substring(0, 70)}), trying next model...`);
            }
        }
    }

    // Built-in intelligent tutor fallback
    const spokenAnswer = solveWithLocalKnowledge(cleanedQuestion, isTamil);
    return {
        success: true,
        question: cleanedQuestion,
        spokenAnswer,
        isTamil,
        language: isTamil ? 'ta' : 'en',
        provider: isTamil ? 'built-in-tamil-tutor' : 'built-in-tutor',
    };
}

module.exports = {
    isBotMentioned,
    isTamilText,
    isDoubt,
    cleanDoubtText,
    solveDoubt,
};
