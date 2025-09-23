'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/hooks/use-cart'
import { formatCurrency } from '@/utils/format'
import { CreditCard, Lock, ShoppingBag, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const checkoutSchema = z.object({
  // Contact Information
  email: z.string().email('Invalid email address'),

  // Shipping Address
  shippingFirstName: z.string().min(1, 'First name is required'),
  shippingLastName: z.string().min(1, 'Last name is required'),
  shippingAddress1: z.string().min(1, 'Address is required'),
  shippingAddress2: z.string().optional(),
  shippingCity: z.string().min(1, 'City is required'),
  shippingState: z.string().min(1, 'State is required'),
  shippingPostalCode: z.string().min(1, 'Postal code is required'),
  shippingCountry: z.string().min(1, 'Country is required'),
  shippingPhone: z.string().optional(),

  // Billing Address
  billingFirstName: z.string().min(1, 'First name is required'),
  billingLastName: z.string().min(1, 'Last name is required'),
  billingAddress1: z.string().min(1, 'Address is required'),
  billingAddress2: z.string().optional(),
  billingCity: z.string().min(1, 'City is required'),
  billingState: z.string().min(1, 'State is required'),
  billingPostalCode: z.string().min(1, 'Postal code is required'),
  billingCountry: z.string().min(1, 'Country is required'),
  billingPhone: z.string().optional(),

  // Payment Information
  cardNumber: z.string().regex(/^[0-9]{16}$/, 'Card number must be 16 digits'),
  expiryMonth: z.string().min(1, 'Expiry month is required'),
  expiryYear: z.string().min(1, 'Expiry year is required'),
  cvv: z.string().regex(/^[0-9]{3,4}$/, 'CVV must be 3 or 4 digits'),
  cardName: z.string().min(1, 'Name on card is required'),

  // Options
  sameAsBilling: z.boolean().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { items, summary, loading: cartLoading } = useCart()
  const [isProcessing, setIsProcessing] = useState(false)
  const [sameAsBilling, setSameAsBilling] = useState(true)

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: session?.user?.email || '',
      shippingCountry: 'United States',
      billingCountry: 'United States',
      sameAsBilling: true,
    }
  })

  // Show loading while session is being determined
  if (status === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-md mx-auto text-center">
          <Card>
            <CardHeader>
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to proceed with checkout
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/auth/signin?from=/checkout">
                  Sign In
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/cart">
                  Return to Cart
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show empty cart message
  if (items.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-md mx-auto text-center">
          <Card>
            <CardContent className="pt-6">
              <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">
                Add some items to your cart before proceeding to checkout.
              </p>
              <Button asChild size="lg" className="w-full">
                <Link href="/products">
                  Start Shopping
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: CheckoutFormData) => {
    setIsProcessing(true)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          items: items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price
          })),
          summary
        }),
      })

      if (!response.ok) {
        throw new Error('Checkout failed')
      }

      const result = await response.json()

      if (result.success) {
        router.push(`/checkout/success?orderId=${result.orderId}`)
      } else {
        throw new Error(result.error || 'Payment failed')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Checkout failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSameAsBillingChange = (checked: boolean) => {
    setSameAsBilling(checked)
    if (checked) {
      const billingData = form.getValues()
      form.setValue('shippingFirstName', billingData.billingFirstName)
      form.setValue('shippingLastName', billingData.billingLastName)
      form.setValue('shippingAddress1', billingData.billingAddress1)
      form.setValue('shippingAddress2', billingData.billingAddress2)
      form.setValue('shippingCity', billingData.billingCity)
      form.setValue('shippingState', billingData.billingState)
      form.setValue('shippingPostalCode', billingData.billingPostalCode)
      form.setValue('shippingCountry', billingData.billingCountry)
      form.setValue('shippingPhone', billingData.billingPhone)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Checkout</h1>
        <p className="text-gray-600">Complete your order</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Forms */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    error={form.formState.errors.email?.message}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="billingFirstName">First Name</Label>
                    <Input
                      id="billingFirstName"
                      {...form.register('billingFirstName')}
                      error={form.formState.errors.billingFirstName?.message}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billingLastName">Last Name</Label>
                    <Input
                      id="billingLastName"
                      {...form.register('billingLastName')}
                      error={form.formState.errors.billingLastName?.message}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="billingAddress1">Address</Label>
                  <Input
                    id="billingAddress1"
                    {...form.register('billingAddress1')}
                    error={form.formState.errors.billingAddress1?.message}
                  />
                </div>

                <div>
                  <Label htmlFor="billingAddress2">Apartment, suite, etc. (optional)</Label>
                  <Input
                    id="billingAddress2"
                    {...form.register('billingAddress2')}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="billingCity">City</Label>
                    <Input
                      id="billingCity"
                      {...form.register('billingCity')}
                      error={form.formState.errors.billingCity?.message}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billingState">State</Label>
                    <Input
                      id="billingState"
                      {...form.register('billingState')}
                      error={form.formState.errors.billingState?.message}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billingPostalCode">Postal Code</Label>
                    <Input
                      id="billingPostalCode"
                      {...form.register('billingPostalCode')}
                      error={form.formState.errors.billingPostalCode?.message}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="billingCountry">Country</Label>
                  <Select value={form.watch('billingCountry')} onValueChange={(value) => form.setValue('billingCountry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="billingPhone">Phone (optional)</Label>
                  <Input
                    id="billingPhone"
                    {...form.register('billingPhone')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sameAsBilling"
                    checked={sameAsBilling}
                    onCheckedChange={handleSameAsBillingChange}
                  />
                  <Label htmlFor="sameAsBilling">Same as billing address</Label>
                </div>

                {!sameAsBilling && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="shippingFirstName">First Name</Label>
                        <Input
                          id="shippingFirstName"
                          {...form.register('shippingFirstName')}
                          error={form.formState.errors.shippingFirstName?.message}
                        />
                      </div>
                      <div>
                        <Label htmlFor="shippingLastName">Last Name</Label>
                        <Input
                          id="shippingLastName"
                          {...form.register('shippingLastName')}
                          error={form.formState.errors.shippingLastName?.message}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="shippingAddress1">Address</Label>
                      <Input
                        id="shippingAddress1"
                        {...form.register('shippingAddress1')}
                        error={form.formState.errors.shippingAddress1?.message}
                      />
                    </div>

                    <div>
                      <Label htmlFor="shippingAddress2">Apartment, suite, etc. (optional)</Label>
                      <Input
                        id="shippingAddress2"
                        {...form.register('shippingAddress2')}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="shippingCity">City</Label>
                        <Input
                          id="shippingCity"
                          {...form.register('shippingCity')}
                          error={form.formState.errors.shippingCity?.message}
                        />
                      </div>
                      <div>
                        <Label htmlFor="shippingState">State</Label>
                        <Input
                          id="shippingState"
                          {...form.register('shippingState')}
                          error={form.formState.errors.shippingState?.message}
                        />
                      </div>
                      <div>
                        <Label htmlFor="shippingPostalCode">Postal Code</Label>
                        <Input
                          id="shippingPostalCode"
                          {...form.register('shippingPostalCode')}
                          error={form.formState.errors.shippingPostalCode?.message}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="shippingCountry">Country</Label>
                      <Select value={form.watch('shippingCountry')} onValueChange={(value) => form.setValue('shippingCountry', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="shippingPhone">Phone (optional)</Label>
                      <Input
                        id="shippingPhone"
                        {...form.register('shippingPhone')}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-1 text-sm">
                    <Lock className="h-4 w-4" />
                    Your payment information is secure
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    {...form.register('cardNumber')}
                    error={form.formState.errors.cardNumber?.message}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use test card: 4111111111111111 for successful payment
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expiryMonth">Month</Label>
                    <Select value={form.watch('expiryMonth')} onValueChange={(value) => form.setValue('expiryMonth', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
                            {String(i + 1).padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="expiryYear">Year</Label>
                    <Select value={form.watch('expiryYear')} onValueChange={(value) => form.setValue('expiryYear', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => (
                          <SelectItem key={i} value={String(new Date().getFullYear() + i)}>
                            {new Date().getFullYear() + i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      {...form.register('cvv')}
                      error={form.formState.errors.cvv?.message}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cardName">Name on Card</Label>
                  <Input
                    id="cardName"
                    {...form.register('cardName')}
                    error={form.formState.errors.cardName?.message}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">Test Payment Info</p>
                      <ul className="text-blue-700 space-y-1">
                        <li>• Use card 4111111111111111 for success</li>
                        <li>• Use card 4000000000000002 for decline</li>
                        <li>• Any future expiry date and CVV</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Items */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="relative">
                          <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                            {item.quantity}
                          </Badge>
                          <div className="w-12 h-12 bg-gray-100 rounded border">
                            {item.product.images[0] && (
                              <img
                                src={item.product.images[0].url}
                                alt={item.product.name}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-sm font-medium">
                          {formatCurrency(item.product.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Order Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(summary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>Free</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>{formatCurrency(summary.tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(summary.total)}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isProcessing || cartLoading}
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Complete Order
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    By completing your order, you agree to our terms and conditions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}