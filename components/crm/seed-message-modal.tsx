"use client"
import { useState } from "react"
import { X, Sprout, Check, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface SeedMessageModalProps {
    isOpen: boolean
    onClose: () => void
    studentId: string
    onSuccess?: () => void
}

export function SeedMessageModal({ isOpen, onClose, studentId, onSuccess }: SeedMessageModalProps) {
    const [text, setText] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!text.trim()) return
        setIsSaving(true)

        try {
            // Save as a message from the STUDENT
            const { error } = await supabase.from('messages').insert({
                student_id: studentId,
                sender_role: 'student', // Seed messages are usually from them
                body_text: text,
                created_at: new Date().toISOString()
            })

            if (error) throw error

            if (onSuccess) onSuccess()
            setText("")
            onClose()
        } catch (error) {
            console.error('Error saving seed message:', error)
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl w-[450px] border border-slate-100 p-6 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-indigo-900">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Sprout size={20} className="text-indigo-600" />
                        </div>
                        <h3 className="font-serif text-lg font-bold">Input Seed Message</h3>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                <p className="text-sm text-slate-500 mb-4">
                    Paste the student's original inquiry (from email, text, or form) here.
                    This gives the AI context to start the conversation.
                </p>

                <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all mb-4 text-slate-700 leading-relaxed"
                    rows={6}
                    placeholder="e.g. 'Hi, I saw your YouTube channel and want to learn Jazz piano...'"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                />

                <button
                    onClick={handleSave}
                    disabled={isSaving || !text.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Planting Seed...
                        </>
                    ) : (
                        <>
                            <Check size={18} strokeWidth={3} />
                            Save to History
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
