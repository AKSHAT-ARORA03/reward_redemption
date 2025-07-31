import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getCampaigns, getCampaignAnalytics } from "@/lib/data"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("superadmin")
    
    const campaigns = await getCampaigns()
    
    // Add analytics for each campaign
    const campaignsWithAnalytics = await Promise.all(
      campaigns.map(async (campaign) => {
        const analytics = await getCampaignAnalytics(campaign.id)
        return {
          ...campaign,
          analytics
        }
      })
    )

    return NextResponse.json(campaignsWithAnalytics)
  } catch (error) {
    console.error("Get all campaigns error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
