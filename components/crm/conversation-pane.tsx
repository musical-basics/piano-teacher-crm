"use client"
import type React from "react"
import { supabase } from "@/lib/supabaseClient"
import { Send, Paperclip, Eye, Sprout, Maximize2, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import type { Student } from "@/lib/types"
import { formatTime } from "@/lib/date-utils"
import { ComposeEmailModal } from "./compose-email-modal"
import { SeedMessageModal } from "./seed-message-modal"
import { generateReplyChainHtml } from "@/lib/reply-chain"

interface ConversationPaneProps {
  student: Student
  onSendMessage: (content: string, subject?: string) => void
}

export function ConversationPane({ student, onSendMessage }: ConversationPaneProps) {
  const [message, setMessage] = useState("")
  const [viewingOriginal, setViewingOriginal] = useState<string | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isSeedOpen, setIsSeedOpen] = useState(false)

  // New state to show loading during send
  const [isSending, setIsSending] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const [status, setStatus] = useState(student.status || 'Lead')

  // --- FIX: Reset status when student changes ---
  useEffect(() => {
    setStatus(student.status || 'Lead')
  }, [student])

  // COLOR MAPPING
  const statusColors: Record<string, string> = {
    Lead: "bg-slate-100 text-slate-600 border-slate-200",
    Discussion: "bg-blue-50 text-blue-600 border-blue-200",
    Trial: "bg-amber-50 text-amber-600 border-amber-200",
    Active: "bg-emerald-50 text-emerald-600 border-emerald-200",
    Inactive: "bg-red-50 text-red-600 border-red-200",
  }

  const handleStatusChange = async (newStatus: any) => {
    setStatus(newStatus) // Update UI instantly

    // Update Database
    const { error } = await supabase
      .from('crm_students')
      .update({ status: newStatus })
      .eq('id', student.id)

    if (error) {
      console.error("Failed to update status:", error)
      alert("Failed to save status")
    }
  }

  const handleSyncEmails = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/email/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentEmail: student.email
        })
      })

      const data = await res.json()

      if (data.count > 0) {
        // If we found new emails, reload the page to show them
        window.location.reload()
      } else {
        // Optional: Show a tiny toast saying "Up to date"
        console.log("No new emails found")
      }
    } catch (err) {
      console.error("Sync failed", err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleOpenCompose = () => {
    if (message.trim()) {
      setIsComposeOpen(true)
    }
  }

  // --- THE FIX: Call the API Route ---
  const handleSendEmail = async (content: string, subject: string, attachments: any[], cleanContent?: string) => {
    if (!content.trim()) return

    setIsSending(true)

    try {
      // 1. Call the Gmail API Route (This sends the real email)
      // Add a 15-second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 15000)
      );

      const fetchPromise = fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: student.email,
          subject: subject || "Re: Piano Lessons", // Fallback subject
          htmlContent: content,
          cleanContent: cleanContent || content, // Pass clean content for DB
          studentId: student.id, // Use this ID to save to DB automatically
          attachments: attachments // Pass attachments to the API
        })
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      // 2. Success! Update UI
      // (The API route already saved it to Supabase, but we update locally to see it instantly)
      // Use cleanContent for the local UI update too!
      onSendMessage(cleanContent || content, subject)

      // Clear inputs
      setMessage("")

    } catch (err: any) {
      console.error("Failed to send message:", err)
      alert(`Error sending email: ${err.message}`)
    } finally {
      setIsSending(false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message? This cannot be undone.")) return

    const { error } = await supabase.from('crm_messages').delete().eq('id', messageId)

    if (error) {
      console.error("Failed to delete message:", error)
      alert("Failed to delete message")
    } else {
      // Reload to refresh the list (simplest way to re-sync props)
      window.location.reload()
    }
  }

  const handleQuickSend = async () => {
    if (!message.trim()) return

    // Generate reply chain for quick send (same as full compose)
    const replyChainHtml = student.messages.length > 0
      ? generateReplyChainHtml(student.messages, {
        studentName: student.name,
        studentEmail: student.email,
        maxMessages: 10
      })
      : ""

    const fullContent = replyChainHtml ? message + replyChainHtml : message
    await handleSendEmail(fullContent, `Re: Piano Lessons - ${student.name}`, [], message)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift sends message (Quick Send)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleQuickSend()
    }
    // Shift+Enter allows new line
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-serif text-slate-800">{student.name}</h2>
            <span className="text-xl">{student.countryFlag}</span>

            {/* STATUS DROPDOWN */}
            <div className="relative group">
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all ${statusColors[status] || statusColors['Lead']}`}
              >
                <option value="Lead">New Lead</option>
                <option value="Discussion">In Discussion</option>
                <option value="Trial">Scheduled Trial</option>
                <option value="Active">Active Student</option>
                <option value="Inactive">Inactive</option>
              </select>
              {/* Custom Arrow Icon Overlay */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

          </div>
          <p className="text-sm text-slate-500 mt-1">{student.email}</p>
        </div>

        {/* SYNC BUTTON */}
        <button
          onClick={handleSyncEmails}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors border border-slate-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-indigo-500" : ""}`} />
          {isSyncing ? "Checking..." : "Check for Replies"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {student.messages.map((msg) => {
          const isInstructor = msg.sender === "instructor"
          return (
            <div key={msg.id} className={`flex ${isInstructor ? "justify-end" : "justify-start"}`}>
              <div className="group relative max-w-[70%]">
                <div
                  className={`px-5 py-3 rounded-3xl ${isInstructor ? "bg-indigo-600 text-white" : "bg-white text-slate-700 shadow-sm"
                    }`}
                >
                  {isInstructor ? (
                    // Instructor messages: render as HTML (from rich text editor)
                    <div
                      className="text-sm leading-relaxed text-white"
                      dangerouslySetInnerHTML={{ __html: msg.content }}
                    />
                  ) : (
                    // Student messages: plain text with linkification
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-700">
                      {msg.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                        if (part.match(/https?:\/\/[^\s]+/)) {
                          return (
                            <a
                              key={i}
                              href={part}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-blue-500 hover:text-blue-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {part}
                            </a>
                          )
                        }
                        return part
                      })}
                    </div>
                  )}
                  <p className={`text-xs mt-2 ${isInstructor ? "text-indigo-200" : "text-slate-400"}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
                {!isInstructor && (
                  <>
                    <button
                      onClick={() => setViewingOriginal(viewingOriginal === msg.id ? null : msg.id)}
                      className={`absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${viewingOriginal === msg.id
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-slate-200 text-slate-500 opacity-0 group-hover:opacity-100"
                        } hover:bg-indigo-100 hover:text-indigo-600`}
                      title="View original email"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="absolute -right-16 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all bg-slate-200 text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 bg-white shadow-sm border border-slate-100"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                {isInstructor && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all bg-slate-200 text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 bg-white shadow-sm border border-slate-100"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
        <div className="flex items-start gap-3">
          <button
            onClick={() => setIsSeedOpen(true)}
            className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors flex-shrink-0 border border-emerald-100"
            title="Input Seed Message (Paste original inquiry)"
          >
            <Sprout className="w-5 h-5" />
          </button>

          <button
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-colors flex-shrink-0"
            title="Attach file (PDF, MP3, etc.)"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              placeholder="Write a reply... (Shift+Enter for new line)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="w-full px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all resize-none min-h-[48px] max-h-[120px]"
              style={{
                height: 'auto',
                overflow: message.split('\n').length > 3 ? 'auto' : 'hidden'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
          </div>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-colors flex-shrink-0"
            title="Open full composer"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleQuickSend}
            disabled={!message.trim() || isSending}
            className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Send reply"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 ml-14">
          Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600 font-mono">Enter</kbd> to quick send • <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600 font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>

      {/* Compose Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        student={student}
        messages={student.messages} // Pass messages for reply chain
        initialContent={message} // Pass quick response text
        onSend={handleSendEmail} // Pass the API-connected function here
      />

      <SeedMessageModal
        isOpen={isSeedOpen}
        onClose={() => setIsSeedOpen(false)}
        studentId={student.id}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </div>
  )
}
