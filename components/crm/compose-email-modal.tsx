"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import {
    X, Send, Bold, Italic, Underline, List, ListOrdered,
    Link, Smile, Undo, Redo, AlignLeft, AlignCenter, AlignRight,
    Minimize2, Maximize2, Paperclip, Save, Loader2, Trash2,
    File, Image as ImageIcon, Music, FileText, ChevronDown
} from "lucide-react"
import type { Student } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"

interface Attachment {
    id?: string
    file_name: string
    file_size: number
    file_type: string
    storage_path: string
}

interface ComposeEmailModalProps {
    isOpen: boolean
    onClose: () => void
    student: Student
}

export function ComposeEmailModal({ isOpen, onClose, student }: ComposeEmailModalProps) {
    // --- STATE ---
    const [subject, setSubject] = useState("")
    const [content, setContent] = useState("") // HTML content
    const [draftId, setDraftId] = useState<string | null>(null)
    const [attachments, setAttachments] = useState<Attachment[]>([])

    // --- UI STATE ---
    const [isMinimized, setIsMinimized] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isLoadingDraft, setIsLoadingDraft] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)

    const editorRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // --- 1. LOAD DRAFT ON OPEN (The Logic Fix) ---
    useEffect(() => {
        if (!isOpen || !student.id) return

        const loadDraft = async () => {
            setIsLoadingDraft(true)

            // Fetch existing draft for this student (get the most recent one)
            const { data } = await supabase
                .from('drafts')
                .select('*')
                .eq('student_id', student.id)
                .order('updated_at', { ascending: false })
                .limit(1)

            const draft = data && data.length > 0 ? data[0] : null

            if (draft) {
                // Draft found! Fill the UI
                setDraftId(draft.id)
                setSubject(draft.subject || "")
                setContent(draft.content || "")
                if (editorRef.current) {
                    editorRef.current.innerHTML = draft.content || ""
                }
                setLastSaved(new Date(draft.updated_at))
            } else {
                // No draft? Clear the UI
                setDraftId(null)
                setSubject("")
                setContent("")
                setAttachments([])
                if (editorRef.current) editorRef.current.innerHTML = ""
                setLastSaved(null)
            }
            setIsLoadingDraft(false)
        }

        loadDraft()
    }, [isOpen, student.id])

    // --- 2. EDITOR COMMANDS (Toolbar Logic) ---
    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value)
        editorRef.current?.focus()
    }

    // --- 3. SAVE LOGIC ---
    const saveDraft = useCallback(async () => {
        const htmlContent = editorRef.current?.innerHTML || content
        // Don't save empty/blank drafts
        if (!htmlContent.trim() && !subject.trim()) return

        setIsSaving(true)
        try {
            const draftData = {
                student_id: student.id,
                subject,
                content: htmlContent,
                updated_at: new Date().toISOString()
            }


            let currentDraftId = draftId

            if (currentDraftId) {
                await supabase.from('drafts').update(draftData).eq('id', currentDraftId)
            } else {
                const { data } = await supabase.from('drafts').insert(draftData).select().single()
                if (data) {
                    setDraftId(data.id)
                    currentDraftId = data.id
                }
            }
            setLastSaved(new Date())
        } catch (error) {
            console.error('Save failed:', error)
        } finally {
            setIsSaving(false)
        }
    }, [content, subject, draftId, student.id])

    // --- 4. ATTACHMENT LOGIC ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return

        // Ensure we have a draft ID first
        if (!draftId) await saveDraft()

        setIsUploading(true)
        const file = e.target.files[0]
        const filePath = `${student.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

        try {
            const { error: uploadErr } = await supabase.storage.from('attachments').upload(filePath, file)
            if (uploadErr) throw uploadErr

            // Add to UI
            const newAtt = {
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                storage_path: filePath
            }
            setAttachments(prev => [...prev, newAtt])

            // You would typically save this link to DB here if your schema requires it
        } catch (err) {
            console.error(err)
        } finally {
            setIsUploading(false)
        }
    }

    // --- RENDER ---
    if (!isOpen && !isMinimized) return null

    return (
        <div className={`fixed bottom-0 right-8 bg-white shadow-2xl border border-slate-200 rounded-t-xl z-50 flex flex-col font-sans transition-all duration-300
            ${isMinimized ? 'w-72 h-12' : 'w-[600px] h-[650px]'}`}
        >
            {/* --- HEADER --- */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-xl cursor-pointer"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">New Message</span>
                    {isSaving && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                    {!isSaving && lastSaved && <span className="text-[10px] text-slate-400">Saved</span>}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }} className="p-1 hover:bg-slate-700 rounded">
                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                    <button onClick={async (e) => { e.stopPropagation(); await saveDraft(); onClose() }} className="p-1 hover:bg-slate-700 rounded">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* --- BODY --- */}
            {!isMinimized && (
                <div className="flex-1 flex flex-col relative">
                    {isLoadingDraft && (
                        <div className="absolute inset-0 bg-white/90 z-10 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="px-4 py-2 border-b border-slate-100 flex flex-col gap-1 bg-slate-50/50">
                        <div className="flex items-center text-sm">
                            <span className="text-slate-500 w-16 text-xs font-bold uppercase tracking-wider">To</span>
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
                                {student.name}
                            </span>
                        </div>
                        <div className="flex items-center text-sm">
                            <span className="text-slate-500 w-16 text-xs font-bold uppercase tracking-wider">Subject</span>
                            <input
                                className="flex-1 bg-transparent focus:outline-none text-slate-800 font-medium placeholder-slate-300"
                                placeholder="Subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                onBlur={saveDraft}
                            />
                        </div>
                    </div>

                    {/* Rich Text Editor */}
                    <div
                        ref={editorRef}
                        contentEditable
                        className="flex-1 p-5 focus:outline-none text-slate-700 leading-relaxed overflow-y-auto text-sm"
                        onInput={(e) => setContent(e.currentTarget.innerHTML)}
                        onBlur={saveDraft}
                        style={{ whiteSpace: "pre-wrap" }}
                    />

                    {/* Attachments Area */}
                    {attachments.length > 0 && (
                        <div className="px-4 py-2 flex flex-wrap gap-2 bg-slate-50 border-t border-slate-100">
                            {attachments.map((file, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs shadow-sm">
                                    <Paperclip size={12} className="text-indigo-400" />
                                    <span className="max-w-[120px] truncate font-medium text-slate-600">{file.file_name}</span>
                                    <button className="text-slate-300 hover:text-red-500"><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- THE TOOLBAR (Gmail Style) --- */}
                    <div className="p-2 border-t border-slate-200 bg-white flex flex-col gap-2">

                        {/* Send & Trash Row */}
                        <div className="flex items-center justify-between mb-1 px-1">
                            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-md shadow-indigo-200 transition-all">
                                Send <Send size={14} />
                            </button>
                            <button
                                onClick={async () => {
                                    if (draftId) await supabase.from('drafts').delete().eq('id', draftId);
                                    onClose();
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Formatting Row */}
                        <div className="flex items-center gap-1 flex-wrap">
                            <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-100">
                                <ToolbarBtn icon={<Bold size={14} />} onClick={() => execCommand('bold')} title="Bold" />
                                <ToolbarBtn icon={<Italic size={14} />} onClick={() => execCommand('italic')} title="Italic" />
                                <ToolbarBtn icon={<Underline size={14} />} onClick={() => execCommand('underline')} title="Underline" />
                            </div>

                            <div className="w-px h-6 bg-slate-200 mx-1" />

                            <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-100">
                                <ToolbarBtn icon={<AlignLeft size={14} />} onClick={() => execCommand('justifyLeft')} title="Align Left" />
                                <ToolbarBtn icon={<AlignCenter size={14} />} onClick={() => execCommand('justifyCenter')} title="Align Center" />
                                <ToolbarBtn icon={<AlignRight size={14} />} onClick={() => execCommand('justifyRight')} title="Align Right" />
                            </div>

                            <div className="w-px h-6 bg-slate-200 mx-1" />

                            <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-100">
                                <ToolbarBtn icon={<List size={14} />} onClick={() => execCommand('insertUnorderedList')} title="Bullet List" />
                                <ToolbarBtn icon={<ListOrdered size={14} />} onClick={() => execCommand('insertOrderedList')} title="Number List" />
                            </div>

                            <div className="flex-1" />

                            {/* Attach Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors relative"
                                title="Attach File"
                            >
                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} multiple />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Helper for cleaner buttons
function ToolbarBtn({ icon, onClick, title }: { icon: React.ReactNode, onClick: () => void, title: string }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
        >
            {icon}
        </button>
    )
}
