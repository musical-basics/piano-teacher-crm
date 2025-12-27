"use client"

import type React from "react"

import { X } from "lucide-react"
import { useState } from "react"
import type { Student } from "@/lib/types"

const countryOptions = [
  { code: "US", flag: "🇺🇸", name: "United States" },
  { code: "NL", flag: "🇳🇱", name: "Netherlands" },
  { code: "AE", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "UK", flag: "🇬🇧", name: "United Kingdom" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "IN", flag: "🇮🇳", name: "India" },
  { code: "JP", flag: "🇯🇵", name: "Japan" },
]

interface AddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (student: Omit<Student, "id" | "messages" | "lastMessageDate" | "status">) => void
}

export function AddStudentModal({ isOpen, onClose, onAdd }: AddStudentModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState(countryOptions[0])
  const [notes, setNotes] = useState("")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name && email) {
      onAdd({
        name,
        email,
        country: country.code,
        countryFlag: country.flag,
        tags: notes ? [notes] : [],
      })
      // Reset form
      setName("")
      setEmail("")
      setCountry(countryOptions[0])
      setNotes("")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-2xl font-serif text-slate-800 mb-6">Add New Student</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter student name"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Country</label>
            <select
              value={country.code}
              onChange={(e) => {
                const selected = countryOptions.find((c) => c.code === e.target.value)
                if (selected) setCountry(selected)
              }}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-transparent transition-all appearance-none bg-white"
            >
              {countryOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.flag} {option.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Initial Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any initial notes about this student..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Start Conversation
          </button>
        </form>
      </div>
    </div>
  )
}
