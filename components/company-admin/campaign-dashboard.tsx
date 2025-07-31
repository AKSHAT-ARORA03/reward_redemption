"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Users, Target, Calendar, Coins, BarChart } from "lucide-react"
import type { Campaign, CreateCampaignRequest } from "@/types/campaign"

export function CampaignDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [vouchers, setVouchers] = useState<any[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [fetchingVouchers, setFetchingVouchers] = useState(false)
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    name: "",
    description: "",
    targetType: "all",
    targetUsers: [],
    targetDepartment: "",
    individualEmails: "",
    totalBudget: 0,
    coinsPerEmployee: 0,
    restrictionType: "none",
    allowedCategories: [],
    allowedBrands: [],
    allowedVoucherIds: [],
    startDate: "",
    endDate: "",
    allowIndividualCodes: true,
    emailNotifications: true,
    maxCoinsPerEmployee: 0,
    tags: [],
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchCampaigns()
    fetchVouchersAndUsers()
  }, [])

  const fetchVouchersAndUsers = async () => {
    setFetchingVouchers(true)
    try {
      // Fetch vouchers to get categories and brands
      const vouchersResponse = await fetch("/api/vouchers")
      if (vouchersResponse.ok) {
        const vouchersData = await vouchersResponse.json()
        setVouchers(vouchersData)
        
        // Extract unique categories and brands
        const categories = [...new Set(vouchersData.map((v: any) => v.category).filter(Boolean))] as string[]
        const brands = [...new Set(vouchersData.map((v: any) => v.brand).filter(Boolean))] as string[]
        setAvailableCategories(categories)
        setAvailableBrands(brands)
      }

      // Fetch users for individual targeting
      const usersResponse = await fetch("/api/company-admin/employees")
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
        
        // Extract unique departments
        const depts = [...new Set(usersData.map((u: any) => u.department).filter(Boolean))] as string[]
        setDepartments(depts)
      }
    } catch (error) {
      console.error("Failed to fetch vouchers and users:", error)
      toast({
        title: "Error",
        description: "Failed to load vouchers and users data.",
        variant: "destructive",
      })
    } finally {
      setFetchingVouchers(false)
    }
  }

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/company-admin/campaigns")
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data)
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingCampaign ? `/api/company-admin/campaigns/${editingCampaign.id}` : "/api/company-admin/campaigns"

      const response = await fetch(url, {
        method: editingCampaign ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Campaign ${editingCampaign ? "updated" : "created"} successfully`,
        })
        setDialogOpen(false)
        resetForm()
        fetchCampaigns()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Operation failed",
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

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setFormData({
      name: campaign.name,
      description: campaign.description,
      targetType: campaign.targetType,
      targetUsers: campaign.targetUsers || [],
      targetDepartment: campaign.targetDepartment || "",
      individualEmails: "", // Reset manual emails when editing
      totalBudget: campaign.totalBudget,
      coinsPerEmployee: campaign.coinsPerEmployee || 0,
      restrictionType: campaign.restrictionType,
      allowedCategories: campaign.allowedCategories || [],
      allowedBrands: campaign.allowedBrands || [],
      allowedVoucherIds: campaign.allowedVoucherIds || [],
      startDate: campaign.startDate.split("T")[0],
      endDate: campaign.endDate.split("T")[0],
      allowIndividualCodes: campaign.allowIndividualCodes,
      emailNotifications: campaign.emailNotifications,
      maxCoinsPerEmployee: campaign.maxCoinsPerEmployee || 0,
      tags: campaign.tags || [],
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return

    try {
      const response = await fetch(`/api/company-admin/campaigns/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Campaign deleted successfully",
        })
        fetchCampaigns()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete campaign",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    }
  }

  const handleDistribute = async (campaignId: string) => {
    if (!confirm("Are you sure you want to distribute coins for this campaign?")) return

    try {
      const response = await fetch(`/api/company-admin/campaigns/${campaignId}/distribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributionType: "immediate",
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: `Distributed ${result.totalDistributed} coins to ${result.targetUsers} users`,
        })
        fetchCampaigns()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to distribute coins",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      targetType: "all",
      targetUsers: [],
      targetDepartment: "",
      individualEmails: "",
      totalBudget: 0,
      coinsPerEmployee: 0,
      restrictionType: "none",
      allowedCategories: [],
      allowedBrands: [],
      allowedVoucherIds: [],
      startDate: "",
      endDate: "",
      allowIndividualCodes: true,
      emailNotifications: true,
      maxCoinsPerEmployee: 0,
      tags: [],
    })
    setEditingCampaign(null)
  }

  const getStatusBadge = (campaign: Campaign) => {
    const now = new Date()
    const startDate = new Date(campaign.startDate)
    const endDate = new Date(campaign.endDate)

    if (!campaign.isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    } else if (now < startDate) {
      return <Badge variant="outline">Scheduled</Badge>
    } else if (now > endDate) {
      return <Badge variant="destructive">Ended</Badge>
    } else {
      return <Badge variant="default">Active</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Campaign Management ({campaigns.length})</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
              <DialogDescription>
                {editingCampaign ? "Update campaign details" : "Create a targeted reward campaign for your employees"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalBudget">Total Budget (Coins)</Label>
                  <Input
                    id="totalBudget"
                    type="number"
                    value={formData.totalBudget}
                    onChange={(e) => setFormData({ ...formData, totalBudget: Number(e.target.value) })}
                    required
                    min="1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetType">Target Type</Label>
                  <Select value={formData.targetType} onValueChange={(value: any) => setFormData({ ...formData, targetType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      <SelectItem value="individual">Specific Individuals</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restrictionType">Voucher Restrictions</Label>
                  <Select value={formData.restrictionType} onValueChange={(value: any) => setFormData({ ...formData, restrictionType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Restrictions</SelectItem>
                      <SelectItem value="category">Category Specific</SelectItem>
                      <SelectItem value="brand">Brand Specific</SelectItem>
                      <SelectItem value="specific">Specific Vouchers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Conditional Target Type Fields */}
              {formData.targetType === "individual" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Add Individual Email Addresses</Label>
                    <Textarea
                      placeholder="Enter email addresses separated by commas or new lines&#10;Example:&#10;john@company.com, jane@company.com&#10;or&#10;john@company.com&#10;jane@company.com"
                      value={formData.individualEmails || ""}
                      onChange={(e) => setFormData({ ...formData, individualEmails: e.target.value })}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-gray-500">
                      Enter email addresses manually, separated by commas or new lines
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Or Select from Existing Users</Label>
                    <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                      {users.length > 0 ? (
                        users.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={formData.targetUsers?.includes(user.id) || false}
                              onCheckedChange={(checked) => {
                                const currentUsers = formData.targetUsers || []
                                if (checked) {
                                  setFormData({ ...formData, targetUsers: [...currentUsers, user.id] })
                                } else {
                                  setFormData({ ...formData, targetUsers: currentUsers.filter(id => id !== user.id) })
                                }
                              }}
                            />
                            <Label htmlFor={`user-${user.id}`} className="text-sm">
                              {user.name} ({user.email})
                            </Label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No users available</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {formData.targetType === "department" && (
                <div className="space-y-2">
                  <Label htmlFor="targetDepartment">Select Department</Label>
                  <Select value={formData.targetDepartment || ""} onValueChange={(value) => setFormData({ ...formData, targetDepartment: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Conditional Restriction Fields */}
              {formData.restrictionType === "category" && (
                <div className="space-y-2">
                  <Label>Select Allowed Categories</Label>
                  <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                    {availableCategories.length > 0 ? (
                      availableCategories.map((category) => (
                        <div key={category} className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={formData.allowedCategories?.includes(category) || false}
                            onCheckedChange={(checked) => {
                              const currentCategories = formData.allowedCategories || []
                              if (checked) {
                                setFormData({ ...formData, allowedCategories: [...currentCategories, category] })
                              } else {
                                setFormData({ ...formData, allowedCategories: currentCategories.filter(cat => cat !== category) })
                              }
                            }}
                          />
                          <Label htmlFor={`category-${category}`} className="text-sm">{category}</Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        {fetchingVouchers ? "Loading categories..." : "No categories available"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {formData.restrictionType === "brand" && (
                <div className="space-y-2">
                  <Label>Select Allowed Brands</Label>
                  <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                    {availableBrands.length > 0 ? (
                      availableBrands.map((brand) => (
                        <div key={brand} className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id={`brand-${brand}`}
                            checked={formData.allowedBrands?.includes(brand) || false}
                            onCheckedChange={(checked) => {
                              const currentBrands = formData.allowedBrands || []
                              if (checked) {
                                setFormData({ ...formData, allowedBrands: [...currentBrands, brand] })
                              } else {
                                setFormData({ ...formData, allowedBrands: currentBrands.filter(b => b !== brand) })
                              }
                            }}
                          />
                          <Label htmlFor={`brand-${brand}`} className="text-sm">{brand}</Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        {fetchingVouchers ? "Loading brands..." : "No brands available"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {formData.restrictionType === "specific" && (
                <div className="space-y-2">
                  <Label>Select Specific Vouchers</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                    {vouchers.length > 0 ? (
                      vouchers.map((voucher) => (
                        <div key={voucher.id} className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id={`voucher-${voucher.id}`}
                            checked={formData.allowedVoucherIds?.includes(voucher.id) || false}
                            onCheckedChange={(checked) => {
                              const currentVouchers = formData.allowedVoucherIds || []
                              if (checked) {
                                setFormData({ ...formData, allowedVoucherIds: [...currentVouchers, voucher.id] })
                              } else {
                                setFormData({ ...formData, allowedVoucherIds: currentVouchers.filter(id => id !== voucher.id) })
                              }
                            }}
                          />
                          <Label htmlFor={`voucher-${voucher.id}`} className="text-sm">
                            {voucher.title} - {voucher.coinValue} coins ({voucher.category})
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        {fetchingVouchers ? "Loading vouchers..." : "No vouchers available"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowIndividualCodes"
                    checked={formData.allowIndividualCodes}
                    onCheckedChange={(checked) => setFormData({ ...formData, allowIndividualCodes: checked })}
                  />
                  <Label htmlFor="allowIndividualCodes">Generate Individual Codes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="emailNotifications"
                    checked={formData.emailNotifications}
                    onCheckedChange={(checked) => setFormData({ ...formData, emailNotifications: checked })}
                  />
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : editingCampaign ? "Update Campaign" : "Create Campaign"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    {getStatusBadge(campaign)}
                    <Badge variant="outline">{campaign.targetType}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(campaign)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(campaign.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardDescription>{campaign.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-600" />
                    <span>{campaign.remainingBudget.toLocaleString()} / {campaign.totalBudget.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>{campaign.participantCount} participants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    <span>{campaign.restrictionType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span>{new Date(campaign.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {campaign.isActive && campaign.remainingBudget > 0 && (
                  <Button 
                    onClick={() => handleDistribute(campaign.id)} 
                    className="w-full"
                    size="sm"
                  >
                    Distribute Coins
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">No campaigns created yet. Create your first campaign to get started!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
