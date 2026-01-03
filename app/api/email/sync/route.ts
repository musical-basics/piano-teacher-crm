import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabaseClient';
// @ts-ignore (This library doesn't have perfect typescript types, so we ignore the warning)
import EmailReplyParser from 'node-email-reply-parser';

const OAuth2 = google.auth.OAuth2;

// --- Helper to Dig for Text (Simplified) ---
// --- Helper to Dig for Text (Improved Recursive) ---
function findPart(parts: any[], mimeType: string): any {
    for (const part of parts) {
        if (part.mimeType === mimeType) {
            return part;
        }
        if (part.parts) {
            const found = findPart(part.parts, mimeType);
            if (found) return found;
        }
    }
    return null;
}

function extractBody(payload: any): string {
    if (!payload) return "";
    let text = "";

    // 1. Try recursive search for text/plain
    if (payload.parts) {
        const textPart = findPart(payload.parts, 'text/plain');
        if (textPart && textPart.body && textPart.body.data) {
            text = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
    }

    // 2. Fallback: Check main body if not found yet
    if (!text && payload.body && payload.body.data) {
        text = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // 3. Recursive search for text/html (if no plain text found)
    if (!text && payload.parts) {
        const htmlPart = findPart(payload.parts, 'text/html');
        if (htmlPart && htmlPart.body && htmlPart.body.data) {
            const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
            // Remove styles and scripts first
            const noScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, "")
                .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, "");

            // Replace common block tags with newlines
            const withNewlines = noScripts
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<\/div>/gi, '\n')
                .replace(/<\/tr>/gi, '\n')
                .replace(/<\/li>/gi, '\n');

            // rudimentary html-to-text
            text = withNewlines
                .replace(/<[^>]*>/g, ' ')
                .replace(/[ \t]+/g, ' ')        // Collapse only spaces/tabs
                .replace(/\n\s+\n/g, '\n\n')    // Collapse multiple empty lines
                .trim();
        }
    }

    // If still empty (maybe it was just an attachment?), try snippet
    // (Note: 'snippet' is on the message object, usually passed down, but here we only have payload.
    // We might miss it if we don't pass the whole message object. But payload doesn't have snippet.)

    // --- THE MAGIC: Use the library to clean the reply ---
    try {
        const cleanText = EmailReplyParser(text, true);
        return ((cleanText as string) || text);
    } catch (e) {
        console.error("Reply parsing failed", e);
        return text;
    }
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

        // Get emails from the last 30 days
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: `from:${studentEmail} newer_than:30d`,
            maxResults: 5
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