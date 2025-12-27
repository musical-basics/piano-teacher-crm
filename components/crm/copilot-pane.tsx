"use client"

import { Sparkles, Globe, Pencil } from "lucide-react"
import { useState } from "react"
import type { Student } from "@/lib/types"

interface CopilotPaneProps {
  student: Student
  onUpdateNotes?: (notes: string) => void
  onEditStudent?: () => void
}

export function CopilotPane({ student, onUpdateNotes, onEditStudent }: CopilotPaneProps) {
  const [copilotMessage, setCopilotMessage] = useState("")
  const [notes, setNotes] = useState(student.instructorNotes || "")

  const handleNotesChange = (value: string) => {
    setNotes(value)
    onUpdateNotes?.(value)
  }

  // Generate a contextual Gemini message based on the student AND instructor notes
  const getGeminiGreeting = () => {
    const hasNotes = notes.trim().length > 0
    const notesContext = hasNotes
      ? ` Based on your notes, I'll keep in mind: "${notes.slice(0, 50)}${notes.length > 50 ? "..." : ""}"`
      : ""

    if (student.tags.includes("Performance Anxiety")) {
      return `I've analyzed ${student.name}'s history. They seem anxious about their recital. Shall I draft a reassuring reply?${notesContext}`
    }
    if (student.tags.includes("Parent")) {
      return `${student.name} is inquiring about lessons for their children. I can help you draft a response about your teaching approach for young students.${notesContext}`
    }
    if (student.tags.includes("Exam Prep")) {
      return `${student.name} is preparing for their Trinity exam. I can help you create a study plan or draft encouraging messages about exam preparation.${notesContext}`
    }
    return `I've reviewed ${student.name}'s conversation history. How can I help you craft the perfect response?${notesContext}`
  }

  return (
    <div className="h-full border-l border-slate-200 bg-white flex flex-col overflow-hidden">
      {/* Top Section - Instructor Notes & Strategy */}
      <div className="p-4 border-b border-slate-100 bg-indigo-50/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Instructor Notes</h3>
          <Pencil className="w-3 h-3 text-slate-400" />
        </div>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add context for Gemini (e.g., 'Prefers visual learning', 'Focus on rhythm')..."
          className="w-full h-16 text-sm text-slate-700 placeholder:text-slate-400 bg-transparent border-none resize-none focus:outline-none focus:ring-0 leading-relaxed"
        />
      </div>

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
          <div className="flex items-center gap-1 ml-auto">
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

      {/* Bottom Section - AI Chat */}
      <div className="flex-1 flex flex-col">
        {/* Copilot Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-slate-700 text-sm">Gemini Co-Pilot</span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 p-3 rounded-2xl bg-slate-100 text-slate-700 text-sm leading-relaxed">
              {getGeminiGreeting()}
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100">
          <input
            type="text"
            placeholder="Ask Gemini..."
            value={copilotMessage}
            onChange={(e) => setCopilotMessage(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
          />
        </div>
      </div>
    </div>
  )
}
