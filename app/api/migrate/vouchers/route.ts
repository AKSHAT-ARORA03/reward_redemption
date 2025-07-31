import { type NextRequest, NextResponse } from "next/server"
import { migrateVouchersAddQuantity } from "@/lib/data"

export async function POST(request: NextRequest) {
  try {
    // Run the migration
    await migrateVouchersAddQuantity()
    
    return NextResponse.json({ 
      success: true, 
      message: "Migration completed successfully - added quantity field to vouchers missing it" 
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Migration failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
