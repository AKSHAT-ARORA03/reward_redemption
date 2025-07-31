"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gift, Calendar, Award, TrendingUp } from "lucide-react"

interface User {
  id: string
  email: string
  coinBalance: number
}

interface RedemptionCode {
  employeeEmail: string
  isRedeemed: boolean
}

interface VoucherPurchase {
  employeeId: string
  isRedeemed: boolean
}

export function EmployeeStats() {
  const [stats, setStats] = useState([
    {
      title: "Coin Balance",
      value: "0",
      description: "Available coins",
      icon: Gift,
      color: "text-blue-600",
    },
    {
      title: "Codes Redeemed",
      value: "0",
      description: "Total codes used",
      icon: Award,
      color: "text-green-600",
    },
    {
      title: "Vouchers Purchased",
      value: "0",
      description: "Total purchases",
      icon: Calendar,
      color: "text-purple-600",
    },
    {
      title: "Vouchers Redeemed",
      value: "0",
      description: "Used vouchers",
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ])
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      // Fetch user auth info
      const authResponse = await fetch("/api/auth/me")
      if (!authResponse.ok) return
      const user = await authResponse.json()

      // Fetch wallet balance
      const walletResponse = await fetch("/api/employee/wallet")
      if (!walletResponse.ok) return
      const walletData = await walletResponse.json()
      const coinBalance = walletData.balance || 0

      // We can add other stats here if needed
      // For now, let's focus on the coin balance which is the main issue

      setStats(prev => prev.map(stat => 
        stat.title === "Coin Balance" 
          ? { ...stat, value: coinBalance.toLocaleString() }
          : stat
      ))
    } catch (error) {
      console.error("Error fetching employee stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Set up an interval to refresh stats periodically
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  // Add a custom event listener to refresh stats when purchases are made
  useEffect(() => {
    const handlePurchaseComplete = () => {
      fetchStats()
    }

    window.addEventListener('voucher-purchase-complete', handlePurchaseComplete)
    return () => window.removeEventListener('voucher-purchase-complete', handlePurchaseComplete)
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
