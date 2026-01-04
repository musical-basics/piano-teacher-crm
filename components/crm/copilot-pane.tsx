"use client"

import { Sparkles, Globe, Pencil, Send, Loader2, ChevronDown, Bot, GraduationCap } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import type { Student } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"

type AIProvider = 'gemini' | 'openai' | 'claude'

interface ChatMessage {
  role: "user" | "assistant" | "system" // Added 'system' for status updates
  content: string
  provider?: AIProvider
}

interface CopilotPaneProps {
  student: Student
  onEditStudent?: () => void
}

const providerConfig = {
  gemini: { name: 'Gemini 2.0', color: 'bg-gradient-to-br from-indigo-500 to-teal-400', icon: '✨' },
  openai: { name: 'GPT-4o', color: 'bg-gradient-to-br from-green-500 to-emerald-400', icon: '🤖' },
  claude: { name: 'Claude Sonnet 4', color: 'bg-gradient-to-br from-orange-500 to-amber-400', icon: '🧠' },
}

export function CopilotPane({ student, onEditStudent }: CopilotPaneProps) {
  const [inputMessage, setInputMessage] = useState("")
  const [strategy, setStrategy] = useState(student.instructorNotes || "")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [provider, setProvider] = useState<AIProvider>('gemini')
  const [isProviderOpen, setIsProviderOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Track if we have already auto-analyzed this specific student session
  // This prevents it from running every time you type a letter
  const hasAnalyzedRef = useRef(false)

  // --- 1. RESET STATE ON STUDENT CHANGE ---
  useEffect(() => {
    setStrategy(student.instructorNotes || "")
    setMessages([])
    setInputMessage("")
    hasAnalyzedRef.current = false // Reset analysis flag
  }, [student.id])

  // --- 2. AUTO-ANALYZE LOGIC (THE NEW PART) ---
  useEffect(() => {
    // If we've already run for this student, stop.
    if (hasAnalyzedRef.current) return

    // Check if we have messages to analyze
    if (!student.messages || student.messages.length === 0) return

    // Get the very last message
    const lastMessage = student.messages[student.messages.length - 1]

    // ONLY auto-draft if the LAST message was from the STUDENT
    if (lastMessage.sender === 'student') {
      hasAnalyzedRef.current = true // Mark as done
      handleAutoDraft()
    }
  }, [student.id, student.messages])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Save strategy to Supabase when user clicks away
  const handleStrategySave = async () => {
    if (strategy === student.instructorNotes) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("crm_students")
        .update({ instructor_strategy: strategy })
        .eq("id", student.id)
      if (error) console.error("Error saving strategy:", error)
    } catch (error) {
      console.error("Error saving strategy:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // --- 3. AUTO DRAFT FUNCTION ---
  const handleAutoDraft = async () => {
    setIsLoading(true)

    // Add a temporary "Thinking" status
    setMessages(prev => [...prev, {
      role: "system",
      content: `New message detected from ${student.name}. Drafting a reply...`
    }])

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // We tell the AI explicit instructions for this auto-draft
          message: "The student just replied. Based on their last message, draft a helpful response.",
          studentId: student.id,
          provider: provider,
        }),
      })
      const data = await response.json()

      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error}` }])
      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: data.reply, provider: data.provider || provider }
        ])
      }
    } catch (error) {
      console.error("Error calling AI:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Manual Send (User types something)
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    const userMessage = inputMessage.trim()
    setInputMessage("")

    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          studentId: student.id,
          provider: provider,
        }),
      })
      const data = await response.json()

      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error}`, provider }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply, provider: data.provider || provider }])
      }
    } catch (error) {
      console.error("Error calling AI:", error)
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error.", provider }])
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

  // Generate initial greeting text (Static)
  const getInitialGreeting = () => {
    const hasStrategy = strategy.trim().length > 0
    const strategyPreview = hasStrategy
      ? ` I'll apply your strategy: "${strategy.slice(0, 60)}${strategy.length > 60 ? "..." : ""}"`
      : ""
    return `Ready to help with ${student.name}.${strategyPreview} What would you like me to draft?`
  }

  return (
    <div className="h-full border-l border-slate-200 bg-white flex flex-col overflow-hidden">
      {/* Strategy Section */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-indigo-600 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Strategy for AI
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
        {/* Experience Level Badge */}
        {student.experienceLevel && (
          <div className="flex items-center gap-2 mt-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-fit">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{student.experienceLevel}</span>
          </div>
        )}
      </div>

      {/* Chat Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Copilot Header with Provider Selector */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl ${providerConfig[provider].color} flex items-center justify-center`}>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-medium text-slate-700 text-sm">AI Co-Pilot</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsProviderOpen(!isProviderOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <span>{providerConfig[provider].icon}</span>
              <span>{providerConfig[provider].name}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isProviderOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                {(Object.keys(providerConfig) as AIProvider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setProvider(p)
                      setIsProviderOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${provider === p ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700'
                      }`}
                  >
                    <span>{providerConfig[p].icon}</span>
                    <span>{providerConfig[p].name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
              ) : msg.role === "system" ? (
                // Small system badge for "Drafting reply..."
                <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-slate-300" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-indigo-600">You</span>
                </div>
              )}

              <div
                className={`flex-1 p-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-500 text-white ml-8"
                  : msg.role === "system" ? "bg-slate-50 text-slate-500 italic border border-slate-100 mr-8"
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
