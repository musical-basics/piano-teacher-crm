import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { message, studentId, provider = 'gemini' } = await req.json();

        // 1. Fetch Student Data
        const { data: student } = await supabase
            .from('crm_students')
            .select('*')
            .eq('id', studentId)
            .single();

        if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

        // 2. Fetch Last Message
        const { data: lastMsgData } = await supabase
            .from('crm_messages')
            .select('body_text')
            .eq('student_id', studentId)
            .eq('sender_role', 'student')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        const lastStudentMessage = lastMsgData?.body_text || "(No previous message found)";

        // 3. Fetch Persona
        const { data: settings } = await supabase
            .from('settings')
            .select('*')
            .limit(1)
            .single();
        const instructorProfile = settings?.instructor_profile || 'A piano teacher';
        const writingStyle = settings?.writing_style || 'Professional and friendly';

        // 4. THE "CHATBOT" SYSTEM PROMPT
        // Forces the specific "Web Chatbot" behavior (Reasoning + Markdown)
        const systemPrompt = `
You are an expert AI Copilot for a high-end music instructor.
Your goal is to write a reply that sounds exactly like the instructor.

**INSTRUCTOR PERSONA:**
${instructorProfile}
**WRITING STYLE:**
${writingStyle}

**STUDENT CONTEXT:**
- Name: ${student.full_name} (${student.country_code || 'Unknown'})
- Strategy: ${student.instructor_strategy || 'None'}
- Tags: ${student.tags?.join(', ') || 'None'}

**LAST MESSAGE FROM STUDENT:**
"${lastStudentMessage}"

**USER INSTRUCTION:**
"${message}"

**GUIDELINES:**
1. **Analyze First**: Briefly analyze the student's tone and needs (hidden reasoning).
2. **Drafting**: Write the response. NO subject lines.
3. **Tone Check**: Ensure it matches the "Writing Style" perfectly (e.g. casual vs formal).
4. **Agentic Behavior**: If the user asks a question *about* the student, answer it directly. If they ask for a *draft*, output the draft clearly.
`.trim();

        let replyText = '';
        let usedModel = '';

        // 5. CALLING THE 2026 FLAGSHIP MODELS (Restored from your Repomix)
        if (provider === 'openai') {
            usedModel = "gpt-5.2"; // KEEPING YOUR 5.2
            const completion = await openai.chat.completions.create({
                model: usedModel,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.7,
            });
            replyText = completion.choices[0].message.content || "";
        }
        else if (provider === 'claude') {
            usedModel = "claude-sonnet-4-5-20250929"; // KEEPING YOUR 4.5
            const msg = await anthropic.messages.create({
                model: usedModel,
                max_tokens: 1000,
                system: systemPrompt,
                messages: [{ role: "user", content: message }],
                temperature: 0.7,
            });
            // @ts-ignore
            replyText = msg.content[0].text;
        }
        else {
            // Gemini (Default)
            usedModel = "gemini-3-pro-preview"; // KEEPING YOUR 3.0

            const model = genAI.getGenerativeModel({
                model: usedModel,
                generationConfig: {
                    temperature: 0.7 // Higher temp for "Chatbot" creativity
                }
            });
            const result = await model.generateContent(systemPrompt);
            replyText = result.response.text();
        }

        return NextResponse.json({
            reply: replyText,
            provider,
            modelUsed: usedModel
        });

    } catch (error: any) {
        console.error('AI Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
