import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { useCampaignRedemptionCode, getUserById, updateUser, addCoinTransaction, logActivity } from "@/lib/data"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("employee")
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Redemption code is required" }, { status: 400 })
    }

    // Try to use the campaign redemption code
    const usedCode = await useCampaignRedemptionCode(code, user.id)
    
    if (!usedCode) {
      return NextResponse.json({ 
        error: "Invalid or already used redemption code" 
      }, { status: 400 })
    }

    // Check if code has expired
    const now = new Date()
    const expiryDate = new Date(usedCode.expiryDate)
    
    if (now > expiryDate) {
      return NextResponse.json({ 
        error: "Redemption code has expired" 
      }, { status: 400 })
    }

    // Add coins to user's balance
    const currentUser = await getUserById(user.id)
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const newBalance = currentUser.coinBalance + usedCode.coinValue
    currentUser.coinBalance = newBalance
    await updateUser(currentUser)

    // Log the transaction
    await addCoinTransaction({
      type: "redeem_code",
      amount: usedCode.coinValue,
      toUserId: user.id,
      description: `Campaign redemption code: ${code}`,
      status: "completed",
    })

    // Log activity
    await logActivity(user.id, "campaign_code_redeem", `Redeemed campaign code: ${code} for ${usedCode.coinValue} coins`)

    return NextResponse.json({
      message: "Redemption code used successfully",
      coinsAdded: usedCode.coinValue,
      newBalance,
      restrictions: {
        type: usedCode.restrictionType,
        allowedCategories: usedCode.allowedCategories,
        allowedBrands: usedCode.allowedBrands,
        allowedVoucherIds: usedCode.allowedVoucherIds
      }
    })
  } catch (error) {
    console.error("Campaign code redemption error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
