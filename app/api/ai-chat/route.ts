import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Initialize all AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Create Supabase client for server-side use
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
            .from('students')
            .select('full_name, country_code, instructor_strategy, tags')
            .eq('id', studentId)
            .single();

        if (studentError || !student) {
            console.error('Supabase error:', studentError);
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // 2. Fetch Instructor Persona/Settings
        const { data: settings } = await supabase
            .from('settings')
            .select('instructor_profile, writing_style')
            .limit(1)
            .single();

        // Build persona section (use defaults if no settings)
        const instructorProfile = settings?.instructor_profile || 'A piano teacher';
        const writingStyle = settings?.writing_style || 'Professional and friendly';

        // 3. Build the "Anti-Robot" System Prompt
        const systemPrompt = `
You are speaking AS ME, the instructor. I am: ${instructorProfile}

MY WRITING STYLE (CRITICAL - YOU MUST FOLLOW THIS):
${writingStyle}

RULES FOR AUTHENTICITY:
1. ABSOLUTELY NO sales-y language like "I'd love to!", "Great to hear!", "I hope you're well!"
2. Be brief and direct. I am busy.
3. ${writingStyle.toLowerCase().includes('typo') ? 'Occasionally miss a capitalization or make a tiny grammar slip to sound human.' : ''}
4. ${writingStyle.toLowerCase().includes('exclamation') || writingStyle.toLowerCase().includes('!') ? 'Never use exclamation marks (!) unless absolutely necessary.' : ''}
5. Get straight to the point. No fluff.

STUDENT CONTEXT (${student.full_name}):
- Location: ${student.country_code || 'Unknown'}
- My Strategy for them: "${student.instructor_strategy || 'None set'}"
- Tags: ${student.tags?.join(', ') || 'None'}

TASK: ${message}

Write the response AS ME, following my writing style exactly.
        `.trim();

        let replyText = '';

        // 4. Switch based on the selected Provider
        if (provider === 'openai') {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                max_tokens: 500, // Keep emails short
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
            });
            replyText = completion.choices[0].message.content || "";
        }

        else if (provider === 'claude') {
            const msg = await anthropic.messages.create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 500, // Keep emails short
                system: systemPrompt,
                messages: [{ role: "user", content: message }],
            });
            const contentBlock = msg.content[0];
            if (contentBlock.type === 'text') {
                replyText = contentBlock.text;
            }
        }

        else {
            // Default to Gemini (2.0 Flash Exp)
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: systemPrompt }] },
                    { role: "model", parts: [{ text: "got it. writing as you now." }] }
                ],
            });
            const result = await chat.sendMessage(message);
            replyText = result.response.text();
        }

        // 5. Optional "Humanizer" - randomly lowercase first letter
        if (writingStyle.toLowerCase().includes('lowercase') && Math.random() > 0.6) {
            replyText = replyText.charAt(0).toLowerCase() + replyText.slice(1);
        }

        return NextResponse.json({ reply: replyText, provider });

    } catch (error: any) {
        console.error('AI Error:', error);

        // Check for rate limit errors
        if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('rate')) {
            return NextResponse.json({
                error: 'Rate limit reached. Please wait a minute and try again.'
            }, { status: 429 });
        }

        // Check for authentication errors
        if (error?.status === 401 || error?.message?.includes('API key') || error?.message?.includes('authentication')) {
            return NextResponse.json({
                error: 'API key error. Please check your configuration.'
            }, { status: 401 });
        }

        return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
    }
}
