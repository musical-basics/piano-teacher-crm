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

        // 1. Fetch Context (Student + Strategy)
        const { data: student, error } = await supabase
            .from('students')
            .select('full_name, country_code, instructor_strategy, tags')
            .eq('id', studentId)
            .single();

        if (error || !student) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const systemPrompt = `
You are an expert piano teaching assistant.
You are helping the instructor reply to a student named: ${student.full_name} (${student.country_code || 'Unknown'}).

CRITICAL INSTRUCTION FROM TEACHER (The "Strategy"):
"${student.instructor_strategy || 'No specific strategy set. Be helpful and encouraging.'}"

Context Tags: ${student.tags?.join(', ') || 'None'}

Task: Answer the instructor's question or draft a reply based on the strategy above.
Keep it concise and helpful. Format your response in a conversational way.
        `.trim();

        let replyText = '';

        // 2. Switch based on the selected Provider
        if (provider === 'openai') {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
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
                max_tokens: 1024,
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
                    { role: "model", parts: [{ text: "Understood. I have internalized the strategy for this student." }] }
                ],
            });
            const result = await chat.sendMessage(message);
            replyText = result.response.text();
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
