export interface Message {
  id: string
  content: string
  sender: "student" | "instructor"
  timestamp: Date
}

export interface Student {
  id: string
  name: string
  email: string
  country: string
  countryFlag: string
  status: "read" | "unread"
  tags: string[]
  messages: Message[]
  lastMessageDate: Date
  instructorNotes?: string
}
