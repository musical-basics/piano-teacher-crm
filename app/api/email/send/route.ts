import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabaseClient';

const OAuth2 = google.auth.OAuth2;

export async function POST(req: Request) {
    console.log("Email send route hit");
    try {
        const reqBody = await req.json();
        const { to, subject, htmlContent, studentId } = reqBody;
        console.log("Received payload:", { to, subject, studentId });

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

        // UPDATED TRANSPORTER: Trying Port 465 (SSL) since 587 timed out
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
                type: 'OAuth2',
                user: process.env.GMAIL_USER,
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: accessToken.token || '',
            },
        });

        console.log("Sending mail via transporter...");
        const info = await transporter.sendMail({
            from: `"Lionel Yu From MusicalBasics" <${process.env.GMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent,
        });
        console.log("Mail sent, info:", info);

        console.log("REAL Message sent ID:", info.messageId);

        if (studentId) {
            console.log("Inserting into database...");
            // Use cleanContent (without reply chain) for DB if available, otherwise fallback to htmlContent
            const dbContent = (reqBody.cleanContent || htmlContent);

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
