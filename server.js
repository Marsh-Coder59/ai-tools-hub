require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Homepage route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
});

// AI API
app.post('/api/generate', async (req, res) => {
    try {
        const { input, type } = req.body;

        if (!input) {
            return res.status(400).json({ error: "Input is required" });
        }

        let prompt = "";

        switch (type) {

           case "resume":
prompt = `
Create a professional resume in clean plain text format.

STRICT RULES:
- No markdown
- No bold text
- No stars **
- No symbols
- No formatting characters
- No backticks
- No bullet stars
- Plain text only
- Clean professional layout
- Output only the resume

Sections:
Name
Contact
Summary
Skills
Experience
Education

User Data:
${input}
`;
break;

            case "paraphrase":
                prompt = `
Rewrite clearly and professionally.

Return only rewritten text.

Text:
${input}
`;
                break;

            case "grammar":
                prompt = `
Fix grammar.

Return only corrected text.

Text:
${input}
`;
                break;

            case "bio":
                prompt = `
Write 3 short professional bio options.

1-2 sentences each.
No headings.
No explanation.

User Data:
${input}
`;
                break;

            case "email":
                prompt = `
Write a professional email.

Return only email.

User Data:
${input}
`;
                break;

            default:
                prompt = input;
        }

        const result = await model.generateContent(prompt);
        const output = result.response.text();

        res.json({ output });

    } catch (error) {
        console.error("Gemini Error:", error.message);
        res.status(500).json({
            error: "AI generation failed"
        });
    }
});

// Email API
app.post('/send-email', async (req, res) => {

    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({
            error: "All fields required"
        });
    }

    try {

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            replyTo: email,
            to: process.env.EMAIL_USER,
            subject: subject,
            text: `
Name: ${name}
Email: ${email}

Message:
${message}
`
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success: "Email sent successfully"
        });

    } catch (error) {

        console.error("Email Error:", error.message);

        res.status(500).json({
            error: "Email failed to send"
        });
    }
});

// Render Port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});