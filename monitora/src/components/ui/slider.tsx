'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  hint?: string
  showValue?: boolean
  valueFormatter?: (value: number) => string
  onChange?: (value: number) => void
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      label,
      hint,
      showValue = true,
      valueFormatter,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      value,
      ...props
    },
    ref
  ) => {
    const currentValue = typeof value === 'number' ? value : Number(value) || 0
    const displayValue = valueFormatter 
      ? valueFormatter(currentValue) 
      : currentValue.toString()

    return (
      <div className={clsx('w-full', className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between mb-2">
            {label && (
              <label className="block text-sm font-medium text-foreground">
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5">
                {displayValue}
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className={clsx(
            'w-full h-2 bg-muted appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:bg-foreground',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:h-4',
            '[&::-moz-range-thumb]:bg-foreground',
            '[&::-moz-range-thumb]:border-none',
            '[&::-moz-range-thumb]:cursor-pointer'
          )}
          {...props}
        />
        {hint && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Slider.displayName = 'Slider'

export { Slider }
