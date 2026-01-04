import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Initialize all AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Create Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type AIProvider = 'gemini' | 'openai' | 'claude';

export async function POST(req: Request) {
    try {
        const { message, studentId, provider = 'gemini' } = await req.json();

        if (!message || !studentId) {
            return NextResponse.json({ error: 'Missing message or studentId' }, { status: 400 });
        }

        // 1. Fetch Student Context
        const { data: student, error: studentError } = await supabase
            .from('crm_students')
            .select('full_name, country_code, instructor_strategy, tags')
            .eq('id', studentId)
            .single();

        if (studentError || !student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // 2. NEW: Fetch the Last Message from this Student
        const { data: lastMsgData } = await supabase
            .from('crm_messages')
            .select('body_text')
            .eq('student_id', studentId)
            .eq('sender_role', 'student')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const lastStudentMessage = lastMsgData?.body_text || "(No previous message found)";

        // 3. Fetch Instructor Persona
        const { data: settings } = await supabase
            .from('settings')
            .select('instructor_profile, writing_style')
            .limit(1)
            .single();

        const instructorProfile = settings?.instructor_profile || 'A piano teacher';
        const writingStyle = settings?.writing_style || 'Professional and friendly';

        // 4. Build the Context-Aware System Prompt
        const systemPrompt = `
You are speaking AS ME, the instructor. I am: ${instructorProfile}

MY WRITING STYLE (CRITICAL):
${writingStyle}

RULES:
1. NO sales-y fluff ("I'd love to!", "Great to hear!"). Be direct.
2. ${writingStyle.toLowerCase().includes('typo') ? 'Make occasional small grammar slips.' : 'Use perfect grammar.'}
3. ${writingStyle.toLowerCase().includes('!') ? 'Use exclamation marks sparingly.' : ''}

CONTEXT:
I am replying to a student named ${student.full_name} (${student.country_code || 'Unknown'}).
My Strategy for them: "${student.instructor_strategy || 'None'}"
Student Tags: ${student.tags?.join(', ') || 'None'}

---
THEIR LAST MESSAGE TO ME:
"${lastStudentMessage}"
---

MY INSTRUCTION TO YOU:
${message}

Write the response AS ME. Do not include subject lines or placeholders like [Name]. Just the body text.
        `.trim();

        let replyText = '';

        // 5. Call the AI Provider
        if (provider === 'openai') {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                max_tokens: 500,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
            });
            replyText = completion.choices[0].message.content || "";
        }
        else if (provider === 'claude') {
            const msg = await anthropic.messages.create({
                model: "claude-sonnet-4-20250514", // Fallback if 4 isn't out, use "claude-3-5-sonnet-20240620"
                max_tokens: 500,
                system: systemPrompt,
                messages: [{ role: "user", content: message }],
            });
            // @ts-ignore
            replyText = msg.content[0].text;
        }
        else {
            // Default: Gemini
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            const result = await model.generateContent(systemPrompt); // Send full prompt in one go for better context
            replyText = result.response.text();
        }

        // 6. Optional Humanizer
        if (writingStyle.toLowerCase().includes('lowercase') && Math.random() > 0.6) {
            replyText = replyText.charAt(0).toLowerCase() + replyText.slice(1);
        }

        return NextResponse.json({ reply: replyText, provider });

    } catch (error: any) {
        console.error('AI Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
    }
}
