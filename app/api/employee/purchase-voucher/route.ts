import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import {
  getUserById,
  updateUser,
  getVouchers,
  getVoucherPurchases,
  saveVoucherPurchases,
  addCoinTransaction,
  logActivity,
  checkVoucherAvailability,
  reduceVoucherQuantity,
  getVoucherWithQuantity,
  useCampaignCoinsForPurchase,
  saveVoucherPurchase
} from "@/lib/data"
import { sendEmail, generateVoucherPurchaseEmail } from "@/lib/email"

interface PurchaseRequest {
  voucherId: string
  quantity: number
  paymentMethod?: "campaign-only" | "regular-only" | "mixed" | "auto"
  campaignCoinsToUse?: number
  regularCoinsToUse?: number
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("employee")
    const { 
      voucherId, 
      quantity = 1, 
      paymentMethod = "auto",
      campaignCoinsToUse = 0,
      regularCoinsToUse = 0
    }: PurchaseRequest = await request.json()

    if (!voucherId) {
      return NextResponse.json({ error: "Voucher ID is required" }, { status: 400 })
    }

    if (quantity < 1) {
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 })
    }

    // Get voucher with current quantity
    const voucher = await getVoucherWithQuantity(voucherId)
    if (!voucher || !voucher.isActive) {
      return NextResponse.json({ error: "Voucher not found or inactive" }, { status: 404 })
    }

    // Check if requested quantity is available
    const isAvailable = await checkVoucherAvailability(voucherId, quantity)
    if (!isAvailable) {
      return NextResponse.json({ 
        error: `Insufficient quantity available. Only ${voucher.quantity} units remaining.` 
      }, { status: 400 })
    }

    // Calculate total cost
    const totalCost = voucher.coinValue * quantity

    // Validate that the specified coin usage matches the total cost
    if (campaignCoinsToUse + regularCoinsToUse !== totalCost) {
      return NextResponse.json({ 
        error: "Campaign coins + regular coins must equal total cost" 
      }, { status: 400 })
    }

    // Attempt purchase with specified coin breakdown
    const useCampaignCoins = campaignCoinsToUse > 0
    const purchaseResult = await useCampaignCoinsForPurchase(user.id, voucherId, totalCost, useCampaignCoins)
    
    if (!purchaseResult.success) {
      return NextResponse.json({ error: purchaseResult.error }, { status: 400 })
    }

    // Verify the actual coin usage matches what was requested
    if (useCampaignCoins && Math.abs(purchaseResult.campaignCoinsUsed - campaignCoinsToUse) > 0.01) {
      return NextResponse.json({ 
        error: `Campaign coin usage mismatch. Requested: ${campaignCoinsToUse}, Available: ${purchaseResult.campaignCoinsUsed}` 
      }, { status: 400 })
    }

    // Reduce voucher quantity
    await reduceVoucherQuantity(voucherId, quantity)

    // Create purchase record(s) - create one record per unit for easier redemption tracking
    const newPurchases = []
    const baseTimestamp = Date.now()
    for (let i = 0; i < quantity; i++) {
      const purchase = {
        id: `${baseTimestamp}-${Math.random().toString(36).substr(2, 9)}-${i}`,
        voucherId: voucher.id,
        employeeId: user.id,
        purchasedAt: new Date().toISOString(),
        isRedeemed: false,
      }
      await saveVoucherPurchase(purchase)
      newPurchases.push(purchase)
    }

    // Create transaction record with detailed payment breakdown
    const transactionDescription = campaignCoinsToUse > 0 
      ? `Purchased ${quantity}x ${voucher.title} (Campaign: ${campaignCoinsToUse}, Regular: ${regularCoinsToUse}) - ${paymentMethod} method`
      : `Purchased ${quantity}x ${voucher.title} (${regularCoinsToUse} regular coins) - ${paymentMethod} method`

    await addCoinTransaction({
      type: "purchase",
      amount: totalCost,
      fromUserId: user.id,
      description: transactionDescription,
      status: "completed",
    })

    await logActivity(
      user.id, 
      "voucher_purchase", 
      `Purchased ${quantity}x ${voucher.title} for ${totalCost} coins total`
    )

    // Get updated user info for email and response
    const updatedUser = await getUserById(user.id)
    if (!updatedUser) {
      throw new Error("Failed to get updated user info")
    }

    // Send email confirmation to employee
    try {
      console.log(`🔄 Preparing to send purchase confirmation email to ${updatedUser.email}`)
      
      const emailHtml = generateVoucherPurchaseEmail(
        updatedUser.name,
        voucher.title,
        quantity,
        totalCost,
        updatedUser.coinBalance,
        updatedUser.companyName || "Your Company"
      )
      
      console.log(`📧 Generated email content for voucher purchase`)
      
      const emailResult = await sendEmail(
        updatedUser.email,
        `Purchase Confirmation - ${quantity}x ${voucher.title}`,
        emailHtml
      )
      
      if (emailResult.success) {
        console.log(`✅ Purchase confirmation email sent successfully to ${updatedUser.email}`)
      } else {
        console.error(`❌ Email sending failed: ${emailResult.message}`)
      }
    } catch (emailError) {
      console.error("❌ Failed to send purchase confirmation email:", emailError)
      // Don't fail the purchase if email fails
    }

    console.log(
      `Employee ${user.email} purchased ${quantity}x ${voucher.title} for ${totalCost} coins. Campaign: ${campaignCoinsToUse}, Regular: ${regularCoinsToUse} using ${paymentMethod} method`,
    )

    return NextResponse.json({
      message: `Successfully purchased ${quantity} voucher(s)`,
      newBalance: updatedUser.coinBalance,
      quantityPurchased: quantity,
      paymentBreakdown: {
        totalCost,
        campaignCoinsUsed: campaignCoinsToUse,
        regularCoinsUsed: regularCoinsToUse,
        paymentMethod
      }
    })
  } catch (error) {
    console.error("Purchase error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
