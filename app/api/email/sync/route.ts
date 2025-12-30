import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabaseClient';

const OAuth2 = google.auth.OAuth2;

// --- 1. NEW: Helper to remove "On [Date] wrote..." ---
// --- 1. NEW: Helper to remove "On [Date] wrote..." ---
function cleanReplyBody(text: string): string {
    const separators = [
        // 1. Robust Gmail/Outlook header (Handles newlines & variable date formats)
        // Matches: "On Tue, Dec 30... wrote:" or "On 2025-12-30... wrote:"
        /On\s+\w{3},?\s+\w{3}\s+\d{1,2},?[\s\S]*?wrote:/i,

        // 2. Simple "On [Date] wrote:" (Fallbacks)
        /On\s+.*?wrote:/i,

        // 3. Standard separators
        /-----Original Message-----/i,
        /From:\s.*Sent:\s/i,
        /________________________________/,

        // 4. Quote blocks (Lines starting with >)
        /\n>/
    ];

    let cleanText = text;

    for (const regex of separators) {
        const match = text.match(regex);
        if (match && match.index) {
            // Cut off everything starting from the separator
            cleanText = cleanText.substring(0, match.index);
            break; // Stop after finding the first (top-most) separator
        }
    }

    return cleanText.trim();
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