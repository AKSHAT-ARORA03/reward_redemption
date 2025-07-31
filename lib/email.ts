import nodemailer from "nodemailer"

// Email configuration with fallback values
const createTransporter = () => {
  try {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number.parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "ayushninawe45@gmail.com",
        pass: process.env.SMTP_PASS || "your-app-password-here",
      },
    })
  } catch (error) {
    console.error("Failed to create email transporter:", error)
    return null
  }
}

const transporter = createTransporter()

export async function sendEmail(to: string, subject: string, html: string): Promise<{success: boolean; message: string}> {
  try {
    // Always log the email for debugging
    console.log("=== EMAIL NOTIFICATION ===")
    console.log(`From: ${process.env.SMTP_USER || "akshatarora0307@gmail.com"}`)
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log("========================")

    // Force email sending regardless of environment
    if (!transporter) {
      const errorMsg = "Email transporter not configured";
      console.error(`❌ ${errorMsg}`);
      return { 
        success: false, 
        message: errorMsg 
      };
    }

    // Try to send the actual email using the configured transporter
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Reward System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })
    
    console.log(`✅ Email sent successfully to ${to}`)
    return { 
      success: true, 
      message: `Email sent successfully to ${to}` 
    };
  } catch (error) {
    const errorMsg = `Failed to send email to ${to}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ Email service error:`, errorMsg)
    return { 
      success: false, 
      message: errorMsg 
    };
  }
}

export function generateRedemptionCodeEmail(
  employeeName: string,
  redemptionCode: string,
  coinAmount: number,
  companyName: string,
  expiryDate: string
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  
  // Format the expiry date to be more readable
  const expiryDateFormatted = new Date(expiryDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 You've Got Coins!</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">From ${companyName}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h2 style="color: #333; margin: 0 0 15px 0;">Hello ${employeeName}! 👋</h2>
        <p style="color: #666; line-height: 1.6; margin: 0;">
          Great news! You have received <strong style="color: #2563eb;">${coinAmount} coins</strong> 
          from <strong>${companyName}</strong>. Use these coins to purchase amazing vouchers from our marketplace!
        </p>
      </div>
      
      <div style="background: #2563eb; padding: 25px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; color: white; font-size: 18px;">Your Redemption Code</h3>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px; font-family: monospace;">
            ${redemptionCode}
          </div>
        </div>
        <p style="margin: 0; color: #e0e7ff; font-size: 14px;">
          This code is worth <strong>${coinAmount} coins</strong> and expires on <strong>${expiryDateFormatted}</strong>
        </p>
      </div>
      
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="color: #0369a1; margin: 0 0 15px 0; font-size: 16px;">📋 How to Redeem:</h3>
        <ol style="color: #0369a1; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Visit our platform: <a href="${appUrl}" style="color: #2563eb;">${appUrl}</a></li>
          <li>Login to your account (or register if you're new)</li>
          <li>Go to the "Redeem Code" section</li>
          <li>Enter your code: <strong>${redemptionCode}</strong></li>
          <li>Your coins will be added instantly!</li>
          <li>Browse and purchase vouchers from the marketplace</li>
        </ol>
      </div>
      
      <div style="text-align: center; margin-bottom: 25px;">
        <a href="${appUrl}/login" 
           style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Redeem Your Coins Now →
        </a>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⚠️ Important:</strong> This code expires on <strong>${expiryDateFormatted}</strong> and can only be used once. 
          Make sure to redeem it before the expiry date!
        </p>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          Best regards,<br>
          <strong>Reward System Team</strong><br>
          <em>Making rewards simple and fun! 🎁</em>
        </p>
      </div>
    </div>
  `
}

export function generateVoucherAssignmentEmail(
  employeeName: string,
  voucherTitle: string,
  companyName: string,
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">🎁 New Voucher Assigned!</h2>
      <p>Dear ${employeeName},</p>
      <p>You have been assigned a new voucher: <strong>${voucherTitle}</strong> from <strong>${companyName}</strong>!</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0; color: #2563eb;">Voucher: ${voucherTitle}</h3>
        <p style="margin: 10px 0 0 0; color: #666;">Check your dashboard to redeem this voucher.</p>
      </div>
      
      <a href="${appUrl}/login" 
         style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
        View Your Vouchers
      </a>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        Best regards,<br>
        Reward System Team
      </p>
    </div>
  `
}

// Generate voucher purchase confirmation email
export function generateVoucherPurchaseEmail(
  employeeName: string,
  voucherTitle: string,
  quantity: number,
  totalCost: number,
  remainingBalance: number,
  companyName: string = "Your Company",
  appUrl: string = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px;">🎉 Purchase Successful!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your voucher purchase has been confirmed</p>
      </div>
      
      <div style="padding: 30px;">
        <h2 style="color: #333; margin-top: 0;">Hi ${employeeName}!</h2>
        
        <p style="line-height: 1.6; margin-bottom: 25px;">
          Great news! You have successfully purchased ${quantity} voucher${quantity > 1 ? 's' : ''} from <strong>${companyName}</strong>.
        </p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin: 0 0 15px 0; color: #28a745;">📋 Purchase Details</h3>
          <div style="margin-bottom: 10px;">
            <strong>Voucher:</strong> ${voucherTitle}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Quantity:</strong> ${quantity} ${quantity > 1 ? 'units' : 'unit'}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Total Cost:</strong> ${totalCost.toLocaleString()} coins
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Remaining Balance:</strong> ${remainingBalance.toLocaleString()} coins
          </div>
          <div>
            <strong>Purchase Date:</strong> ${new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1976d2;">🎁 What's Next?</h3>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Visit your dashboard to view your purchased vouchers</li>
            <li>Redeem your voucher${quantity > 1 ? 's' : ''} when you're ready to use ${quantity > 1 ? 'them' : 'it'}</li>
            <li>Check the redemption instructions for each voucher</li>
            <li>Contact support if you have any questions</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/employee" 
             style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View My Vouchers
          </a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <strong>💡 Tip:</strong> Keep track of your voucher expiry dates to make sure you don't miss out on using them!
        </div>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px; text-align: center;">
          Thank you for using our reward system!<br>
          <strong>Reward System Team</strong>
        </p>
      </div>
    </div>
  `
}

// Campaign distribution email template
export function generateCampaignDistributionEmail(
  employeeName: string,
  campaignName: string,
  coinAmount: number,
  campaignDescription: string,
  restrictionType: string,
  allowedCategories?: string[],
  allowedBrands?: string[],
  customMessage?: string
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  
  // Generate restriction information
  let restrictionInfo = ""
  switch (restrictionType) {
    case "category":
      if (allowedCategories && allowedCategories.length > 0) {
        restrictionInfo = `
          <div style="background: #e1f5fe; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <strong>🏷️ Category Restrictions:</strong> These coins can only be used for vouchers in the following categories:<br>
            <span style="color: #0277bd; font-weight: bold;">${allowedCategories.join(", ")}</span>
          </div>
        `
      }
      break
    case "brand":
      if (allowedBrands && allowedBrands.length > 0) {
        restrictionInfo = `
          <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <strong>🏪 Brand Restrictions:</strong> These coins can only be used for vouchers from the following brands:<br>
            <span style="color: #2e7d32; font-weight: bold;">${allowedBrands.join(", ")}</span>
          </div>
        `
      }
      break
    case "specific":
      restrictionInfo = `
        <div style="background: #fff3e0; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <strong>🎯 Specific Voucher Restrictions:</strong> These coins can only be used for specific pre-selected vouchers.
        </div>
      `
      break
    default:
      restrictionInfo = `
        <div style="background: #f3e5f5; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <strong>🎉 No Restrictions:</strong> These coins can be used for any available vouchers in our marketplace!
        </div>
      `
  }

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎊 Congratulations!</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">You've received reward coins!</p>
      </div>
      
      <div style="padding: 30px; background: #ffffff; border-radius: 0 0 10px 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
          Hello <strong>${employeeName}</strong>,
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
          Great news! You've been selected to receive <strong style="color: #2563eb; font-size: 20px;">${coinAmount.toLocaleString()} coins</strong> 
          from the campaign "<strong style="color: #7c3aed;">${campaignName}</strong>".
        </p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <h3 style="margin: 0 0 15px 0; color: #2563eb;">📋 Campaign Details</h3>
          <div style="margin-bottom: 10px;">
            <strong>Campaign:</strong> ${campaignName}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Description:</strong> ${campaignDescription}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Coins Received:</strong> ${coinAmount.toLocaleString()} coins
          </div>
          <div>
            <strong>Received Date:</strong> ${new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        ${restrictionInfo}

        ${customMessage ? `
          <div style="background: #fef7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #a855f7;">
            <h3 style="margin: 0 0 10px 0; color: #a855f7;">💬 Personal Message</h3>
            <p style="margin: 0; font-style: italic; color: #555;">"${customMessage}"</p>
          </div>
        ` : ''}

        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1976d2;">🎁 How to Use Your Coins</h3>
          <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Visit the voucher marketplace in your employee dashboard</li>
            <li>Browse available vouchers ${restrictionType !== "none" ? "(filtered based on campaign restrictions)" : ""}</li>
            <li>Purchase vouchers using your coins</li>
            <li>Redeem your vouchers when you're ready to use them</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/employee" 
             style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Start Shopping with Your Coins
          </a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <strong>💡 Pro Tip:</strong> Check out the featured vouchers section for the best deals and popular choices among your colleagues!
        </div>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px; text-align: center;">
          Questions about this campaign? Contact your HR team or system administrator.<br>
          <strong>Reward System Team</strong>
        </p>
      </div>
    </div>
  `
}
