'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

export interface DropdownItem {
  label: string
  value: string
  icon?: ReactNode
  disabled?: boolean
  danger?: boolean
  onClick?: () => void
}

export interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, align = 'left', className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className={clsx('relative inline-block', className)}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      
      {isOpen && (
        <div
          className={clsx(
            'absolute z-50 mt-1 min-w-[180px] border border-border bg-background py-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.value || index}
              className={clsx(
                'flex w-full items-center px-3 py-2 text-sm transition-colors',
                item.disabled
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-muted',
                item.danger && 'text-red-600 hover:bg-red-50'
              )}
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick?.()
                  setIsOpen(false)
                }
              }}
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Select dropdown variant
export interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  disabled,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={selectRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'flex h-10 w-full items-center justify-between border border-border bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-1',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className={!selectedOption ? 'text-muted-foreground' : ''}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={clsx('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full border border-border bg-background py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={clsx(
                'flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-muted',
                option.value === value && 'bg-muted font-medium'
              )}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
