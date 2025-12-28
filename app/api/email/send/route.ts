import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabaseClient';

const OAuth2 = google.auth.OAuth2;

export async function POST(req: Request) {
    try {
        const { to, subject, htmlContent, studentId } = await req.json();

        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        const accessToken = await oauth2Client.getAccessToken();

        // UPDATED TRANSPORTER: Uses Port 587 to bypass ISP blocks
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                type: 'OAuth2',
                user: process.env.GMAIL_USER,
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: accessToken.token || '',
            },
        });

        const info = await transporter.sendMail({
            from: `"Lionel from MusicalBasics" <${process.env.GMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent,
        });

        console.log("REAL Message sent ID:", info.messageId);

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
