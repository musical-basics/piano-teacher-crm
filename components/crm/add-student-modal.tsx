"use client"
import { useState } from "react"
import { X, UserPlus, Loader2, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface AddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: () => void // Triggers the list refresh
}

export function AddStudentModal({ isOpen, onClose, onAdd }: AddStudentModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("")
  const [initialNote, setInitialNote] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // 1. Insert Student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          full_name: name,
          email: email,
          country_code: country || 'US',
          status: 'active',
          last_contacted_at: new Date().toISOString() // Mark as active now
        })
        .select()
        .single()

      if (studentError) {
        if (studentError.code === '23505') throw new Error("This email is already registered.")
        throw studentError
      }

      // 2. Insert Initial Note (as a message from the student)
      if (initialNote.trim()) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            student_id: student.id,
            sender_role: 'student', // It's their inquiry
            body_text: initialNote,
            created_at: new Date().toISOString()
          })

        if (msgError) throw msgError
      }

      // 3. Success
      onAdd() // Refresh the main list
      onClose()
      // Reset form
      setName(""); setEmail(""); setCountry(""); setInitialNote("")

    } catch (err: any) {
      console.error("Save failed:", err)
      setError(err.message || "Failed to save student")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-[500px] border border-slate-100 p-6">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-serif text-slate-800 flex items-center gap-2">
            <UserPlus size={24} className="text-indigo-600" />
            Add New Student
          </h2>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="e.g. Evan Quigley"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="evan@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Country</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="US"
                value={country}
                onChange={e => setCountry(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Notes / Inquiry</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              rows={4}
              placeholder="Paste their first email here..."
              value={initialNote}
              onChange={e => setInitialNote(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Start Conversation"}
          </button>
        </form>
      </div>
    </div>
  )
}
