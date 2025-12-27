"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
    X, Send, Bold, Italic, Underline, List, ListOrdered,
    Link, Smile, Undo, Redo, AlignLeft, AlignCenter, AlignRight,
    ChevronDown, Trash2, Minimize2, Maximize2, Paperclip, Save, Loader2,
    FileText, Music, Image as ImageIcon, File
} from "lucide-react"
import type { Student } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"

interface Attachment {
    id?: string
    file_name: string
    file_size: number
    file_type: string
    storage_path: string
    file?: File
}

interface ComposeEmailModalProps {
    isOpen: boolean
    onClose: () => void
    onSend: (content: string, subject: string, attachments?: Attachment[]) => void
    student: Student
    initialContent?: string
    draftId?: string
}

export function ComposeEmailModal({
    isOpen,
    onClose,
    onSend,
    student,
    initialContent = "",
    draftId: initialDraftId
}: ComposeEmailModalProps) {
    const [subject, setSubject] = useState("")
    const [content, setContent] = useState(initialContent)
    const [isMinimized, setIsMinimized] = useState(false)
    const [showCcBcc, setShowCcBcc] = useState(false)
    const [cc, setCc] = useState("")
    const [bcc, setBcc] = useState("")
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [draftId, setDraftId] = useState<string | undefined>(initialDraftId)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const editorRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen && editorRef.current) {
            editorRef.current.innerHTML = initialContent
        }
    }, [isOpen, initialContent])

    useEffect(() => {
        if (isOpen) {
            setContent(initialContent)
            setSubject("")
            setAttachments([])
            setDraftId(initialDraftId)
            setLastSaved(null)
        }
    }, [isOpen, initialContent, initialDraftId])

    // Auto-save draft periodically
    const saveDraft = useCallback(async () => {
        const htmlContent = editorRef.current?.innerHTML || content
        if (!htmlContent.trim() && !subject.trim()) return

        setIsSaving(true)
        try {
            if (draftId) {
                // Update existing draft
                const { error } = await supabase
                    .from('drafts')
                    .update({
                        subject,
                        content: htmlContent,
                        cc,
                        bcc,
                    })
                    .eq('id', draftId)

                if (error) throw error
            } else {
                // Create new draft
                const { data, error } = await supabase
                    .from('drafts')
                    .insert({
                        student_id: student.id,
                        subject,
                        content: htmlContent,
                        cc,
                        bcc,
                    })
                    .select()
                    .single()

                if (error) throw error
                setDraftId(data.id)
            }
            setLastSaved(new Date())
        } catch (error) {
            console.error('Error saving draft:', error)
        } finally {
            setIsSaving(false)
        }
    }, [content, subject, cc, bcc, draftId, student.id])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setIsUploading(true)
        try {
            for (const file of Array.from(files)) {
                // Generate unique path
                const timestamp = Date.now()
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                const storagePath = `${student.id}/${timestamp}_${safeName}`

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(storagePath, file)

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    continue
                }

                // Add to attachments list
                const newAttachment: Attachment = {
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    storage_path: storagePath,
                    file: file
                }

                setAttachments(prev => [...prev, newAttachment])

                // Save to database if we have a draft
                if (draftId) {
                    await supabase.from('attachments').insert({
                        draft_id: draftId,
                        file_name: file.name,
                        file_size: file.size,
                        file_type: file.type,
                        storage_path: storagePath,
                    })
                }
            }
        } catch (error) {
            console.error('Error uploading file:', error)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const removeAttachment = async (index: number) => {
        const attachment = attachments[index]

        // Remove from storage
        try {
            await supabase.storage
                .from('attachments')
                .remove([attachment.storage_path])
        } catch (error) {
            console.error('Error removing file:', error)
        }

        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
        if (type.startsWith('audio/')) return <Music className="w-4 h-4" />
        if (type === 'application/pdf') return <FileText className="w-4 h-4" />
        return <File className="w-4 h-4" />
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    if (!isOpen) return null

    const handleSend = async () => {
        const htmlContent = editorRef.current?.innerHTML || content
        if (htmlContent.trim()) {
            onSend(htmlContent, subject, attachments)

            // Delete draft after sending
            if (draftId) {
                await supabase.from('drafts').delete().eq('id', draftId)
            }

            setContent("")
            setSubject("")
            setAttachments([])
            setDraftId(undefined)
            if (editorRef.current) {
                editorRef.current.innerHTML = ""
            }
            onClose()
        }
    }

    const handleDiscard = async () => {
        // Delete draft and attachments
        if (draftId) {
            // Delete attachments from storage
            for (const attachment of attachments) {
                await supabase.storage.from('attachments').remove([attachment.storage_path])
            }
            await supabase.from('drafts').delete().eq('id', draftId)
        }
        onClose()
    }

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value)
        editorRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl/Cmd + Enter to send
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            handleSend()
        }
        // Ctrl/Cmd + S to save draft
        if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            saveDraft()
        }
    }

    if (isMinimized) {
        return (
            <div className="fixed bottom-0 right-6 w-72 bg-white rounded-t-lg shadow-2xl border border-slate-200 z-50">
                <div
                    className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white rounded-t-lg cursor-pointer"
                    onClick={() => setIsMinimized(false)}
                >
                    <span className="text-sm font-medium truncate">New Message - {student.name}</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                            className="p-1 hover:bg-slate-700 rounded"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="p-1 hover:bg-slate-700 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed bottom-0 right-6 w-[560px] bg-white rounded-t-xl shadow-2xl border border-slate-200 z-50 flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white rounded-t-xl">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">New Message</span>
                    {isSaving && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Saving...
                        </span>
                    )}
                    {lastSaved && !isSaving && (
                        <span className="text-xs text-slate-400">
                            Saved {lastSaved.toLocaleTimeString()}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                        title="Minimize"
                    >
                        <Minimize2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* To Field */}
            <div className="flex items-center px-4 py-2 border-b border-slate-200">
                <span className="text-sm text-slate-500 w-12">To</span>
                <div className="flex-1 flex items-center gap-2">
                    <div className="px-2 py-1 bg-slate-100 rounded text-sm text-slate-700 flex items-center gap-1">
                        {student.name}
                        <span className="text-slate-400">&lt;{student.email}&gt;</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowCcBcc(!showCcBcc)}
                    className="text-sm text-slate-500 hover:text-slate-700"
                >
                    Cc Bcc
                </button>
            </div>

            {/* Cc/Bcc Fields */}
            {showCcBcc && (
                <>
                    <div className="flex items-center px-4 py-2 border-b border-slate-200">
                        <span className="text-sm text-slate-500 w-12">Cc</span>
                        <input
                            type="text"
                            value={cc}
                            onChange={(e) => setCc(e.target.value)}
                            className="flex-1 text-sm text-slate-700 focus:outline-none"
                            placeholder="Add Cc recipients"
                        />
                    </div>
                    <div className="flex items-center px-4 py-2 border-b border-slate-200">
                        <span className="text-sm text-slate-500 w-12">Bcc</span>
                        <input
                            type="text"
                            value={bcc}
                            onChange={(e) => setBcc(e.target.value)}
                            className="flex-1 text-sm text-slate-700 focus:outline-none"
                            placeholder="Add Bcc recipients"
                        />
                    </div>
                </>
            )}

            {/* Subject */}
            <div className="flex items-center px-4 py-2 border-b border-slate-200">
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="flex-1 text-sm text-slate-700 focus:outline-none"
                    placeholder="Subject"
                />
            </div>

            {/* Content Editor */}
            <div
                ref={editorRef}
                contentEditable
                onKeyDown={handleKeyDown}
                className="flex-1 min-h-[160px] max-h-[300px] overflow-y-auto px-4 py-3 text-sm text-slate-700 focus:outline-none"
                style={{ whiteSpace: "pre-wrap" }}
                data-placeholder="Compose your email..."
                onInput={(e) => setContent((e.target as HTMLDivElement).innerHTML)}
            />

            {/* Attachments */}
            {attachments.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
                    <div className="flex flex-wrap gap-2">
                        {attachments.map((attachment, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            >
                                {getFileIcon(attachment.file_type)}
                                <span className="max-w-[120px] truncate text-slate-700">{attachment.file_name}</span>
                                <span className="text-slate-400">{formatFileSize(attachment.file_size)}</span>
                                <button
                                    onClick={() => removeAttachment(index)}
                                    className="p-0.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-200 bg-slate-50 flex-wrap">
                {/* Send Button */}
                <button
                    onClick={handleSend}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Send
                    <ChevronDown className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-slate-300 mx-2" />

                {/* Text Formatting */}
                <button
                    onClick={() => execCommand("bold")}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Bold (Ctrl+B)"
                >
                    <Bold className="w-4 h-4 text-slate-600" />
                </button>
                <button
                    onClick={() => execCommand("italic")}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Italic (Ctrl+I)"
                >
                    <Italic className="w-4 h-4 text-slate-600" />
                </button>
                <button
                    onClick={() => execCommand("underline")}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Underline (Ctrl+U)"
                >
                    <Underline className="w-4 h-4 text-slate-600" />
                </button>

                <div className="w-px h-6 bg-slate-300 mx-1" />

                {/* Alignment */}
                <button
                    onClick={() => execCommand("justifyLeft")}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Align left"
                >
                    <AlignLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button
                    onClick={() => execCommand("justifyCenter")}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Center"
                >
                    <AlignCenter className="w-4 h-4 text-slate-600" />
                </button>
                <button
                    onClick={() => execCommand("justifyRight")}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Align right"
                >
                    <AlignRight className="w-4 h-4 text-slate-600" />
                </button>

                <div className="w-px h-6 bg-slate-300 mx-1" />

                {/* Lists */}
                <button
                    onClick={() => execCommand("insertUnorderedList")}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Bulleted list"
                >
                    <List className="w-4 h-4 text-slate-600" />
                </button>
                <button
                    onClick={() => execCommand("insertOrderedList")}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Numbered list"
                >
                    <ListOrdered className="w-4 h-4 text-slate-600" />
                </button>

                <div className="w-px h-6 bg-slate-300 mx-1" />

                {/* Attachment */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
                    title="Attach files"
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                    ) : (
                        <Paperclip className="w-4 h-4 text-slate-600" />
                    )}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                />

                {/* Link */}
                <button
                    onClick={() => {
                        const url = prompt("Enter URL:")
                        if (url) execCommand("createLink", url)
                    }}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Insert link"
                >
                    <Link className="w-4 h-4 text-slate-600" />
                </button>

                {/* Emoji */}
                <button
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Insert emoji"
                >
                    <Smile className="w-4 h-4 text-slate-600" />
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Save Draft */}
                <button
                    onClick={saveDraft}
                    disabled={isSaving}
                    className="p-2 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
                    title="Save draft (Ctrl+S)"
                >
                    <Save className="w-4 h-4 text-slate-600" />
                </button>

                {/* Undo/Redo */}
                <button
                    onClick={() => execCommand("undo")}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Undo"
                >
                    <Undo className="w-4 h-4 text-slate-600" />
                </button>
                <button
                    onClick={() => execCommand("redo")}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Redo"
                >
                    <Redo className="w-4 h-4 text-slate-600" />
                </button>

                {/* Delete */}
                <button
                    onClick={handleDiscard}
                    className="p-2 hover:bg-red-100 rounded transition-colors"
                    title="Discard draft"
                >
                    <Trash2 className="w-4 h-4 text-slate-600" />
                </button>
            </div>

            {/* Keyboard shortcut hint */}
            <div className="px-4 py-1.5 text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">
                <kbd className="px-1 py-0.5 bg-slate-200 rounded text-slate-600">Ctrl+Enter</kbd> send • <kbd className="px-1 py-0.5 bg-slate-200 rounded text-slate-600">Ctrl+S</kbd> save draft
            </div>
        </div>
    )
}
