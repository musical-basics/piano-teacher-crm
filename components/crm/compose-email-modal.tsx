"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import {
    X, Minus, Send, Bold, Italic, Underline, List, ListOrdered,
    Link, Minimize2, Maximize2, Paperclip, Loader2, Trash2, Image as ImageIcon, FolderOpen
} from "lucide-react"
import type { Student, Message } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"
import { AssetManager, Asset } from "./asset-manager"
import { generateReplyChainHtml } from "@/lib/reply-chain"

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
    messages?: Message[] // Conversation history for reply chain
    initialContent?: string // Text to pre-fill (e.g. from quick response)
    onSend?: (content: string, subject: string, attachments: Attachment[], cleanContent?: string) => Promise<void>
}

export function ComposeEmailModal({ isOpen, onClose, student, messages = [], initialContent = "", onSend }: ComposeEmailModalProps) {
    // --- STATE ---
    const [subject, setSubject] = useState("Re: Lesson Follow-up")
    const [content, setContent] = useState("")
    const [replyChainHtml, setReplyChainHtml] = useState("")
    const [draftId, setDraftId] = useState<string | null>(null)
    const [attachments, setAttachments] = useState<Attachment[]>([])

    // Asset Manager State
    const [showAssetManager, setShowAssetManager] = useState(false)
    const savedContentRef = useRef<string>("") // Save content before opening asset manager

    // --- UI STATE ---
    const [isMinimized, setIsMinimized] = useState(false)
    const [isMaximized, setIsMaximized] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isLoadingDraft, setIsLoadingDraft] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)

    const editorRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const attachmentInputRef = useRef<HTMLInputElement>(null)
    // Ref to track cursor position for image insertion
    const selectionRangeRef = useRef<Range | null>(null)

    // --- 1. LOAD DRAFT OR INITIAL CONTENT ON OPEN ---
    useEffect(() => {
        if (!isOpen || !student.id) return

        // If we have initial content passed (e.g. from quick response), use that
        if (initialContent && initialContent.trim() !== "") {
            setDraftId(null) // Treat as new draft
            setSubject("Re: Lesson Follow-up")
            setContent(initialContent)
            setAttachments([])
            if (editorRef.current) {
                editorRef.current.innerHTML = initialContent
            }
            setLastSaved(null)
            return
        }

        const loadDraft = async () => {
            setIsLoadingDraft(true)
            try {
                const { data, error } = await supabase
                    .from('drafts')
                    .select('*')
                    .eq('student_id', student.id)
                    .order('updated_at', { ascending: false })
                    .limit(1)

                if (error) throw error

                const draft = data && data.length > 0 ? data[0] : null

                if (draft) {
                    setDraftId(draft.id)
                    setSubject(draft.subject || "Re: Lesson Follow-up")
                    setContent(draft.content || "")
                    if (editorRef.current) {
                        editorRef.current.innerHTML = draft.content || ""
                    }
                    setLastSaved(new Date(draft.updated_at))
                } else {
                    setDraftId(null)
                    setSubject("Re: Lesson Follow-up")
                    setContent("")
                    setAttachments([])
                    if (editorRef.current) editorRef.current.innerHTML = ""
                    setLastSaved(null)
                }
            } catch (error) {
                console.error("Failed to load draft:", error)
            } finally {
                setIsLoadingDraft(false)
            }
        }

        loadDraft()
    }, [isOpen, student.id])

    // --- GENERATE REPLY CHAIN WHEN MODAL OPENS ---
    useEffect(() => {
        if (!isOpen || messages.length === 0) {
            setReplyChainHtml("")
            return
        }

        const chainHtml = generateReplyChainHtml(messages, {
            studentName: student.name,
            studentEmail: student.email,
            maxMessages: 10
        })
        setReplyChainHtml(chainHtml)
    }, [isOpen, messages, student.name, student.email])

    // --- 2. EDITOR COMMANDS ---
    const execCommand = (command: string, value?: string) => {
        // Restore selection if we lost it (e.g. clicking a toolbar button)
        restoreSelection()
        document.execCommand(command, false, value)
        editorRef.current?.focus()
    }

    // Save selection whenever the user clicks or types in the editor
    const saveSelection = () => {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
            selectionRangeRef.current = sel.getRangeAt(0)
        }
    }

    const restoreSelection = () => {
        if (selectionRangeRef.current) {
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(selectionRangeRef.current)
        }
    }

    // --- 3. SAVE LOGIC ---
    const saveDraft = useCallback(async () => {
        const htmlContent = editorRef.current?.innerHTML || content
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
        if (!draftId) await saveDraft()

        setIsUploading(true)
        const file = e.target.files[0]
        const filePath = `${student.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

        try {
            const { error: uploadErr } = await supabase.storage.from('attachments').upload(filePath, file)
            if (uploadErr) throw uploadErr

            setAttachments(prev => [...prev, {
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                storage_path: filePath
            }])
        } catch (err) {
            console.error(err)
        } finally {
            setIsUploading(false)
        }
    }

    // --- 5. INLINE IMAGE HANDLING ---
    const uploadInlineImage = async (file: File) => {
        setIsUploading(true)
        const filePath = `${student.id}/inline_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

        try {
            const { error: uploadErr } = await supabase.storage.from('attachments').upload(filePath, file)
            if (uploadErr) throw uploadErr

            const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(filePath)

            restoreSelection()
            document.execCommand('insertHTML', false, `<img src="${urlData.publicUrl}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;" /><br/>`)

        } catch (err) {
            console.error("Failed to upload inline image:", err)
            alert("Failed to insert image. Please try again.")
        } finally {
            setIsUploading(false)
        }
    }

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                e.preventDefault()
                const file = items[i].getAsFile()
                if (file) await uploadInlineImage(file)
                return
            }
        }
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        const files = e.dataTransfer.files
        if (files.length > 0 && files[0].type.startsWith("image/")) {
            await uploadInlineImage(files[0])
        }
    }

    // --- 6. ASSET MANAGER HANDLER ---
    const openAssetManager = () => {
        // Save current editor content before opening overlay
        if (editorRef.current) {
            savedContentRef.current = editorRef.current.innerHTML
        }
        setShowAssetManager(true)
    }

    const handleInsertAsset = (asset: Asset, variant: 'small' | 'original' = 'original') => {
        // Close the asset manager first
        setShowAssetManager(false)

        // Use setTimeout to ensure the overlay is closed and editor is visible
        setTimeout(() => {
            if (asset.file_type.startsWith('image/')) {
                // "Small" means 300px width. "Original" is 100% width (max).
                const style = variant === 'small'
                    ? "max-width: 300px; height: auto; border-radius: 8px; margin: 10px 0; display: block;"
                    : "max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block;"

                const imgHtml = `<img src="${asset.public_url}" style="${style}" /><br/>`

                // Use saved content + new image
                if (editorRef.current) {
                    const newContent = savedContentRef.current + imgHtml
                    editorRef.current.innerHTML = newContent
                    setContent(newContent)
                    // Move cursor to end
                    editorRef.current.focus()
                    const range = document.createRange()
                    range.selectNodeContents(editorRef.current)
                    range.collapse(false)
                    const sel = window.getSelection()
                    sel?.removeAllRanges()
                    sel?.addRange(range)
                }
            } else {
                // Insert as Attachment (PDF, etc)
                // Also restore the content for non-image assets
                if (editorRef.current) {
                    editorRef.current.innerHTML = savedContentRef.current
                }
                setAttachments(prev => [...prev, {
                    file_name: asset.file_name,
                    file_size: asset.file_size,
                    file_type: asset.file_type,
                    storage_path: asset.storage_path
                }])
            }
        }, 50)
    }

    // --- CLEANUP ---
    const handleDiscard = async () => {
        if (draftId) await supabase.from('drafts').delete().eq('id', draftId)
        onClose()
    }

    const handleClose = async () => {
        await saveDraft()
        onClose()
    }

    const handleSendAction = async () => {
        if (!onSend) return
        setIsSending(true)
        try {
            // Append reply chain to the content when sending
            const fullContent = replyChainHtml
                ? content + replyChainHtml
                : content

            // Pass both full HTML (for email) and clean content (for DB)
            await onSend(fullContent, subject, attachments, content)
            if (draftId) {
                await supabase.from('drafts').delete().eq('id', draftId)
            }
            onClose()
        } catch (error) {
            console.error("Failed to send:", error)
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSendAction()
        }
    }

    // --- RENDER ---
    if (!isOpen && !isMinimized) return null

    if (isMinimized) {
        return (
            <div className="fixed bottom-0 right-6 w-72 bg-white rounded-t-xl shadow-2xl border border-slate-200 z-50">
                <div
                    className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-t-xl cursor-pointer"
                    onClick={() => setIsMinimized(false)}
                >
                    <span className="text-sm font-medium text-white truncate">
                        New Message - {student.name}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(false) }}
                            className="w-6 h-6 rounded hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleClose() }}
                            className="w-6 h-6 rounded hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-end p-6">
            {/* Modal - Docked to bottom right */}
            <div
                className={`pointer-events-auto relative bg-white rounded-t-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 border border-slate-200 ${isMaximized ? "w-[90vw] h-[80vh]" : "w-[600px] h-[600px]"
                    }`}
            >
                {/* --- ASSET MANAGER OVERLAY --- */}
                {showAssetManager ? (
                    <div className="absolute inset-0 z-20 bg-white flex flex-col">
                        <AssetManager
                            onInsert={handleInsertAsset}
                            onClose={() => setShowAssetManager(false)}
                        />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 rounded-t-xl">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">New Message</span>
                                {isSaving && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                                {!isSaving && lastSaved && (
                                    <span className="text-[10px] text-slate-400">Saved</span>
                                )}
                                {isUploading && (
                                    <span className="text-[10px] text-indigo-300 flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsMinimized(true)}
                                    className="w-7 h-7 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                                    title="Minimize"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsMaximized(!isMaximized)}
                                    className="w-7 h-7 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                                    title={isMaximized ? "Restore" : "Maximize"}
                                >
                                    {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="w-7 h-7 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Loading Overlay */}
                        {isLoadingDraft && (
                            <div className="absolute inset-0 bg-white/90 z-10 flex items-center justify-center rounded-2xl">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            </div>
                        )}

                        {/* To field */}
                        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                            <span className="text-sm text-slate-400 w-16">To</span>
                            <div className="flex-1 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
                                    {student.name}
                                    <button className="w-4 h-4 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            </div>
                        </div>

                        {/* Subject field */}
                        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                            <span className="text-sm text-slate-400 w-16">Subject</span>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                onBlur={saveDraft}
                                placeholder="Subject"
                                className="flex-1 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none"
                            />
                        </div>

                        {/* Body - Rich Text Editor */}
                        <div className="flex-1 p-5 overflow-hidden">
                            <div
                                ref={editorRef}
                                contentEditable
                                onKeyDown={handleKeyDown}
                                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                                onBlur={saveDraft}
                                onPaste={handlePaste}
                                onDrop={handleDrop}
                                onMouseUp={saveSelection}
                                onKeyUp={saveSelection}
                                data-placeholder="Write your message... (Paste images directly!)"
                                className="w-full h-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none leading-relaxed overflow-y-auto"
                                style={{ whiteSpace: "pre-wrap" }}
                            />
                        </div>

                        {/* Attachments Area */}
                        {attachments.length > 0 && (
                            <div className="px-5 py-2 flex flex-wrap gap-2 border-t border-slate-100">
                                {attachments.map((file, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full text-xs">
                                        <Paperclip className="w-3 h-3 text-slate-400" />
                                        <span className="max-w-[120px] truncate text-slate-600">{file.file_name}</span>
                                        <button
                                            className="text-slate-400 hover:text-red-500"
                                            onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Footer toolbar */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-1">
                                {/* Send button */}
                                <button
                                    onClick={handleSendAction}
                                    disabled={!content.trim() || isSending || isUploading}
                                    className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSending ? (
                                        <>Sending... <Loader2 className="w-4 h-4 animate-spin" /></>
                                    ) : (
                                        <>Send <Send className="w-4 h-4" /></>
                                    )}
                                </button>

                                {/* Formatting tools */}
                                <div className="flex items-center ml-3 pl-3 border-l border-slate-200">
                                    <button onClick={() => execCommand('bold')} className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors" title="Bold">
                                        <Bold className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => execCommand('italic')} className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors" title="Italic">
                                        <Italic className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => execCommand('underline')} className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors" title="Underline">
                                        <Underline className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => {
                                        const url = prompt("Enter URL:")
                                        if (url) execCommand('createLink', url)
                                    }} className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors" title="Insert Link">
                                        <Link className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => execCommand('insertUnorderedList')} className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors" title="Bullet List">
                                        <List className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => execCommand('insertOrderedList')} className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors" title="Numbered List">
                                        <ListOrdered className="w-4 h-4" />
                                    </button>

                                    {/* Insert Image Button */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                                        title="Insert Image"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                uploadInlineImage(e.target.files[0])
                                            }
                                        }}
                                    />

                                    {/* Asset Library Button */}
                                    <button
                                        onClick={openAssetManager}
                                        className="w-8 h-8 rounded-lg hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors"
                                        title="Open Asset Library"
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {/* Attach */}
                                <button
                                    onClick={() => attachmentInputRef.current?.click()}
                                    className="w-9 h-9 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                                    title="Attach files"
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Paperclip className="w-5 h-5" />
                                    )}
                                </button>
                                <input
                                    ref={attachmentInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    multiple
                                />

                                {/* Delete */}
                                <button
                                    onClick={handleDiscard}
                                    className="w-9 h-9 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                                    title="Discard draft"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
