import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (Use Service Role Key to ensure access to storage)
// Fallback to anon key if service role is missing, though service role is preferred for storage download
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const OAuth2 = google.auth.OAuth2;

export async function POST(req: Request) {
    console.log("Email send route hit");
    try {
        const reqBody = await req.json();
        const { to, subject, htmlContent, studentId, cleanContent, attachments = [] } = reqBody;
        console.log("Received payload:", { to, subject, studentId, attachmentsCount: attachments.length });

        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        console.log("Getting access token...");
        const accessToken = await oauth2Client.getAccessToken();
        console.log("Got access token");

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: 'OAuth2',
                user: process.env.GMAIL_USER,
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: accessToken.token || '',
            },
        });

        // PROCESS ATTACHMENTS
        const processedAttachments = [];

        for (const file of attachments) {
            // Check if it has a storage_path (uploaded via modal)
            if (file.storage_path) {
                console.log(`Downloading attachment: ${file.file_name} from ${file.storage_path}`);
                // Download the actual file data from Supabase
                const { data, error } = await supabase
                    .storage
                    .from('attachments')
                    .download(file.storage_path);

                if (error) {
                    console.error(`Failed to download ${file.file_name}:`, error);
                    continue;
                }

                // Convert Blob to Buffer
                const arrayBuffer = await data.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                processedAttachments.push({
                    filename: file.file_name,
                    content: buffer,
                    contentType: file.file_type
                });
            }
        }

        console.log("Sending mail via transporter with attachments:", processedAttachments.length);
        const info = await transporter.sendMail({
            from: `"Lionel Yu From MusicalBasics" <${process.env.GMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent,
            attachments: processedAttachments,
        });
        console.log("Mail sent, info:", info);
        console.log("REAL Message sent ID:", info.messageId);

        if (studentId) {
            console.log("Inserting into database...");
            // Use cleanContent (without reply chain) for DB if available, otherwise fallback to htmlContent
            const dbContent = (cleanContent || htmlContent);

            const { error } = await supabase.from('messages').insert({
                student_id: studentId,
                sender_role: 'instructor',
                body_text: dbContent,
                gmail_message_id: info.messageId,
                created_at: new Date().toISOString()
            });
            if (error) console.error("Database insert error:", error);
            else console.log("Database insert success");
        }

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error: any) {
        console.error("Gmail Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
