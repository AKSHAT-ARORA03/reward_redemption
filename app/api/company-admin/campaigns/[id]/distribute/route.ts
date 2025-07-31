import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { distributeCampaignCoins, getCampaignById, getUsers, logActivity, processIndividualEmails } from "@/lib/data"
import { generateCampaignDistributionEmail, sendEmail } from "@/lib/email"
import type { CampaignDistributionRequest } from "@/types/campaign"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth("company_admin")
    const { id } = await params
    const distributionData: CampaignDistributionRequest = await request.json()

    const campaign = await getCampaignById(id)
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Ensure user can only distribute their own campaigns
    if (campaign.companyId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if campaign is active
    if (!campaign.isActive) {
      return NextResponse.json({ error: "Campaign is not active" }, { status: 400 })
    }

    // Check campaign dates
    const now = new Date()
    const startDate = new Date(campaign.startDate)
    const endDate = new Date(campaign.endDate)

    if (now < startDate) {
      return NextResponse.json({ error: "Campaign has not started yet" }, { status: 400 })
    }

    if (now > endDate) {
      return NextResponse.json({ error: "Campaign has ended" }, { status: 400 })
    }

    // Get target users based on campaign target type
    let targetUsers: string[] = []
    const allUsers = await getUsers()

    switch (campaign.targetType) {
      case "all":
        // Get all employees in the company
        targetUsers = allUsers
          .filter(u => u.role === "employee" && u.companyName === user.companyName)
          .map(u => u.id)
        break
      
      case "individual":
        let individualTargetUsers: string[] = []
        
        // Add users from checkbox selection
        if (campaign.targetUsers && campaign.targetUsers.length > 0) {
          individualTargetUsers = [...campaign.targetUsers]
        }
        
        // Add users from manual email input (if campaign was created with individualEmails)
        // Note: This would require storing individualEmails in the campaign or processing during distribution
        // For now, we'll use the existing targetUsers from campaign
        
        targetUsers = individualTargetUsers
        break
      
      case "department":
        // For now, we'll use companyName as department (can be enhanced later)
        targetUsers = allUsers
          .filter(u => u.role === "employee" && u.companyName === campaign.targetDepartment)
          .map(u => u.id)
        break
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: "No target users found" }, { status: 400 })
    }

    // Calculate coins per user
    const coinsPerUser = campaign.coinsPerEmployee || Math.floor(campaign.remainingBudget / targetUsers.length)
    
    if (coinsPerUser <= 0) {
      return NextResponse.json({ error: "Insufficient budget for distribution" }, { status: 400 })
    }

    // Distribute coins
    await distributeCampaignCoins(id, targetUsers, coinsPerUser)

    // Send email notifications if enabled
    if (campaign.emailNotifications) {
      const targetUserDetails = allUsers.filter(u => targetUsers.includes(u.id))
      
      for (const targetUser of targetUserDetails) {
        try {
          const emailContent = generateCampaignDistributionEmail(
            targetUser.name,
            campaign.name,
            coinsPerUser,
            campaign.description,
            campaign.restrictionType,
            campaign.allowedCategories,
            campaign.allowedBrands,
            distributionData.customMessage
          )
          
          await sendEmail(
            targetUser.email,
            `🎉 You've received ${coinsPerUser} coins from ${campaign.name}!`,
            emailContent
          )
        } catch (emailError) {
          console.error(`Failed to send email to ${targetUser.email}:`, emailError)
        }
      }
    }

    // Log activity
    await logActivity(
      user.id, 
      "campaign_distribute", 
      `Distributed ${coinsPerUser * targetUsers.length} coins to ${targetUsers.length} users in campaign: ${campaign.name}`
    )

    return NextResponse.json({
      message: "Campaign distribution completed successfully",
      targetUsers: targetUsers.length,
      coinsPerUser,
      totalDistributed: coinsPerUser * targetUsers.length,
      emailsSent: campaign.emailNotifications
    })
  } catch (error) {
    console.error("Campaign distribution error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
