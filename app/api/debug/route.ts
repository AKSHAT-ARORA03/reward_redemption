import { NextResponse } from "next/server"
import { getUsers, getCoinTransactions, getVouchers } from "@/lib/data"

export async function GET() {
  try {
    const users = await getUsers()
    const transactions = await getCoinTransactions()
    const vouchers = await getVouchers()

    const debugInfo = {
      dataDirectory: process.cwd() + "/data",
      users: users.length,
      transactions: transactions.length,
      vouchers: vouchers.length,
      superadmin: users.find((u) => u.role === "superadmin"),
      allUsers: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        coinBalance: u.coinBalance,
        lastUpdated: u.lastUpdated,
      })),
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json({ error: "Debug failed", details: error }, { status: 500 })
  }
}
