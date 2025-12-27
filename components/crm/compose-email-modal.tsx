"use client"

import { useState, useRef, useEffect } from "react"
import {
    X, Send, Bold, Italic, Underline, List, ListOrdered,
    Link, Image, Smile, Undo, Redo, AlignLeft, AlignCenter, AlignRight,
    ChevronDown, Trash2, Minimize2, Maximize2
} from "lucide-react"
import type { Student } from "@/lib/types"

interface ComposeEmailModalProps {
    isOpen: boolean
    onClose: () => void
    onSend: (content: string, subject: string) => void
    student: Student
    initialContent?: string
}

export function ComposeEmailModal({
    isOpen,
    onClose,
    onSend,
    student,
    initialContent = ""
}: ComposeEmailModalProps) {
    const [subject, setSubject] = useState("")
    const [content, setContent] = useState(initialContent)
    const [isMinimized, setIsMinimized] = useState(false)
    const [showCcBcc, setShowCcBcc] = useState(false)
    const [cc, setCc] = useState("")
    const [bcc, setBcc] = useState("")
    const editorRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen && editorRef.current) {
            editorRef.current.innerHTML = initialContent
        }
    }, [isOpen, initialContent])

    useEffect(() => {
        if (isOpen) {
            setContent(initialContent)
            setSubject("")
        }
    }, [isOpen, initialContent])

    if (!isOpen) return null

    const handleSend = () => {
        const htmlContent = editorRef.current?.innerHTML || content
        if (htmlContent.trim()) {
            onSend(htmlContent, subject)
            setContent("")
            setSubject("")
            if (editorRef.current) {
                editorRef.current.innerHTML = ""
            }
            onClose()
        }
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
                <span className="text-sm font-medium">New Message</span>
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
                className="flex-1 min-h-[200px] max-h-[400px] overflow-y-auto px-4 py-3 text-sm text-slate-700 focus:outline-none"
                style={{ whiteSpace: "pre-wrap" }}
                data-placeholder="Compose your email..."
                onInput={(e) => setContent((e.target as HTMLDivElement).innerHTML)}
            />

            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-200 bg-slate-50">
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
                    onClick={onClose}
                    className="p-2 hover:bg-red-100 rounded transition-colors"
                    title="Discard draft"
                >
                    <Trash2 className="w-4 h-4 text-slate-600" />
                </button>
            </div>

            {/* Keyboard shortcut hint */}
            <div className="px-4 py-1.5 text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">
                Press <kbd className="px-1 py-0.5 bg-slate-200 rounded text-slate-600">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-slate-200 rounded text-slate-600">Enter</kbd> to send
            </div>
        </div>
    )
}
