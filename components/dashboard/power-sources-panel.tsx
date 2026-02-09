"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { powerSources } from "@/lib/dashboard-data"

export function PowerSourcesPanel() {
  return (
    <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 panel-glow h-full">
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

      <h3 className="text-sm font-semibold text-primary mb-2 text-glow">Source of Power</h3>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={powerSources}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {powerSources.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(10, 30, 60, 0.95)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                borderRadius: "8px",
                color: "#e0f7fa",
              }}
              formatter={(value: number) => [`${value}%`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs mt-2">
        {powerSources.map((source) => (
          <div key={source.name} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: source.color }}
            />
            <span className="text-muted-foreground">{source.name}</span>
            <span className="text-primary ml-auto font-mono">{source.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
