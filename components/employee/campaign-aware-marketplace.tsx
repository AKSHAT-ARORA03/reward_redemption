"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, Coins, Package, Gift, Tag, AlertCircle, Star } from "lucide-react"

interface CampaignVoucher {
  id: string
  title: string
  description: string
  category: string
  brand?: string
  coinValue: number
  quantity: number
  expiryDate: string
  isActive: boolean
  campaignRestricted: boolean
  availableCampaigns?: string[]
}

interface CampaignCode {
  id: string
  campaignId: string
  coinValue: number
  restrictionType: string
  allowedCategories?: string[]
  allowedBrands?: string[]
  expiryDate: string
  isUsed: boolean
}

interface VoucherEligibility {
  voucherId: string
  isEligible: boolean
  availableCampaignCoins: any[]
  totalCampaignCoins: number
  regularCoins: number
  totalAvailableCoins: number
}

export function CampaignAwareMarketplace() {
  const [vouchers, setVouchers] = useState<CampaignVoucher[]>([])
  const [campaignCodes, setCampaignCodes] = useState<CampaignCode[]>([])
  const [coinBalance, setCoinBalance] = useState(0)
  const [campaignCoinsTotal, setCampaignCoinsTotal] = useState(0)
  const [voucherEligibility, setVoucherEligibility] = useState<Map<string, VoucherEligibility>>(new Map())
  const [loading, setLoading] = useState(false)
  const [purchaseDialog, setPurchaseDialog] = useState<{open: boolean, voucher: CampaignVoucher | null}>({
    open: false,
    voucher: null
  })
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [useCampaignCoins, setUseCampaignCoins] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<"campaign-only" | "regular-only" | "mixed" | "auto">("auto")
  const [selectedFilter, setSelectedFilter] = useState<"all" | "campaign" | "unrestricted">("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [vouchersRes, walletRes, userRes] = await Promise.all([
        fetch("/api/employee/campaign-vouchers"),
        fetch("/api/employee/wallet"),
        fetch("/api/auth/me")
      ])

      if (vouchersRes.ok) {
        const vouchersData = await vouchersRes.json()
        setVouchers(vouchersData.vouchers)
        setCampaignCodes(vouchersData.campaignCodes)
        
        // Check eligibility for each voucher
        if (vouchersData.vouchers) {
          const eligibilityMap = new Map<string, VoucherEligibility>()
          for (const voucher of vouchersData.vouchers) {
            try {
              const eligibilityRes = await fetch(`/api/employee/voucher-eligibility?voucherId=${voucher.id}`)
              if (eligibilityRes.ok) {
                const eligibility = await eligibilityRes.json()
                eligibilityMap.set(voucher.id, eligibility)
              }
            } catch (error) {
              console.error(`Failed to check eligibility for voucher ${voucher.id}:`, error)
            }
          }
          setVoucherEligibility(eligibilityMap)
        }
      }

      if (walletRes.ok) {
        const walletData = await walletRes.json()
        setCoinBalance(walletData.balance)
      }

      if (userRes.ok) {
        const userData = await userRes.json()
        // Calculate total campaign coins
        const totalCampaignCoins = userData.campaignCoins?.reduce((sum: number, cc: any) => sum + cc.balance, 0) || 0
        setCampaignCoinsTotal(totalCampaignCoins)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    }
  }

  const handlePurchase = async () => {
    if (!purchaseDialog.voucher) return

    setLoading(true)
    try {
      const breakdown = calculatePaymentBreakdown(purchaseDialog.voucher, selectedQuantity)
      
      if (!breakdown.canAfford) {
        toast({
          title: "Insufficient coins",
          description: `You need ${breakdown.totalCost} coins. Available: ${breakdown.regularBalance} regular + ${breakdown.availableCampaignCoins} campaign coins`,
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/employee/purchase-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          voucherId: purchaseDialog.voucher.id,
          quantity: selectedQuantity,
          paymentMethod: paymentMethod,
          campaignCoinsToUse: breakdown.campaignCoinsUsed,
          regularCoinsToUse: breakdown.regularCoinsUsed
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Create detailed success message
        let paymentDetails = ""
        if (breakdown.campaignCoinsUsed > 0 && breakdown.regularCoinsUsed > 0) {
          paymentDetails = ` using ${breakdown.campaignCoinsUsed} campaign + ${breakdown.regularCoinsUsed} regular coins`
        } else if (breakdown.campaignCoinsUsed > 0) {
          paymentDetails = ` using ${breakdown.campaignCoinsUsed} campaign coins`
        } else {
          paymentDetails = ` using ${breakdown.regularCoinsUsed} regular coins`
        }
        
        toast({
          title: "Purchase successful! 🎉",
          description: `Successfully purchased ${selectedQuantity} voucher(s) for ${breakdown.totalCost} coins${paymentDetails}`,
        })
        setCoinBalance(result.newBalance)
        setPurchaseDialog({ open: false, voucher: null })
        setSelectedQuantity(1)
        setPaymentMethod("auto")
        
        // Refresh all data to get updated campaign coins and voucher quantities
        await fetchData()
        fetchData()
        
        // Trigger custom event to refresh stats in other components
        window.dispatchEvent(new CustomEvent('voucher-purchase-complete'))
      } else {
        const error = await response.json()
        toast({
          title: "Purchase failed",
          description: error.error || "Something went wrong",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getMaxQuantity = (voucher: CampaignVoucher) => {
    const eligibility = voucherEligibility.get(voucher.id)
    const availableCampaignCoins = eligibility?.isEligible ? 
      (eligibility.availableCampaignCoins as any[])?.reduce((sum: number, cc: any) => sum + cc.balance, 0) || 0 : 0

    switch (paymentMethod) {
      case "campaign-only":
        return eligibility?.isEligible ? 
          Math.min(voucher.quantity || 1, Math.floor(availableCampaignCoins / voucher.coinValue)) : 0
      
      case "regular-only":
        return Math.min(voucher.quantity || 1, Math.floor(coinBalance / voucher.coinValue))
      
      case "mixed":
      case "auto":
      default:
        if (eligibility?.isEligible) {
          const totalAvailable = coinBalance + availableCampaignCoins
          return Math.min(voucher.quantity || 1, Math.floor(totalAvailable / voucher.coinValue))
        }
        return Math.min(voucher.quantity || 1, Math.floor(coinBalance / voucher.coinValue))
    }
  }

  const canAffordPurchase = (voucher: CampaignVoucher, quantity: number) => {
    const breakdown = calculatePaymentBreakdown(voucher, quantity)
    return breakdown.canAfford
  }

  const openPurchaseDialog = (voucher: CampaignVoucher) => {
    setPurchaseDialog({ open: true, voucher })
    setSelectedQuantity(1)
  }

  const calculatePaymentBreakdown = (voucher: CampaignVoucher, quantity: number) => {
    const totalCost = voucher.coinValue * quantity
    const eligibility = voucherEligibility.get(voucher.id)
    const availableCampaignCoins = eligibility?.isEligible ? 
      (eligibility.availableCampaignCoins as any[])?.reduce((sum: number, cc: any) => sum + cc.balance, 0) || 0 : 0

    let campaignCoinsUsed = 0
    let regularCoinsUsed = 0
    let canAfford = false

    switch (paymentMethod) {
      case "campaign-only":
        if (eligibility?.isEligible && totalCost <= availableCampaignCoins) {
          campaignCoinsUsed = totalCost
          regularCoinsUsed = 0
          canAfford = true
        }
        break
      
      case "regular-only":
        if (totalCost <= coinBalance) {
          campaignCoinsUsed = 0
          regularCoinsUsed = totalCost
          canAfford = true
        }
        break
      
      case "mixed":
        if (eligibility?.isEligible) {
          campaignCoinsUsed = Math.min(totalCost, availableCampaignCoins)
          regularCoinsUsed = totalCost - campaignCoinsUsed
          canAfford = regularCoinsUsed <= coinBalance
        } else {
          campaignCoinsUsed = 0
          regularCoinsUsed = totalCost
          canAfford = totalCost <= coinBalance
        }
        break
      
      case "auto":
      default:
        if (eligibility?.isEligible) {
          // Use campaign coins first, then regular coins
          campaignCoinsUsed = Math.min(totalCost, availableCampaignCoins)
          regularCoinsUsed = totalCost - campaignCoinsUsed
          canAfford = regularCoinsUsed <= coinBalance
        } else {
          campaignCoinsUsed = 0
          regularCoinsUsed = totalCost
          canAfford = totalCost <= coinBalance
        }
        break
    }

    return {
      totalCost,
      campaignCoinsUsed,
      regularCoinsUsed,
      canAfford,
      availableCampaignCoins,
      regularBalance: coinBalance
    }
  }

  const getFilteredVouchers = () => {
    switch (selectedFilter) {
      case "campaign":
        return vouchers.filter(v => v.campaignRestricted)
      case "unrestricted":
        return vouchers.filter(v => !v.campaignRestricted)
      default:
        return vouchers
    }
  }

  const getAvailableCampaignCoins = () => {
    return campaignCodes.reduce((total, code) => !code.isUsed ? total + code.coinValue : total, 0)
  }

  const getRestrictionInfo = (voucher: CampaignVoucher) => {
    if (!voucher.campaignRestricted) return null

    const relatedCodes = campaignCodes.filter(code => 
      !code.isUsed && 
      (code.restrictionType === "none" ||
       (code.restrictionType === "category" && code.allowedCategories?.includes(voucher.category)) ||
       (code.restrictionType === "brand" && code.allowedBrands?.includes(voucher.brand || "")) ||
       code.restrictionType === "specific")
    )

    if (relatedCodes.length === 0) {
      return { type: "blocked", message: "Not available with current campaign restrictions" }
    }

    return { type: "allowed", codes: relatedCodes.length }
  }

  const filteredVouchers = getFilteredVouchers()
  const campaignCoins = getAvailableCampaignCoins()

  return (
    <div className="space-y-6">
      {/* Campaign Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Regular Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{coinBalance.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Available for any voucher</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Campaign Coins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{campaignCoins.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{campaignCodes.filter(c => !c.isUsed).length} active codes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Total Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{(coinBalance + campaignCoins).toLocaleString()}</p>
            <p className="text-sm text-gray-500">Combined purchasing power</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Codes Section */}
      {campaignCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Campaign Codes</CardTitle>
            <CardDescription>Redeem these codes to use your campaign coins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaignCodes.filter(c => !c.isUsed).map((code) => (
                <div key={code.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">{code.coinValue} coins</Badge>
                    <Badge variant="outline" className="text-xs">
                      {code.restrictionType === "none" ? "No restrictions" : code.restrictionType}
                    </Badge>
                  </div>
                  {code.restrictionType === "category" && code.allowedCategories && (
                    <p className="text-sm text-purple-700">Categories: {code.allowedCategories.join(", ")}</p>
                  )}
                  {code.restrictionType === "brand" && code.allowedBrands && (
                    <p className="text-sm text-purple-700">Brands: {code.allowedBrands.join(", ")}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Expires: {new Date(code.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button 
          variant={selectedFilter === "all" ? "default" : "outline"}
          onClick={() => setSelectedFilter("all")}
          size="sm"
        >
          All Vouchers ({vouchers.length})
        </Button>
        <Button 
          variant={selectedFilter === "campaign" ? "default" : "outline"}
          onClick={() => setSelectedFilter("campaign")}
          size="sm"
        >
          Campaign Exclusive ({vouchers.filter(v => v.campaignRestricted).length})
        </Button>
        <Button 
          variant={selectedFilter === "unrestricted" ? "default" : "outline"}
          onClick={() => setSelectedFilter("unrestricted")}
          size="sm"
        >
          Regular Vouchers ({vouchers.filter(v => !v.campaignRestricted).length})
        </Button>
      </div>

      {/* Vouchers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVouchers.map((voucher) => {
          const restrictionInfo = getRestrictionInfo(voucher)
          const isBlocked = restrictionInfo?.type === "blocked"
          const eligibility = voucherEligibility.get(voucher.id)
          
          return (
            <Card key={voucher.id} className={isBlocked ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{voucher.title}</CardTitle>
                  <div className="flex flex-col gap-1">
                    {voucher.campaignRestricted && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        Campaign
                      </Badge>
                    )}
                    {eligibility?.isEligible && (eligibility.availableCampaignCoins as any[])?.length > 0 && (
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        ✓ {(eligibility.availableCampaignCoins as any[]).reduce((sum: number, cc: any) => sum + cc.balance, 0)} campaign coins
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>{voucher.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Category:</span>
                      <span className="text-sm">{voucher.category}</span>
                    </div>
                    {voucher.brand && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Brand:</span>
                        <span className="text-sm">{voucher.brand}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cost:</span>
                      <Badge variant="secondary">{voucher.coinValue} coins each</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Available:</span>
                      <Badge variant={(voucher.quantity || 1) > 0 ? "default" : "destructive"}>
                        <Package className="h-3 w-3 mr-1" />
                        {voucher.quantity || 1} units
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Expires:</span>
                      <span className="text-sm">{new Date(voucher.expiryDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {restrictionInfo && restrictionInfo.type === "blocked" && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{restrictionInfo.message}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => openPurchaseDialog(voucher)}
                    disabled={loading || (voucher.quantity || 1) === 0 || isBlocked}
                    className="w-full flex items-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {(voucher.quantity || 1) === 0 ? "Out of Stock" : 
                     isBlocked ? "Not Available" : "Purchase"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredVouchers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">No vouchers available for the selected filter</p>
          </CardContent>
        </Card>
      )}

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialog.open} onOpenChange={(open) => setPurchaseDialog({ open, voucher: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase Voucher</DialogTitle>
            <DialogDescription>
              Select the quantity you want to purchase
            </DialogDescription>
          </DialogHeader>
          {purchaseDialog.voucher && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold">{purchaseDialog.voucher.title}</h3>
                  <p className="text-sm text-gray-600">{purchaseDialog.voucher.description}</p>
                  {purchaseDialog.voucher.campaignRestricted && (
                    <Badge variant="secondary" className="mt-2 bg-purple-100 text-purple-800">
                      Campaign Voucher
                    </Badge>
                  )}
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Price per unit:</span>
                  <Badge variant="secondary">{purchaseDialog.voucher.coinValue} coins</Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Available quantity:</span>
                  <span className="text-sm font-semibold">{purchaseDialog.voucher.quantity || 1} units</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Your balance:</span>
                  <span className="text-sm font-semibold">{coinBalance.toLocaleString()} coins</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={getMaxQuantity(purchaseDialog.voucher)}
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                  />
                </div>

                {/* Payment Method Selection */}
                {purchaseDialog.voucher && (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border">
                    <Label className="text-sm font-medium text-blue-800">Payment Method</Label>
                    <RadioGroup 
                      value={paymentMethod} 
                      onValueChange={(value) => setPaymentMethod(value as "campaign-only" | "regular-only" | "mixed" | "auto")} 
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auto" id="auto" />
                        <Label htmlFor="auto" className="text-sm">Auto (Campaign coins first, then regular)</Label>
                      </div>
                      
                      {voucherEligibility.get(purchaseDialog.voucher.id)?.isEligible && (
                        <>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="campaign-only" id="campaign-only" />
                            <Label htmlFor="campaign-only" className="text-sm">Campaign coins only</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="mixed" id="mixed" />
                            <Label htmlFor="mixed" className="text-sm">Mix of campaign and regular coins</Label>
                          </div>
                        </>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="regular-only" id="regular-only" />
                        <Label htmlFor="regular-only" className="text-sm">Regular coins only</Label>
                      </div>
                    </RadioGroup>
                    
                    {/* Payment Breakdown */}
                    {purchaseDialog.voucher && selectedQuantity > 0 && (
                      <div className="mt-3 p-3 bg-white rounded border space-y-2">
                        <h4 className="text-sm font-medium">Payment Breakdown:</h4>
                        {(() => {
                          const breakdown = calculatePaymentBreakdown(purchaseDialog.voucher, selectedQuantity)
                          return (
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Total Cost:</span>
                                <span className="font-medium">{breakdown.totalCost} coins</span>
                              </div>
                              {breakdown.campaignCoinsUsed > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>Campaign Coins:</span>
                                  <span>-{breakdown.campaignCoinsUsed} coins</span>
                                </div>
                              )}
                              {breakdown.regularCoinsUsed > 0 && (
                                <div className="flex justify-between text-blue-600">
                                  <span>Regular Coins:</span>
                                  <span>-{breakdown.regularCoinsUsed} coins</span>
                                </div>
                              )}
                              <div className="border-t pt-1 flex justify-between">
                                <span>After Purchase:</span>
                                <span className="font-medium">
                                  {breakdown.regularBalance - breakdown.regularCoinsUsed} regular + {breakdown.availableCampaignCoins - breakdown.campaignCoinsUsed} campaign
                                </span>
                              </div>
                              {!breakdown.canAfford && (
                                <div className="text-red-600 text-xs mt-1">
                                  ❌ Insufficient coins for this payment method
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between font-semibold">
                  <span>Total cost:</span>
                  <span>{(purchaseDialog.voucher.coinValue * selectedQuantity).toLocaleString()} coins</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPurchaseDialog({ open: false, voucher: null })}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePurchase} 
                  disabled={loading || !canAffordPurchase(purchaseDialog.voucher, selectedQuantity)}
                  className="flex-1"
                >
                  {loading ? "Processing..." : "Confirm Purchase"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
