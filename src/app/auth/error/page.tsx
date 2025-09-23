'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = () => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'You do not have permission to sign in.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      case 'OAuthSignin':
        return 'Error occurred while signing in with OAuth provider.'
      case 'OAuthCallback':
        return 'Error occurred during OAuth callback.'
      case 'OAuthCreateAccount':
        return 'Could not create OAuth provider user account.'
      case 'EmailCreateAccount':
        return 'Could not create email provider user account.'
      case 'Callback':
        return 'Error occurred during callback.'
      case 'OAuthAccountNotLinked':
        return 'Email is already linked to another account. Sign in with the original account to link them.'
      case 'EmailSignin':
        return 'Check your email for the sign in link.'
      case 'CredentialsSignin':
        return 'Sign in failed. Check the details you provided are correct.'
      default:
        return 'An error occurred during authentication.'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>There was a problem signing you in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{getErrorMessage()}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Link href="/auth/signin" className="w-full">
            <Button className="w-full">Try again</Button>
          </Link>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">Go to homepage</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}