const fs = require('fs');
const path = require('path');
const os = require('os');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const googleTTS = require('google-tts-api');
const https = require('https');
const http = require('http');

const TEMP_DIR = path.join(os.tmpdir(), 'cyber-bot-voice');
if (!fs.existsSync(TEMP_DIR)) {
    try {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    } catch (e) {
        console.error('[SpeechService] Error creating temp dir:', e.message);
    }
}

const AVAILABLE_VOICES = [
    { id: 'en-US-ChristopherNeural', name: 'Christopher (US Male - Professional & Clear)', lang: 'en-US', gender: 'Male' },
    { id: 'en-US-JennyNeural', name: 'Jenny (US Female - Natural & Friendly)', lang: 'en-US', gender: 'Female' },
    { id: 'en-US-GuyNeural', name: 'Guy (US Male - Casual & Confident)', lang: 'en-US', gender: 'Male' },
    { id: 'en-US-AriaNeural', name: 'Aria (US Female - Expressive)', lang: 'en-US', gender: 'Female' },
    { id: 'en-GB-SoniaNeural', name: 'Sonia (British Female - Crisp & Polite)', lang: 'en-GB', gender: 'Female' },
    { id: 'en-GB-RyanNeural', name: 'Ryan (British Male - Articulate)', lang: 'en-GB', gender: 'Male' },
    { id: 'en-IN-NeerjaNeural', name: 'Neerja (Indian English Female - Clear & Melodic)', lang: 'en-IN', gender: 'Female' },
    { id: 'en-IN-PrabhatNeural', name: 'Prabhat (Indian English Male - Clear & Authoritative)', lang: 'en-IN', gender: 'Male' },
    { id: 'ta-IN-PallaviNeural', name: 'Pallavi (Tamil Female - Natural & Clear / தமிழ்)', lang: 'ta-IN', gender: 'Female' },
    { id: 'ta-IN-ValluvarNeural', name: 'Valluvar (Tamil Male - Authoritative & Clear / தமிழ்)', lang: 'ta-IN', gender: 'Male' },
];

function cleanTextForSpeech(text) {
    if (!text) return '';
    let cleaned = String(text);

    // Remove code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, ' [code snippet omitted] ');
    // Remove inline code
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    // Remove Discord mentions (<@123>, <#123>, <@&123>)
    cleaned = cleaned.replace(/<@!?&?[0-9]+>/g, '');
    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/\S+/gi, '');
    // Remove markdown symbols: headings, bold, italic, strikethrough, blockquotes
    cleaned = cleaned.replace(/[#*_~>]/g, ' ');
    // Replace symbols with words for better pronunciation
    cleaned = cleaned.replace(/\s\+\s/g, ' plus ');
    cleaned = cleaned.replace(/\s\-\s/g, ' minus ');
    cleaned = cleaned.replace(/\s\*\s/g, ' times ');
    cleaned = cleaned.replace(/\s\/\s/g, ' divided by ');
    cleaned = cleaned.replace(/%/g, ' percent ');
    cleaned = cleaned.replace(/&/g, ' and ');
    cleaned = cleaned.replace(/@/g, ' at ');
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    // Limit length to keep speech natural and not overwhelmingly long (approx 450 chars)
    if (cleaned.length > 450) {
        const truncated = cleaned.substring(0, 440);
        const lastPunctuation = Math.max(
            truncated.lastIndexOf('.'),
            truncated.lastIndexOf('!'),
            truncated.lastIndexOf('?'),
            truncated.lastIndexOf('।')
        );
        if (lastPunctuation > 200) {
            cleaned = truncated.substring(0, lastPunctuation + 1);
        } else {
            cleaned = truncated + '...';
        }
    }

    return cleaned;
}

function pcmToWav(pcmBuffer, sampleRate = 48000, channels = 2, bitDepth = 16) {
    const byteRate = (sampleRate * channels * bitDepth) / 8;
    const blockAlign = (channels * bitDepth) / 8;
    const dataSize = pcmBuffer.length;
    const fileSize = 44 + dataSize - 8;

    const header = Buffer.alloc(44);

    // RIFF chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);

    // fmt sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
    header.writeUInt16LE(1, 20);  // AudioFormat 1 = PCM
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);

    // data sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
}

async function synthesizeWithEdgeTTS(text, voiceId, outputPath) {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    return new Promise((resolve, reject) => {
        const out = fs.createWriteStream(outputPath);
        audioStream.pipe(out);
        out.on('finish', () => resolve(outputPath));
        out.on('error', (err) => reject(err));
        audioStream.on('error', (err) => reject(err));
    });
}

function downloadUrlToBuffer(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadUrlToBuffer(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed audio download: HTTP ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function synthesizeWithGoogleTTS(text, outputPath, isTamil = false) {
    const url = googleTTS.getAudioUrl(text, {
        lang: isTamil ? 'ta' : 'en',
        slow: false,
        host: 'https://translate.google.com',
    });
    const buffer = await downloadUrlToBuffer(url);
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
}

async function synthesizeSpeechToFile(text, options = {}) {
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) {
        throw new Error('Text for speech synthesis is empty.');
    }

    // Auto-detect Tamil script and select Tamil neural voice if appropriate
    const isTamil = /[\u0B80-\u0BFF]/.test(cleanedText);
    let voiceId = options.voice || process.env.TTS_VOICE;

    if (isTamil && (!voiceId || !voiceId.startsWith('ta-'))) {
        voiceId = 'ta-IN-PallaviNeural';
    } else if (!voiceId) {
        voiceId = 'en-US-ChristopherNeural';
    }

    const filename = `tts_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp3`;
    const outputPath = path.join(TEMP_DIR, filename);

    try {
        await synthesizeWithEdgeTTS(cleanedText, voiceId, outputPath);
        return {
            filePath: outputPath,
            text: cleanedText,
            voice: voiceId,
            engine: 'msedge-tts',
            isTamil,
        };
    } catch (edgeErr) {
        console.warn('[SpeechService] MsEdgeTTS failed, falling back to Google TTS:', edgeErr.message);
        try {
            await synthesizeWithGoogleTTS(cleanedText, outputPath, isTamil);
            return {
                filePath: outputPath,
                text: cleanedText,
                voice: isTamil ? 'google-tts-ta' : 'google-tts-en',
                engine: 'google-tts',
                isTamil,
            };
        } catch (googleErr) {
            console.error('[SpeechService] Both TTS engines failed:', googleErr.message);
            throw googleErr;
        }
    }
}

async function transcribeAudioWithGemini(wavBuffer) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { success: false, error: 'GEMINI_API_KEY not configured' };
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.6-flash'];

    const prompt = `You are an AI meeting assistant listening to student voice audio in a learning group meeting.
The participants speak in English, Tamil (தமிழ்), or Tanglish (Tamil written in English alphabet).
Listen carefully to the speech in this audio clip.
1. Transcribe the words spoken as accurately as possible in the language spoken.
2. Check if the speaker explicitly mentions or addresses the bot name (e.g. "Cyber Bot", "Cyberbot", "Hey Bot", "Bot", "சைபர் பாட்", "பாட்").
3. Determine if the user is asking a question or doubt.
4. Extract the clean question or doubt text.
5. Identify if the language is Tamil or Tanglish.

Respond ONLY with a valid JSON object in this exact format:
{
    "transcript": "exact transcription of speech",
    "isBotMentioned": true/false,
    "isDoubt": true/false,
    "isTamil": true/false,
    "doubtText": "the extracted question or doubt, or empty string"
}`;

    const base64Audio = wavBuffer.toString('base64');
    let lastError = null;

    for (const modelName of candidateModels) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: 'audio/wav',
                        data: base64Audio,
                    },
                },
            ]);

            const responseText = result.response.text().trim();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    transcript: parsed.transcript || '',
                    isBotMentioned: !!parsed.isBotMentioned,
                    isDoubt: !!parsed.isDoubt,
                    isTamil: !!parsed.isTamil,
                    doubtText: parsed.doubtText || parsed.transcript || '',
                    model: modelName,
                };
            }

            const isTamil = /[\u0B80-\u0BFF]/.test(responseText);
            return {
                success: true,
                transcript: responseText,
                isBotMentioned: /cyber\s*bot|bot|சைபர்\s*பாட்|பாட்/i.test(responseText),
                isDoubt: responseText.includes('?') || /how|what|why|explain|என்ன|எப்படி|சொல்லுங்க/i.test(responseText),
                isTamil,
                doubtText: responseText,
                model: modelName,
            };
        } catch (err) {
            lastError = err;
            console.warn(`[SpeechService] Model ${modelName} failed (${err.message?.substring(0, 70)}), trying next model...`);
        }
    }

    console.error('[SpeechService] All Gemini models failed transcription:', lastError?.message);
    return { success: false, error: lastError?.message || 'Transcription failed' };
}

function cleanupTempAudio(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
            // Ignore cleanup failure
        }
    }
}

module.exports = {
    cleanTextForSpeech,
    pcmToWav,
    synthesizeSpeechToFile,
    transcribeAudioWithGemini,
    cleanupTempAudio,
    AVAILABLE_VOICES,
};
