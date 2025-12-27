"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Sidebar } from "@/components/crm/sidebar"
import { ConversationPane } from "@/components/crm/conversation-pane"
import { CopilotPane } from "@/components/crm/copilot-pane"
import { AddStudentModal } from "@/components/crm/add-student-modal"
import type { Student, Message } from "@/lib/types"

const initialStudents: Student[] = [
  {
    id: "1",
    name: "Robert Alconcel",
    email: "robert.alconcel@email.com",
    country: "US",
    countryFlag: "🇺🇸",
    status: "unread",
    tags: ["Adult Learner", "Jazz Interest", "Performance Anxiety"],
    lastMessageDate: new Date("2025-12-21"),
    messages: [
      {
        id: "1a",
        content: "Hi! I saw your profile and I'm interested in piano lessons. I've been playing for about 2 years now.",
        sender: "student",
        timestamp: new Date("2025-12-15T10:30:00"),
      },
      {
        id: "1b",
        content: "Welcome Robert! I'd love to help you on your piano journey. What are your main goals?",
        sender: "instructor",
        timestamp: new Date("2025-12-15T14:22:00"),
      },
      {
        id: "1c",
        content: "I really want to master jazz piano. I love playing Dr. Dre beats and hip-hop inspired pieces.",
        sender: "student",
        timestamp: new Date("2025-12-16T09:15:00"),
      },
      {
        id: "1d",
        content:
          "That's a great direction! Jazz and hip-hop have a lot of overlap. Let's focus on chord voicings and groove.",
        sender: "instructor",
        timestamp: new Date("2025-12-16T11:00:00"),
      },
      {
        id: "1e",
        content: "Bombed my recital playing 'Still Dre'. Left hand issues. When can we meet?",
        sender: "student",
        timestamp: new Date("2025-12-21T16:45:00"),
      },
    ],
  },
  {
    id: "2",
    name: "Alina Hanson",
    email: "alina.hanson@email.com",
    country: "US",
    countryFlag: "🇺🇸",
    status: "read",
    tags: ["Parent", "Kids Lessons"],
    lastMessageDate: new Date("2025-11-29"),
    messages: [
      {
        id: "2a",
        content: "Hello! I found your website through a friend's recommendation.",
        sender: "student",
        timestamp: new Date("2025-11-28T08:00:00"),
      },
      {
        id: "2b",
        content: "Hi Alina! Thank you for reaching out. How can I help you?",
        sender: "instructor",
        timestamp: new Date("2025-11-28T10:30:00"),
      },
      {
        id: "2c",
        content: "My two boys (9 and 6) want to learn. Do you teach kids?",
        sender: "student",
        timestamp: new Date("2025-11-29T09:20:00"),
      },
    ],
  },
  {
    id: "3",
    name: "Sander",
    email: "sander@email.nl",
    country: "NL",
    countryFlag: "🇳🇱",
    status: "read",
    tags: ["Beginner", "Theory Focus"],
    lastMessageDate: new Date("2025-12-04"),
    messages: [
      {
        id: "3a",
        content: "Hallo! I'm looking for online piano lessons. I'm based in the Netherlands.",
        sender: "student",
        timestamp: new Date("2025-12-01T15:00:00"),
      },
      {
        id: "3b",
        content: "Hi Sander! Online lessons work great across time zones. What's your experience level?",
        sender: "instructor",
        timestamp: new Date("2025-12-02T09:00:00"),
      },
      {
        id: "3c",
        content: "I only get 15 min lessons. I want to learn theory.",
        sender: "student",
        timestamp: new Date("2025-12-04T18:30:00"),
      },
    ],
  },
  {
    id: "4",
    name: "Daksh Sapru",
    email: "daksh.sapru@email.com",
    country: "AE",
    countryFlag: "🇦🇪",
    status: "unread",
    tags: ["Intermediate", "Exam Prep", "Trinity Grade 3"],
    lastMessageDate: new Date("2025-12-17"),
    messages: [
      {
        id: "4a",
        content: "Good evening! I'm looking for a teacher who can help me prepare for my Trinity exam.",
        sender: "student",
        timestamp: new Date("2025-12-10T19:00:00"),
      },
      {
        id: "4b",
        content: "Hi Daksh! I have experience with Trinity exams. Which grade are you preparing for?",
        sender: "instructor",
        timestamp: new Date("2025-12-11T08:00:00"),
      },
      {
        id: "4c",
        content: "Living in Dubai, taking Trinity Grade 3 soon.",
        sender: "student",
        timestamp: new Date("2025-12-17T20:15:00"),
      },
    ],
  },
]

export default function CRMDashboard() {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [selectedStudent, setSelectedStudent] = useState<Student>(initialStudents[0])
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  const filteredStudents = students.filter((student) => student.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    // Mark as read when selected
    setStudents((prev) => prev.map((s) => (s.id === student.id ? { ...s, status: "read" as const } : s)))
  }

  const handleSendMessage = (content: string) => {
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
    setSelectedStudent((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      lastMessageDate: new Date(),
    }))
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

  return (
    <div
      ref={containerRef}
      className="flex h-screen bg-slate-50"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{ width: sidebarWidth, flexShrink: 0 }}>
        <Sidebar
          students={filteredStudents}
          selectedStudent={selectedStudent}
          onSelectStudent={handleSelectStudent}
          onAddStudent={() => setIsModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      <div
        className="w-1 bg-slate-200 hover:bg-indigo-300 cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={() => handleMouseDown("sidebar")}
      />

      <div className="flex-1 min-w-0">
        <ConversationPane student={selectedStudent} onSendMessage={handleSendMessage} />
      </div>

      <div
        className="w-1 bg-slate-200 hover:bg-indigo-300 cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={() => handleMouseDown("copilot")}
      />

      <div style={{ width: copilotWidth, flexShrink: 0 }}>
        <CopilotPane student={selectedStudent} />
      </div>

      <AddStudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={handleAddStudent} />
    </div>
  )
}
