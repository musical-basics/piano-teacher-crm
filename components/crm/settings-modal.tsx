"use client"
import { useState, useEffect } from "react"
import { X, Save, User, PenTool, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [profile, setProfile] = useState("")
    const [style, setStyle] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [settingsId, setSettingsId] = useState<string | null>(null)

    // Load Settings
    useEffect(() => {
        if (!isOpen) return

        const load = async () => {
            setIsLoading(true)
            const { data } = await supabase
                .from('settings')
                .select('*')
                .limit(1)
                .single()

            if (data) {
                setSettingsId(data.id)
                setProfile(data.instructor_profile || "")
                setStyle(data.writing_style || "")
            }
            setIsLoading(false)
        }
        load()
    }, [isOpen])

    const save = async () => {
        setIsSaving(true)

        if (settingsId) {
            await supabase
                .from('settings')
                .update({
                    instructor_profile: profile,
                    writing_style: style
                })
                .eq('id', settingsId)
        } else {
            // Create new settings row if none exists
            await supabase
                .from('settings')
                .insert({
                    instructor_profile: profile,
                    writing_style: style
                })
        }

        setIsSaving(false)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-[500px] border border-slate-100">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-serif text-slate-800">Your Persona</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <>
                            {/* Bio */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-2">
                                    <User size={14} /> Who are you?
                                </label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                    rows={3}
                                    placeholder="e.g. I am a busy jazz pianist teaching private lessons. I'm in high demand and don't do sales pitches."
                                    value={profile}
                                    onChange={(e) => setProfile(e.target.value)}
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Tell the AI who you are and your teaching style.
                                </p>
                            </div>

                            {/* Writing Style */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-2">
                                    <PenTool size={14} /> Writing Style
                                </label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                                    rows={4}
                                    placeholder="e.g. No exclamation marks. Use lowercase sometimes. Be blunt. Occasional typos look human."
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    How should the AI write? Include any quirks to sound human.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                    <button
                        onClick={save}
                        disabled={isSaving || isLoading}
                        className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Save Persona
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
