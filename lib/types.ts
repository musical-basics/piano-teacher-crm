export interface Message {
  id: string
  content: string
  sender: "student" | "instructor"
  timestamp: Date
}

export type StudentStatus = 'Lead' | 'Discussion' | 'Trial' | 'Active' | 'Inactive';

export interface Student {
  id: string
  name: string
  email: string
  country: string
  countryFlag: string
  status: StudentStatus
  tags: string[]
  messages: Message[]
  lastMessageDate: Date
  instructorNotes?: string
  experienceLevel?: string
}
