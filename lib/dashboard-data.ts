export type Industry =
  | "Energy"
  | "Fintech"
  | "Manufacturing"
  | "Logistics"
  | "Healthcare"

export type Company = {
  id: string
  name: string
  region: string
  lat: number
  lng: number
  industry: Industry
  employees: number
  outputValue: number
  outputCurrency: "IDR" | "SGD" | "USD"
  capacityMW?: number
  description?: string
}

export type Region = {
  id: string
  name: string
  lat: number
  lng: number
  companies: Company[]
}

export const companies: Company[] = [
  // Jakarta Region
  {
    id: "c1",
    name: "PLN Suralaya",
    region: "Jakarta",
    lat: -6.2088,
    lng: 106.8456,
    industry: "Energy",
    employees: 1250,
    outputValue: 3400,
    outputCurrency: "IDR",
    capacityMW: 3400,
    description: "Indonesia's largest coal-fired power station",
  },
  {
    id: "c2",
    name: "Indo Power Solutions",
    region: "Jakarta",
    lat: -6.2088,
    lng: 106.8456,
    industry: "Energy",
    employees: 890,
    outputValue: 1200,
    outputCurrency: "IDR",
    capacityMW: 1200,
    description: "Renewable energy solutions provider",
  },
  {
    id: "c3",
    name: "Jakarta Energy Corp",
    region: "Jakarta",
    lat: -6.2088,
    lng: 106.8456,
    industry: "Energy",
    employees: 650,
    outputValue: 800,
    outputCurrency: "IDR",
    capacityMW: 800,
    description: "Metropolitan power distribution",
  },
  // Surabaya Region
  {
    id: "c4",
    name: "Paiton Energy",
    region: "Surabaya",
    lat: -7.2575,
    lng: 112.7521,
    industry: "Energy",
    employees: 1100,
    outputValue: 2300,
    outputCurrency: "IDR",
    capacityMW: 2300,
    description: "East Java's primary power generator",
  },
  {
    id: "c5",
    name: "Surabaya Grid Systems",
    region: "Surabaya",
    lat: -7.2575,
    lng: 112.7521,
    industry: "Energy",
    employees: 450,
    outputValue: 660,
    outputCurrency: "IDR",
    capacityMW: 660,
    description: "Smart grid infrastructure provider",
  },
  // Bali Region
  {
    id: "c6",
    name: "Bali Renewable Energy",
    region: "Bali",
    lat: -8.4095,
    lng: 115.1889,
    industry: "Energy",
    employees: 320,
    outputValue: 450,
    outputCurrency: "IDR",
    capacityMW: 450,
    description: "Solar and wind power specialist",
  },
  {
    id: "c7",
    name: "Denpasar Power",
    region: "Bali",
    lat: -8.4095,
    lng: 115.1889,
    industry: "Energy",
    employees: 280,
    outputValue: 380,
    outputCurrency: "IDR",
    capacityMW: 380,
    description: "Island power distribution network",
  },
  // Medan Region
  {
    id: "c8",
    name: "Sumatra Energy Co",
    region: "Medan",
    lat: 3.5952,
    lng: 98.6722,
    industry: "Energy",
    employees: 780,
    outputValue: 1050,
    outputCurrency: "IDR",
    capacityMW: 1050,
    description: "North Sumatra power generation",
  },
  // Makassar Region
  {
    id: "c9",
    name: "Sulawesi Power Grid",
    region: "Makassar",
    lat: -5.1477,
    lng: 119.4327,
    industry: "Energy",
    employees: 520,
    outputValue: 700,
    outputCurrency: "IDR",
    capacityMW: 700,
    description: "Eastern Indonesia power hub",
  },
  {
    id: "c10",
    name: "Makassar Hydro",
    region: "Makassar",
    lat: -5.1477,
    lng: 119.4327,
    industry: "Energy",
    employees: 340,
    outputValue: 480,
    outputCurrency: "IDR",
    capacityMW: 480,
    description: "Hydroelectric power generation",
  },
  // Palembang Region
  {
    id: "c11",
    name: "South Sumatra Energy",
    region: "Palembang",
    lat: -2.9761,
    lng: 104.7754,
    industry: "Energy",
    employees: 620,
    outputValue: 990,
    outputCurrency: "IDR",
    capacityMW: 990,
    description: "Regional power generation facility",
  },
  // Semarang Region
  {
    id: "c12",
    name: "Central Java Power",
    region: "Semarang",
    lat: -6.9666,
    lng: 110.4196,
    industry: "Energy",
    employees: 890,
    outputValue: 1100,
    outputCurrency: "IDR",
    capacityMW: 1100,
    description: "Central Java electricity provider",
  },
  {
    id: "c13",
    name: "Semarang Solar Farm",
    region: "Semarang",
    lat: -6.9666,
    lng: 110.4196,
    industry: "Energy",
    employees: 210,
    outputValue: 320,
    outputCurrency: "IDR",
    capacityMW: 320,
    description: "Large-scale solar power facility",
  },
  // Balikpapan Region
  {
    id: "c14",
    name: "Kalimantan Energy",
    region: "Balikpapan",
    lat: -1.2654,
    lng: 116.8312,
    industry: "Energy",
    employees: 480,
    outputValue: 630,
    outputCurrency: "IDR",
    capacityMW: 630,
    description: "Borneo power generation hub",
  },
]

export const regions: Region[] = [
  {
    id: "r1",
    name: "Jakarta",
    lat: -6.2088,
    lng: 106.8456,
    companies: companies.filter((c) => c.region === "Jakarta"),
  },
  {
    id: "r2",
    name: "Surabaya",
    lat: -7.2575,
    lng: 112.7521,
    companies: companies.filter((c) => c.region === "Surabaya"),
  },
  {
    id: "r3",
    name: "Bali",
    lat: -8.4095,
    lng: 115.1889,
    companies: companies.filter((c) => c.region === "Bali"),
  },
  {
    id: "r4",
    name: "Medan",
    lat: 3.5952,
    lng: 98.6722,
    companies: companies.filter((c) => c.region === "Medan"),
  },
  {
    id: "r5",
    name: "Makassar",
    lat: -5.1477,
    lng: 119.4327,
    companies: companies.filter((c) => c.region === "Makassar"),
  },
  {
    id: "r6",
    name: "Palembang",
    lat: -2.9761,
    lng: 104.7754,
    companies: companies.filter((c) => c.region === "Palembang"),
  },
  {
    id: "r7",
    name: "Semarang",
    lat: -6.9666,
    lng: 110.4196,
    companies: companies.filter((c) => c.region === "Semarang"),
  },
  {
    id: "r8",
    name: "Balikpapan",
    lat: -1.2654,
    lng: 116.8312,
    companies: companies.filter((c) => c.region === "Balikpapan"),
  },
]

export const powerSources = [
  { name: "Coal", value: 36.04, color: "#ff9800" },
  { name: "Natural Gas", value: 27.03, color: "#00e5ff" },
  { name: "Petroleum", value: 18.02, color: "#f44336" },
  { name: "Hydro", value: 7.21, color: "#2196f3" },
  { name: "Solar", value: 4.5, color: "#ffeb3b" },
  { name: "Wind", value: 4.5, color: "#4caf50" },
  { name: "Garbage", value: 2.7, color: "#9c27b0" },
]

export const plantCapacities = [
  { name: "Suralaya", capacity: 3400 },
  { name: "Paiton", capacity: 2300 },
  { name: "Pelabuhan Ratu", capacity: 1050 },
  { name: "Sumur Adem", capacity: 990 },
  { name: "Lontar", capacity: 945 },
  { name: "Adipala", capacity: 660 },
  { name: "Sluke", capacity: 630 },
  { name: "Labuan", capacity: 600 },
]

export const hourlyGeneration = [
  { hour: "1:00", value: 4 },
  { hour: "2:00", value: 3.5 },
  { hour: "3:00", value: 3 },
  { hour: "4:00", value: 4 },
  { hour: "5:00", value: 5 },
  { hour: "6:00", value: 7 },
  { hour: "7:00", value: 9 },
  { hour: "8:00", value: 12 },
  { hour: "9:00", value: 15 },
  { hour: "10:00", value: 17 },
  { hour: "11:00", value: 18 },
  { hour: "12:00", value: 19 },
  { hour: "13:00", value: 20 },
  { hour: "14:00", value: 19 },
]

export const yearlyTransmission = [
  { year: "2010", value: 18 },
  { year: "2011", value: 42 },
  { year: "2012", value: 67 },
  { year: "2013", value: 88 },
  { year: "2014", value: 102 },
  { year: "2015", value: 133 },
  { year: "2016", value: 145 },
  { year: "2017", value: 169 },
  { year: "2018", value: 198 },
  { year: "2019", value: 222 },
]

export const taskCompletion = [
  { task: "Material Purchasing", value: 85 },
  { task: "Coal Burning", value: 72 },
  { task: "Garbage Disposal", value: 60 },
  { task: "Fly Ash Disposal", value: 55 },
  { task: "Device Maintenance", value: 78 },
  { task: "Electricity Charge", value: 90 },
]
