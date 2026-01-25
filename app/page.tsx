"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useStudents, useStudentMessages } from "@/hooks/use-crm"
import { Sidebar } from "@/components/crm/sidebar"
import { ConversationPane } from "@/components/crm/conversation-pane"
import { CopilotPane } from "@/components/crm/copilot-pane"
import { DashboardPane } from "@/components/crm/dashboard-pane"
import { AddStudentModal } from "@/components/crm/add-student-modal"
import { EditStudentModal } from "@/components/crm/edit-student-modal"
import { SettingsModal } from "@/components/crm/settings-modal"
import type { Student, Message } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"
import DebugSupabase from "@/components/DebugSupabase"

export default function CRMDashboard() {
  // Queries
  const queryClient = useQueryClient()
  const { data: students = [], isLoading: isStudentsLoading, refetch: refetchStudents } = useStudents()

  // State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // Fetch messages ONLY for selected ID
  const { data: messages = [], isLoading: isMessagesLoading } = useStudentMessages(selectedStudentId)

  // Construct the "Active Student" object on the fly
  // We merge the static student details with the dynamic messages
  const selectedStudent = selectedStudentId
    ? students.find(s => s.id === selectedStudentId)
      ? {
        ...students.find(s => s.id === selectedStudentId)!,
        messages: messages
      }
      : null
    : null

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
    // const containerWidth = containerRect.width // Unused

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

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectStudent = (student: Student) => {
    setSelectedStudentId(student.id)
  }

  // Handle updates manually via Supabase then invalidate queries
  const handleSendMessage = (content: string) => {
    // Optimistic or just invalidate
    // Invalidate messages for this student
    if (selectedStudentId) {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedStudentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] }) // Update last message time/snippet
    }
  }

  const handleUpdateStudent = async (updates: Partial<Student>) => {
    if (!selectedStudentId) return
    const studentId = selectedStudentId

    // Update in Supabase
    try {
      const { error } = await supabase
        .from("crm_students")
        .update({
          full_name: updates.name,
          email: updates.email,
          country_code: updates.country,
          tags: updates.tags,
        })
        .eq("id", studentId)

      if (error) throw error

      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ['students'] })

    } catch (error: any) {
      console.error("Error updating student:", error)
      alert(`Failed to save changes: ${error.message || error.details || "Unknown error"}`)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return

    try {
      const { error } = await supabase.from("crm_students").delete().eq("id", studentId)
      if (error) throw error

      // Clear selection if deleted
      if (selectedStudentId === studentId) {
        setSelectedStudentId(null)
      }

      // Refresh list
      queryClient.invalidateQueries({ queryKey: ['students'] })

    } catch (error: any) {
      console.error("Error deleting student:", error)
      alert(`Failed to delete student: ${error.message || "Unknown error"}`)
    }
  }

  // Loading State
  if (isStudentsLoading) {
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
          onGoToDashboard={() => setSelectedStudentId(null)}
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
          <ConversationPane
            student={selectedStudent}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <DashboardPane
            students={students}
            onSelectStudent={handleSelectStudent}
          />
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

      <AddStudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={() => queryClient.invalidateQueries({ queryKey: ['students'] })}
      />

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
