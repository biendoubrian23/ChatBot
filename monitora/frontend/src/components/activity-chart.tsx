"use client"

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"

interface ActivityChartProps {
    data: any[]
    title?: string
    dataKey: string
    color?: string
}

export function ActivityChart({
    data,
    title,
    dataKey,
    color = "#8B5CF6" // Violet par défaut
}: ActivityChartProps) {

    // Formater la date pour l'axe X
    const formatDate = (dateStr: string) => {
        if (!dateStr) return ""
        const date = new Date(dateStr)
        // Si la date est invalide ou "HH:00", retourner telle quelle si ':', sinon formater
        if (dateStr.includes(':')) return dateStr

        return new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "short",
        }).format(date)
    }

    // Si pas de données
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                {title && <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>}
                <div className="flex h-[300px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                    <p className="text-sm font-medium text-gray-500">
                        Graphique à venir
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            {title && <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>}
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#F3F4F6"
                        />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9CA3AF", fontSize: 12 }}
                            tickFormatter={formatDate}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9CA3AF", fontSize: 12 }}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #E5E7EB",
                                borderRadius: "8px",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                            labelFormatter={(label) => formatDate(label)}
                        />
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#color-${dataKey})`}
                            activeDot={{ r: 6, strokeWidth: 0, fill: color }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
