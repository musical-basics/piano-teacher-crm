import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabaseClient';

const OAuth2 = google.auth.OAuth2;

// --- 1. NEW: "Nuclear" Cleaner Function ---
function cleanReplyBody(text: string): string {
    const lines = text.split('\n');
    let cleanLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // STOP if we hit the Gmail "On [Date] ... wrote:" line
        // We check if it starts with "On" and contains "wrote:" anywhere in the line
        if (trimmed.startsWith("On ") && trimmed.includes("wrote:")) {
            break;
        }

        // STOP if we hit the Outlook/Standard "From:" block
        if (trimmed.startsWith("From: ") && trimmed.includes("@")) {
            break;
        }

        // STOP if we hit a Divider line
        if (trimmed.match(/^_+$/)) { // matches "_______"
            break;
        }

        // STOP if we hit a quoted block (lines starting with >)
        // (This catches cases where the "On... wrote" header was missing but the quote remains)
        if (trimmed.startsWith(">")) {
            break;
        }

        // If none of the above, keep the line
        cleanLines.push(line);
    }

    // Join it back together and trim extra whitespace
    return cleanLines.join('\n').trim();
}

// --- 2. EXISTING: Helper to Dig for Text ---
function extractBody(payload: any): string {
    if (!payload) return "";
    let text = "";

    if (payload.body && payload.body.data) {
        text = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain') {
                if (part.body && part.body.data) {
                    text = Buffer.from(part.body.data, 'base64').toString('utf-8');
                    break;
                }
            }
            if (part.mimeType?.startsWith('multipart/')) {
                text = extractBody(part);
                if (text) break;
            }
        }
    }
    // Clean the result before returning
    return cleanReplyBody(text);
}

export async function POST(req: Request) {
    try {
        const { studentId, studentEmail } = await req.json();

        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // --- 3. FIX: Add 'newer_than:30d' to ignore old emails ---
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: `from:${studentEmail} newer_than:30d`,
            maxResults: 10
        });

        const messages = response.data.messages || [];
        let newCount = 0;

        for (const msg of messages) {
            if (!msg.id) continue;

            const { data: existing } = await supabase
                .from('messages')
                .select('id')
                .eq('gmail_message_id', msg.id)
                .single();

            if (existing) continue;

            const fullEmail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'full'
            });

            const body = extractBody(fullEmail.data.payload);

            const dateHeader = fullEmail.data.payload?.headers?.find(h => h.name === 'Date');
            const createdAt = dateHeader ? new Date(dateHeader.value!).toISOString() : new Date().toISOString();

            await supabase.from('messages').insert({
                student_id: studentId,
                sender_role: 'student',
                body_text: body || "(Could not parse email body)",
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