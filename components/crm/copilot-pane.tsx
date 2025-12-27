"use client"

import { Sparkles, Globe, Pencil, Send, Loader2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import type { Student } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface CopilotPaneProps {
  student: Student
  onEditStudent?: () => void
}

export function CopilotPane({ student, onEditStudent }: CopilotPaneProps) {
  const [inputMessage, setInputMessage] = useState("")
  const [strategy, setStrategy] = useState(student.instructorNotes || "")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Reset state when student changes
  useEffect(() => {
    setStrategy(student.instructorNotes || "")
    setMessages([])
    setInputMessage("")
  }, [student.id])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Save strategy to Supabase when user clicks away
  const handleStrategySave = async () => {
    if (strategy === student.instructorNotes) return // No changes

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("students")
        .update({ instructor_strategy: strategy })
        .eq("id", student.id)

      if (error) {
        console.error("Error saving strategy:", error)
      }
    } catch (error) {
      console.error("Error saving strategy:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Send message to Gemini API
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage("")

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          studentId: student.id,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ])
      }
    } catch (error) {
      console.error("Error calling Gemini:", error)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Generate initial greeting based on student context
  const getInitialGreeting = () => {
    const hasStrategy = strategy.trim().length > 0
    const strategyPreview = hasStrategy
      ? ` I'll apply your strategy: "${strategy.slice(0, 60)}${strategy.length > 60 ? "..." : ""}"`
      : ""

    if (student.tags.includes("Performance Anxiety")) {
      return `I've analyzed ${student.name}'s profile. They may need extra encouragement about their recital.${strategyPreview} How can I help?`
    }
    if (student.tags.includes("Parent")) {
      return `${student.name} is a parent inquiring about lessons.${strategyPreview} I can help you draft a family-friendly response.`
    }
    if (student.tags.includes("Exam Prep")) {
      return `${student.name} is preparing for exams.${strategyPreview} Want me to help with study tips or encouragement?`
    }
    return `Ready to help with ${student.name}.${strategyPreview} What would you like me to draft?`
  }

  return (
    <div className="h-full border-l border-slate-200 bg-white flex flex-col overflow-hidden">
      {/* Strategy Section */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-indigo-600 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Strategy for Gemini
          </h3>
          {isSaving && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
        </div>
        <textarea
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          onBlur={handleStrategySave}
          placeholder="Tell Gemini how to handle this student (e.g., 'Be extra patient', 'Focus on jazz', 'Talk like a pirate')..."
          className="w-full h-20 text-sm text-slate-700 placeholder:text-slate-400 bg-white/70 border border-indigo-100 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all leading-relaxed"
        />
      </div>

      {/* Student Info */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h2 className="text-xl font-serif text-slate-800">{student.name}</h2>
          {onEditStudent && (
            <button
              onClick={onEditStudent}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit student details"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 ml-auto flex-wrap">
            {student.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-500">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {student.countryFlag} {student.country}
          </span>
        </div>
      </div>

      {/* Chat Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Copilot Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-slate-700 text-sm">Gemini Co-Pilot</span>
          <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Live</span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Initial Greeting */}
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 p-3 rounded-2xl bg-slate-100 text-slate-700 text-sm leading-relaxed">
              {getInitialGreeting()}
            </div>
          </div>

          {/* Chat History */}
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "assistant" ? (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-indigo-600">You</span>
                </div>
              )}
              <div
                className={`flex-1 p-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                    ? "bg-indigo-500 text-white ml-8"
                    : "bg-slate-100 text-slate-700 mr-8"
                  }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 p-3 rounded-2xl bg-slate-100 text-slate-500 text-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask Gemini to draft a reply..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 rounded-2xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
