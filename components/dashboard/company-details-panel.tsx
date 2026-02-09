"use client"

import React from "react"

import { X, Building2, MapPin, Users, Zap, DollarSign, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Company } from "@/lib/dashboard-data"

interface CompanyDetailsPanelProps {
  company: Company
  onClear: () => void
}

export function CompanyDetailsPanel({ company, onClear }: CompanyDetailsPanelProps) {
  return (
    <div className="relative bg-card/90 backdrop-blur-md border border-border rounded-lg p-4 panel-glow">
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-primary text-glow">{company.name}</h3>
          <p className="text-sm text-muted-foreground">{company.industry}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear selection</span>
        </Button>
      </div>

      <div className="space-y-3">
        <DetailRow icon={MapPin} label="Region" value={company.region} />
        <DetailRow icon={Users} label="Employees" value={company.employees.toLocaleString()} />
        <DetailRow
          icon={Zap}
          label="Capacity"
          value={`${company.capacityMW?.toLocaleString() || "N/A"} MW`}
        />
        <DetailRow
          icon={DollarSign}
          label="Output Value"
          value={`${company.outputValue.toLocaleString()} ${company.outputCurrency}`}
        />
        {company.description && (
          <DetailRow icon={Info} label="Description" value={company.description} />
        )}
      </div>
    </div>
  )
}

interface DetailRowProps {
  icon: React.ElementType
  label: string
  value: string
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="text-sm text-foreground truncate">{value}</p>
      </div>
    </div>
  )
}
