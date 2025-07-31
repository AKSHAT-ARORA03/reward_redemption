import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RedeemCode } from "@/components/employee/redeem-code"
import { VoucherMarketplace } from "@/components/employee/voucher-marketplace"
import { EmployeeVouchers } from "@/components/employee/employee-vouchers"
import { EmployeeStats } from "@/components/employee/employee-stats"
import { CampaignCodeRedemption } from "@/components/employee/campaign-code-redemption"
import { CampaignAwareMarketplace } from "@/components/employee/campaign-aware-marketplace"
import { requireAuth } from "@/lib/auth"

export default async function EmployeeDashboard() {
  await requireAuth("employee")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Employee Dashboard</h1>
          <p className="text-gray-600">Redeem codes and purchase vouchers</p>
        </div>

        <Suspense fallback={<div>Loading stats...</div>}>
          <EmployeeStats />
        </Suspense>

        <Tabs defaultValue="campaigns" className="mt-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="campaigns">Campaign Marketplace</TabsTrigger>
            <TabsTrigger value="campaign-codes">Campaign Codes</TabsTrigger>
            <TabsTrigger value="redeem">Redeem Code</TabsTrigger>
            <TabsTrigger value="marketplace">Buy Vouchers</TabsTrigger>
            <TabsTrigger value="vouchers">My Vouchers</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle>Campaign-Aware Marketplace</CardTitle>
                <CardDescription>Shop with your campaign coins and regular balance</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading...</div>}>
                  <CampaignAwareMarketplace />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaign-codes">
            <Suspense fallback={<div>Loading...</div>}>
              <CampaignCodeRedemption />
            </Suspense>
          </TabsContent>

          <TabsContent value="redeem">
            <Suspense fallback={<div>Loading...</div>}>
              <RedeemCode />
            </Suspense>
          </TabsContent>

          <TabsContent value="marketplace">
            <Card>
              <CardHeader>
                <CardTitle>Voucher Marketplace</CardTitle>
                <CardDescription>Purchase vouchers using your coins</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading...</div>}>
                  <VoucherMarketplace />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vouchers">
            <Card>
              <CardHeader>
                <CardTitle>My Purchased Vouchers</CardTitle>
                <CardDescription>Vouchers you have purchased and can redeem</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading...</div>}>
                  <EmployeeVouchers />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
