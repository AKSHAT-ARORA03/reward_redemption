"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, Coins, Package } from "lucide-react"

interface Voucher {
  id: string
  title: string
  description: string
  category: string
  coinValue: number
  quantity: number
  expiryDate: string
  isActive: boolean
  brand?: string
  originalPrice?: string
  imageUrl?: string
  featured?: boolean
}

export function VoucherMarketplace() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [coinBalance, setCoinBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [purchaseDialog, setPurchaseDialog] = useState<{open: boolean, voucher: Voucher | null}>({
    open: false,
    voucher: null
  })
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [vouchersRes, walletRes] = await Promise.all([fetch("/api/vouchers"), fetch("/api/employee/wallet")])

      if (vouchersRes.ok) {
        const vouchersData = await vouchersRes.json()
        setVouchers(vouchersData.filter((v: Voucher) => v.isActive))
      }

      if (walletRes.ok) {
        const walletData = await walletRes.json()
        setCoinBalance(walletData.balance)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    }
  }

  const handlePurchase = async () => {
    if (!purchaseDialog.voucher) return
    
    const totalCost = purchaseDialog.voucher.coinValue * selectedQuantity
    
    if (coinBalance < totalCost) {
      toast({
        title: "Insufficient coins",
        description: `You need ${totalCost} coins but have ${coinBalance}`,
        variant: "destructive",
      })
      return
    }

    if (selectedQuantity > (purchaseDialog.voucher.quantity || 1)) {
      toast({
        title: "Insufficient quantity",
        description: `Only ${purchaseDialog.voucher.quantity || 1} units available`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/employee/purchase-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          voucherId: purchaseDialog.voucher.id,
          quantity: selectedQuantity 
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Purchase successful",
          description: `Successfully purchased ${selectedQuantity} voucher(s) for ${totalCost} coins`,
        })
        setCoinBalance(result.newBalance)
        setPurchaseDialog({ open: false, voucher: null })
        setSelectedQuantity(1)
        fetchData() // Refresh voucher quantities
        
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

  const openPurchaseDialog = (voucher: Voucher) => {
    setPurchaseDialog({ open: true, voucher })
    setSelectedQuantity(1)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Your Balance: {coinBalance.toLocaleString()} coins
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vouchers.map((voucher) => (
          <Card key={voucher.id}>
            <CardHeader>
              <CardTitle className="text-lg">{voucher.title}</CardTitle>
              <CardDescription>{voucher.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Category:</span>
                    <span className="text-sm">{voucher.category}</span>
                  </div>
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
                <Button
                  onClick={() => openPurchaseDialog(voucher)}
                  disabled={loading || coinBalance < voucher.coinValue || (voucher.quantity || 1) === 0}
                  className="w-full flex items-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {(voucher.quantity || 1) === 0 ? "Out of Stock" : 
                   coinBalance < voucher.coinValue ? "Insufficient Coins" : "Purchase"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {vouchers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">No vouchers available for purchase</p>
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
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Price per unit:</span>
                  <Badge variant="secondary">{purchaseDialog.voucher.coinValue} coins</Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Available quantity:</span>
                  <span className="text-sm font-semibold">{purchaseDialog.voucher.quantity || 1} units</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={purchaseDialog.voucher.quantity || 1}
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Math.max(1, Math.min(purchaseDialog.voucher?.quantity || 1, parseInt(e.target.value) || 1)))}
                  />
                </div>

                <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Total cost:</span>
                    <span className="font-semibold">{(purchaseDialog.voucher.coinValue * selectedQuantity).toLocaleString()} coins</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Your balance:</span>
                    <span className="text-sm">{coinBalance.toLocaleString()} coins</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Remaining after purchase:</span>
                    <span className={`text-sm font-semibold ${
                      coinBalance - (purchaseDialog.voucher.coinValue * selectedQuantity) < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {(coinBalance - (purchaseDialog.voucher.coinValue * selectedQuantity)).toLocaleString()} coins
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handlePurchase}
                disabled={loading || coinBalance < (purchaseDialog.voucher.coinValue * selectedQuantity) || selectedQuantity > (purchaseDialog.voucher.quantity || 1)}
                className="w-full"
              >
                {loading ? "Processing..." : `Purchase ${selectedQuantity} voucher${selectedQuantity > 1 ? 's' : ''}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
