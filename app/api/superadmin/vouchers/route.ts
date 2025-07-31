import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getVouchers, saveVoucher, logActivity } from "@/lib/data"

export async function GET() {
  try {
    await requireAuth("superadmin")
    const vouchers = await getVouchers()
    return NextResponse.json(vouchers)
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("superadmin")
    const { 
      title, 
      description, 
      category, 
      coinValue, 
      quantity, 
      expiryDate, 
      isActive, 
      brand, 
      originalPrice, 
      imageUrl, 
      featured 
    } = await request.json()

    if (!title || !description || !category || !coinValue || !expiryDate || quantity === undefined) {
      return NextResponse.json({ error: "All fields including quantity are required" }, { status: 400 })
    }

    if (quantity < 0) {
      return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 })
    }

    const newVoucher = {
      id: Date.now().toString(),
      title,
      description,
      category,
      coinValue,
      quantity: parseInt(quantity, 10), // Ensure quantity is a number
      expiryDate,
      isActive: isActive ?? true,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      brand: brand || "Custom",
      originalPrice: originalPrice || `$${(coinValue / 10).toFixed(2)}`,
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
      featured: featured ?? false,
    }

    await saveVoucher(newVoucher)
    await logActivity(user.id, "voucher_create", `Created voucher: ${title} (Quantity: ${quantity})`)

    return NextResponse.json(newVoucher)
  } catch (error) {
    console.error("Create voucher error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
