import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabaseClient';

const OAuth2 = google.auth.OAuth2;

// --- Helper Function to Dig for Text ---
function extractBody(payload: any): string {
    if (!payload) return "";

    // 1. If the body is directly here (rare for full emails, common for simple ones)
    if (payload.body && payload.body.data) {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // 2. If it has parts (Multipart), loop through them
    if (payload.parts) {
        // First, look for plain text
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain') {
                if (part.body && part.body.data) {
                    return Buffer.from(part.body.data, 'base64').toString('utf-8');
                }
            }
            // If the part is ITSELF a container (nested), dig deeper!
            if (part.mimeType?.startsWith('multipart/')) {
                const nestedBody = extractBody(part);
                if (nestedBody) return nestedBody;
            }
        }

        // Fallback: If no plain text found, look for HTML
        for (const part of payload.parts) {
            if (part.mimeType === 'text/html') {
                if (part.body && part.body.data) {
                    return Buffer.from(part.body.data, 'base64').toString('utf-8');
                }
            }
        }
    }
    return "";
}

export async function POST(req: Request) {
    console.log("--- SYNC STARTED ---");
    try {
        const { studentId, studentEmail } = await req.json();
        console.log(`Checking emails from: ${studentEmail}`);

        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // 1. List Messages
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: `from:${studentEmail}`, // Only get emails SENT BY the student
            maxResults: 5
        });

        const messages = response.data.messages || [];
        console.log(`Found ${messages.length} potential matches in Gmail.`);

        let newCount = 0;

        for (const msg of messages) {
            if (!msg.id) continue;

            // 2. Check DB for duplicates
            const { data: existing } = await supabase
                .from('messages')
                .select('id')
                .eq('gmail_message_id', msg.id)
                .single();

            if (existing) {
                console.log(`Skipping existing message: ${msg.id}`);
                continue;
            }

            console.log(`Processing NEW message: ${msg.id}`);

            // 3. Fetch Full Content
            const fullEmail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'full'
            });

            // 4. Extract Body using the smarter function
            const body = extractBody(fullEmail.data.payload);

            // 5. Get Date
            const dateHeader = fullEmail.data.payload?.headers?.find(h => h.name === 'Date');
            const createdAt = dateHeader ? new Date(dateHeader.value!).toISOString() : new Date().toISOString();

            // 6. Save to DB
            const { error } = await supabase.from('messages').insert({
                student_id: studentId,
                sender_role: 'student',
                body_text: body || "(Could not parse email body)",
                gmail_message_id: msg.id,
                created_at: createdAt
            });

            if (error) console.error("Supabase Insert Error:", error);
            else newCount++;
        }

        console.log(`--- SYNC FINISHED: Imported ${newCount} messages ---`);
        return NextResponse.json({ success: true, count: newCount });

    } catch (error: any) {
        console.error("Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}