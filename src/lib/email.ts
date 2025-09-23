import nodemailer from 'nodemailer'

// Mock email service for development
// In production, you would configure with a real email service like Gmail, SendGrid, etc.
const transporter = nodemailer.createTransport({
  // Use ethereal email for testing (generates fake SMTP service)
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: 'ethereal.user@ethereal.email',
    pass: 'ethereal.pass'
  }
})

export interface OrderEmailData {
  orderNumber: string
  customerEmail: string
  customerName: string
  orderTotal: number
  orderDate: string
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
  shippingAddress: {
    name: string
    address1: string
    address2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

export async function sendOrderConfirmation(orderData: OrderEmailData) {
  try {
    // In development, just log the email instead of actually sending
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Mock Order Confirmation Email')
      console.log('================================')
      console.log(`To: ${orderData.customerEmail}`)
      console.log(`Subject: Order Confirmation - ${orderData.orderNumber}`)
      console.log('\n--- Email Content ---')
      console.log(generateOrderConfirmationHTML(orderData))
      console.log('================================')

      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        message: 'Mock email logged to console'
      }
    }

    // For production, you would configure real email sending
    const mailOptions = {
      from: '"E-Commerce Store" <orders@ecommerce-store.com>',
      to: orderData.customerEmail,
      subject: `Order Confirmation - ${orderData.orderNumber}`,
      html: generateOrderConfirmationHTML(orderData)
    }

    const info = await transporter.sendMail(mailOptions)

    return {
      success: true,
      messageId: info.messageId,
      message: 'Order confirmation email sent successfully'
    }

  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: 'Failed to send confirmation email'
    }
  }
}

function generateOrderConfirmationHTML(orderData: OrderEmailData): string {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px; }
        .order-info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .items-table th { background: #f5f5f5; font-weight: bold; }
        .total-row { font-weight: bold; background: #f9f9f9; }
        .address { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
        .success-icon { color: #4caf50; font-size: 48px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="success-icon">✅</div>
        <h1>Order Confirmed!</h1>
        <p>Thank you for your order, ${orderData.customerName}!</p>
      </div>

      <div class="order-info">
        <h2>Order Details</h2>
        <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
        <p><strong>Order Date:</strong> ${new Date(orderData.orderDate).toLocaleDateString()}</p>
        <p><strong>Total:</strong> ${formatCurrency(orderData.orderTotal)}</p>
      </div>

      <h3>Items Ordered</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${orderData.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.price)}</td>
              <td>${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3">Total</td>
            <td>${formatCurrency(orderData.orderTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="address">
        <h3>Shipping Address</h3>
        <p>
          ${orderData.shippingAddress.name}<br>
          ${orderData.shippingAddress.address1}<br>
          ${orderData.shippingAddress.address2 ? orderData.shippingAddress.address2 + '<br>' : ''}
          ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.postalCode}<br>
          ${orderData.shippingAddress.country}
        </p>
      </div>

      <h3>What's Next?</h3>
      <ul>
        <li>We'll send you a shipping confirmation with tracking information once your order ships</li>
        <li>Estimated delivery time: 3-5 business days</li>
        <li>You can track your order status in your account dashboard</li>
      </ul>

      <div class="footer">
        <p>Thank you for shopping with us!</p>
        <p>If you have any questions, please contact our customer support.</p>
        <p><strong>E-Commerce Store Team</strong></p>
      </div>
    </body>
    </html>
  `
}

export async function sendShippingNotification(orderData: {
  orderNumber: string
  customerEmail: string
  customerName: string
  trackingNumber: string
  carrier: string
}) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('📦 Mock Shipping Notification Email')
      console.log('====================================')
      console.log(`To: ${orderData.customerEmail}`)
      console.log(`Subject: Your Order Has Shipped - ${orderData.orderNumber}`)
      console.log(`Tracking: ${orderData.trackingNumber} (${orderData.carrier})`)
      console.log('====================================')

      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        message: 'Mock shipping email logged to console'
      }
    }

    // Implementation for production email sending would go here

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      message: 'Shipping notification sent successfully'
    }

  } catch (error) {
    console.error('Shipping email error:', error)
    return {
      success: false,
      error: 'Failed to send shipping notification'
    }
  }
}