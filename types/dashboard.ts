export interface DashboardStat {
  title: string
  value: number
  description: string
  trend: number
}

export interface Activity {
  id: string
  title: string
  time: string
  user: string
}

export interface ChartData {
  month: string
  total: number
}