import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className
}: StatCardProps) {
  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-500">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <span className={cn(
                'flex items-center text-sm font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="w-4 h-4 mr-0.5" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-0.5" />
                )}
                {trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
