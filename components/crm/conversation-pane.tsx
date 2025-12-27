"use client"

import type React from "react"

import { Send, Paperclip, Eye } from "lucide-react"
import { useState } from "react"
import type { Student } from "@/lib/types"
import { formatTime } from "@/lib/date-utils"

interface ConversationPaneProps {
  student: Student
  onSendMessage: (content: string) => void
}

export function ConversationPane({ student, onSendMessage }: ConversationPaneProps) {
  const [message, setMessage] = useState("")
  const [viewingOriginal, setViewingOriginal] = useState<string | null>(null)

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-serif text-slate-800">{student.name}</h2>
          <span className="text-xl">{student.countryFlag}</span>
        </div>
        <p className="text-sm text-slate-500 mt-1">{student.email}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {student.messages.map((msg) => {
          const isInstructor = msg.sender === "instructor"

          return (
            <div key={msg.id} className={`flex ${isInstructor ? "justify-end" : "justify-start"}`}>
              <div className="group relative max-w-[70%]">
                <div
                  className={`px-5 py-3 rounded-3xl ${
                    isInstructor ? "bg-indigo-600 text-white" : "bg-white text-slate-700 shadow-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-xs mt-2 ${isInstructor ? "text-indigo-200" : "text-slate-400"}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
                {!isInstructor && (
                  <button
                    onClick={() => setViewingOriginal(viewingOriginal === msg.id ? null : msg.id)}
                    className={`absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      viewingOriginal === msg.id
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-slate-200 text-slate-500 opacity-0 group-hover:opacity-100"
                    } hover:bg-indigo-100 hover:text-indigo-600`}
                    title="View original email"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                {viewingOriginal === msg.id && (
                  <div className="mt-2 p-3 bg-slate-100 rounded-xl text-xs text-slate-600 font-mono whitespace-pre-wrap border border-slate-200">
                    <div className="text-slate-400 mb-2">--- Original Email ---</div>
                    {msg.content}
                    {"\n\n"}---{"\n"}
                    {student.name}
                    {"\n"}
                    Sent from my iPhone
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-8 py-5">
        <div className="flex items-center gap-3">
          <button
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Attach file (PDF, MP3, etc.)"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            placeholder="Write a reply..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
