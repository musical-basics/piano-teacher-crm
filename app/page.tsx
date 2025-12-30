"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Sidebar } from "@/components/crm/sidebar"
import { ConversationPane } from "@/components/crm/conversation-pane"
import { CopilotPane } from "@/components/crm/copilot-pane"
import { AddStudentModal } from "@/components/crm/add-student-modal"
import { EditStudentModal } from "@/components/crm/edit-student-modal"
import { SettingsModal } from "@/components/crm/settings-modal"
import type { Student, Message } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"
import DebugSupabase from "@/components/DebugSupabase"

// Country code to flag emoji mapping
const countryFlags: Record<string, string> = {
  US: "🇺🇸",
  NL: "🇳🇱",
  AE: "🇦🇪",
  GB: "🇬🇧",
  CA: "🇨🇦",
  AU: "🇦🇺",
  DE: "🇩🇪",
  FR: "🇫🇷",
  IN: "🇮🇳",
  JP: "🇯🇵",
  CN: "🇨🇳",
  BR: "🇧🇷",
  MX: "🇲🇽",
  ES: "🇪🇸",
  IT: "🇮🇹",
}

const getCountryFlag = (countryCode: string | null): string => {
  if (!countryCode) return "🌍"
  return countryFlags[countryCode.toUpperCase()] || "🌍"
}

export default function CRMDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDebugOpen, setIsDebugOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [copilotWidth, setCopilotWidth] = useState(340)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef<"sidebar" | "copilot" | null>(null)

  const handleMouseDown = useCallback((divider: "sidebar" | "copilot") => {
    isDraggingRef.current = divider
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const containerWidth = containerRect.width

    if (isDraggingRef.current === "sidebar") {
      const newWidth = e.clientX - containerRect.left
      setSidebarWidth(Math.max(200, Math.min(400, newWidth)))
    } else if (isDraggingRef.current === "copilot") {
      const newWidth = containerRect.right - e.clientX
      setCopilotWidth(Math.max(280, Math.min(500, newWidth)))
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = null
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }, [])

  // Fetch students and messages from Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .order("last_contacted_at", { ascending: false, nullsFirst: false })

      if (studentsError) {
        console.error("Error fetching students:", studentsError)
        return
      }

      // Fetch all messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })

      if (messagesError) {
        console.error("Error fetching messages:", messagesError)
      }

      // Combine data
      const formattedStudents: Student[] = (studentsData || []).map((dbStudent) => {
        const studentMessages = (messagesData || [])
          .filter((m) => m.student_id === dbStudent.id)
          .map((m) => ({
            id: m.id,
            content: m.body_text || "",
            sender: m.sender_role as "student" | "instructor" || "student",
            timestamp: new Date(m.created_at),
          }))

        // Determine status
        let status: "read" | "unread" | "replied" = "read"
        if (dbStudent.status === 'active') status = 'read' // Default mapping
        if (dbStudent.status === 'new') status = 'unread'

        return {
          id: dbStudent.id,
          name: dbStudent.full_name,
          email: dbStudent.email,
          avatar: "/placeholder.svg?height=40&width=40", // Fallback
          status: status,
          lastMessage: studentMessages.length > 0 ? studentMessages[studentMessages.length - 1].content : "No messages",
          time: dbStudent.last_contacted_at ? new Date(dbStudent.last_contacted_at).toLocaleDateString() : "",
          messages: studentMessages,
          lastMessageDate: dbStudent.last_contacted_at ? new Date(dbStudent.last_contacted_at) : new Date(0),
          country: dbStudent.country_code || "US",
          countryFlag: getCountryFlag(dbStudent.country_code),
          tags: dbStudent.tags || [],
          instructorNotes: dbStudent.instructor_strategy
        }
      })

      setStudents(formattedStudents)

      // Update selected student using functional update to avoid dependency loop
      setSelectedStudent(prev => {
        if (prev) {
          const updated = formattedStudents.find(s => s.id === prev.id)
          return updated || prev
        } else if (formattedStudents.length > 0) {
          return formattedStudents[0]
        }
        return null
      })

    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData]) // Initial load

  const filteredStudents = students.filter((student) => student.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    // Mark as read when selected
    setStudents((prev) => prev.map((s) => (s.id === student.id ? { ...s, status: "read" as const } : s)))
  }

  const handleSendMessage = (content: string) => {
    if (!selectedStudent) return

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content,
      sender: "instructor",
      timestamp: new Date(),
    }
    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent.id ? { ...s, messages: [...s.messages, newMessage], lastMessageDate: new Date() } : s,
      ),
    )
    setSelectedStudent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        messages: [...prev.messages, newMessage],
        lastMessageDate: new Date(),
      }
    })
  }



  const handleUpdateStudent = async (updates: Partial<Student>) => {
    if (!selectedStudent) return

    // Keep old state for revert
    const oldStudent = selectedStudent

    // Update local state (Optimistic)
    const updatedStudent = { ...selectedStudent, ...updates }
    setStudents((prev) =>
      prev.map((s) => (s.id === selectedStudent.id ? updatedStudent : s))
    )
    setSelectedStudent(updatedStudent)

    // Update in Supabase
    try {
      const { error } = await supabase
        .from("students")
        .update({
          full_name: updates.name,
          email: updates.email,
          country_code: updates.country,
          tags: updates.tags,
        })
        .eq("id", selectedStudent.id)

      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error("Error updating student:", error)
      alert(`Failed to save changes: ${error.message || error.details || "Unknown error"}`)

      // Revert state
      setStudents((prev) =>
        prev.map((s) => (s.id === oldStudent.id ? oldStudent : s))
      )
      setSelectedStudent(oldStudent)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return

    // Optimistic update
    const previousStudents = students
    const studentToDelete = students.find((s) => s.id === studentId)

    setStudents((prev) => prev.filter((s) => s.id !== studentId))
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null)
    }

    try {
      const { error } = await supabase.from("students").delete().eq("id", studentId)

      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error("Error deleting student:", error)
      alert(`Failed to delete student: ${error.message || "Unknown error"}`)
      // Revert state
      setStudents(previousStudents)
      if (studentToDelete && selectedStudent === null) {
        // If we deselected the student, we might want to re-select if we revert? 
        // But `selectedStudent` was local state.
        // Let's just reload to be safe and consistent.
        loadData()
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
          <p className="mt-3 text-gray-600">Loading students...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex h-screen bg-slate-50"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <DebugSupabase isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
      <div style={{ width: sidebarWidth, flexShrink: 0 }}>
        <Sidebar
          students={filteredStudents}
          selectedStudent={selectedStudent}
          onSelectStudent={handleSelectStudent}
          onAddStudent={() => setIsModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenDebug={() => setIsDebugOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onDeleteStudent={handleDeleteStudent}
        />
      </div>

      <div
        className="w-1 bg-slate-200 hover:bg-indigo-300 cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={() => handleMouseDown("sidebar")}
      />

      <div className="flex-1 min-w-0">
        {selectedStudent ? (
          <ConversationPane student={selectedStudent} onSendMessage={handleSendMessage} />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Select a student to view conversation
          </div>
        )}
      </div>

      <div
        className="w-1 bg-slate-200 hover:bg-indigo-300 cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={() => handleMouseDown("copilot")}
      />

      <div style={{ width: copilotWidth, flexShrink: 0 }}>
        {selectedStudent ? (
          <CopilotPane
            student={selectedStudent}
            onEditStudent={() => setIsEditModalOpen(true)}
          />
        ) : (
          <div className="h-full bg-white" />
        )}
      </div>

      <AddStudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={loadData} />

      {selectedStudent && (
        <EditStudentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          student={selectedStudent}
          onSave={handleUpdateStudent}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}
