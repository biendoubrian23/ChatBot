'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DateRangePickerProps {
  isOpen: boolean
  onClose: () => void
  onApply: (start: string, end: string) => void
  initialStart?: string
  initialEnd?: string
}

export function DateRangePicker({ 
  isOpen, 
  onClose, 
  onApply,
  initialStart,
  initialEnd
}: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [startDate, setStartDate] = useState<Date | null>(initialStart ? new Date(initialStart) : null)
  const [endDate, setEndDate] = useState<Date | null>(initialEnd ? new Date(initialEnd) : null)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [startInput, setStartInput] = useState(initialStart || '')
  const [endInput, setEndInput] = useState(initialEnd || '')

  useEffect(() => {
    if (startDate) {
      setStartInput(formatDateForInput(startDate))
    }
  }, [startDate])

  useEffect(() => {
    if (endDate) {
      setEndInput(formatDateForInput(endDate))
    }
  }, [endDate])

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Lundi = 0

    const days: (Date | null)[] = []
    
    // Jours vides avant le premier jour du mois
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    
    // Jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const handleDayClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // Première sélection ou reset
      setStartDate(date)
      setEndDate(null)
    } else {
      // Deuxième sélection
      if (date < startDate) {
        setEndDate(startDate)
        setStartDate(date)
      } else {
        setEndDate(date)
      }
    }
  }

  const isInRange = (date: Date) => {
    if (!startDate) return false
    
    const end = endDate || hoverDate
    if (!end) return false
    
    const start = startDate < end ? startDate : end
    const finish = startDate < end ? end : startDate
    
    return date > start && date < finish
  }

  const isStart = (date: Date) => {
    return startDate && date.toDateString() === startDate.toDateString()
  }

  const isEnd = (date: Date) => {
    return endDate && date.toDateString() === endDate.toDateString()
  }

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleInputChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartInput(value)
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setStartDate(date)
        setCurrentMonth(date)
      }
    } else {
      setEndInput(value)
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setEndDate(date)
      }
    }
  }

  const handleApply = () => {
    if (startDate && endDate) {
      onApply(formatDateForInput(startDate), formatDateForInput(endDate))
    }
  }

  const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const days = getDaysInMonth(currentMonth)
  const weekDays = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

  if (!isOpen) return null

  return (
    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-80">
      {/* Header avec inputs */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">Plage personnalisée</span>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Fermer"
            aria-label="Fermer le sélecteur de dates"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Inputs de date sur une ligne */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startInput}
            onChange={(e) => handleInputChange('start', e.target.value)}
            className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
            title="Date de début"
            aria-label="Date de début"
          />
          <span className="text-gray-400 text-xs">→</span>
          <input
            type="date"
            value={endInput}
            onChange={(e) => handleInputChange('end', e.target.value)}
            className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
            title="Date de fin"
            aria-label="Date de fin"
          />
        </div>
      </div>

      {/* Navigation du mois */}
      <div className="flex items-center justify-between px-4 py-3">
        <button 
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          title="Mois précédent"
          aria-label="Mois précédent"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-900 capitalize">{monthName}</span>
        <button 
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          title="Mois suivant"
          aria-label="Mois suivant"
        >
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Calendrier */}
      <div className="px-4 pb-4">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Jours du mois */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-8" />
            }

            const isStartDay = isStart(date)
            const isEndDay = isEnd(date)
            const inRange = isInRange(date)
            const today = isToday(date)

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDayClick(date)}
                onMouseEnter={() => setHoverDate(date)}
                onMouseLeave={() => setHoverDate(null)}
                className={`
                  h-8 text-xs font-medium rounded-lg transition-all relative
                  ${isStartDay || isEndDay 
                    ? 'bg-black text-white' 
                    : inRange 
                      ? 'bg-gray-100 text-gray-900'
                      : today
                        ? 'border border-black text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                  }
                  ${isStartDay ? 'rounded-r-none' : ''}
                  ${isEndDay ? 'rounded-l-none' : ''}
                  ${inRange ? 'rounded-none' : ''}
                `}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Résumé et bouton Appliquer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {startDate && endDate ? (
              <span>
                {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
              </span>
            ) : startDate ? (
              <span>Sélectionnez la date de fin</span>
            ) : (
              <span>Sélectionnez une date</span>
            )}
          </div>
          <button
            onClick={handleApply}
            disabled={!startDate || !endDate}
            className="px-4 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  )
}
