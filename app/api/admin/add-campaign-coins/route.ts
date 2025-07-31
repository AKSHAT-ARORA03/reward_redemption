import { type NextRequest, NextResponse } from "next/server"
import { getUserById, updateUser } from "@/lib/data"

export async function POST(request: NextRequest) {
  try {
    const { email, campaignCoins } = await request.json()
    
    if (!email || !campaignCoins) {
      return NextResponse.json({ error: "Email and campaign coins are required" }, { status: 400 })
    }

    // Find user by email
    const users = await import("@/lib/data").then(mod => mod.getUsers())
    const user = users.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user with campaign coins
    const updatedUser = {
      ...user,
      campaignCoins: campaignCoins
    }

    await updateUser(updatedUser)

    return NextResponse.json({ 
      message: "Campaign coins added successfully",
      user: updatedUser
    })
  } catch (error) {
    console.error("Add campaign coins error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
