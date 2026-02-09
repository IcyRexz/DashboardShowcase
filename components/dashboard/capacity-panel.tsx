"use client"

import { type Company, plantCapacities, companies } from "@/lib/dashboard-data"

interface CapacityPanelProps {
  selectedCompany: Company | null
}

export function CapacityPanel({ selectedCompany }: CapacityPanelProps) {
  const data = selectedCompany
    ? [{ name: selectedCompany.name, capacity: selectedCompany.capacityMW || 0 }]
    : plantCapacities

  const maxCapacity = Math.max(...data.map((d) => d.capacity))

  return (
    <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 panel-glow h-full">
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

      <h3 className="text-sm font-semibold text-primary mb-4 text-glow">
        Power Generation Capacity (MW)
      </h3>

      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="text-xs text-foreground w-28 truncate">{item.name}</span>
            <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                style={{ width: `${(item.capacity / maxCapacity) * 100}%` }}
              />
            </div>
            <span className="text-xs text-primary font-mono w-12 text-right">
              {item.capacity}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
