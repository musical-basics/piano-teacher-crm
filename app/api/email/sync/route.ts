import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabaseClient';

const OAuth2 = google.auth.OAuth2;

export async function POST(req: Request) {
    try {
        const { studentId, studentEmail } = await req.json();

        if (!studentId || !studentEmail) {
            return NextResponse.json({ error: 'Missing studentId or studentEmail' }, { status: 400 });
        }

        // 1. Setup Auth (Same as sending)
        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // 2. Fetch recent emails FROM this student
        // We get the last 10 messages to be safe
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: `from:${studentEmail}`,
            maxResults: 10
        });

        const messages = response.data.messages || [];
        let newCount = 0;

        // 3. Process each message
        for (const msg of messages) {
            if (!msg.id) continue;

            // A. Check if we already have this specific email ID in Supabase
            const { data: existing } = await supabase
                .from('messages')
                .select('id')
                .eq('gmail_message_id', msg.id)
                .single();

            // If we already have it, skip!
            if (existing) continue;

            // B. If new, fetch the full details
            const fullEmail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'full' // We need the body
            });

            const payload = fullEmail.data.payload;
            if (!payload) continue;

            // C. Extract the Body Text (Gmail makes this tricky!)
            let body = fullEmail.data.snippet || ""; // Fallback to snippet

            // Try to find the HTML or Text part
            if (payload.parts) {
                const part = payload.parts.find(p => p.mimeType === 'text/plain') || payload.parts[0];
                if (part && part.body && part.body.data) {
                    body = Buffer.from(part.body.data, 'base64').toString('utf-8');
                }
            } else if (payload.body && payload.body.data) {
                body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
            }

            // D. Clean up the date
            const dateHeader = payload.headers?.find(h => h.name === 'Date');
            const createdAt = dateHeader ? new Date(dateHeader.value!).toISOString() : new Date().toISOString();

            // E. Insert into Supabase
            await supabase.from('messages').insert({
                student_id: studentId,
                sender_role: 'student', // Since we filtered by 'from:studentEmail'
                body_text: body,
                gmail_message_id: msg.id,
                created_at: createdAt
            });

            newCount++;
        }

        return NextResponse.json({ success: true, count: newCount });

    } catch (error: any) {
        console.error("Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
