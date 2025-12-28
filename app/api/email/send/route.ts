import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabaseClient';

const OAuth2 = google.auth.OAuth2;

export async function POST(req: Request) {
    try {
        const { to, subject, htmlContent, studentId } = await req.json();

        // 1. Setup OAuth2 Client using your new .env keys
        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        // 2. Get Access Token (This is the "handshake" with Google)
        const accessToken = await oauth2Client.getAccessToken();

        // 3. Create the Transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.GMAIL_USER,
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: accessToken.token || '',
            },
        });

        // 4. Send the REAL Email
        const info = await transporter.sendMail({
            from: `"Musical Basics" <${process.env.GMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent,
        });

        console.log("REAL Message sent ID:", info.messageId);

        // 5. Save to Database
        if (studentId) {
            await supabase.from('messages').insert({
                student_id: studentId,
                sender_role: 'instructor',
                body_text: htmlContent,
                gmail_message_id: info.messageId,
                created_at: new Date().toISOString()
            });
        }

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error: any) {
        console.error("Gmail Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
