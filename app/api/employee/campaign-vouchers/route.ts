import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getUserCampaignRedemptionCodes, getCampaignFilteredVouchers } from "@/lib/data"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("employee")
    
    // Get user's campaign redemption codes
    const campaignCodes = await getUserCampaignRedemptionCodes(user.id)
    
    // Get campaign-filtered vouchers based on user's active campaigns
    let availableVouchers: any[] = []
    
    if (campaignCodes.length > 0) {
      // User has campaign codes, filter vouchers accordingly
      for (const code of campaignCodes) {
        const filteredVouchers = await getCampaignFilteredVouchers({
          userId: user.id,
          campaignId: code.campaignId,
          restrictionType: code.restrictionType,
          categories: code.allowedCategories,
          brands: code.allowedBrands,
        })
        
        // Merge vouchers (avoid duplicates)
        for (const voucher of filteredVouchers) {
          if (!availableVouchers.find(v => v.id === voucher.id)) {
            availableVouchers.push({
              ...voucher,
              campaignRestricted: true,
              availableCampaigns: [code.campaignId]
            })
          }
        }
      }
    } else {
      // User has no campaign codes, show all vouchers
      availableVouchers = await getCampaignFilteredVouchers({
        userId: user.id,
      })
      
      availableVouchers = availableVouchers.map(voucher => ({
        ...voucher,
        campaignRestricted: false
      }))
    }

    return NextResponse.json({
      vouchers: availableVouchers,
      campaignCodes: campaignCodes.map(code => ({
        id: code.id,
        campaignId: code.campaignId,
        coinValue: code.coinValue,
        restrictionType: code.restrictionType,
        allowedCategories: code.allowedCategories,
        allowedBrands: code.allowedBrands,
        expiryDate: code.expiryDate,
        isUsed: code.isUsed
      }))
    })
  } catch (error) {
    console.error("Get campaign vouchers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
