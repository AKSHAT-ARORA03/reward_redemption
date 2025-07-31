import { getDatabase } from "./mongodb"
import type { ObjectId } from "mongodb"
import type { 
  Campaign, 
  CampaignParticipant, 
  CampaignRedemptionCode, 
  CampaignAnalytics,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignFilterOptions
} from "../types/campaign"

// User management
export interface User {
  _id?: ObjectId
  id: string
  name: string
  email: string
  password: string
  role: "superadmin" | "company_admin" | "employee"
  companyName?: string
  department?: string
  coinBalance: number
  campaignCoins?: CampaignCoinBalance[] // Campaign-specific coin balances
  createdAt: string
  lastUpdated: string
}

// Campaign coin balance tracking
export interface CampaignCoinBalance {
  campaignId: string
  campaignName: string
  balance: number
  restrictionType: "none" | "category" | "brand" | "specific"
  allowedCategories?: string[]
  allowedBrands?: string[]
  allowedVoucherIds?: string[]
  expiryDate: string
}

export async function getUsers(): Promise<User[]> {
  try {
    const db = await getDatabase()
    const users = await db.collection<User>("users").find({}).toArray()
    console.log(`✅ Fetched ${users.length} users from MongoDB`)
    return users
  } catch (error) {
    console.error("❌ Error fetching users:", error)
    return []
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  try {
    const db = await getDatabase()
    
    // Update all users with their last updated timestamp
    const updatedUsers = users.map(user => ({
      ...user,
      lastUpdated: new Date().toISOString()
    }));

    // Create bulk operations for updating users
    const bulkOps = updatedUsers.map(user => {
      if (user._id) {
        return {
          updateOne: {
            filter: { _id: user._id },
            update: { $set: user }
          }
        };
      } else {
        return {
          updateOne: {
            filter: { id: user.id },
            update: { $set: user },
            upsert: true
          }
        };
      }
    });

    if (bulkOps.length > 0) {
      await db.collection("users").bulkWrite(bulkOps);
    }
    console.log(`✅ Saved ${users.length} users to MongoDB`);
  } catch (error) {
    console.error("❌ Error saving users:", error);
    throw error;
  }
}

export async function saveUser(user: User): Promise<void> {
  try {
    const db = await getDatabase()
    user.lastUpdated = new Date().toISOString()

    if (user._id) {
      await db.collection("users").updateOne({ _id: user._id }, { $set: user })
    } else {
      await db.collection("users").insertOne(user)
    }
    console.log(`✅ Saved user ${user.email} to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving user:", error)
    throw error
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const db = await getDatabase()
    const user = await db.collection<User>("users").findOne({ email })
    return user
  } catch (error) {
    console.error("❌ Error fetching user by email:", error)
    return null
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const db = await getDatabase()
    const user = await db.collection<User>("users").findOne({ id })
    return user
  } catch (error) {
    console.error("❌ Error fetching user by id:", error)
    return null
  }
}

export async function updateUser(updatedUser: User): Promise<void> {
  try {
    const db = await getDatabase()
    updatedUser.lastUpdated = new Date().toISOString()

    await db.collection("users").updateOne({ id: updatedUser.id }, { $set: updatedUser })
    console.log(`✅ Updated user ${updatedUser.email} with balance: ${updatedUser.coinBalance}`)
  } catch (error) {
    console.error("❌ Error updating user:", error)
    throw error
  }
}

export async function createUser(userData: Omit<User, "id" | "createdAt" | "lastUpdated" | "_id">): Promise<User> {
  try {
    const db = await getDatabase()
    const newUser: User = {
      ...userData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    await db.collection("users").insertOne(newUser)
    console.log(`✅ Created new user: ${newUser.email} with balance: ${newUser.coinBalance}`)
    return newUser
  } catch (error) {
    console.error("❌ Error creating user:", error)
    throw error
  }
}

// Voucher management
export interface Voucher {
  _id?: ObjectId
  id: string
  title: string
  description: string
  category: string
  coinValue: number
  quantity: number // Available quantity
  expiryDate: string
  isActive: boolean
  createdAt: string
  createdBy: string
  imageUrl?: string
  featured?: boolean
  brand?: string
  originalPrice?: string
}

// Serialized version of Voucher for client components
export interface SerializedVoucher {
  _id?: string // ObjectId as string for client components
  id: string
  title: string
  description: string
  category: string
  coinValue: number
  quantity: number // Available quantity
  expiryDate: string
  isActive: boolean
  createdAt: string
  createdBy: string
  imageUrl?: string
  featured?: boolean
  brand?: string
  originalPrice?: string
}

export async function getVouchers(): Promise<SerializedVoucher[]> {
  try {
    const db = await getDatabase()
    const vouchers = await db.collection<Voucher>("vouchers").find({}).toArray()
    console.log(`✅ Fetched ${vouchers.length} vouchers from MongoDB`)
    
    // Serialize MongoDB objects to plain JavaScript objects
    const serializedVouchers: SerializedVoucher[] = vouchers.map(voucher => ({
      ...voucher,
      _id: voucher._id ? voucher._id.toString() : undefined, // Convert ObjectId to string
      id: voucher.id,
      title: voucher.title,
      description: voucher.description,
      category: voucher.category,
      coinValue: voucher.coinValue,
      quantity: voucher.quantity,
      expiryDate: voucher.expiryDate,
      isActive: voucher.isActive,
      createdAt: voucher.createdAt,
      createdBy: voucher.createdBy,
      imageUrl: voucher.imageUrl,
      featured: voucher.featured,
      brand: voucher.brand,
      originalPrice: voucher.originalPrice
    }))
    
    return serializedVouchers
  } catch (error) {
    console.error("❌ Error fetching vouchers:", error)
    return []
  }
}

export async function saveVouchers(vouchers: Voucher[]): Promise<void> {
  try {
    const db = await getDatabase()

    // Clear existing vouchers and insert new ones
    await db.collection("vouchers").deleteMany({})
    if (vouchers.length > 0) {
      await db.collection("vouchers").insertMany(vouchers)
    }
    console.log(`✅ Saved ${vouchers.length} vouchers to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving vouchers:", error)
    throw error
  }
}

export async function saveVoucher(voucher: Voucher): Promise<void> {
  try {
    const db = await getDatabase()

    if (voucher._id) {
      await db.collection("vouchers").updateOne({ _id: voucher._id }, { $set: voucher })
    } else {
      await db.collection("vouchers").insertOne(voucher)
    }
    console.log(`✅ Saved voucher ${voucher.title} to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving voucher:", error)
    throw error
  }
}

export async function deleteVoucher(id: string): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("vouchers").deleteOne({ id })
    console.log(`✅ Deleted voucher ${id} from MongoDB`)
  } catch (error) {
    console.error("❌ Error deleting voucher:", error)
    throw error
  }
}

// Coin transactions
export interface CoinTransaction {
  _id?: ObjectId
  id: string
  type: "add" | "remove" | "request" | "approve" | "purchase" | "redeem_code"
  amount: number
  fromUserId?: string
  toUserId?: string
  description: string
  status: "pending" | "approved" | "rejected" | "completed"
  createdAt: string
}

export async function getCoinTransactions(): Promise<CoinTransaction[]> {
  try {
    const db = await getDatabase()
    const transactions = await db.collection<CoinTransaction>("coinTransactions").find({}).toArray()
    console.log(`✅ Fetched ${transactions.length} transactions from MongoDB`)
    return transactions
  } catch (error) {
    console.error("❌ Error fetching transactions:", error)
    return []
  }
}

export async function saveCoinTransaction(transaction: CoinTransaction): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("coinTransactions").insertOne(transaction)
    console.log(`✅ Saved transaction ${transaction.type} to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving transaction:", error)
    throw error
  }
}

export async function saveCoinTransactions(transactions: CoinTransaction[]): Promise<void> {
  try {
    const db = await getDatabase()
    // Delete existing transactions and insert the updated array
    await db.collection("coinTransactions").deleteMany({})
    await db.collection("coinTransactions").insertMany(transactions)
    console.log(`✅ Saved ${transactions.length} transactions to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving transactions:", error)
    throw error
  }
}

export async function addCoinTransaction(
  transaction: Omit<CoinTransaction, "id" | "createdAt" | "_id">,
): Promise<CoinTransaction> {
  try {
    const newTransaction: CoinTransaction = {
      ...transaction,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    }

    await saveCoinTransaction(newTransaction)
    console.log(`✅ Added transaction: ${newTransaction.type} - ${newTransaction.amount} coins`)
    return newTransaction
  } catch (error) {
    console.error("❌ Error adding transaction:", error)
    throw error
  }
}

export async function updateCoinTransaction(transaction: CoinTransaction): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("coinTransactions").updateOne({ id: transaction.id }, { $set: transaction })
    console.log(`✅ Updated transaction ${transaction.id}`)
  } catch (error) {
    console.error("❌ Error updating transaction:", error)
    throw error
  }
}

// Redemption codes for employees
export interface RedemptionCode {
  _id?: ObjectId
  id: string
  code: string
  coinAmount: number
  employeeEmail: string
  employeeName: string
  companyAdminId: string
  isRedeemed: boolean
  redeemedAt?: string
  createdAt: string
  expiresAt: string
  // Email tracking fields
  emailSent?: boolean
  emailStatus?: string
}

export async function getRedemptionCodes(): Promise<RedemptionCode[]> {
  try {
    const db = await getDatabase()
    const codes = await db.collection<RedemptionCode>("redemptionCodes").find({}).toArray()
    console.log(`✅ Fetched ${codes.length} redemption codes from MongoDB`)
    return codes
  } catch (error) {
    console.error("❌ Error fetching redemption codes:", error)
    return []
  }
}

export async function saveRedemptionCode(code: RedemptionCode): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("redemptionCodes").insertOne(code)
    console.log(`✅ Saved redemption code ${code.code} to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving redemption code:", error)
    throw error
  }
}

export async function saveRedemptionCodes(codes: RedemptionCode[]): Promise<void> {
  try {
    const db = await getDatabase()

    if (codes.length > 0) {
      // Create bulk operations for updating codes
      const bulkOps = codes.map(code => {
        if (code._id) {
          return {
            updateOne: {
              filter: { _id: code._id },
              update: { $set: code }
            }
          };
        } else {
          return {
            updateOne: {
              filter: { id: code.id },
              update: { $set: code },
              upsert: true
            }
          };
        }
      });

      await db.collection("redemptionCodes").bulkWrite(bulkOps);
    }
    console.log(`✅ Saved ${codes.length} redemption codes to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving redemption codes:", error)
    throw error
  }
}

export async function updateRedemptionCode(code: RedemptionCode): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("redemptionCodes").updateOne({ id: code.id }, { $set: code })
    console.log(`✅ Updated redemption code ${code.code}`)
  } catch (error) {
    console.error("❌ Error updating redemption code:", error)
    throw error
  }
}

// Employee voucher purchases
export interface VoucherPurchase {
  _id?: ObjectId
  id: string
  voucherId: string
  employeeId: string
  purchasedAt: string
  redeemedAt?: string
  isRedeemed: boolean
}

export async function getVoucherPurchases(): Promise<VoucherPurchase[]> {
  try {
    const db = await getDatabase()
    const purchases = await db.collection<VoucherPurchase>("voucherPurchases").find({}).toArray()
    console.log(`✅ Fetched ${purchases.length} voucher purchases from MongoDB`)
    return purchases
  } catch (error) {
    console.error("❌ Error fetching voucher purchases:", error)
    return []
  }
}

export async function saveVoucherPurchase(purchase: VoucherPurchase): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("voucherPurchases").insertOne(purchase)
    console.log(`✅ Saved voucher purchase to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving voucher purchase:", error)
    throw error
  }
}

export async function saveVoucherPurchases(purchases: VoucherPurchase[]): Promise<void> {
  try {
    const db = await getDatabase()

    if (purchases.length > 0) {
      await db.collection("voucherPurchases").insertMany(purchases)
    }
    console.log(`✅ Saved ${purchases.length} voucher purchases to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving voucher purchases:", error)
    throw error
  }
}

export async function updateVoucherPurchase(purchase: VoucherPurchase): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("voucherPurchases").updateOne({ id: purchase.id }, { $set: purchase })
    console.log(`✅ Updated voucher purchase ${purchase.id}`)
  } catch (error) {
    console.error("❌ Error updating voucher purchase:", error)
    throw error
  }
}

// Activity logs
export interface ActivityLog {
  _id?: ObjectId
  id: string
  userId: string
  action: string
  details: string
  timestamp: string
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  try {
    const db = await getDatabase()
    const logs = await db.collection<ActivityLog>("activityLogs").find({}).toArray()
    console.log(`✅ Fetched ${logs.length} activity logs from MongoDB`)
    return logs
  } catch (error) {
    console.error("❌ Error fetching activity logs:", error)
    return []
  }
}

export async function saveActivityLog(log: ActivityLog): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("activityLogs").insertOne(log)
    console.log(`✅ Saved activity log to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving activity log:", error)
    throw error
  }
}

export async function logActivity(userId: string, action: string, details: string): Promise<void> {
  try {
    const newLog: ActivityLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    }

    await saveActivityLog(newLog)
    console.log(`✅ Logged activity: ${action} - ${details}`)
  } catch (error) {
    console.error("❌ Error logging activity:", error)
  }
}

// Voucher assignments (kept for backward compatibility)
export interface VoucherAssignment {
  _id?: ObjectId
  id: string
  voucherId: string
  employeeId: string
  companyAdminId: string
  assignedAt: string
  redeemedAt?: string
  isRedeemed: boolean
}

export async function getVoucherAssignments(): Promise<VoucherAssignment[]> {
  try {
    const db = await getDatabase()
    const assignments = await db.collection<VoucherAssignment>("voucherAssignments").find({}).toArray()
    console.log(`✅ Fetched ${assignments.length} voucher assignments from MongoDB`)
    return assignments
  } catch (error) {
    console.error("❌ Error fetching voucher assignments:", error)
    return []
  }
}

export async function saveVoucherAssignment(assignment: VoucherAssignment): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("voucherAssignments").insertOne(assignment)
    console.log(`✅ Saved voucher assignment to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving voucher assignment:", error)
    throw error
  }
}

export async function saveVoucherAssignments(assignments: VoucherAssignment[]): Promise<void> {
  try {
    const db = await getDatabase()

    if (assignments.length > 0) {
      await db.collection("voucherAssignments").insertMany(assignments)
    }
    console.log(`✅ Saved ${assignments.length} voucher assignments to MongoDB`)
  } catch (error) {
    console.error("❌ Error saving voucher assignments:", error)
    throw error
  }
}

export async function updateVoucherAssignment(assignment: VoucherAssignment): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("voucherAssignments").updateOne({ id: assignment.id }, { $set: assignment })
    console.log(`✅ Updated voucher assignment ${assignment.id}`)
  } catch (error) {
    console.error("❌ Error updating voucher assignment:", error)
    throw error
  }
}

// Initialize superadmin user and sample data
export async function initializeSuperadmin(): Promise<void> {
  try {
    const existingSuperadmin = await getUserByEmail("superadmin@gmail.com")

    if (!existingSuperadmin) {
      await createUser({
        name: "Super Admin",
        email: "superadmin@gmail.com",
        password: "superadmin",
        role: "superadmin",
        coinBalance: 100000, // Large initial balance
      })
      console.log("✅ Superadmin initialized with 100,000 coins")
    } else {
      console.log(`✅ Superadmin exists with balance: ${existingSuperadmin.coinBalance}`)
    }

    // Initialize comprehensive brand vouchers if none exist
    const vouchers = await getVouchers()
    if (vouchers.length === 0) {
      const brandVouchers = [
        // Featured Premium Vouchers
        {
          id: "voucher1",
          title: "Amazon Gift Card $25",
          description:
            "Shop millions of products on Amazon with this $25 gift card. Perfect for books, electronics, home goods, and more.",
          category: "Shopping",
          coinValue: 250,
          quantity: 100, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=400&h=300&fit=crop",
          featured: true,
          brand: "Amazon",
          originalPrice: "$25.00",
        },
        {
          id: "voucher2",
          title: "Starbucks $10 Gift Card",
          description:
            "Enjoy your favorite coffee, tea, or snack at any Starbucks location worldwide. Valid for 12 months.",
          category: "Food & Beverage",
          coinValue: 100,
          quantity: 50, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop",
          featured: true,
          brand: "Starbucks",
          originalPrice: "$10.00",
        },
        {
          id: "voucher3",
          title: "Netflix Premium 3 Months",
          description:
            "Stream unlimited movies and TV shows in 4K Ultra HD. Access to Netflix's entire catalog for 3 months.",
          category: "Entertainment",
          coinValue: 450,
          quantity: 25, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=300&fit=crop",
          featured: true,
          brand: "Netflix",
          originalPrice: "$45.00",
        },
        {
          id: "voucher4",
          title: "Spotify Premium 6 Months",
          description: "Ad-free music streaming with offline downloads. Access to over 100 million songs and podcasts.",
          category: "Entertainment",
          coinValue: 600,
          quantity: 20, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=400&h=300&fit=crop",
          featured: true,
          brand: "Spotify",
          originalPrice: "$60.00",
        },
        {
          id: "voucher5",
          title: "Apple App Store $15",
          description:
            "Purchase apps, games, music, movies, and more from the Apple App Store. Compatible with iPhone, iPad, and Mac.",
          category: "Technology",
          coinValue: 150,
          quantity: 75, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=400&h=300&fit=crop",
          featured: true,
          brand: "Apple",
          originalPrice: "$15.00",
        },
        {
          id: "voucher6",
          title: "Google Play Store $20",
          description:
            "Download premium apps, games, movies, and books from Google Play Store. Works on all Android devices.",
          category: "Technology",
          coinValue: 200,
          quantity: 60, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=300&fit=crop",
          featured: true,
          brand: "Google",
          originalPrice: "$20.00",
        },

        // Food & Beverage
        {
          id: "voucher7",
          title: "McDonald's Big Mac Meal",
          description: "Enjoy a classic Big Mac meal with fries and drink at any McDonald's restaurant worldwide.",
          category: "Food & Beverage",
          coinValue: 80,
          quantity: 200, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop",
          featured: false,
          brand: "McDonald's",
          originalPrice: "$8.00",
        },
        {
          id: "voucher8",
          title: "Subway Footlong Sub",
          description: "Choose any footlong sub with your favorite toppings at participating Subway locations.",
          category: "Food & Beverage",
          coinValue: 90,
          quantity: 150, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1555072956-7758afb20e8f?w=400&h=300&fit=crop",
          featured: false,
          brand: "Subway",
          originalPrice: "$9.00",
        },
        {
          id: "voucher9",
          title: "Domino's Large Pizza",
          description: "Order any large pizza with up to 3 toppings from Domino's. Delivery or pickup available.",
          category: "Food & Beverage",
          coinValue: 150,
          quantity: 100, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
          featured: false,
          brand: "Domino's",
          originalPrice: "$15.00",
        },

        // Transportation
        {
          id: "voucher10",
          title: "Uber Ride Credit $15",
          description: "Get $15 credit for Uber rides in your city. Perfect for commuting or weekend trips.",
          category: "Transportation",
          coinValue: 150,
          quantity: 80, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop",
          featured: false,
          brand: "Uber",
          originalPrice: "$15.00",
        },
        {
          id: "voucher11",
          title: "Lyft Ride Credit $20",
          description:
            "Enjoy convenient rides with Lyft. $20 credit can be used for multiple trips or one longer journey.",
          category: "Transportation",
          coinValue: 200,
          quantity: 70, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop",
          featured: false,
          brand: "Lyft",
          originalPrice: "$20.00",
        },

        // Gaming
        {
          id: "voucher12",
          title: "Steam Wallet $25",
          description:
            "Add $25 to your Steam wallet to purchase games, DLC, and in-game items from the world's largest gaming platform.",
          category: "Gaming",
          coinValue: 250,
          quantity: 40, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=300&fit=crop",
          featured: false,
          brand: "Steam",
          originalPrice: "$25.00",
        },
        {
          id: "voucher13",
          title: "PlayStation Store $30",
          description: "Purchase games, add-ons, and PlayStation Plus subscriptions from the PlayStation Store.",
          category: "Gaming",
          coinValue: 300,
          quantity: 35, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop",
          featured: false,
          brand: "PlayStation",
          originalPrice: "$30.00",
        },
        {
          id: "voucher14",
          title: "Xbox Game Pass 3 Months",
          description:
            "Access over 100 high-quality games on Xbox console, PC, and mobile devices with Xbox Game Pass Ultimate.",
          category: "Gaming",
          coinValue: 450,
          quantity: 25, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&h=300&fit=crop",
          featured: false,
          brand: "Xbox",
          originalPrice: "$45.00",
        },

        // Health & Fitness
        {
          id: "voucher15",
          title: "Planet Fitness 1 Month",
          description:
            "One month unlimited access to Planet Fitness gyms nationwide. Includes all basic amenities and equipment.",
          category: "Health & Fitness",
          coinValue: 200,
          quantity: 50, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
          featured: false,
          brand: "Planet Fitness",
          originalPrice: "$20.00",
        },
        {
          id: "voucher16",
          title: "Yoga Studio 5 Classes",
          description:
            "Attend 5 yoga classes at participating studios. Perfect for beginners and experienced practitioners.",
          category: "Health & Fitness",
          coinValue: 250,
          quantity: 30, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
          featured: false,
          brand: "Local Yoga Studios",
          originalPrice: "$25.00",
        },

        // Fashion & Beauty
        {
          id: "voucher17",
          title: "Nike Store $40",
          description: "Shop the latest Nike shoes, apparel, and accessories. Valid at Nike stores and online.",
          category: "Fashion",
          coinValue: 400,
          quantity: 60, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
          featured: false,
          brand: "Nike",
          originalPrice: "$40.00",
        },
        {
          id: "voucher18",
          title: "Sephora Beauty $35",
          description:
            "Discover the latest in beauty and skincare at Sephora. Choose from thousands of premium brands.",
          category: "Beauty",
          coinValue: 350,
          quantity: 45, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop",
          featured: false,
          brand: "Sephora",
          originalPrice: "$35.00",
        },

        // Books & Education
        {
          id: "voucher19",
          title: "Barnes & Noble $20",
          description: "Purchase books, magazines, games, and gifts at Barnes & Noble bookstores or online.",
          category: "Education",
          coinValue: 200,
          quantity: 80, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
          featured: false,
          brand: "Barnes & Noble",
          originalPrice: "$20.00",
        },
        {
          id: "voucher20",
          title: "Audible 2 Months Free",
          description:
            "Listen to thousands of audiobooks and podcasts with 2 months of Audible Premium Plus membership.",
          category: "Education",
          coinValue: 300,
          quantity: 40, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
          featured: false,
          brand: "Audible",
          originalPrice: "$30.00",
        },

        // Premium Experience Vouchers
        {
          id: "voucher21",
          title: "Movie Theater Premium Experience",
          description: "Two premium movie tickets with reserved seating and complimentary popcorn and drinks.",
          category: "Entertainment",
          coinValue: 350,
          quantity: 40, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1489185078254-c3365d6e359f?w=400&h=300&fit=crop",
          featured: false,
          brand: "AMC Theaters",
          originalPrice: "$35.00",
        },
        {
          id: "voucher22",
          title: "Spa Day Relaxation Package",
          description: "Full day spa experience including massage, facial, and access to wellness facilities.",
          category: "Health & Wellness",
          coinValue: 800,
          quantity: 15, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop",
          featured: true,
          brand: "Premium Spas",
          originalPrice: "$80.00",
        },
        {
          id: "voucher23",
          title: "Fine Dining Experience",
          description: "Three-course meal for two at a premium restaurant. Wine pairing included.",
          category: "Food & Beverage",
          coinValue: 1000,
          quantity: 10, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
          featured: true,
          brand: "Premium Restaurants",
          originalPrice: "$100.00",
        },
        {
          id: "voucher24",
          title: "Weekend Getaway Hotel",
          description:
            "Two nights at a 4-star hotel including breakfast and late checkout. Perfect for a weekend escape.",
          category: "Travel",
          coinValue: 1500,
          quantity: 5, // Available quantity
          expiryDate: "2024-12-31T23:59:59.000Z",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "superadmin",
          imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
          featured: true,
          brand: "Premium Hotels",
          originalPrice: "$150.00",
        },
      ]

      await saveVouchers(brandVouchers)
      console.log("✅ Comprehensive brand vouchers with images initialized in MongoDB")
    }
  } catch (error) {
    console.error("❌ Error initializing superadmin:", error)
  }
}

// Generate unique redemption code
export function generateRedemptionCode(): string {
  // Generate a 16-digit alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Helper function to transfer coins between users
export async function transferCoins(
  fromUserId: string,
  toUserId: string,
  amount: number,
  description: string,
): Promise<void> {
  try {
    const fromUser = await getUserById(fromUserId)
    const toUser = await getUserById(toUserId)

    if (!fromUser || !toUser) {
      throw new Error("User not found")
    }

    if (fromUser.coinBalance < amount) {
      throw new Error("Insufficient coins")
    }

    // Transfer coins
    fromUser.coinBalance -= amount
    toUser.coinBalance += amount

    await updateUser(fromUser)
    await updateUser(toUser)

    // Log transaction
    await addCoinTransaction({
      type: "approve",
      amount,
      fromUserId,
      toUserId,
      description,
      status: "completed",
    })

    console.log(`✅ Transferred ${amount} coins from ${fromUser.email} to ${toUser.email}`)
  } catch (error) {
    console.error("❌ Error transferring coins:", error)
    throw error
  }
}

// Inventory Management Functions

// Check if voucher has sufficient quantity available
export async function checkVoucherAvailability(voucherId: string, requestedQuantity: number): Promise<boolean> {
  try {
    const db = await getDatabase()
    const voucher = await db.collection<Voucher>("vouchers").findOne({ id: voucherId })
    
    if (!voucher) {
      throw new Error("Voucher not found")
    }
    
    return voucher.quantity >= requestedQuantity
  } catch (error) {
    console.error("❌ Error checking voucher availability:", error)
    throw error
  }
}

// Reduce voucher quantity after purchase
export async function reduceVoucherQuantity(voucherId: string, quantityPurchased: number): Promise<void> {
  try {
    const db = await getDatabase()
    
    // First check if quantity is available
    const voucher = await db.collection<Voucher>("vouchers").findOne({ id: voucherId })
    if (!voucher) {
      throw new Error("Voucher not found")
    }
    
    if (voucher.quantity < quantityPurchased) {
      throw new Error(`Insufficient quantity. Available: ${voucher.quantity}, Requested: ${quantityPurchased}`)
    }
    
    // Update the voucher quantity
    const result = await db.collection<Voucher>("vouchers").updateOne(
      { id: voucherId },
      { $inc: { quantity: -quantityPurchased } }
    )
    
    if (result.matchedCount === 0) {
      throw new Error("Voucher not found")
    }
    
    console.log(`✅ Reduced voucher ${voucherId} quantity by ${quantityPurchased}`)
  } catch (error) {
    console.error("❌ Error reducing voucher quantity:", error)
    throw error
  }
}

// Get voucher with current quantity
export async function getVoucherWithQuantity(voucherId: string): Promise<Voucher | null> {
  try {
    const db = await getDatabase()
    const voucher = await db.collection<Voucher>("vouchers").findOne({ id: voucherId })
    return voucher
  } catch (error) {
    console.error("❌ Error getting voucher with quantity:", error)
    throw error
  }
}

// Migration function to add quantity field to existing vouchers
export async function migrateVouchersAddQuantity(): Promise<void> {
  try {
    const db = await getDatabase()
    
    // Update all vouchers that don't have a quantity field
    const result = await db.collection<Voucher>("vouchers").updateMany(
      { quantity: { $exists: false } }, // Find vouchers without quantity field
      { $set: { quantity: 1 } } // Set default quantity to 1
    )
    
    console.log(`✅ Migration complete: Added quantity field to ${result.modifiedCount} vouchers`)
    
  } catch (error) {
    console.error("❌ Error migrating vouchers:", error)
    throw error
  }
}

// ===========================
// CAMPAIGN MANAGEMENT FUNCTIONS
// ===========================

// Campaign CRUD operations
export async function getCampaigns(): Promise<Campaign[]> {
  try {
    const db = await getDatabase()
    const campaigns = await db.collection<Campaign>("campaigns").find({}).toArray()
    console.log(`✅ Fetched ${campaigns.length} campaigns from MongoDB`)
    return campaigns
  } catch (error) {
    console.error("❌ Error fetching campaigns:", error)
    return []
  }
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  try {
    const db = await getDatabase()
    const campaign = await db.collection<Campaign>("campaigns").findOne({ id })
    return campaign
  } catch (error) {
    console.error("❌ Error fetching campaign by id:", error)
    return null
  }
}

export async function getCampaignsByCompany(companyId: string): Promise<Campaign[]> {
  try {
    const db = await getDatabase()
    const campaigns = await db.collection<Campaign>("campaigns").find({ companyId }).toArray()
    console.log(`✅ Fetched ${campaigns.length} campaigns for company ${companyId}`)
    return campaigns
  } catch (error) {
    console.error("❌ Error fetching campaigns by company:", error)
    return []
  }
}

export async function createCampaign(campaignData: CreateCampaignRequest, companyId: string, createdBy: string): Promise<Campaign> {
  try {
    const db = await getDatabase()
    const newCampaign: Campaign = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      companyId,
      createdBy,
      ...campaignData,
      remainingBudget: campaignData.totalBudget,
      participantCount: 0,
      totalDistributed: 0,
      redemptionCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    await db.collection("campaigns").insertOne(newCampaign)
    console.log(`✅ Created new campaign: ${newCampaign.name}`)
    return newCampaign
  } catch (error) {
    console.error("❌ Error creating campaign:", error)
    throw error
  }
}

export async function updateCampaign(id: string, updates: UpdateCampaignRequest): Promise<Campaign | null> {
  try {
    const db = await getDatabase()
    const updateData = {
      ...updates,
      lastUpdated: new Date().toISOString(),
    }

    const result = await db.collection<Campaign>("campaigns").findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (result) {
      console.log(`✅ Updated campaign: ${id}`)
      return result
    }
    return null
  } catch (error) {
    console.error("❌ Error updating campaign:", error)
    throw error
  }
}

export async function deleteCampaign(id: string): Promise<void> {
  try {
    const db = await getDatabase()
    await db.collection("campaigns").deleteOne({ id })
    console.log(`✅ Deleted campaign: ${id}`)
  } catch (error) {
    console.error("❌ Error deleting campaign:", error)
    throw error
  }
}

// Campaign participants management
export async function getCampaignParticipants(campaignId: string): Promise<CampaignParticipant[]> {
  try {
    const db = await getDatabase()
    const participants = await db.collection<CampaignParticipant>("campaignParticipants").find({ campaignId }).toArray()
    console.log(`✅ Fetched ${participants.length} participants for campaign ${campaignId}`)
    return participants
  } catch (error) {
    console.error("❌ Error fetching campaign participants:", error)
    return []
  }
}

export async function addCampaignParticipant(participant: Omit<CampaignParticipant, "id" | "joinedAt" | "lastActivity" | "_id">): Promise<CampaignParticipant> {
  try {
    const db = await getDatabase()
    const newParticipant: CampaignParticipant = {
      ...participant,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      joinedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    }

    await db.collection("campaignParticipants").insertOne(newParticipant)
    console.log(`✅ Added participant to campaign: ${participant.campaignId}`)
    return newParticipant
  } catch (error) {
    console.error("❌ Error adding campaign participant:", error)
    throw error
  }
}

export async function updateCampaignParticipant(participant: CampaignParticipant): Promise<void> {
  try {
    const db = await getDatabase()
    participant.lastActivity = new Date().toISOString()
    await db.collection("campaignParticipants").updateOne({ id: participant.id }, { $set: participant })
    console.log(`✅ Updated campaign participant: ${participant.id}`)
  } catch (error) {
    console.error("❌ Error updating campaign participant:", error)
    throw error
  }
}

// Campaign redemption codes
export async function getCampaignRedemptionCodes(campaignId: string): Promise<CampaignRedemptionCode[]> {
  try {
    const db = await getDatabase()
    const codes = await db.collection<CampaignRedemptionCode>("campaignRedemptionCodes").find({ campaignId }).toArray()
    console.log(`✅ Fetched ${codes.length} redemption codes for campaign ${campaignId}`)
    return codes
  } catch (error) {
    console.error("❌ Error fetching campaign redemption codes:", error)
    return []
  }
}

export async function getUserCampaignRedemptionCodes(userId: string): Promise<CampaignRedemptionCode[]> {
  try {
    const db = await getDatabase()
    const codes = await db.collection<CampaignRedemptionCode>("campaignRedemptionCodes").find({ userId, isUsed: false }).toArray()
    console.log(`✅ Fetched ${codes.length} unused redemption codes for user ${userId}`)
    return codes
  } catch (error) {
    console.error("❌ Error fetching user campaign redemption codes:", error)
    return []
  }
}

export async function createCampaignRedemptionCode(codeData: Omit<CampaignRedemptionCode, "id" | "code" | "generatedAt" | "isUsed" | "_id">): Promise<CampaignRedemptionCode> {
  try {
    const db = await getDatabase()
    const newCode: CampaignRedemptionCode = {
      ...codeData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      code: generateRedemptionCode(),
      generatedAt: new Date().toISOString(),
      isUsed: false,
      emailSent: false,
    }

    await db.collection("campaignRedemptionCodes").insertOne(newCode)
    console.log(`✅ Created campaign redemption code: ${newCode.code}`)
    return newCode
  } catch (error) {
    console.error("❌ Error creating campaign redemption code:", error)
    throw error
  }
}

export async function useCampaignRedemptionCode(code: string, userId: string): Promise<CampaignRedemptionCode | null> {
  try {
    const db = await getDatabase()
    const redemptionCode = await db.collection<CampaignRedemptionCode>("campaignRedemptionCodes").findOneAndUpdate(
      { code, userId, isUsed: false },
      { 
        $set: { 
          isUsed: true, 
          usedAt: new Date().toISOString() 
        } 
      },
      { returnDocument: 'after' }
    )

    if (redemptionCode) {
      console.log(`✅ Used campaign redemption code: ${code}`)
      return redemptionCode
    }
    return null
  } catch (error) {
    console.error("❌ Error using campaign redemption code:", error)
    throw error
  }
}

// Campaign-aware voucher filtering
export async function getCampaignFilteredVouchers(options: CampaignFilterOptions): Promise<SerializedVoucher[]> {
  try {
    const db = await getDatabase()
    let query: any = { isActive: true }

    // If user has campaigns, apply campaign restrictions
    if (options.campaignId) {
      const campaign = await getCampaignById(options.campaignId)
      if (campaign) {
        switch (campaign.restrictionType) {
          case "category":
            if (campaign.allowedCategories && campaign.allowedCategories.length > 0) {
              query.category = { $in: campaign.allowedCategories }
            }
            break
          case "brand":
            if (campaign.allowedBrands && campaign.allowedBrands.length > 0) {
              query.brand = { $in: campaign.allowedBrands }
            }
            break
          case "specific":
            if (campaign.allowedVoucherIds && campaign.allowedVoucherIds.length > 0) {
              query.id = { $in: campaign.allowedVoucherIds }
            }
            break
        }
      }
    }

    // Apply additional filters
    if (options.categories && options.categories.length > 0) {
      query.category = { $in: options.categories }
    }
    if (options.brands && options.brands.length > 0) {
      query.brand = { $in: options.brands }
    }

    const vouchers = await db.collection<Voucher>("vouchers").find(query).toArray()
    
    // Serialize the results
    const serializedVouchers: SerializedVoucher[] = vouchers.map(voucher => ({
      ...voucher,
      _id: voucher._id ? voucher._id.toString() : undefined,
    }))
    
    console.log(`✅ Fetched ${serializedVouchers.length} campaign-filtered vouchers`)
    return serializedVouchers
  } catch (error) {
    console.error("❌ Error fetching campaign-filtered vouchers:", error)
    return []
  }
}

// Campaign analytics
export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
  try {
    const db = await getDatabase()
    
    // Get campaign basic info
    const campaign = await getCampaignById(campaignId)
    if (!campaign) return null

    // Get participants
    const participants = await getCampaignParticipants(campaignId)
    
    // Get redemption codes
    const redemptionCodes = await getCampaignRedemptionCodes(campaignId)
    
    // Get voucher purchases related to this campaign
    const voucherPurchases = await db.collection("voucherPurchases").find({
      // Add campaign tracking field if needed
    }).toArray()

    // Calculate analytics
    const totalParticipants = participants.length
    const totalCoinsDistributed = participants.reduce((sum, p) => sum + p.coinsReceived, 0)
    const totalCoinsUsed = participants.reduce((sum, p) => sum + p.coinsUsed, 0)
    const totalVouchersPurchased = voucherPurchases.length
    const averageCoinsPerParticipant = totalParticipants > 0 ? totalCoinsDistributed / totalParticipants : 0
    const redemptionRate = totalCoinsDistributed > 0 ? (totalCoinsUsed / totalCoinsDistributed) * 100 : 0

    // Calculate top categories and brands (simplified for now)
    const topCategories: { category: string; usage: number }[] = []
    const topBrands: { brand: string; usage: number }[] = []
    
    // Daily activity (simplified for now)
    const dailyActivity: { date: string; coinsUsed: number; vouchersPurchased: number }[] = []
    
    // Participant activity
    const participantActivity = participants.map(p => ({
      userId: p.userId,
      userName: "User", // Would need to fetch from users collection
      coinsReceived: p.coinsReceived,
      coinsUsed: p.coinsUsed,
      vouchersPurchased: 0, // Would need to calculate from purchases
    }))

    const analytics: CampaignAnalytics = {
      campaignId,
      totalParticipants,
      totalCoinsDistributed,
      totalCoinsUsed,
      totalVouchersPurchased,
      averageCoinsPerParticipant,
      redemptionRate,
      topCategories,
      topBrands,
      dailyActivity,
      participantActivity,
    }

    console.log(`✅ Generated analytics for campaign: ${campaignId}`)
    return analytics
  } catch (error) {
    console.error("❌ Error generating campaign analytics:", error)
    return null
  }
}

// Bulk campaign operations
export async function distributeCampaignCoins(campaignId: string, targetUsers: string[], coinsPerUser: number): Promise<void> {
  try {
    const db = await getDatabase()
    const campaign = await getCampaignById(campaignId)
    
    if (!campaign) {
      throw new Error("Campaign not found")
    }

    const totalCoinsNeeded = targetUsers.length * coinsPerUser
    if (totalCoinsNeeded > campaign.remainingBudget) {
      throw new Error("Insufficient campaign budget")
    }

    // Create participants and add campaign coins to users
    const operations = targetUsers.map(async (userId) => {
      // Add as participant
      await addCampaignParticipant({
        campaignId,
        userId,
        coinsReceived: coinsPerUser,
        coinsUsed: 0,
        redemptionCodes: [],
        isActive: true,
      })

      // Add campaign coins directly to user's account
      await addCampaignCoinsToUser(userId, {
        campaignId,
        campaignName: campaign.name,
        balance: coinsPerUser,
        restrictionType: campaign.restrictionType,
        allowedCategories: campaign.allowedCategories,
        allowedBrands: campaign.allowedBrands,
        allowedVoucherIds: campaign.allowedVoucherIds,
        expiryDate: campaign.endDate,
      })

      // Create redemption code for tracking (optional)
      if (campaign.allowIndividualCodes) {
        await createCampaignRedemptionCode({
          campaignId,
          userId,
          coinValue: coinsPerUser,
          restrictionType: campaign.restrictionType,
          allowedCategories: campaign.allowedCategories,
          allowedBrands: campaign.allowedBrands,
          allowedVoucherIds: campaign.allowedVoucherIds,
          expiryDate: campaign.endDate,
          emailSent: false,
        })
      }
    })

    await Promise.all(operations)

    // Update campaign budget and stats
    await updateCampaign(campaignId, {
      remainingBudget: campaign.remainingBudget - totalCoinsNeeded,
      participantCount: campaign.participantCount + targetUsers.length,
      totalDistributed: campaign.totalDistributed + totalCoinsNeeded,
    })

    console.log(`✅ Distributed ${totalCoinsNeeded} coins to ${targetUsers.length} users in campaign ${campaignId}`)
  } catch (error) {
    console.error("❌ Error distributing campaign coins:", error)
    throw error
  }
}

// Helper function to process manual emails and convert to user IDs
export async function processIndividualEmails(emailString: string): Promise<string[]> {
  try {
    if (!emailString || emailString.trim().length === 0) {
      return []
    }

    // Split emails by comma or newline, clean and validate
    const emails = emailString
      .split(/[,\n]/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0 && email.includes('@'))

    if (emails.length === 0) {
      return []
    }

    // Get users from database and find matching emails
    const allUsers = await getUsers()
    const userIds: string[] = []

    for (const email of emails) {
      const user = allUsers.find(u => u.email.toLowerCase() === email)
      if (user) {
        userIds.push(user.id)
      } else {
        console.warn(`⚠️ Email not found in users: ${email}`)
      }
    }

    console.log(`✅ Processed ${emails.length} emails, found ${userIds.length} matching users`)
    return userIds
  } catch (error) {
    console.error("❌ Error processing individual emails:", error)
    return []
  }
}

// ===========================
// CAMPAIGN COIN MANAGEMENT FUNCTIONS
// ===========================

// Add campaign coins to user
export async function addCampaignCoinsToUser(userId: string, campaignCoinBalance: CampaignCoinBalance): Promise<void> {
  try {
    const user = await getUserById(userId)
    if (!user) {
      throw new Error("User not found")
    }

    // Initialize campaignCoins array if it doesn't exist
    if (!user.campaignCoins) {
      user.campaignCoins = []
    }

    // Check if user already has coins for this campaign
    const existingIndex = user.campaignCoins.findIndex(cc => cc.campaignId === campaignCoinBalance.campaignId)
    
    if (existingIndex >= 0) {
      // Update existing campaign coins
      user.campaignCoins[existingIndex].balance += campaignCoinBalance.balance
    } else {
      // Add new campaign coin balance
      user.campaignCoins.push(campaignCoinBalance)
    }

    await updateUser(user)
    console.log(`✅ Added ${campaignCoinBalance.balance} campaign coins to user ${user.email} for campaign ${campaignCoinBalance.campaignName}`)
  } catch (error) {
    console.error("❌ Error adding campaign coins to user:", error)
    throw error
  }
}

// Check if voucher is eligible for campaign coins
export async function getVoucherCampaignEligibility(userId: string, voucherId: string): Promise<{
  isEligible: boolean
  availableCampaignCoins: CampaignCoinBalance[]
  totalCampaignCoins: number
}> {
  try {
    const user = await getUserById(userId)
    const voucher = await getVoucherWithQuantity(voucherId)
    
    if (!user || !voucher || !user.campaignCoins) {
      return { isEligible: false, availableCampaignCoins: [], totalCampaignCoins: 0 }
    }

    const eligibleCampaignCoins: CampaignCoinBalance[] = []
    let totalCampaignCoins = 0

    // Check each campaign coin balance for eligibility
    for (const campaignCoin of user.campaignCoins) {
      if (campaignCoin.balance <= 0) continue
      
      // Check if voucher matches campaign restrictions
      let isVoucherEligible = false
      
      switch (campaignCoin.restrictionType) {
        case "none":
          isVoucherEligible = true
          break
        case "category":
          isVoucherEligible = campaignCoin.allowedCategories?.includes(voucher.category) || false
          break
        case "brand":
          isVoucherEligible = campaignCoin.allowedBrands?.includes(voucher.brand || "") || false
          break
        case "specific":
          isVoucherEligible = campaignCoin.allowedVoucherIds?.includes(voucher.id) || false
          break
      }

      if (isVoucherEligible) {
        eligibleCampaignCoins.push(campaignCoin)
        totalCampaignCoins += campaignCoin.balance
      }
    }

    return {
      isEligible: eligibleCampaignCoins.length > 0,
      availableCampaignCoins: eligibleCampaignCoins,
      totalCampaignCoins
    }
  } catch (error) {
    console.error("❌ Error checking voucher campaign eligibility:", error)
    return { isEligible: false, availableCampaignCoins: [], totalCampaignCoins: 0 }
  }
}

// Use campaign coins for purchase
export async function useCampaignCoinsForPurchase(
  userId: string, 
  voucherId: string, 
  totalCost: number, 
  useCampaignCoins: boolean = true
): Promise<{
  success: boolean
  campaignCoinsUsed: number
  regularCoinsUsed: number
  remainingCost: number
  error?: string
}> {
  try {
    const user = await getUserById(userId)
    if (!user) {
      return { success: false, campaignCoinsUsed: 0, regularCoinsUsed: 0, remainingCost: totalCost, error: "User not found" }
    }

    let campaignCoinsUsed = 0
    let regularCoinsUsed = 0
    let remainingCost = totalCost

    if (useCampaignCoins && user.campaignCoins) {
      // Check voucher eligibility for campaign coins
      const eligibility = await getVoucherCampaignEligibility(userId, voucherId)
      
      if (eligibility.isEligible) {
        // Use campaign coins first (up to the total cost)
        const availableCampaignCoins = Math.min(eligibility.totalCampaignCoins, remainingCost)
        campaignCoinsUsed = availableCampaignCoins
        remainingCost -= campaignCoinsUsed

        // Deduct campaign coins from user's balances
        let coinsToDeduct = campaignCoinsUsed
        for (const campaignCoin of eligibility.availableCampaignCoins) {
          if (coinsToDeduct <= 0) break
          
          const deductFromThisCampaign = Math.min(campaignCoin.balance, coinsToDeduct)
          campaignCoin.balance -= deductFromThisCampaign
          coinsToDeduct -= deductFromThisCampaign
        }
      }
    }

    // If there's remaining cost, use regular coins
    if (remainingCost > 0) {
      if (user.coinBalance >= remainingCost) {
        regularCoinsUsed = remainingCost
        user.coinBalance -= remainingCost
        remainingCost = 0
      } else {
        return { 
          success: false, 
          campaignCoinsUsed: 0, 
          regularCoinsUsed: 0, 
          remainingCost: totalCost, 
          error: "Insufficient coins (regular + campaign)" 
        }
      }
    }

    // Update user in database
    await updateUser(user)

    console.log(`✅ Purchase completed: Campaign coins: ${campaignCoinsUsed}, Regular coins: ${regularCoinsUsed}`)
    return {
      success: true,
      campaignCoinsUsed,
      regularCoinsUsed,
      remainingCost: 0
    }
  } catch (error) {
    console.error("❌ Error using campaign coins for purchase:", error)
    return { 
      success: false, 
      campaignCoinsUsed: 0, 
      regularCoinsUsed: 0, 
      remainingCost: totalCost, 
      error: "Transaction failed" 
    }
  }
}

// Get user's total available coins (regular + campaign) for a specific voucher
export async function getUserTotalAvailableCoins(userId: string, voucherId?: string): Promise<{
  regularCoins: number
  campaignCoins: number
  totalCoins: number
  eligibleCampaignCoins?: CampaignCoinBalance[]
}> {
  try {
    const user = await getUserById(userId)
    if (!user) {
      return { regularCoins: 0, campaignCoins: 0, totalCoins: 0 }
    }

    const regularCoins = user.coinBalance

    if (!voucherId || !user.campaignCoins) {
      const totalCampaignCoins = user.campaignCoins?.reduce((sum, cc) => sum + cc.balance, 0) || 0
      return { 
        regularCoins, 
        campaignCoins: totalCampaignCoins, 
        totalCoins: regularCoins + totalCampaignCoins 
      }
    }

    // Get campaign coins eligible for this voucher
    const eligibility = await getVoucherCampaignEligibility(userId, voucherId)
    
    return {
      regularCoins,
      campaignCoins: eligibility.totalCampaignCoins,
      totalCoins: regularCoins + eligibility.totalCampaignCoins,
      eligibleCampaignCoins: eligibility.availableCampaignCoins
    }
  } catch (error) {
    console.error("❌ Error getting user total available coins:", error)
    return { regularCoins: 0, campaignCoins: 0, totalCoins: 0 }
  }
}
