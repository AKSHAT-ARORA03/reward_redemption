// Campaign-based reward system types
import type { ObjectId } from "mongodb"

export interface Campaign {
  _id?: ObjectId
  id: string
  name: string
  description: string
  companyId: string // Company admin who created the campaign
  
  // Targeting options
  targetType: "all" | "individual" | "department"
  targetUsers?: string[] // User IDs for individual targeting
  targetDepartment?: string // Department name for department targeting
  
  // Budget and coin management
  totalBudget: number // Total coins allocated for this campaign
  remainingBudget: number // Remaining coins available
  coinsPerEmployee?: number // For bulk distribution campaigns
  
  // Voucher restrictions
  restrictionType: "none" | "category" | "brand" | "specific"
  allowedCategories?: string[] // For category restrictions
  allowedBrands?: string[] // For brand restrictions
  allowedVoucherIds?: string[] // For specific voucher restrictions
  
  // Campaign lifecycle
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  lastUpdated: string
  
  // Campaign settings
  allowIndividualCodes: boolean // Whether to generate individual redemption codes
  emailNotifications: boolean // Whether to send email notifications
  maxCoinsPerEmployee?: number // Maximum coins an employee can receive from this campaign
  
  // Statistics
  participantCount: number
  totalDistributed: number
  redemptionCount: number
  
  // Metadata
  createdBy: string // User ID of creator
  tags?: string[] // For easy filtering and organization
}

export interface CampaignParticipant {
  _id?: ObjectId
  id: string
  campaignId: string
  userId: string
  coinsReceived: number
  coinsUsed: number
  redemptionCodes: string[] // Array of redemption code IDs
  joinedAt: string
  lastActivity: string
  isActive: boolean
}

export interface CampaignRedemptionCode {
  _id?: ObjectId
  id: string
  campaignId: string
  userId: string
  code: string
  coinValue: number
  restrictionType: "none" | "category" | "brand" | "specific"
  allowedCategories?: string[]
  allowedBrands?: string[]
  allowedVoucherIds?: string[]
  isUsed: boolean
  usedAt?: string
  generatedAt: string
  expiryDate: string
  emailSent: boolean
}

// Enhanced voucher interface with campaign support
export interface CampaignAwareVoucher {
  id: string
  title: string
  description: string
  category: string
  brand?: string
  coinValue: number
  quantity: number
  expiryDate: string
  isActive: boolean
  
  // Campaign restrictions
  campaignRestricted: boolean
  allowedCampaigns?: string[] // Campaign IDs that can access this voucher
  restrictedCategories?: string[]
  restrictedBrands?: string[]
  
  // Enhanced metadata
  originalPrice?: string
  imageUrl?: string
  featured?: boolean
  createdAt: string
}

// Campaign analytics interface
export interface CampaignAnalytics {
  campaignId: string
  totalParticipants: number
  totalCoinsDistributed: number
  totalCoinsUsed: number
  totalVouchersPurchased: number
  averageCoinsPerParticipant: number
  redemptionRate: number // Percentage of coins used vs distributed
  topCategories: { category: string; usage: number }[]
  topBrands: { brand: string; usage: number }[]
  dailyActivity: { date: string; coinsUsed: number; vouchersPurchased: number }[]
  participantActivity: { userId: string; userName: string; coinsReceived: number; coinsUsed: number; vouchersPurchased: number }[]
}

// API request/response types
export interface CreateCampaignRequest {
  name: string
  description: string
  targetType: "all" | "individual" | "department"
  targetUsers?: string[]
  targetDepartment?: string
  individualEmails?: string // Manual email input for individual targeting
  totalBudget: number
  coinsPerEmployee?: number
  restrictionType: "none" | "category" | "brand" | "specific"
  allowedCategories?: string[]
  allowedBrands?: string[]
  allowedVoucherIds?: string[]
  startDate: string
  endDate: string
  allowIndividualCodes: boolean
  emailNotifications: boolean
  maxCoinsPerEmployee?: number
  tags?: string[]
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  isActive?: boolean
  remainingBudget?: number
  participantCount?: number
  totalDistributed?: number
  redemptionCount?: number
}

export interface CampaignDistributionRequest {
  campaignId: string
  distributionType: "immediate" | "scheduled"
  scheduledDate?: string
  customMessage?: string
}

export interface CampaignFilterOptions {
  userId?: string
  campaignId?: string
  restrictionType?: string
  categories?: string[]
  brands?: string[]
}
