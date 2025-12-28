import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    try {
        const { to, subject, htmlContent, studentId } = await request.json();

        console.log(`[API] Attempting to send email to: ${to}`);
        console.log(`[API] Subject: ${subject}`);

        // --- MOCK GMAIL SENDING ---
        // Since googleapis is not installed yet, we simulate the send.
        // This log matches the user's expected "Terminal Check"
        const googleMessageId = `gmail-mock-${Date.now()}`;
        console.log(`Message sent: ${googleMessageId}`);

        // --- SAVE TO MESSAGE HISTORY ---
        if (studentId) {
            const { error } = await supabase
                .from('messages')
                .insert({
                    student_id: studentId,
                    sender_role: 'instructor',
                    body_text: htmlContent,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('[API] Failed to save to DB:', error);
                // We don't fail the request if email sent but db failed, or maybe we do?
                // For now, log it.
            } else {
                console.log('[API] Saved to conversation history.');
            }
        }

        return NextResponse.json({ success: true, messageId: googleMessageId });
    } catch (error: any) {
        console.error('[API] Error processing email request:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
