import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getCampaignById, updateCampaign, deleteCampaign, logActivity } from "@/lib/data"
import type { UpdateCampaignRequest } from "@/types/campaign"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth("company_admin")
    const { id } = await params

    const campaign = await getCampaignById(id)
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Ensure user can only access their own campaigns
    if (campaign.companyId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json(campaign)
  } catch (error) {
    console.error("Get campaign error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth("company_admin")
    const { id } = await params
    const updates: UpdateCampaignRequest = await request.json()

    const existingCampaign = await getCampaignById(id)
    
    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Ensure user can only update their own campaigns
    if (existingCampaign.companyId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Validate dates if provided
    if (updates.startDate && updates.endDate) {
      const startDate = new Date(updates.startDate)
      const endDate = new Date(updates.endDate)

      if (startDate >= endDate) {
        return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
      }
    }

    // Validate restriction type specific requirements if provided
    if (updates.restrictionType === "category" && (!updates.allowedCategories || updates.allowedCategories.length === 0)) {
      return NextResponse.json({ error: "Allowed categories are required for category restrictions" }, { status: 400 })
    }

    if (updates.restrictionType === "brand" && (!updates.allowedBrands || updates.allowedBrands.length === 0)) {
      return NextResponse.json({ error: "Allowed brands are required for brand restrictions" }, { status: 400 })
    }

    if (updates.restrictionType === "specific" && (!updates.allowedVoucherIds || updates.allowedVoucherIds.length === 0)) {
      return NextResponse.json({ error: "Allowed vouchers are required for specific voucher restrictions" }, { status: 400 })
    }

    // Update the campaign
    const updatedCampaign = await updateCampaign(id, updates)
    
    if (!updatedCampaign) {
      return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
    }

    // Log activity
    await logActivity(user.id, "campaign_update", `Updated campaign: ${updatedCampaign.name}`)

    return NextResponse.json(updatedCampaign)
  } catch (error) {
    console.error("Update campaign error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth("company_admin")
    const { id } = await params

    const existingCampaign = await getCampaignById(id)
    
    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Ensure user can only delete their own campaigns
    if (existingCampaign.companyId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if campaign has participants - prevent deletion if active
    if (existingCampaign.participantCount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete campaign with participants. Deactivate instead." 
      }, { status: 400 })
    }

    await deleteCampaign(id)
    
    // Log activity
    await logActivity(user.id, "campaign_delete", `Deleted campaign: ${existingCampaign.name}`)

    return NextResponse.json({ message: "Campaign deleted successfully" })
  } catch (error) {
    console.error("Delete campaign error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
