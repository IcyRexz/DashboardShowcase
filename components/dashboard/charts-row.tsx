"use client"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import {
  type Company,
  hourlyGeneration,
  yearlyTransmission,
  taskCompletion,
} from "@/lib/dashboard-data"

interface ChartsRowProps {
  selectedCompany: Company | null
}

export function ChartsRow({ selectedCompany }: ChartsRowProps) {
  // Modify data based on selected company
  const hourlyData = selectedCompany
    ? hourlyGeneration.map((d) => ({
        ...d,
        value: Math.round(d.value * (selectedCompany.capacityMW || 1000) / 3400),
      }))
    : hourlyGeneration

  const yearlyData = selectedCompany
    ? yearlyTransmission.map((d) => ({
        ...d,
        value: Math.round(d.value * (selectedCompany.capacityMW || 1000) / 3400),
      }))
    : yearlyTransmission

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Task Completion Rate - Radar Chart */}
      <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 panel-glow">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

        <h3 className="text-sm font-semibold text-primary mb-2 text-glow">
          Task Completion Rate
        </h3>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={taskCompletion} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(0, 229, 255, 0.2)" />
              <PolarAngleAxis
                dataKey="task"
                tick={{ fill: "#80deea", fontSize: 8 }}
                tickLine={false}
              />
              <Radar
                name="Completion"
                dataKey="value"
                stroke="#00e5ff"
                fill="#00e5ff"
                fillOpacity={0.3}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10, 30, 60, 0.95)",
                  border: "1px solid rgba(0, 229, 255, 0.3)",
                  borderRadius: "8px",
                  color: "#e0f7fa",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Generated Electricity - Line Chart */}
      <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 panel-glow">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

        <h3 className="text-sm font-semibold text-primary mb-2 text-glow">
          Hourly Generated Electricity (MW)
        </h3>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 229, 255, 0.1)" />
              <XAxis
                dataKey="hour"
                tick={{ fill: "#80deea", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0, 229, 255, 0.3)" }}
              />
              <YAxis
                tick={{ fill: "#80deea", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0, 229, 255, 0.3)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10, 30, 60, 0.95)",
                  border: "1px solid rgba(0, 229, 255, 0.3)",
                  borderRadius: "8px",
                  color: "#e0f7fa",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00e5ff"
                strokeWidth={2}
                dot={{ fill: "#00e5ff", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "#00e5ff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accumulated Transmitted Electricity - Bar Chart */}
      <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 panel-glow">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

        <h3 className="text-sm font-semibold text-primary mb-2 text-glow">
          Accumulated Transmitted Electricity (MW)
        </h3>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 229, 255, 0.1)" />
              <XAxis
                dataKey="year"
                tick={{ fill: "#80deea", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0, 229, 255, 0.3)" }}
              />
              <YAxis
                tick={{ fill: "#80deea", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0, 229, 255, 0.3)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10, 30, 60, 0.95)",
                  border: "1px solid rgba(0, 229, 255, 0.3)",
                  borderRadius: "8px",
                  color: "#e0f7fa",
                }}
              />
              <Bar
                dataKey="value"
                fill="#2196f3"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
