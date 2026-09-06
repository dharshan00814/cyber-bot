const KNOWLEDGE_BASE_EN = {
    'webhook': 'A webhook is a mechanism that allows one application to automatically send real-time data to another application whenever a specific event occurs, usually via an HTTP POST request.',
    'rest api': 'A REST API is an architectural style for APIs that uses standard HTTP methods (like GET, POST, PUT, and DELETE) to access and manipulate resources in a stateless manner.',
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
    'webhook': 'வெப்ஹூக் (Webhook) என்பது ஒரு குறிப்பிட்ட நிகழ்வு நடக்கும்போது ஒரு செயலி மற்றொரு செயலிக்கு தானாகவே நிகழ்நேர தகவலை (HTTP POST மூலம்) அனுப்பும் ஒரு தொழில்நுட்ப வழிமுறையாகும்.',
    'rest api': 'ரெஸ்ட் ஏபிஐ (REST API) என்பது இணையத்தில் தகவல்களை பரிமாறிக் கொள்ள GET, POST, PUT, DELETE போன்ற நிலையான HTTP முறைகளைப் பயன்படுத்தும் ஒரு நவீன ஏபிஐ வடிவமைப்பு முறையாகும்.',
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

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts possible bot names/identifiers given client, guild, and custom options
 */
function getBotIdentifiers(options = {}) {
    const names = new Set();

    // Default known bot names
    names.add('cyber bot');
    names.add('cyber-bot');
    names.add('cyberbot');
    names.add('meetingbot');
    names.add('meeting bot');
    names.add('cyber-fox');
    names.add('cyber fox');

    if (options.wakeWord) {
        names.add(options.wakeWord.toLowerCase().trim());
    }
    if (process.env.WAKE_WORD) {
        names.add(process.env.WAKE_WORD.toLowerCase().trim());
    }

    if (options.client?.user?.username) {
        names.add(options.client.user.username.toLowerCase().trim());
    }
    if (options.guild?.members?.me?.displayName) {
        names.add(options.guild.members.me.displayName.toLowerCase().trim());
    }

    return Array.from(names).filter(n => n && n.length > 0);
}

/**
 * Checks if a message or text is directing a doubt/question to the bot.
 * Supports:
 * - Discord user mention (<@botId>, <@!botId>, message.mentions.has(client.user))
 * - Plaintext bot name (@MeetingBot, @CYBER-FOX, MeetingBot, etc.)
 * - Call syntax (MeetingBot, explain API / Hey bot, what is a webhook?)
 * - Configured WAKE_WORD
 * - Tamil patterns (சைபர் பாட், பாட்)
 */
function isBotMentioned(input, wakeWord = null, botId = null, extraOptions = {}) {
    let text = '';
    let mentions = null;
    let client = null;
    let guild = null;

    if (input && typeof input === 'object' && typeof input.content === 'string') {
        text = input.content;
        mentions = input.mentions;
        client = input.client;
        guild = input.guild;
        botId = botId || client?.user?.id;
    } else if (typeof input === 'string') {
        text = input;
    } else {
        return false;
    }

    if (typeof wakeWord === 'object' && wakeWord !== null) {
        extraOptions = wakeWord;
        wakeWord = extraOptions.wakeWord;
        botId = botId || extraOptions.botId;
        client = client || extraOptions.client;
        guild = guild || extraOptions.guild;
        mentions = mentions || extraOptions.mentions;
    }

    botId = botId || client?.user?.id || process.env.CLIENT_ID;

    // 1. Direct Discord Mentions Collection Check
    if (client?.user && mentions?.has && mentions.has(client.user)) {
        return true;
    }
    if (botId && mentions?.users?.has && mentions.users.has(botId)) {
        return true;
    }

    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // 2. Raw Discord Mention Syntax in Content (<@botId> or <@!botId>)
    if (botId) {
        const rawMentionRegex = new RegExp(`<@!?${botId}>`, 'i');
        if (rawMentionRegex.test(trimmed)) {
            return true;
        }
    }

    // 3. Dynamic Bot Names & Nicknames
    const botNames = getBotIdentifiers({ wakeWord, client, guild });
    for (const name of botNames) {
        const escaped = escapeRegex(name);

        // @BotName
        if (new RegExp(`@${escaped}\\b`, 'i').test(lower)) {
            return true;
        }

        // BotName, or BotName: (e.g. "MeetingBot, what is...", "CYBER-FOX: explain API")
        if (new RegExp(`^${escaped}[,:]\\s*`, 'i').test(lower)) {
            return true;
        }

        // Hey/Hi/Hello BotName
        if (new RegExp(`\\b(hey|hi|hello)\\s+${escaped}\\b`, 'i').test(lower)) {
            return true;
        }

        // BotName at the start of a question (e.g. "MeetingBot what is a webhook?", "MeetingBot explain...")
        if (new RegExp(`^${escaped}\\s+(what|explain|how|why|can|tell|is|are|define|i\\s+don't|help)\\b`, 'i').test(lower)) {
            return true;
        }

        // "... BotName?" at the end
        if (new RegExp(`\\b${escaped}\\s*\\?\\s*$`, 'i').test(lower)) {
            return true;
        }
    }

    // 4. Generic Bot Calling Patterns
    const genericPatterns = [
        /^@bot\b/i,
        /^bot[,:]\s+/i,
        /\bhey\s+bot\b/i,
        /\bhi\s+bot\b/i,
        /\bhello\s+bot\b/i,
        /\s+bot[,?.]?$/i,
        /\b(doubt\s+bot|bot\s+doubt)\b/i,
    ];

    if (genericPatterns.some(p => p.test(lower))) {
        return true;
    }

    // 5. Tamil Bot Names & Calling Patterns (சைபர் பாட், பாட்)
    const tamilBotPatterns = [
        /சைபர்\s*பாட்/i,
        /ஹே\s*பாட்/i,
        /(?:^|\s+)பாட்(?:[,:?!]|\s+|$)/i,
    ];

    if (tamilBotPatterns.some(p => p.test(trimmed))) {
        return true;
    }

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

function isDoubt(text, wakeWord = null, botId = null, options = {}) {
    if (!text || typeof text !== 'string') return false;
    if (options.isExplicit) return true;
    return isBotMentioned(text, wakeWord, botId, options);
}

/**
 * Strips Discord user mentions (<@id>), @BotName, wake words, and conversational call prefixes.
 */
function cleanDoubtText(rawText, optionsOrWakeWord = {}) {
    if (!rawText || typeof rawText !== 'string') return '';
    let cleaned = rawText.trim();

    let options = {};
    if (typeof optionsOrWakeWord === 'string') {
        options = { wakeWord: optionsOrWakeWord };
    } else if (typeof optionsOrWakeWord === 'object') {
        options = optionsOrWakeWord;
    }

    // 1. Remove Discord Mention tags: <@123456789>, <@!123456789>, <@&123456789>
    cleaned = cleaned.replace(/<@!?&?\d+>/g, ' ');

    // 2. Remove known bot names
    const botNames = getBotIdentifiers(options);
    for (const name of botNames) {
        const escaped = escapeRegex(name);
        cleaned = cleaned.replace(new RegExp(`@${escaped}\\b`, 'gi'), ' ');
        cleaned = cleaned.replace(new RegExp(`^${escaped}[,:]?\\s*`, 'i'), ' ');
        cleaned = cleaned.replace(new RegExp(`[,]?\\s*${escaped}[?.]?$`, 'i'), ' ');
    }

    // 3. Remove generic prefixes: "@bot", "hey bot", "hi bot", "bot,"
    cleaned = cleaned.replace(/@bot\b/gi, ' ');
    cleaned = cleaned.replace(/^(hey|hi|hello)\s+bot[,:]?\s*/i, ' ');
    cleaned = cleaned.replace(/^bot[,:]?\s*/i, ' ');
    cleaned = cleaned.replace(/[,]?\s*(hey\s+bot|bot)[?.]?$/i, ' ');

    // 4. Remove Tamil wake phrases
    cleaned = cleaned.replace(/^(சைபர்\s*பாட்|ஹே\s*பாட்|பாட்)[,:]?\s*/i, ' ');
    cleaned = cleaned.replace(/[,]?\s*(சைபர்\s*பாட்|பாட்)[?.]?$/i, ' ');
    cleaned = cleaned.replace(/^(எனக்கு\s*ஒரு\s*சந்தேகம்|ஒரு\s*டவுட்)[,:]?\s*/i, ' ');

    // 5. Clean up extra punctuation and whitespace
    cleaned = cleaned.replace(/^[,:;\s-]+/, '').replace(/[\s-]+$/, '').trim();

    return cleaned;
}

function matchesTamilConcept(text, key) {
    const tamilKeywords = {
        'webhook': ['வெப்ஹூக்', 'webhook'],
        'rest api': ['ரெஸ்ட் ஏபிஐ', 'rest api', 'rest'],
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

function solveWithLocalKnowledge(question, isTamil = false) {
    const lower = (question || '').toLowerCase();
    const kb = isTamil ? KNOWLEDGE_BASE_TA : KNOWLEDGE_BASE_EN;

    // Check exact or keyword match
    for (const [key, answer] of Object.entries(kb)) {
        if (lower.includes(key) || (isTamil && matchesTamilConcept(lower, key))) {
            return answer;
        }
    }

    // Specific conversational answers
    if (lower.includes('recursion')) {
        return isTamil
            ? 'ரெக்கர்ஷன் என்பது ஒரு ஃபங்க்ஷன் தன்னைத்தானே அழைத்துக் கொள்ளும் ஒரு நிரலாக்க முறை. இது பேஸ் கண்டிஷன் வரும் வரை தொடர்ந்து இயங்கும்.'
            : 'Recursion is a programming technique where a function calls itself to solve smaller instances of the same problem until reaching a base condition.';
    }

    if (lower.includes('api')) {
        return isTamil
            ? 'ஏபிஐ (API) என்பது இரண்டு வெவ்வேறு செயலிகள் அல்லது மென்பொருள்கள் ஒன்றுடன் ஒன்று தகவல்களை எளிதாக பரிமாறிக் கொள்ள உதவும் ஒரு தொழில்நுட்ப அமைப்பாகும்.'
            : 'An API (Application Programming Interface) is a set of rules and protocols that allows different software applications to communicate and exchange data with each other.';
    }

    if (lower.includes('webhook')) {
        return isTamil
            ? 'வெப்ஹூக் என்பது ஒரு குறிப்பிட்ட நிகழ்வு நடக்கும் போது தானாகவே தகவலை அனுப்பும் ஒரு நிகழ்நேர இணைப்பு முறையாகும்.'
            : 'A webhook is a way for one application to automatically send real-time information to another application when a specific event occurs.';
    }

    if (isTamil) {
        return `நல்ல கேள்வி! ${question.replace(/\?+$/, '')} என்பது மென்பொருள் உருவாக்கத்தில் ஒரு முக்கிய தொழில்நுட்ப கருத்து ஆகும். இது அமைப்புகளை சிறப்பாக இயக்க உதவுகிறது. மேலும் ஏதேனும் சந்தேகம் இருந்தால் தாராளமாகக் கேளுங்கள்!`;
    }

    return `That is a great question about ${question.replace(/\?+$/, '')}. In simple terms, it is a key technical concept used to build, connect, and scale software systems reliably. Feel free to ask if you'd like a deeper breakdown!`;
}

/**
 * Solves a user doubt or question using Gemini Generative AI or built-in intelligent tutor fallback.
 */
async function solveDoubt(doubtText, context = {}) {
    const cleanedQuestion = cleanDoubtText(doubtText, context.wakeWord || process.env.WAKE_WORD || 'cyber bot');
    const isTamil = isTamilText(doubtText) || isTamilText(cleanedQuestion) || context.lang === 'ta';
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

    if (apiKey && apiKey.trim().length > 5 && apiKey !== 'your_gemini_api_key_here') {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey.trim());

        const candidateModels = [
            process.env.GEMINI_MODEL || process.env.AI_MODEL,
            'gemini-3.5-flash-lite',
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-flash-latest',
        ].filter(Boolean);

        let systemPrompt;
        if (isTamil) {
            systemPrompt = `You are Cyber Bot, an encouraging, articulate, and friendly AI meeting and learning assistant.
The member has asked you a question or doubt in TAMIL (or Tanglish): "${cleanedQuestion}".

Guidelines:
1. Explain the answer in clear, natural, spoken TAMIL (தமிழில் விளக்கம் அளியுங்கள்).
2. You may use standard English tech terms (like API, Webhook, Recursion, Database, Endpoint, Server) where helpful.
3. Keep the explanation concise, informative, and direct (between 2 and 4 natural sentences, around 40-70 words).
4. Maintain a warm, encouraging, and mentor-like tone.`;
        } else {
            systemPrompt = `You are Cyber Bot, an encouraging, articulate, and friendly AI meeting and learning assistant.
The member has asked you this question or doubt: "${cleanedQuestion}".

Guidelines:
1. Provide a direct, crystal-clear, and accurate explanation.
2. Keep the answer concise and digestible (between 2 and 4 informative sentences, around 40-70 words).
3. Sound friendly, confident, and professional.
4. Conclude with a helpful, encouraging closing.`;
        }

        for (const modelName of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(systemPrompt);
                const rawResponse = result.response.text().trim();
                const cleanAnswer = rawResponse.replace(/[*_#`~>]/g, '').trim();

                return {
                    success: true,
                    question: cleanedQuestion,
                    answer: rawResponse,
                    spokenAnswer: cleanAnswer,
                    isTamil,
                    language: isTamil ? 'ta' : 'en',
                    provider: modelName,
                };
            } catch (err) {
                console.warn(`[AiDoubtService] Model ${modelName} failed (${err.message?.substring(0, 70)}), checking fallback...`);
            }
        }
    }

    // Built-in intelligent tutor fallback
    const localAnswer = solveWithLocalKnowledge(cleanedQuestion, isTamil);
    return {
        success: true,
        question: cleanedQuestion,
        answer: localAnswer,
        spokenAnswer: localAnswer.replace(/[*_#`~>]/g, '').trim(),
        isTamil,
        language: isTamil ? 'ta' : 'en',
        provider: isTamil ? 'built-in-tamil-tutor' : 'built-in-tutor',
    };
}

function isStopRequested(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.trim().toLowerCase();
    if (/^(stop|pause|shut up|be quiet|silence|halt|போதும்|நிறுத்து)$/i.test(t)) return true;
    if (/\b(stop\s+talking|stop\s+it|stop\s+speaking|shut\s+up|be\s+quiet|please\s+stop|can\s+you\s+stop|bot\s+stop|stop\s+bot)\b/i.test(t)) return true;
    if (/\b(stop\s+pannu|stop\s+pannunga|niruthu|niruthunga|pothum)\b/i.test(t)) return true;
    if (/(?:போதும்|நிறுத்து|நிறுத்துங்க)/.test(t)) return true;
    return false;
}

module.exports = {
    isBotMentioned,
    isTamilText,
    isDoubt,
    isStopRequested,
    cleanDoubtText,
    solveDoubt,
    solveWithLocalKnowledge,
    getBotIdentifiers,
};
