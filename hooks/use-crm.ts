import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Student, Message } from '@/lib/types'

// Country code to flag emoji mapping
const countryFlags: Record<string, string> = {
    US: "🇺🇸",
    NL: "🇳🇱",
    AE: "🇦🇪",
    GB: "🇬🇧",
    CA: "🇨🇦",
    AU: "🇦🇺",
    DE: "🇩🇪",
    FR: "🇫🇷",
    IN: "🇮🇳",
    JP: "🇯🇵",
    CN: "🇨🇳",
    BR: "🇧🇷",
    MX: "🇲🇽",
    ES: "🇪🇸",
    IT: "🇮🇹",
}

const getCountryFlag = (countryCode: string | null): string => {
    if (!countryCode) return "🌍"
    return countryFlags[countryCode.toUpperCase()] || "🌍"
}

// 1. Fetch the Student List (Lightweight)
export function useStudents() {
    return useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_students')
                .select('*, crm_messages(id, body_text, created_at, sender_role)')
                .order('last_contacted_at', { ascending: false, nullsFirst: false })
                .order('created_at', { foreignTable: 'crm_messages', ascending: false })
                .limit(1, { foreignTable: 'crm_messages' })

            if (error) throw error

            // Map DB shape to UI shape (Student type)
            return (data || []).map((s: any) => {
                const latestMsg = s.crm_messages?.[0]
                const messages: Message[] = latestMsg ? [{
                    id: latestMsg.id,
                    content: latestMsg.body_text || "",
                    sender: latestMsg.sender_role || "student",
                    timestamp: new Date(latestMsg.created_at)
                }] : []

                return {
                    id: s.id,
                    name: s.full_name,
                    email: s.email,
                    status: s.status || 'Lead',
                    country: s.country_code || 'US',
                    countryFlag: getCountryFlag(s.country_code),
                    tags: s.tags || [],
                    instructorNotes: s.instructor_strategy,
                    lastMessageDate: s.last_contacted_at ? new Date(s.last_contacted_at) : new Date(0),
                    messages: messages, // Populated with just the latest message
                    lastMessage: messages[0]?.content || "No messages yet",
                    experienceLevel: s.experience_level
                }
            }) as Student[]
        }
    })
}

// 2. Fetch Messages for ONE Student (On Demand)
export function useStudentMessages(studentId: string | null) {
    return useQuery({
        queryKey: ['messages', studentId],
        enabled: !!studentId, // Only run if a student is selected
        queryFn: async () => {
            if (!studentId) return []

            const { data, error } = await supabase
                .from('crm_messages')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: true })

            if (error) throw error

            return (data || []).map((m: any) => ({
                id: m.id,
                content: m.body_text || "",
                sender: m.sender_role || "student",
                timestamp: new Date(m.created_at),
            })) as Message[]
        }
    })
}
