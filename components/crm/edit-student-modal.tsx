"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import type { Student } from "@/lib/types"

interface EditStudentModalProps {
    isOpen: boolean
    onClose: () => void
    student: Student
    onSave: (updates: Partial<Student>) => void
}

// Country code to flag emoji mapping
const countryOptions = [
    { code: "US", flag: "🇺🇸", name: "United States" },
    { code: "NL", flag: "🇳🇱", name: "Netherlands" },
    { code: "AE", flag: "🇦🇪", name: "UAE" },
    { code: "GB", flag: "🇬🇧", name: "United Kingdom" },
    { code: "CA", flag: "🇨🇦", name: "Canada" },
    { code: "AU", flag: "🇦🇺", name: "Australia" },
    { code: "DE", flag: "🇩🇪", name: "Germany" },
    { code: "FR", flag: "🇫🇷", name: "France" },
    { code: "IN", flag: "🇮🇳", name: "India" },
    { code: "JP", flag: "🇯🇵", name: "Japan" },
    { code: "CN", flag: "🇨🇳", name: "China" },
    { code: "BR", flag: "🇧🇷", name: "Brazil" },
    { code: "MX", flag: "🇲🇽", name: "Mexico" },
    { code: "ES", flag: "🇪🇸", name: "Spain" },
    { code: "IT", flag: "🇮🇹", name: "Italy" },
]

export function EditStudentModal({ isOpen, onClose, student, onSave }: EditStudentModalProps) {
    const [name, setName] = useState(student.name)
    const [email, setEmail] = useState(student.email)
    const [country, setCountry] = useState(student.country)
    const [tags, setTags] = useState<string[]>(student.tags)
    const [newTag, setNewTag] = useState("")

    // Reset form when student changes
    useEffect(() => {
        setName(student.name)
        setEmail(student.email)
        setCountry(student.country)
        setTags(student.tags)
        setNewTag("")
    }, [student])

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()])
            setNewTag("")
        }
    }

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            handleAddTag()
        }
    }

    const handleSave = () => {
        const selectedCountry = countryOptions.find(c => c.code === country)
        onSave({
            name,
            email,
            country,
            countryFlag: selectedCountry?.flag || "🌍",
            tags,
        })
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800">Edit Student</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-5 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                        />
                    </div>

                    {/* Country */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Country
                        </label>
                        <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"
                        >
                            {countryOptions.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.flag} {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Tags
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-indigo-50 text-indigo-700"
                                >
                                    {tag}
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="p-0.5 hover:bg-indigo-100 rounded-full transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Add a tag..."
                                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                            />
                            <button
                                onClick={handleAddTag}
                                disabled={!newTag.trim()}
                                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}
