"use client"
import { useState } from "react"
import { X, Sprout, Check, User, GraduationCap, Calendar, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

export function SeedMessageModal({ isOpen, onClose, studentId, onSuccess }: {
    isOpen: boolean,
    onClose: () => void,
    studentId: string,
    onSuccess?: () => void
}) {
    const [text, setText] = useState("")
    const [sender, setSender] = useState<'student' | 'instructor'>('student')

    // Default to "Right Now" (formatted for datetime-local input)
    // Format: YYYY-MM-DDThh:mm
    const [date, setDate] = useState(() => {
        const now = new Date()
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
        return now.toISOString().slice(0, 16)
    })

    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!text.trim()) return
        setIsSaving(true)

        try {
            // Save message with the selected sender AND the custom date
            await supabase.from('messages').insert({
                student_id: studentId,
                sender_role: sender,
                body_text: text,
                created_at: new Date(date).toISOString() // <--- The Magic: Backdating
            })

            setIsSaving(false)
            setText("")
            if (onSuccess) onSuccess()
            onClose()
        } catch (error) {
            console.error(error)
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl w-[500px] border border-slate-100 p-6 transform transition-all">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2 text-indigo-900">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Sprout size={20} className="text-indigo-600" />
                        </div>
                        <h3 className="font-serif text-lg font-bold">Import History</h3>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                {/* Sender Toggle */}
                <div className="flex gap-3 mb-4">
                    <button
                        onClick={() => setSender('student')}
                        className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${sender === 'student'
                                ? 'bg-slate-50 border-slate-300 text-slate-800 shadow-sm'
                                : 'bg-white border-transparent text-slate-400 hover:bg-slate-50'
                            }`}
                    >
                        <User size={18} />
                        <span className="font-medium text-sm">Student Said</span>
                    </button>

                    <button
                        onClick={() => setSender('instructor')}
                        className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${sender === 'instructor'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                : 'bg-white border-transparent text-slate-400 hover:bg-slate-50'
                            }`}
                    >
                        <GraduationCap size={18} />
                        <span className="font-medium text-sm">I Said</span>
                    </button>
                </div>

                {/* Date Picker (The New Field) */}
                <div className="mb-4">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-1.5 ml-1">
                        <Calendar size={14} /> Date Sent
                    </label>
                    <input
                        type="datetime-local"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                {/* Text Area */}
                <textarea
                    className={`w-full border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 transition-all mb-4 leading-relaxed h-32 resize-none
                        ${sender === 'student'
                            ? 'bg-slate-50 border-slate-200 focus:ring-slate-200 text-slate-700'
                            : 'bg-indigo-50/30 border-indigo-100 focus:ring-indigo-100 text-indigo-900 placeholder-indigo-300'
                        }`}
                    placeholder={sender === 'student'
                        ? "Paste the student's email content here..."
                        : "Paste your reply here..."}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                />

                <button
                    onClick={handleSave}
                    disabled={isSaving || !text.trim()}
                    className={`w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                        ${sender === 'instructor'
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 text-white'
                            : 'bg-slate-800 hover:bg-slate-900 shadow-slate-200 text-white'
                        }`}
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Check size={18} strokeWidth={3} />
                            Add to History
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
