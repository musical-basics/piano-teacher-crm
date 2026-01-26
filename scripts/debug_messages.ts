
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load env from .env.local manually
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8')
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=')
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
        }
    })
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function run() {
    // 1. Find Marco
    const { data: students, error: sError } = await supabase
        .from('crm_students')
        .select('id, full_name, email')
        .ilike('full_name', '%Marco%')

    if (sError) {
        console.error('Error finding student:', sError)
        return
    }

    if (!students || students.length === 0) {
        console.log('No student found named Marco')
        return
    }

    const marco = students[0]
    console.log('Found Student:', marco)

    // 2. Get Last Message
    const { data: messages, error: mError } = await supabase
        .from('crm_messages')
        .select('*')
        .eq('student_id', marco.id)
        .eq('sender_role', 'student')
        .order('created_at', { ascending: false })
        .limit(3) // Get last 3 to see context

    if (mError) {
        console.error('Error fetching messages:', mError)
        return
    }

    console.log(`\nLast ${messages.length} messages from ${marco.full_name}:`)
    messages.forEach((m, i) => {
        console.log(`\n--- Message ${i + 1} (${m.created_at}) ---`)
        console.log(m.body_text)
        console.log('-----------------------------------')
    })
}

run()
