import type { Student } from "@/lib/types"
import { Users, UserPlus, Zap, Clock, ChevronRight } from "lucide-react"

interface DashboardPaneProps {
    students: Student[]
    onSelectStudent: (student: Student) => void
}

export function DashboardPane({ students, onSelectStudent }: DashboardPaneProps) {
    // 1. Calculate Stats
    const totalStudents = students.length
    const leadsCount = students.filter(s => s.status === 'Lead').length
    const activeCount = students.filter(s => s.status === 'Active').length

    // 2. Find people waiting for a reply
    // Logic: The last message was from the student (not you) AND they are not inactive
    const needsReply = students.filter(s => {
        if (s.status === 'Inactive') return false
        if (!s.messages || s.messages.length === 0) return false
        const lastMsg = s.messages[s.messages.length - 1]
        return lastMsg.sender === 'student'
    })

    // 3. Find recent leads (created recently or status is Lead)
    const recentLeads = students
        .filter(s => s.status === 'Lead')
        .slice(0, 5)

    return (
        <div className="h-full bg-slate-50 overflow-y-auto p-8">
            <h1 className="text-3xl font-serif text-slate-800 mb-2">Good Afternoon, Teacher</h1>
            <p className="text-slate-500 mb-8">Here is what's happening in your studio today.</p>

            {/* STATS GRID */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Total Students</span>
                    </div>
                    <p className="text-2xl font-semibold text-slate-800">{totalStudents}</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Active Learners</span>
                    </div>
                    <p className="text-2xl font-semibold text-slate-800">{activeCount}</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">New Leads</span>
                    </div>
                    <p className="text-2xl font-semibold text-slate-800">{leadsCount}</p>
                </div>
            </div>

            {/* NEEDS ATTENTION SECTION */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Needs Reply
                </h2>

                {needsReply.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                        All caught up! No pending messages. 🎉
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {needsReply.map(student => (
                            <button
                                key={student.id}
                                onClick={() => onSelectStudent(student)}
                                className="w-full flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-800">{student.name}</h3>
                                        <p className="text-sm text-slate-500 truncate max-w-[300px]">
                                            {student.messages[student.messages.length - 1].content}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
                                    Reply <ChevronRight className="w-4 h-4" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
