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
  useEffect(() => {
    const fetchStudents = async () => {
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

        // Map database records to Student type
        const mappedStudents: Student[] = (studentsData || []).map((dbStudent) => {
          const studentMessages: Message[] = (messagesData || [])
            .filter((msg) => msg.student_id === dbStudent.id)
            .map((msg) => ({
              id: msg.id,
              content: msg.body_text,
              sender: msg.sender_role as "student" | "instructor",
              timestamp: new Date(msg.created_at),
            }))

          const lastMessage = studentMessages[studentMessages.length - 1]

          return {
            id: dbStudent.id,
            name: dbStudent.full_name,
            email: dbStudent.email,
            country: dbStudent.country_code || "US",
            countryFlag: getCountryFlag(dbStudent.country_code),
            status: dbStudent.status === "new" ? "unread" : "read",
            tags: dbStudent.tags || [],
            messages: studentMessages,
            lastMessageDate: lastMessage ? lastMessage.timestamp : new Date(dbStudent.created_at),
            instructorNotes: dbStudent.instructor_strategy || undefined,
          }
        })

        setStudents(mappedStudents)
        if (mappedStudents.length > 0) {
          setSelectedStudent(mappedStudents[0])
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [])

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

  const handleAddStudent = (newStudent: Omit<Student, "id" | "messages" | "lastMessageDate" | "status">) => {
    const student: Student = {
      ...newStudent,
      id: `student-${Date.now()}`,
      status: "unread",
      messages:
        newStudent.tags.length > 0
          ? [
            {
              id: `msg-${Date.now()}`,
              content: newStudent.tags[0],
              sender: "student",
              timestamp: new Date(),
            },
          ]
          : [],
      lastMessageDate: new Date(),
    }
    setStudents((prev) => [student, ...prev])
    setIsModalOpen(false)
  }

  const handleUpdateStudent = (updates: Partial<Student>) => {
    if (!selectedStudent) return

    // Update local state
    const updatedStudent = { ...selectedStudent, ...updates }
    setStudents((prev) =>
      prev.map((s) => (s.id === selectedStudent.id ? updatedStudent : s))
    )
    setSelectedStudent(updatedStudent)

    // Update in Supabase
    const updateDatabase = async () => {
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
        console.error("Error updating student:", error)
      }
    }
    updateDatabase()
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

      <AddStudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={handleAddStudent} />

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
