import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getCampaignsByCompany, createCampaign, logActivity, processIndividualEmails } from "@/lib/data"
import type { CreateCampaignRequest } from "@/types/campaign"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("company_admin")
    
    const campaigns = await getCampaignsByCompany(user.id)
    
    return NextResponse.json(campaigns)
  } catch (error) {
    console.error("Get campaigns error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("company_admin")
    const campaignData: CreateCampaignRequest = await request.json()

    // Validate required fields
    if (!campaignData.name || !campaignData.description || !campaignData.totalBudget || !campaignData.targetType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate budget
    if (campaignData.totalBudget <= 0) {
      return NextResponse.json({ error: "Budget must be greater than 0" }, { status: 400 })
    }

    // Validate target type specific requirements
    if (campaignData.targetType === "individual") {
      const hasTargetUsers = campaignData.targetUsers && campaignData.targetUsers.length > 0
      const hasIndividualEmails = campaignData.individualEmails && campaignData.individualEmails.trim().length > 0
      
      if (!hasTargetUsers && !hasIndividualEmails) {
        return NextResponse.json({ 
          error: "Either target users or individual emails are required for individual targeting" 
        }, { status: 400 })
      }
    }

    if (campaignData.targetType === "department" && !campaignData.targetDepartment) {
      return NextResponse.json({ error: "Target department is required for department targeting" }, { status: 400 })
    }

    // Validate restriction type specific requirements
    if (campaignData.restrictionType === "category" && (!campaignData.allowedCategories || campaignData.allowedCategories.length === 0)) {
      return NextResponse.json({ error: "Allowed categories are required for category restrictions" }, { status: 400 })
    }

    if (campaignData.restrictionType === "brand" && (!campaignData.allowedBrands || campaignData.allowedBrands.length === 0)) {
      return NextResponse.json({ error: "Allowed brands are required for brand restrictions" }, { status: 400 })
    }

    if (campaignData.restrictionType === "specific" && (!campaignData.allowedVoucherIds || campaignData.allowedVoucherIds.length === 0)) {
      return NextResponse.json({ error: "Allowed vouchers are required for specific voucher restrictions" }, { status: 400 })
    }

    // Validate dates
    const startDate = new Date(campaignData.startDate)
    const endDate = new Date(campaignData.endDate)
    const now = new Date()

    if (startDate >= endDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    }

    if (endDate <= now) {
      return NextResponse.json({ error: "End date must be in the future" }, { status: 400 })
    }

    // Process individual emails if provided and merge with targetUsers
    if (campaignData.targetType === "individual" && campaignData.individualEmails) {
      const emailUserIds = await processIndividualEmails(campaignData.individualEmails)
      
      // Merge with existing targetUsers, avoiding duplicates
      const existingUserIds = campaignData.targetUsers || []
      const allUserIds = [...new Set([...existingUserIds, ...emailUserIds])]
      campaignData.targetUsers = allUserIds
      
      console.log(`📧 Processed manual emails: found ${emailUserIds.length} users, total targets: ${allUserIds.length}`)
    }

    // Create the campaign
    const newCampaign = await createCampaign(campaignData, user.id, user.id)
    
    // Log activity
    await logActivity(user.id, "campaign_create", `Created campaign: ${newCampaign.name}`)

    return NextResponse.json(newCampaign, { status: 201 })
  } catch (error) {
    console.error("Create campaign error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
