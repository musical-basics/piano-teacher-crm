"use client"

import { Search, Plus, FlaskConical, Settings, Trash2, LayoutDashboard } from "lucide-react"
import type { Student } from "@/lib/types"
import { formatRelativeTime } from "@/lib/date-utils"

interface SidebarProps {
  students: Student[]
  selectedStudent: Student | null
  onSelectStudent: (student: Student) => void
  onAddStudent: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onOpenDebug?: () => void
  onOpenSettings?: () => void
  onDeleteStudent: (studentId: string) => void
  onGoToDashboard: () => void
}

export function Sidebar({
  students,
  selectedStudent,
  onSelectStudent,
  onAddStudent,
  searchQuery,
  onSearchChange,
  onOpenDebug,
  onOpenSettings,
  onDeleteStudent,
  onGoToDashboard,
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

      <div className="px-4 mb-2">
        <button
          onClick={onGoToDashboard}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${selectedStudent === null
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
            : "hover:bg-white hover:shadow-sm text-slate-600"
            }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${selectedStudent === null ? "text-white" : "text-slate-400 group-hover:text-indigo-500"}`} />
          <div className="text-left">
            <p className="font-medium text-sm">Dashboard</p>
          </div>
        </button>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {students.map((student) => {
          const isSelected = selectedStudent?.id === student.id
          const lastMessage = student.messages[student.messages.length - 1]

          return (
            <div
              key={student.id}
              className="relative group"
            >
              <button
                onClick={() => onSelectStudent(student)}
                className={`w-full p-4 rounded-2xl text-left transition-all ${isSelected ? "bg-white shadow-sm ring-1 ring-slate-200" : "hover:bg-slate-50"
                  }`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread indicator - showing for 'Lead' status now */}
                  <div className="mt-2">
                    {student.status === "Lead" ? (
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
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteStudent(student.id)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete student"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer - Settings & Debug */}
      <div className="px-4 py-3 border-t border-slate-100 space-y-1">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4" />
            Your Persona
          </button>
        )}
        {onOpenDebug && (
          <button
            onClick={onOpenDebug}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Test DB
          </button>
        )}
      </div>
    </div>
  )
}
