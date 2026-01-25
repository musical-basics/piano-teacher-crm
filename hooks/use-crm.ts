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
                .select('*')
                .order('last_contacted_at', { ascending: false, nullsFirst: false })

            if (error) throw error

            // Map DB shape to UI shape (Student type)
            // Note: We intentionally leave messages empty here to keep it fast
            return (data || []).map((s: any) => ({
                id: s.id,
                name: s.full_name,
                email: s.email,
                status: s.status || 'Lead',
                country: s.country_code || 'US',
                countryFlag: getCountryFlag(s.country_code),
                tags: s.tags || [],
                instructorNotes: s.instructor_strategy,
                lastMessageDate: s.last_contacted_at ? new Date(s.last_contacted_at) : new Date(0),
                messages: [], // Empty initially!
                lastMessage: "Click to load...", // Placeholder, will be populated on selection? Or maybe we can fetch just the last message content if needed, but for now placeholder is fine
                experienceLevel: s.experience_level
            })) as Student[]
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
