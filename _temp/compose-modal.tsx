"use client"

import type React from "react"
import { useState } from "react"
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  ListOrdered,
  Paperclip,
  Trash2,
  Send,
} from "lucide-react"
import type { Student } from "@/lib/types"

interface ComposeModalProps {
  student: Student
  initialMessage?: string
  onSend: (content: string, subject: string) => void
  onClose: () => void
}

export function ComposeModal({ student, initialMessage = "", onSend, onClose }: ComposeModalProps) {
  const [subject, setSubject] = useState(`Re: Lesson Follow-up`)
  const [body, setBody] = useState(initialMessage)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  const handleSend = () => {
    if (body.trim()) {
      onSend(body.trim(), subject)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-6 w-72 bg-white rounded-t-xl shadow-2xl border border-slate-200 z-50">
        <div
          className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-t-xl cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <span className="text-sm font-medium text-white truncate">New Message - {student.name}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsMinimized(false)
              }}
              className="w-6 h-6 rounded hover:bg-slate-700 flex items-center justify-center text-slate-300"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized ? "w-[90vw] h-[90vh]" : "w-[600px] h-[500px]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 rounded-t-2xl">
          <span className="text-sm font-medium text-white">New Message</span>
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
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

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
            placeholder="Subject"
            className="flex-1 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none"
          />
        </div>

        {/* Body */}
        <div className="flex-1 p-5 overflow-hidden">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your message..."
            className="w-full h-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
            autoFocus
          />
        </div>

        {/* Footer toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1">
            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!body.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
              <Send className="w-4 h-4" />
            </button>

            {/* Formatting tools */}
            <div className="flex items-center ml-3 pl-3 border-l border-slate-200">
              <button className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <Bold className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <Italic className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <Underline className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <Link className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <List className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Attach */}
            <button
              className="w-9 h-9 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            {/* Delete */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              title="Discard draft"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
