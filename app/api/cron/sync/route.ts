import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabaseClient';
// @ts-ignore
import EmailReplyParser from 'node-email-reply-parser';

export const dynamic = 'force-dynamic'; // Prevent caching

const OAuth2 = google.auth.OAuth2;

// --- Helper: Extract email from "Name <email@gmail.com>" ---
function extractEmailAddress(header: string): string | null {
    const match = header.match(/<(.+)>/);
    if (match && match[1]) return match[1];
    if (header.includes('@')) return header; // Fallback if no brackets
    return null;
}

// --- Helper: Body Extractor (Same as before) ---
function extractBody(payload: any): string {
    if (!payload) return "";
    let text = "";

    if (payload.parts) {
        const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
        if (textPart && textPart.body && textPart.body.data) {
            text = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
    }
    if (!text && payload.body && payload.body.data) {
        text = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    if (!text && payload.parts) {
        const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
        if (htmlPart && htmlPart.body && htmlPart.body.data) {
            const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
            text = html.replace(/<[^>]*>/g, ' ').trim();
        }
    }

    // Use your Library Fix here!
    // The library exports a function: parse(text, visibleTextOnly)
    // We pass true to get just the visible text immediately
    const cleanText = EmailReplyParser(text || "", true);

    return ((cleanText as string) || text);
}

export async function GET(req: Request) {
    // SECURITY: Simple check to prevent random people from spamming this
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (key !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log("--- GLOBAL SYNC STARTED ---");

        // 1. Setup Gmail
        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );
        oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // 2. Fetch ALL emails received in the last 10 minutes
        // We look back 10m just to be safe in case a run was missed
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'newer_than:10m',
            maxResults: 20
        });

        const messages = response.data.messages || [];
        console.log(`Found ${messages.length} recent emails.`);

        let processedCount = 0;

        for (const msg of messages) {
            if (!msg.id) continue;

            // A. Check Dedupe early
            const { data: existing } = await supabase
                .from('crm_messages')
                .select('id')
                .eq('gmail_message_id', msg.id)
                .single();

            if (existing) continue;

            // B. Fetch Details
            const fullEmail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
            const payload = fullEmail.data.payload;
            if (!payload) continue;

            // C. Find Sender Email
            const fromHeader = payload.headers?.find(h => h.name === 'From')?.value || "";
            const senderEmail = extractEmailAddress(fromHeader);

            if (!senderEmail) continue;

            // D. Does this student exist in our DB?
            const { data: student } = await supabase
                .from('crm_students')
                .select('id')
                .eq('email', senderEmail)
                .single();

            if (!student) {
                console.log(`Ignored email from unknown student: ${senderEmail}`);
                continue;
            }

            // E. Save the Message
            const body = extractBody(payload);
            const dateHeader = payload.headers?.find(h => h.name === 'Date');
            const createdAt = dateHeader ? new Date(dateHeader.value!).toISOString() : new Date().toISOString();

            await supabase.from('crm_messages').insert({
                student_id: student.id,
                sender_role: 'student',
                body_text: body,
                gmail_message_id: msg.id,
                created_at: createdAt
            });

            console.log(`✅ Saved reply from ${senderEmail}`);
            processedCount++;
        }

        return NextResponse.json({ success: true, processed: processedCount });

    } catch (error: any) {
        console.error("Cron Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
