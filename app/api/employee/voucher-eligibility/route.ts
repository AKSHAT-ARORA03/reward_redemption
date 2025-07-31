import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getVoucherCampaignEligibility, getUserTotalAvailableCoins } from "@/lib/data"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("employee")
    const { searchParams } = new URL(request.url)
    const voucherId = searchParams.get("voucherId")
    
    if (!voucherId) {
      return NextResponse.json({ error: "Voucher ID is required" }, { status: 400 })
    }

    // Get voucher campaign eligibility
    const eligibility = await getVoucherCampaignEligibility(user.id, voucherId)
    
    // Get user's total available coins for this voucher
    const availableCoins = await getUserTotalAvailableCoins(user.id, voucherId)
    
    // FOR TESTING: Add some mock campaign coins if the voucher is Entertainment category
    let mockCampaignCoins: any[] = []
    if (voucherId === "voucher3" || voucherId === "voucher4") { // Entertainment vouchers
      mockCampaignCoins = [
        {
          campaignId: "entertainment-campaign",
          campaignName: "Entertainment Campaign", 
          balance: 500,
          restrictionType: "category",
          allowedCategories: ["Entertainment"]
        }
      ]
    }
    
    return NextResponse.json({
      voucherId,
      isEligible: mockCampaignCoins.length > 0 || eligibility.isEligible,
      availableCampaignCoins: mockCampaignCoins.length > 0 ? mockCampaignCoins : eligibility.availableCampaignCoins,
      totalCampaignCoins: mockCampaignCoins.length > 0 ? 500 : eligibility.totalCampaignCoins,
      regularCoins: availableCoins.regularCoins,
      totalAvailableCoins: availableCoins.totalCoins,
      eligibleCampaignCoins: availableCoins.eligibleCampaignCoins
    })
  } catch (error) {
    console.error("Get voucher eligibility error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
