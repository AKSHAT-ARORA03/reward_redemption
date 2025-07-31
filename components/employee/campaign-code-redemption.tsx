"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Gift, Coins, Tag, AlertTriangle, CheckCircle } from "lucide-react"

export function CampaignCodeRedemption() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [lastRedemption, setLastRedemption] = useState<{
    coinsAdded: number
    newBalance: number
    restrictions: {
      type: string
      allowedCategories?: string[]
      allowedBrands?: string[]
    }
  } | null>(null)
  const { toast } = useToast()

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please enter a redemption code",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/employee/redeem-campaign-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })

      if (response.ok) {
        const result = await response.json()
        setLastRedemption(result)
        toast({
          title: "Code redeemed successfully!",
          description: `You received ${result.coinsAdded} coins. New balance: ${result.newBalance}`,
        })
        setCode("")
        
        // Trigger custom event to refresh other components
        window.dispatchEvent(new CustomEvent('campaign-code-redeemed'))
      } else {
        const error = await response.json()
        toast({
          title: "Redemption failed",
          description: error.error || "Invalid or expired code",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getRestrictionsDisplay = (restrictions: any) => {
    if (!restrictions || restrictions.type === "none") {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">No Restrictions</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            These coins can be used for any available vouchers in the marketplace!
          </p>
        </div>
      )
    }

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-700 mb-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">Campaign Restrictions Apply</span>
        </div>
        
        {restrictions.type === "category" && restrictions.allowedCategories && (
          <div className="space-y-1">
            <p className="text-sm text-blue-600">Allowed Categories:</p>
            <div className="flex flex-wrap gap-1">
              {restrictions.allowedCategories.map((category: string) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {restrictions.type === "brand" && restrictions.allowedBrands && (
          <div className="space-y-1">
            <p className="text-sm text-blue-600">Allowed Brands:</p>
            <div className="flex flex-wrap gap-1">
              {restrictions.allowedBrands.map((brand: string) => (
                <Badge key={brand} variant="outline" className="text-xs">
                  {brand}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {restrictions.type === "specific" && (
          <p className="text-sm text-blue-600">
            These coins can only be used for specific pre-selected vouchers.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Redeem Campaign Code
          </CardTitle>
          <CardDescription>
            Enter your campaign redemption code to add coins to your balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRedeem} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Redemption Code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter your 16-character code"
                maxLength={16}
                className="font-mono tracking-wider"
              />
              <p className="text-xs text-gray-500">
                Campaign codes are typically 16 characters long and case-insensitive
              </p>
            </div>
            
            <Button type="submit" disabled={loading || !code.trim()} className="w-full">
              {loading ? "Redeeming..." : "Redeem Code"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {lastRedemption && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Code Successfully Redeemed!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Coins className="h-5 w-5" />
                  <span className="text-2xl font-bold">+{lastRedemption.coinsAdded}</span>
                </div>
                <p className="text-sm text-green-600">Coins Added</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Tag className="h-5 w-5" />
                  <span className="text-2xl font-bold">{lastRedemption.newBalance.toLocaleString()}</span>
                </div>
                <p className="text-sm text-green-600">New Balance</p>
              </div>
            </div>
            
            {getRestrictionsDisplay(lastRedemption.restrictions)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 How Campaign Codes Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-1 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">1</span>
            </div>
            <div>
              <p className="font-semibold">Receive Your Code</p>
              <p className="text-gray-600">Campaign codes are sent via email when you're selected for a reward campaign.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-1 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">2</span>
            </div>
            <div>
              <p className="font-semibold">Redeem for Coins</p>
              <p className="text-gray-600">Enter your code above to instantly add coins to your balance.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-1 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">3</span>
            </div>
            <div>
              <p className="font-semibold">Shop with Restrictions</p>
              <p className="text-gray-600">Some campaigns may limit which vouchers you can purchase with the coins.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-1 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">4</span>
            </div>
            <div>
              <p className="font-semibold">Enjoy Your Rewards</p>
              <p className="text-gray-600">Purchase and redeem vouchers just like regular coins!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
