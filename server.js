require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const nodemailer = require('nodemailer');

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===============================
// AI CLIENTS
// ===============================

// Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
});

// OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Claude
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// ===============================
// PROMPT BUILDER
// ===============================
function buildPrompt(type, input) {

    switch (type) {

        // ===============================
        // RESUME GENERATOR
        // ===============================
        case "resume":
            return `
Create a professional resume in clean plain text format.

STRICT RULES:
- Output ONLY the resume
- No explanations
- No markdown
- No symbols (*, **, #, etc.)
- No placeholders like [Your Name]
- Use proper spacing between sections

FORMAT:
Name
Contact
Summary
Skills
Experience
Education

User Data:
${input}
`;

        // ===============================
        // PARAPHRASER
        // ===============================
        case "paraphrase":
            return `
Rewrite the following text clearly and professionally.

STRICT RULES:
- Output ONLY the rewritten text
- No explanations
- No multiple options
- No bullet points
- Keep same meaning

Text:
${input}
`;

        // ===============================
        // GRAMMAR FIXER
        // ===============================
        case "grammar":
            return `
Fix all grammar and spelling errors in the text.

STRICT RULES:
- Output ONLY the corrected text
- Do NOT explain anything
- Do NOT add extra sentences

Text:
${input}
`;

        // ===============================
        // BIO GENERATOR
        // ===============================
        case "bio":
            return `
Write exactly 3 short professional bio options.

STRICT RULES:
- Each bio must be 1–2 sentences
- Output ONLY the bios
- No headings
- No numbering
- No explanations

User Data:
${input}
`;

        // ===============================
        // EMAIL GENERATOR
        // ===============================
        case "email":
            return `
Write a professional email based on the user input.

STRICT RULES:
- Output ONLY the email
- No tips or explanations
- No bullet points
- No placeholders like [Your Name]
- Use real professional tone

STRUCTURE:
Subject line
Greeting
Body
Closing

User Data:
${input}
`;

        default:
            return input;
    }
}

// ===============================
// AI ENGINE WITH TRACKING
// ===============================
async function tryAI(prompt) {

    // GEMINI
    try {
        const res = await geminiModel.generateContent(prompt);
        return {
            output: res.response.text(),
            provider: "gemini",
            model: "gemini-2.5-flash"
        };
    } catch (e) {
        console.log("Gemini failed");
    }

    // OPENAI
    try {
        const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        });

        return {
            output: res.choices[0].message.content,
            provider: "openai",
            model: "gpt-4o-mini"
        };

    } catch (e) {
        console.log("OpenAI failed");
    }

    // CLAUDE
    try {
        const res = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 800,
            messages: [{ role: "user", content: prompt }]
        });

        return {
            output: res.content[0].text,
            provider: "claude",
            model: "claude-3-haiku-20240307"
        };

    } catch (e) {
        console.log("Claude failed");
    }

    // OPENROUTER
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/llama-3-8b-instruct",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();

        return {
            output: data?.choices?.[0]?.message?.content || null,
            provider: "openrouter",
            model: "llama-3-8b"
        };

    } catch (e) {
        console.log("OpenRouter failed");
    }

    return null;
}

// ===============================
// RULE ENGINE (NO AI FALLBACK)
// ===============================
function ruleEngine(type, input) {

    if (type === "resume") {
        return {
            output: `
NAME: Not provided

SUMMARY:
Basic profile generated without AI.

EDUCATION:
${input}

SKILLS:
Basic skills listed manually.

NOTE:
Generated using fallback system.`,
            provider: "rule-engine",
            model: "none"
        };
    }

    if (type === "email") {
        return {
            output: `Subject: Message

Dear Sir/Madam,

${input}

Regards,
User`,
            provider: "rule-engine",
            model: "none"
        };
    }

    return {
        output: input,
        provider: "rule-engine",
        model: "none"
    };
}

// ===============================
// MAIN API
// ===============================
app.post('/api/generate', async (req, res) => {

    try {

        const { input, type } = req.body;

        if (!input) {
            return res.status(400).json({ error: "Input is required" });
        }

        const prompt = buildPrompt(type, input);

        let result = await tryAI(prompt);

        if (!result || !result.output) {
            result = ruleEngine(type, input);
        }

        res.json(result);

    } catch (error) {

        console.error(error);

        res.json({
            output: "System fallback response",
            provider: "system-error",
            model: "none"
        });
    }
});

// ===============================
// EMAIL SYSTEM
// ===============================
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.post('/send-email', async (req, res) => {

    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "All fields required" });
    }

    try {

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject,
            text: `${name}\n\n${message}`
        });

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: "Email failed" });
    }
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🔥 Hybrid AI System Running");
});