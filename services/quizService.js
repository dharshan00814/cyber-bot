const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Member = require('../models/Member');
const Quiz = require('../models/Quiz');

const POINTS_FOR_CORRECT_ANSWER = 15;
const QUESTION_TIMEOUT_MS = 60 * 1000; // 60 seconds

// Curated tech, programming & cybersecurity questions (English & Tamil)
const QUESTION_BANK = [
    // Cybersecurity
    {
        question: "What type of attack involves injecting malicious SQL queries into user input fields to manipulate a database?",
        options: ["SQL Injection", "Cross-Site Scripting (XSS)", "DDoS Attack", "Man-in-the-Middle"],
        correctIndex: 0,
        explanation: "SQL Injection (SQLi) occurs when untrusted user input is directly concatenated into a SQL statement, allowing attackers to access or modify database records.",
        topic: "Cybersecurity",
        isTamil: false,
    },
    {
        question: "Which cryptographic protocol is used to provide secure communication over a computer network, securing websites with HTTPS?",
        options: ["TLS/SSL", "FTP", "SNMP", "Telnet"],
        correctIndex: 0,
        explanation: "TLS (Transport Layer Security) and its predecessor SSL encrypt HTTP web traffic, establishing HTTPS for privacy and integrity.",
        topic: "Cybersecurity",
        isTamil: false,
    },
    {
        question: "What does 2FA stand for in modern authentication systems?",
        options: ["Two-Factor Authentication", "Two-File Access", "Two-Firewall Architecture", "Two-Format Authorization"],
        correctIndex: 0,
        explanation: "Two-Factor Authentication (2FA) requires users to provide two distinct forms of identification before gaining access.",
        topic: "Cybersecurity",
        isTamil: false,
    },
    {
        question: "What is the social engineering technique of tricking users into revealing sensitive credentials via fake emails or websites?",
        options: ["Phishing", "Spoofing", "Keylogging", "Ransomware"],
        correctIndex: 0,
        explanation: "Phishing is the fraudulent practice of sending deceptive messages to trick people into revealing personal data like passwords or credit card numbers.",
        topic: "Cybersecurity",
        isTamil: false,
    },
    {
        question: "What security mechanism prevents one website from reading data or cookies from another website in the browser?",
        options: ["Same-Origin Policy (SOP)", "Cross-Origin Resource Sharing (CORS)", "Content Security Policy (CSP)", "Sandboxing"],
        correctIndex: 0,
        explanation: "The Same-Origin Policy (SOP) is an essential browser security mechanism that restricts how documents or scripts from one origin can interact with resources from another origin.",
        topic: "Cybersecurity",
        isTamil: false,
    },

    // Web Development & JavaScript
    {
        question: "In JavaScript, what mechanism handles asynchronous callbacks and promises so the main thread remains non-blocking?",
        options: ["Event Loop", "Garbage Collector", "Call Stack", "Heap Allocator"],
        correctIndex: 0,
        explanation: "The JavaScript Event Loop monitors the call stack and callback queue, pushing asynchronous events back onto the stack when it becomes empty.",
        topic: "Web Development",
        isTamil: false,
    },
    {
        question: "Which HTTP status code signifies that a requested resource was not found on the server?",
        options: ["404", "200", "500", "403"],
        correctIndex: 0,
        explanation: "404 Not Found indicates that the origin server did not find a current representation for the target resource.",
        topic: "Web Development",
        isTamil: false,
    },
    {
        question: "In React, which hook is primarily used to perform side effects like data fetching or DOM updates in functional components?",
        options: ["useEffect", "useState", "useMemo", "useContext"],
        correctIndex: 0,
        explanation: "useEffect allows you to run side effects after rendering, such as fetching data, subscribing to services, or manually changing the DOM.",
        topic: "Web Development",
        isTamil: false,
    },
    {
        question: "What does CSS stand for in web development?",
        options: ["Cascading Style Sheets", "Computer Style Sheets", "Creative Styling System", "Colorful Sheet Styles"],
        correctIndex: 0,
        explanation: "Cascading Style Sheets (CSS) describes how HTML elements are to be displayed on screen, paper, or in other media.",
        topic: "Web Development",
        isTamil: false,
    },
    {
        question: "Which HTTP method should be used according to REST conventions when you want to partially update an existing resource?",
        options: ["PATCH", "GET", "POST", "DELETE"],
        correctIndex: 0,
        explanation: "The HTTP PATCH method applies partial modifications to a resource, whereas PUT typically replaces the entire resource representation.",
        topic: "Web Development",
        isTamil: false,
    },

    // Programming & Data Structures
    {
        question: "What is the average time complexity of searching for an element in a balanced Binary Search Tree (BST)?",
        options: ["O(log n)", "O(1)", "O(n)", "O(n log n)"],
        correctIndex: 0,
        explanation: "In a balanced BST, each comparison eliminates half the remaining elements, resulting in O(log n) logarithmic search time.",
        topic: "Data Structures",
        isTamil: false,
    },
    {
        question: "In Git, which command creates a new branch and immediately switches to it in modern versions?",
        options: ["git switch -c <branch>", "git merge <branch>", "git commit -m", "git fetch --all"],
        correctIndex: 0,
        explanation: "'git switch -c <branch>' (or 'git checkout -b <branch>') creates a new branch and switches your working directory to it.",
        topic: "Git & Version Control",
        isTamil: false,
    },
    {
        question: "What data structure operates on a First-In, First-Out (FIFO) principle?",
        options: ["Queue", "Stack", "Tree", "Graph"],
        correctIndex: 0,
        explanation: "A Queue operates on a FIFO basis: the first element added is the first one to be removed, like a real-world checkout line.",
        topic: "Data Structures",
        isTamil: false,
    },
    {
        question: "What is the term for a function that calls itself until it reaches a base termination condition?",
        options: ["Recursive Function", "Higher-Order Function", "Anonymous Function", "Pure Function"],
        correctIndex: 0,
        explanation: "Recursion is a method of solving problems where a function calls itself directly or indirectly to solve smaller subproblems.",
        topic: "Programming",
        isTamil: false,
    },

    // Tamil Tech Questions
    {
        question: "இரண்டு செயலிகள் இணையம் வழியாக நிகழ்நேரத்தில் தகவல்களைப் பரிமாறிக் கொள்ளப் பயன்படும் பாலத்தின் பெயர் என்ன?",
        options: ["API (ஏபிஐ)", "Firewall (ஃபயர்வால்)", "Compiler (கம்பைலர்)", "RAM (ரேம்)"],
        correctIndex: 0,
        explanation: "API (Application Programming Interface) என்பது வெவ்வேறு மென்பொருள்கள் ஒன்றுடன் ஒன்று எளிதாக தகவல்களைப் பரிமாறிக் கொள்ள உதவும் அமைப்பாகும்.",
        topic: "Tamil Tech",
        isTamil: true,
    },
    {
        question: "கோடிங் மாற்றங்களை பாதுகாப்பாக கண்காணிக்கவும், குழுவாக இணைந்து பணியாற்றவும் பயன்படும் வெர்ஷன் கண்ட்ரோல் டூல் எது?",
        options: ["Git (கிட்)", "Docker (டாக்கர்)", "VS Code (விஎஸ் கோடு)", "Postman (போஸ்ட்மேன்)"],
        correctIndex: 0,
        explanation: "Git என்பது ஒரு சக்திவாய்ந்த distributed version control system ஆகும், இது அனைத்து கோடிங் ஹிஸ்டரியையும் பாதுகாக்கிறது.",
        topic: "Tamil Tech",
        isTamil: true,
    },
    {
        question: "ஒரு குறிப்பிட்ட நிகழ்வு நடக்கும்போது ஒரு செயலி மற்றொரு செயலிக்கு தானாகவே HTTP POST மூலம் தகவலை அனுப்பும் முறை எது?",
        options: ["Webhook (வெப்ஹூக்)", "Cookie (குக்கீ)", "Session (செஷன்)", "Cache (கேச்)"],
        correctIndex: 0,
        explanation: "Webhook என்பது நிகழ்வு சார்ந்த (event-driven) நிகழ்நேர தகவல் பகிர்வு முறையாகும்.",
        topic: "Tamil Tech",
        isTamil: true,
    },
];

// Curated pool of funny, safe, community-appropriate tech & social dares
const DARES_POOL = [
    {
        dare: "🎭 **DARE:** Change your Discord server nickname to **'Bug Whisperer 404'** or **'Syntax Error'** for the next 30 minutes!",
        spoken: "Your dare is: Change your Discord server nickname to Bug Whisperer 404 for the next 30 minutes!",
        isTamil: false,
    },
    {
        dare: "🎭 **DARE:** Explain what an API or Database is in one sentence, but speak or type like an evil dramatic villain!",
        spoken: "Your dare is: Explain what an API is in one sentence, but sound like a dramatic movie villain!",
        isTamil: false,
    },
    {
        dare: "🎭 **DARE:** Post the funniest programming or cybersecurity meme you have in this chat right now!",
        spoken: "Your dare is: Post the funniest programming meme you have in the chat right now!",
        isTamil: false,
    },
    {
        dare: "🎭 **DARE:** Type your next 3 chat messages in ALL CAPS like your production database just crashed!",
        spoken: "Your dare is: Type your next three messages in all caps like the production server crashed!",
        isTamil: false,
    },
    {
        dare: "🎭 **DARE:** Give a genuine, ultra-enthusiastic compliment to any 2 members in this Discord server right now!",
        spoken: "Your dare is: Give a super enthusiastic compliment to two other members in this server right now!",
        isTamil: false,
    },
    {
        dare: "🎭 **DARE:** Confess your most embarrassing coding blunder, infinite loop, or typo in this chat!",
        spoken: "Your dare is: Confess your most embarrassing coding mistake in the chat!",
        isTamil: false,
    },
    {
        dare: "🎭 **DARE:** Write a 2-line rhyming poem about JavaScript bugs and post it here!",
        spoken: "Your dare is: Write a two line rhyming poem about programming bugs and post it here!",
        isTamil: false,
    },
    {
        dare: "🎭 **DARE:** React with 🤡 (clown) to the last 3 messages sent in this channel!",
        spoken: "Your dare is: React with a clown emoji to the last three messages in this channel!",
        isTamil: false,
    },
    {
        dare: "🎭 **DARE:** Send a 5-second voice note or type a message saying: 'Cyber Bot is my master, I shall study harder!'",
        spoken: "Your dare is: Say aloud: Cyber Bot is my master, I shall study harder!",
        isTamil: false,
    },
    {
        dare: "🎭 **DARE:** Change your Discord Custom Status to 'Defeated by Cyber Bot 🤖' for 1 hour!",
        spoken: "Your dare is: Set your Discord status to Defeated by Cyber Bot for one hour!",
        isTamil: false,
    },
    // Tamil Dares
    {
        dare: "🎭 **டேர் (DARE):** அடுத்த 30 நிமிடங்களுக்கு உங்கள் Discord சர்வர் பெயரை **'பக் ராஜா' (Bug King)** என்று மாற்றவும்!",
        spoken: "உங்களுக்கான டேர்: அடுத்த முப்பது நிமிடங்களுக்கு உங்கள் டிஸ்கார்ட் பெயரை பக் ராஜா என்று மாற்றவும்!",
        isTamil: true,
    },
    {
        dare: "🎭 **டேர் (DARE):** சாட்டில் **'சைபர் பாட் கிட்ட மாட்டிகிட்டேன்! அடுத்த முறை கரெக்டா ஆன்சர் பண்ணுவேன்!'** என்று உடனே டைப் செய்யவும்!",
        spoken: "உங்களுக்கான டேர்: சாட்டில் சைபர் பாட் கிட்ட மாட்டிகிட்டேன் என்று உடனடியாக பதிவிடவும்!",
        isTamil: true,
    },
    {
        dare: "🎭 **டேர் (DARE):** இந்த குரூப்பில் உள்ள ஏதேனும் இரண்டு நண்பர்களுக்கு மனமார்ந்த வாழ்த்துக்களை சொல்லுங்கள்!",
        spoken: "உங்களுக்கான டேர்: இந்த குரூப்பில் உள்ள இரண்டு நண்பர்களுக்கு மனமார்ந்த வாழ்த்துக்களை உடனே சொல்லுங்கள்!",
        isTamil: true,
    },
];

class QuizService {
    constructor() {
        // Active sessions mapped by channelId -> session object
        this.activeSessions = new Map();
    }

    /**
     * Checks if a user's prompt is requesting the bot to ask a question / start a quiz.
     */
    isQuizRequest(text) {
        if (!text || typeof text !== 'string') return false;
        const t = text.trim().toLowerCase();

        // English patterns
        const englishPatterns = [
            /\b(ask\s+(me\s+)?(a\s+)?question)\b/i,
            /\b(quiz\s+(me|us))\b/i,
            /\b(start\s+(a\s+)?quiz)\b/i,
            /\b(give\s+me\s+a\s+question)\b/i,
            /\b(test\s+(me|my\s+knowledge))\b/i,
            /\b(ask\s+question)\b/i,
            /\b(question\s+dare|question\s+or\s+dare)\b/i,
            /\b(play\s+quiz)\b/i,
        ];

        // Tamil & Tanglish patterns
        const tamilPatterns = [
            /கேள்வி\s*கேளு/i,
            /கேள்வி\s*கேளுங்கள்/i,
            /ஒரு\s*கேள்வி/i,
            /\b(kelvi\s*kelunga|kelvi\s*kelu|question\s*kelunga)\b/i,
            /\b(quiz\s*veinga|test\s*veinga)\b/i,
        ];

        return englishPatterns.some(p => p.test(t)) || tamilPatterns.some(p => p.test(t));
    }

    /**
     * Shuffles an array in-place (Fisher-Yates)
     */
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Retrieves or generates a question.
     * Uses Gemini AI if available for fresh questions, or falls back to curated bank.
     */
    async getQuestion(options = {}) {
        const isTamil = options.isTamil || false;
        const topic = options.topic || 'Random';
        const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

        // Try AI generation if API key is available
        if (apiKey && apiKey.trim().length > 5 && apiKey !== 'your_gemini_api_key_here') {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey.trim());
                const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
                const model = genAI.getGenerativeModel({ model: modelName });

                const prompt = isTamil
                    ? `Generate 1 multiple choice technical question about computer science, programming, or cybersecurity in TAMIL.
Format your output strictly as a JSON object with this exact structure:
{
  "question": "Question text in Tamil",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctIndex": 0,
  "explanation": "Brief explanation in Tamil (1-2 sentences)",
  "topic": "${topic}"
}
Do NOT include markdown backticks or any extra words outside JSON.`
                    : `Generate 1 engaging multiple choice technical question about ${topic === 'Random' ? 'software engineering, web development, or cybersecurity' : topic}.
Format your output strictly as a JSON object with this exact structure:
{
  "question": "Question text",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctIndex": 0,
  "explanation": "Brief explanation why this is correct (1-2 sentences)",
  "topic": "${topic}"
}
Make sure correctIndex is an integer from 0 to 3 pointing to the correct option in options array.
Do NOT include markdown backticks or any extra words outside JSON.`;

                const result = await model.generateContent(prompt);
                const text = result.response.text().trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
                const parsed = JSON.parse(text);

                if (parsed.question && Array.isArray(parsed.options) && parsed.options.length === 4 && typeof parsed.correctIndex === 'number') {
                    // Randomize options so option A isn't always correct
                    return this.formatAndShuffleQuestion(parsed, isTamil);
                }
            } catch (aiErr) {
                console.warn('[QuizService] Gemini AI question generation fallback:', aiErr.message);
            }
        }

        // Fallback to local curated question bank
        let filtered = QUESTION_BANK;
        if (isTamil) {
            filtered = QUESTION_BANK.filter(q => q.isTamil);
        } else if (topic && topic !== 'Random') {
            const topicLower = topic.toLowerCase();
            const topicMatches = QUESTION_BANK.filter(q => !q.isTamil && q.topic.toLowerCase().includes(topicLower));
            if (topicMatches.length > 0) {
                filtered = topicMatches;
            } else {
                filtered = QUESTION_BANK.filter(q => !q.isTamil);
            }
        } else {
            filtered = QUESTION_BANK.filter(q => !q.isTamil);
        }

        const picked = filtered[Math.floor(Math.random() * filtered.length)] || QUESTION_BANK[0];
        return this.formatAndShuffleQuestion(picked, isTamil);
    }

    /**
     * Randomizes the 4 options so the correct answer is not always in the same position
     */
    formatAndShuffleQuestion(rawQ, isTamil = false) {
        const originalCorrectOption = rawQ.options[rawQ.correctIndex];
        const indexedOptions = rawQ.options.map((opt, idx) => ({ text: opt, isCorrect: idx === rawQ.correctIndex }));
        const shuffled = this.shuffleArray(indexedOptions);
        const newCorrectIndex = shuffled.findIndex(item => item.isCorrect);

        const letters = ['A', 'B', 'C', 'D'];
        const cleanOptions = shuffled.map(item => item.text.replace(/^[A-D]\)\s*/i, '').trim());

        return {
            question: rawQ.question,
            options: cleanOptions,
            displayOptions: cleanOptions.map((opt, idx) => `**${letters[idx]}** ${opt}`),
            correctIndex: newCorrectIndex,
            correctLetter: letters[newCorrectIndex],
            correctText: cleanOptions[newCorrectIndex],
            explanation: rawQ.explanation || 'Great job answering!',
            topic: rawQ.topic || 'Tech',
            isTamil,
        };
    }

    /**
     * Picks a fun dare from the dare pool (curated or dynamic)
     */
    getRandomDare(isTamil = false) {
        const pool = DARES_POOL.filter(d => isTamil ? d.isTamil : !d.isTamil);
        const selected = pool[Math.floor(Math.random() * pool.length)] || DARES_POOL[0];
        return selected;
    }

    /**
     * Creates and starts a new Question & Dare session in a channel or via slash interaction.
     */
    async askQuestion({ channel = null, interaction = null, user = null, isVoice = false, topic = 'Random', lang = 'en' }) {
        const targetChannel = channel || interaction?.channel;
        const targetUser = user || interaction?.user;
        if (!targetChannel || !targetUser) return null;

        const isTamil = lang === 'ta' || topic.toLowerCase() === 'tamil';
        const questionData = await this.getQuestion({ isTamil, topic });

        // Clear existing session for this channel if any
        if (this.activeSessions.has(targetChannel.id)) {
            const oldSession = this.activeSessions.get(targetChannel.id);
            if (oldSession.timeoutTimer) clearTimeout(oldSession.timeoutTimer);
            this.activeSessions.delete(targetChannel.id);
        }

        const sessionId = `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const letters = ['A', 'B', 'C', 'D'];

        // Build interactive Discord buttons
        const actionRow = new ActionRowBuilder();
        letters.forEach((letter, idx) => {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`quiz_opt_${idx}_${sessionId}`)
                    .setLabel(`Option ${letter}`)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        const giveUpRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`quiz_giveup_${sessionId}`)
                .setLabel(isTamil ? '🏳️ எனக்கு தெரியாது (Give Up & Take Dare)' : '🏳️ Give Up & Take Dare')
                .setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
            .setTitle(isTamil ? '🧠 கேள்வி & டேர் சவால்! (Question & Dare)' : '🧠 Question & Dare Challenge!')
            .setDescription(
                `Hey <@${targetUser.id}>! Here is your question:\n\n` +
                `### ❓ ${questionData.question}\n\n` +
                questionData.displayOptions.join('\n') +
                `\n\n🎯 **Reward:** **+${POINTS_FOR_CORRECT_ANSWER} XP Points** on correct answer!\n` +
                `🎭 **Penalty:** A hilarious **DARE** if you get it wrong or give up!\n` +
                `⏱️ **Time to answer:** 60 seconds (Click a button or type your answer)`
            )
            .setColor(0x5865F2)
            .setFooter({ text: `Category: ${questionData.topic} | Question for ${targetUser.username}` })
            .setTimestamp();

        let sentMessage = null;
        try {
            if (interaction) {
                sentMessage = await interaction.editReply({
                    embeds: [embed],
                    components: [actionRow, giveUpRow],
                });
                if (!sentMessage?.id) {
                    sentMessage = await interaction.fetchReply().catch(() => null);
                }
            } else {
                sentMessage = await targetChannel.send({
                    embeds: [embed],
                    components: [actionRow, giveUpRow],
                });
            }
        } catch (sendErr) {
            console.error('[QuizService] Failed to send quiz question:', sendErr);
            return null;
        }

        // Store active session state
        const session = {
            id: sessionId,
            channelId: targetChannel.id,
            userId: targetUser.id,
            userName: targetUser.displayName || targetUser.username,
            questionData,
            messageId: sentMessage ? sentMessage.id : null,
            channel: targetChannel,
            isVoice,
            isTamil,
            startedAt: Date.now(),
            timeoutTimer: null,
        };

        // Set 60-second expiration timer
        session.timeoutTimer = setTimeout(async () => {
            await this.handleTimeout(targetChannel.id, sessionId);
        }, QUESTION_TIMEOUT_MS);

        this.activeSessions.set(targetChannel.id, session);

        // Build spoken text for voice meetings
        const spokenQuestion = isTamil
            ? `இதோ உங்களுக்கான கேள்வி: ${questionData.question}. ஆப்ஷன் ஏ: ${questionData.options[0]}. ஆப்ஷன் பி: ${questionData.options[1]}. ஆப்ஷன் சி: ${questionData.options[2]}. ஆப்ஷன் டி: ${questionData.options[3]}. சரியான விடையை சொல்லுங்கள்!`
            : `Here is your question: ${questionData.question}. Option A: ${questionData.options[0]}. Option B: ${questionData.options[1]}. Option C: ${questionData.options[2]}. Option D: ${questionData.options[3]}. What is your answer?`;

        return {
            success: true,
            session,
            questionData,
            spokenQuestion,
        };
    }

    /**
     * Checks if a channel has an active quiz session.
     */
    getActiveSession(channelId) {
        return this.activeSessions.get(channelId) || null;
    }

    /**
     * Evaluates whether a given text input corresponds to an option or give-up intent.
     */
    parseAnswerInput(inputText, questionData) {
        if (!inputText || typeof inputText !== 'string') return null;
        const text = inputText.trim().toLowerCase();

        // 1. Give up check (English, Tamil, Tanglish)
        const isEnglishGiveUp = /\b(give\s*up|skip|pass|i\s*don'?t\s*know|idk|dare\s*me|dare|surrender)\b/i.test(text);
        const isTamilGiveUp = /(?:தெரியாது|விட்டுட்டேன்|தெரில|தெரியல)/.test(text) || /\b(theriyathu|therila|theriyala)\b/i.test(text);
        if (isEnglishGiveUp || isTamilGiveUp) {
            return { isGiveUp: true };
        }

        // 2. Exact letter or Option letter check
        // Matches: "a", "A", "option a", "opt a", "(a)", "1"
        if (/^(a|\(a\)|option\s*a|opt\s*a|1)$/i.test(text)) return { selectedIndex: 0, letter: 'A' };
        if (/^(b|\(b\)|option\s*b|opt\s*b|2)$/i.test(text)) return { selectedIndex: 1, letter: 'B' };
        if (/^(c|\(c\)|option\s*c|opt\s*c|3)$/i.test(text)) return { selectedIndex: 2, letter: 'C' };
        if (/^(d|\(d\)|option\s*d|opt\s*d|4)$/i.test(text)) return { selectedIndex: 3, letter: 'D' };

        // 3. Spoken phrases: "the answer is A", "it's option B", "i think it is C"
        const letterMatch = text.match(/\b(?:option|it's|is|choose)\s+([a-d])\b/i);
        if (letterMatch) {
            const letter = letterMatch[1].toUpperCase();
            const idx = ['A', 'B', 'C', 'D'].indexOf(letter);
            if (idx !== -1) return { selectedIndex: idx, letter };
        }

        // 4. Content match: does the text include the exact answer or words from an option?
        for (let i = 0; i < questionData.options.length; i++) {
            const optText = questionData.options[i].toLowerCase();
            if (text === optText || (optText.length > 3 && text.includes(optText))) {
                return { selectedIndex: i, letter: ['A', 'B', 'C', 'D'][i] };
            }
        }

        return null;
    }

    /**
     * Submits an answer for the active session in a channel.
     * Evaluates answer, awards points if correct, or assigns dare if incorrect.
     */
    async submitAnswer({ channelId, userId, user, answerInput, interaction = null, isVoice = false }) {
        const session = this.activeSessions.get(channelId);
        if (!session) {
            return { handled: false, error: 'No active quiz session in this channel' };
        }

        // Clear timeout timer immediately
        if (session.timeoutTimer) {
            clearTimeout(session.timeoutTimer);
        }

        const { questionData, isTamil } = session;
        let selectedIndex = null;
        let isGiveUp = false;

        // Determine choice from interaction or text
        if (interaction && interaction.customId) {
            if (interaction.customId.startsWith('quiz_giveup')) {
                isGiveUp = true;
            } else {
                const match = interaction.customId.match(/quiz_opt_(\d+)/);
                if (match) {
                    selectedIndex = parseInt(match[1], 10);
                }
            }
        } else {
            const parsed = this.parseAnswerInput(answerInput, questionData);
            if (!parsed) {
                // Input did not match any recognizable answer pattern
                return { handled: false, error: 'Unrecognized answer format' };
            }
            if (parsed.isGiveUp) {
                isGiveUp = true;
            } else {
                selectedIndex = parsed.selectedIndex;
            }
        }

        // Remove active session
        this.activeSessions.delete(channelId);

        const letters = ['A', 'B', 'C', 'D'];
        const isCorrect = !isGiveUp && selectedIndex === questionData.correctIndex;
        const targetUserId = userId || session.userId;
        const targetUser = user || (interaction ? interaction.user : null);
        const displayName = targetUser?.displayName || targetUser?.username || session.userName;

        // Disable buttons on the original message if available
        if (session.messageId && session.channel) {
            try {
                const msg = await session.channel.messages.fetch(session.messageId);
                if (msg) {
                    const disabledRows = msg.components.map(row => {
                        const newRow = ActionRowBuilder.from(row);
                        newRow.components.forEach(c => c.setDisabled(true));
                        return newRow;
                    });
                    await msg.edit({ components: disabledRows });
                }
            } catch (e) {
                // Ignore button disable error
            }
        }

        if (isCorrect) {
            // === CORRECT ANSWER: AWARD POINTS ===
            const updatedMember = await this.awardQuizPoints(targetUserId, displayName, questionData.topic);
            const totalXp = updatedMember?.xp ?? '15+';

            const successEmbed = new EmbedBuilder()
                .setTitle(isTamil ? '🎉 சரியான விடை! புள்ளிகள் வழங்கப்பட்டது! 🏆' : '🎉 CORRECT ANSWER! Points Awarded! 🏆')
                .setDescription(
                    `Awesome job <@${targetUserId}>! You nailed it! 🌟\n\n` +
                    `✅ **Correct Answer:** **Option ${questionData.correctLetter}: ${questionData.correctText}**\n` +
                    `💡 **Explanation:** ${questionData.explanation}\n\n` +
                    `⭐ **Earned:** **+${POINTS_FOR_CORRECT_ANSWER} XP Points!**\n` +
                    `📊 **Your Total XP:** **${totalXp} XP**\n` +
                    `🏆 Check the ranking with \`/leaderboard\`!`
                )
                .setColor(0x00FF88)
                .setFooter({ text: `Question Solved: ${questionData.topic}` })
                .setTimestamp();

            const spokenResult = isTamil
                ? `அருமை! சரியான விடை. ஆப்ஷன் ${questionData.correctLetter}: ${questionData.correctText}. உங்களுக்கு பதினைந்து புள்ளிகள் வழங்கப்பட்டுள்ளது! வாழ்த்துக்கள்!`
                : `Awesome! That is the correct answer. Option ${questionData.correctLetter}: ${questionData.correctText}. You earned fifteen XP points! Great job!`;

            if (interaction) {
                await interaction.reply({ embeds: [successEmbed] }).catch(() => {});
            } else if (session.channel) {
                await session.channel.send({ embeds: [successEmbed] }).catch(() => {});
            }

            return {
                handled: true,
                isCorrect: true,
                pointsAwarded: POINTS_FOR_CORRECT_ANSWER,
                totalXp,
                spokenResult,
            };
        } else {
            // === INCORRECT ANSWER OR GAVE UP: ASSIGN DARE ===
            const dareObj = this.getRandomDare(isTamil);
            const userChoiceText = selectedIndex !== null ? `Option ${letters[selectedIndex]}: ${questionData.options[selectedIndex]}` : 'Gave Up';

            const dareEmbed = new EmbedBuilder()
                .setTitle(isTamil ? '❌ தவறான விடை! இதோ உங்களுக்கான டேர்! 🎭' : '❌ WRONG ANSWER! Here is your DARE! 🎭')
                .setDescription(
                    isGiveUp
                        ? `Aww, <@${targetUserId}> gave up! 😅\n\n`
                        : `Oops <@${targetUserId}>! You chose **${userChoiceText}**, which is incorrect!\n\n` +
                        `✅ **The Correct Answer was:** **Option ${questionData.correctLetter}: ${questionData.correctText}**\n` +
                        `💡 **Explanation:** ${questionData.explanation}\n\n` +
                        `---\n\n` +
                        `### ${dareObj.dare}\n\n` +
                        `*No points this round, but you must complete your dare to restore your honor!* 😂`
                )
                .setColor(0xFF3366)
                .setFooter({ text: 'Better luck next question! Ask again anytime.' })
                .setTimestamp();

            const spokenResult = isTamil
                ? `தவறான விடை! சரியான விடை ஆப்ஷன் ${questionData.correctLetter}: ${questionData.correctText}. ${dareObj.spoken}`
                : `Oops, that is incorrect! The correct answer was Option ${questionData.correctLetter}: ${questionData.correctText}. ${dareObj.spoken}`;

            if (interaction) {
                await interaction.reply({ embeds: [dareEmbed] }).catch(() => {});
            } else if (session.channel) {
                await session.channel.send({ embeds: [dareEmbed] }).catch(() => {});
            }

            return {
                handled: true,
                isCorrect: false,
                dare: dareObj.dare,
                spokenResult,
            };
        }
    }

    /**
     * Handles timeout when no answer is provided within 60 seconds.
     */
    async handleTimeout(channelId, sessionId) {
        const session = this.activeSessions.get(channelId);
        if (!session || session.id !== sessionId) return;

        this.activeSessions.delete(channelId);

        const { questionData, isTamil, userId, channel, messageId } = session;
        const dareObj = this.getRandomDare(isTamil);

        // Disable buttons on the original message
        if (messageId && channel) {
            try {
                const msg = await channel.messages.fetch(messageId);
                if (msg) {
                    const disabledRows = msg.components.map(row => {
                        const newRow = ActionRowBuilder.from(row);
                        newRow.components.forEach(c => c.setDisabled(true));
                        return newRow;
                    });
                    await msg.edit({ components: disabledRows });
                }
            } catch (e) {}
        }

        const timeoutEmbed = new EmbedBuilder()
            .setTitle(isTamil ? '⏰ நேரம் முடிந்துவிட்டது! இதோ உங்களுக்கான டேர்! 🎭' : '⏰ Time\'s Up! Here is your DARE! 🎭')
            .setDescription(
                `Time ran out for <@${userId}>!\n\n` +
                `✅ **The Correct Answer was:** **Option ${questionData.correctLetter}: ${questionData.correctText}**\n` +
                `💡 **Explanation:** ${questionData.explanation}\n\n` +
                `---\n\n` +
                `### ${dareObj.dare}\n\n` +
                `*Time waits for no coder! Better luck next time!* 😂`
            )
            .setColor(0xFFA500)
            .setTimestamp();

        channel.send({ embeds: [timeoutEmbed] }).catch(() => {});
    }

    /**
     * Awards quiz XP points to a member and updates their completedTasks.
     */
    async awardQuizPoints(userId, name, topic = 'Tech') {
        try {
            let member = await Member.findOne({ userId });
            if (member) {
                member.name = name || member.name;
                member.xp = (member.xp ?? 0) + POINTS_FOR_CORRECT_ANSWER;
                member.activityScore = (member.activityScore ?? 0) + 1;
                member.lastActiveDate = new Date();
                member.completedTasks = Array.isArray(member.completedTasks) ? member.completedTasks : [];
                member.completedTasks.push({
                    taskName: `Quiz: ${topic}`,
                    completedDate: new Date(),
                    pointsEarned: POINTS_FOR_CORRECT_ANSWER,
                });
                await member.save();
                return member;
            } else {
                member = new Member({
                    userId,
                    name: name || 'Learner',
                    joinDate: new Date(),
                    xp: POINTS_FOR_CORRECT_ANSWER,
                    activityScore: 1,
                    lastActiveDate: new Date(),
                    completedTasks: [
                        {
                            taskName: `Quiz: ${topic}`,
                            completedDate: new Date(),
                            pointsEarned: POINTS_FOR_CORRECT_ANSWER,
                        },
                    ],
                });
                await member.save();
                return member;
            }
        } catch (err) {
            console.error('[QuizService] Error awarding points:', err);
            return null;
        }
    }
}

const quizService = new QuizService();
module.exports = quizService;
