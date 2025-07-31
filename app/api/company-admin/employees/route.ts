import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getUsers } from "@/lib/data"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("company_admin")
    
    // Get all users and filter for employees only
    const allUsers = await getUsers()
    const employees = allUsers.filter(u => u.role === "employee")
    
    // Return basic employee information
    const employeeData = employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      department: emp.department || "General", // Default department if not set
      coinBalance: emp.coinBalance,
    }))
    
    return NextResponse.json(employeeData)
  } catch (error) {
    console.error("Get employees error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
