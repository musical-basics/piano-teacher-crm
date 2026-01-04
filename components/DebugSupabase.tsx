"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { X } from "lucide-react"

interface DebugSupabaseProps {
    isOpen: boolean
    onClose: () => void
}

export default function DebugSupabase({ isOpen, onClose }: DebugSupabaseProps) {
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const fetchStudents = async () => {
        const { data, error } = await supabase.from("crm_students").select("*").order("created_at", { ascending: false })
        if (error) {
            console.error("Error fetching students:", error)
        } else {
            setStudents(data || [])
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchStudents()
        }
    }, [isOpen])

    const handleAddStudent = async () => {
        setLoading(true)
        const newStudent = {
            full_name: "Test User",
            email: `test-${Date.now()}@test.com`,
            country_code: "US",
            status: "new",
        }

        const { error } = await supabase.from("crm_students").insert([newStudent])

        if (error) {
            console.error("Error inserting student:", error)
            alert("Error adding student: " + error.message)
        } else {
            await fetchStudents()
        }
        setLoading(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-96 max-h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-sm font-bold text-slate-700">🧪 Supabase Debug Panel</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4">
                    <button
                        onClick={handleAddStudent}
                        disabled={loading}
                        className="w-full px-3 py-2 mb-4 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        {loading ? "Adding..." : "Add Test Student"}
                    </button>

                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-600">
                            Database Students ({students.length}):
                        </h3>
                        <ul className="space-y-2 max-h-64 overflow-y-auto">
                            {students.map((student) => (
                                <li key={student.id} className="p-3 border rounded-lg bg-slate-50">
                                    <div className="font-medium text-slate-800">{student.full_name}</div>
                                    <div className="text-sm text-slate-500 truncate">{student.email}</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {new Date(student.created_at).toLocaleString()}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
