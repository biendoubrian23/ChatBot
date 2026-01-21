'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label?: string
  showValue?: boolean
  className?: string
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  showValue = true,
  className
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-gray-600">{label}</span>}
          {showValue && (
            <span className="font-medium text-gray-900">{value}</span>
          )}
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, #000 0%, #000 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
          }}
        />
      </div>
      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #000;
          border-radius: 0;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #000;
          border-radius: 0;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
