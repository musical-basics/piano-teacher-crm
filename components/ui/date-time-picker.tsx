"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    disabled?: boolean
}

export function DateTimePicker({ date, setDate, disabled }: DateTimePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
    const [isOpen, setIsOpen] = React.useState(false)

    // Initialize time state from date or defaults
    const [hour, setHour] = React.useState(date ? parseInt(format(date, "hh")) : 12)
    const [minute, setMinute] = React.useState(date ? parseInt(format(date, "mm")) : 0)
    const [ampm, setAmpm] = React.useState<"AM" | "PM">(
        date ? (format(date, "a") as "AM" | "PM") : "PM"
    )

    // Sync internal state when prop changes
    React.useEffect(() => {
        if (date) {
            setSelectedDate(date)
            setHour(parseInt(format(date, "hh")))
            setMinute(parseInt(format(date, "mm")))
            setAmpm(format(date, "a") as "AM" | "PM")
        }
    }, [date])

    // Helper to construct a full Date object from parts
    const buildDate = (d: Date | undefined, h: number, m: number, ap: "AM" | "PM") => {
        if (!d) return undefined
        const newDate = new Date(d)
        let hours24 = h
        if (ap === "PM" && h !== 12) hours24 += 12
        if (ap === "AM" && h === 12) hours24 = 0
        newDate.setHours(hours24)
        newDate.setMinutes(m)
        return newDate
    }

    const handleDateSelect = (d: Date | undefined) => {
        setSelectedDate(d)
        if (d) {
            const newDateTime = buildDate(d, hour, minute, ampm)
            setDate(newDateTime)
        } else {
            setDate(undefined)
        }
    }

    const handleTimeChange = (type: "hour" | "minute" | "ampm", val: any) => {
        let newH = hour
        let newM = minute
        let newAmpm = ampm

        if (type === "hour") newH = val
        if (type === "minute") newM = val
        if (type === "ampm") newAmpm = val

        setHour(newH)
        setMinute(newM)
        setAmpm(newAmpm)

        if (selectedDate) {
            const newDateTime = buildDate(selectedDate, newH, newM, newAmpm)
            setDate(newDateTime)
        }
    }

    const handleClear = () => {
        setSelectedDate(undefined)
        setDate(undefined)
    }

    const handleToday = () => {
        const now = new Date()
        setSelectedDate(now)
        setHour(parseInt(format(now, "hh")))
        setMinute(parseInt(now, "mm"))
        setAmpm(format(now, "a") as "AM" | "PM")
        setDate(now)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all",
                        !date && "text-slate-400"
                    )}
                >
                    <span>
                        {date ? format(date, "MM/dd/yyyy, hh:mm a") : "mm/dd/yyyy, --:-- --"}
                    </span>
                    <CalendarIcon className="h-4 w-4 text-slate-500" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white rounded-xl shadow-xl border-slate-100" align="start">
                <div className="flex bg-white rounded-xl overflow-hidden divide-x divide-slate-100">
                    {/* Calendar Section */}
                    <div className="p-3">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            initialFocus
                            className="p-0"
                            classNames={{
                                root: "p-0",
                                head_cell: "text-slate-500 font-normal text-[0.8rem]",
                                cell: "h-9 w-9 text-center text-sm p-0 flex items-center justify-center",
                                day: cn(
                                    "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full flex items-center justify-center transition-colors",
                                ),
                                day_selected:
                                    "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white",
                                day_today: "bg-slate-100 text-slate-900",
                            }}
                        />
                        {/* Footer Buttons */}
                        <div className="flex items-center justify-between mt-4 px-2 pt-2 border-t border-slate-100">
                            <button
                                onClick={handleClear}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                type="button"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleToday}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                type="button"
                            >
                                Today
                            </button>
                        </div>
                    </div>

                    {/* Time Picker Section */}
                    <div className="flex flex-col w-[160px] p-3">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="text-sm font-semibold text-slate-900">Time</div>
                            <div className="flex gap-1">
                                <div className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">{hour.toString().padStart(2, '0')}</div>
                                <div className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">{minute.toString().padStart(2, '0')}</div>
                                <div className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">{ampm}</div>
                            </div>
                        </div>

                        {/* Columns */}
                        <div className="flex h-[200px] gap-2">
                            {/* Hour Column */}
                            <div className="flex flex-col flex-1 items-center h-full overflow-hidden relative">
                                <TimeColumn
                                    items={Array.from({ length: 12 }, (_, i) => i + 1)}
                                    selected={hour}
                                    onChange={(v) => handleTimeChange('hour', v)}
                                />
                            </div>

                            {/* Minute Column */}
                            <div className="flex flex-col flex-1 items-center h-full overflow-hidden relative">
                                <TimeColumn
                                    items={Array.from({ length: 60 }, (_, i) => i)}
                                    selected={minute}
                                    onChange={(v) => handleTimeChange('minute', v)}
                                    format={(v) => v.toString().padStart(2, '0')}
                                />
                            </div>

                            {/* AM/PM Column */}
                            <div className="flex flex-col flex-1 items-center h-full overflow-hidden relative">
                                <div className="flex flex-col gap-1 w-full h-full overflow-y-auto no-scrollbar py-20 snap-y snap-mandatory">
                                    {['AM', 'PM'].map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => handleTimeChange('ampm', v)}
                                            className={cn(
                                                "h-8 shrink-0 snap-center flex items-center justify-center text-sm rounded transition-colors w-full",
                                                ampm === v ? "bg-slate-100 font-bold text-slate-900" : "text-slate-400 hover:text-slate-600"
                                            )}
                                            type="button"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Done Button */}
                        <div className="mt-auto pt-4">
                            <Button
                                onClick={() => setIsOpen(false)}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9"
                                type="button"
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

function TimeColumn({ items, selected, onChange, format }: {
    items: number[],
    selected: number,
    onChange: (val: number) => void,
    format?: (val: number) => string
}) {
    return (
        <div className="flex flex-col gap-1 w-full h-full overflow-y-auto no-scrollbar py-20 snap-y snap-mandatory">
            {items.map((val) => (
                <button
                    key={val}
                    onClick={() => onChange(val)}
                    className={cn(
                        "h-8 shrink-0 snap-center flex items-center justify-center text-sm rounded transition-colors w-full",
                        selected === val ? "bg-slate-100 font-bold text-slate-900" : "text-slate-400 hover:text-slate-600"
                    )}
                    type="button"
                >
                    {format ? format(val) : val}
                </button>
            ))}
        </div>
    )
}
