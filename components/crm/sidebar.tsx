"use client"

import { Search, Plus } from "lucide-react"
import type { Student } from "@/lib/types"
import { formatRelativeTime } from "@/lib/date-utils"

interface SidebarProps {
  students: Student[]
  selectedStudent: Student
  onSelectStudent: (student: Student) => void
  onAddStudent: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function Sidebar({
  students,
  selectedStudent,
  onSelectStudent,
  onAddStudent,
  searchQuery,
  onSearchChange,
}: SidebarProps) {
  return (
    <div className="h-full border-r border-slate-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-100">
        <h1 className="text-2xl font-serif text-slate-800">Students</h1>
        <button
          onClick={onAddStudent}
          className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-200 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-full bg-slate-100 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
          />
        </div>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {students.map((student) => {
          const isSelected = selectedStudent.id === student.id
          const lastMessage = student.messages[student.messages.length - 1]

          return (
            <button
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className={`w-full p-4 rounded-2xl text-left transition-all ${
                isSelected ? "bg-white shadow-sm ring-1 ring-slate-200" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Unread indicator */}
                <div className="mt-2">
                  {student.status === "unread" ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800 truncate">{student.name}</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatRelativeTime(student.lastMessageDate)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 truncate mt-1">{lastMessage?.content || "No messages yet"}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
