import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Create a Supabase client for server-side use
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { message, studentId } = await req.json();

        if (!message || !studentId) {
            return NextResponse.json({ error: 'Missing message or studentId' }, { status: 400 });
        }

        // 1. Fetch the Student's Profile & Strategy from Supabase
        const { data: student, error } = await supabase
            .from('students')
            .select('full_name, country_code, instructor_strategy, tags')
            .eq('id', studentId)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // 2. Construct the "System Prompt"
        // This is where the magic happens. We inject your strategy dynamically.
        const systemPrompt = `
      You are an expert piano teaching assistant.
      You are helping the instructor reply to a student named: ${student.full_name} (${student.country_code || 'Unknown'}).
      
      CRITICAL INSTRUCTION FROM TEACHER (The "Strategy"):
      "${student.instructor_strategy || 'No specific strategy set. Be helpful and encouraging.'}"
      
      Context Tags: ${student.tags?.join(', ') || 'None'}
      
      Task: Answer the instructor's question or draft a reply based on the strategy above.
      Keep it concise and helpful. Format your response in a conversational way.
    `;

        // 3. Call Gemini - Using the experimental 2.0 Flash model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Understood. I have internalized the strategy for this student and am ready to help you craft the perfect response." }] }
            ],
        });

        const result = await chat.sendMessage(message);
        const response = result.response.text();

        return NextResponse.json({ reply: response });

    } catch (error: any) {
        console.error('Gemini Error:', error);

        // Check for rate limit errors
        if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
            return NextResponse.json({
                error: 'Rate limit reached. Please wait a minute and try again.'
            }, { status: 429 });
        }

        // Check for model not found
        if (error?.status === 404 || error?.message?.includes('not found')) {
            return NextResponse.json({
                error: 'AI model not available. Please check API configuration.'
            }, { status: 503 });
        }

        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
