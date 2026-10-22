/**
 * Login & Sign-Up Page for CIPHER AI.
 * Implements accessible email/password authentication using Supabase Auth.
 */

import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      setErrorMsg(error.message || 'Invalid email or password.')
    } else {
      navigate(fromLocation, { replace: true })
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const { error } = await signUp(email, password)
    setLoading(false)

    if (error) {
      setErrorMsg(error.message || 'Failed to create account. Please try again.')
    } else {
      setSuccessMsg('Account created successfully! Check your email for confirmation or sign in.')
    }
  }

  return (
    <div className="py-12 px-4 max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2 shadow-sm">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome to CIPHER AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access your private scan history, dashboard, and investigation cases.
        </p>
      </div>

      <Card className="border-border/60 shadow-lg bg-card/80 backdrop-blur-sm">
        <Tabs defaultValue="signin" className="w-full">
          <CardHeader className="pb-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs font-medium"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="flex items-start gap-2.5 p-3 rounded-md bg-success/15 border border-success/30 text-success text-xs font-medium"
              >
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <TabsContent value="signin" className="m-0 space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signin-email" className="text-xs font-medium text-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="analyst@enterprise.com"
                      className="pl-9 text-xs sm:text-sm"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="signin-password" className="text-xs font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-9 text-xs sm:text-sm"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="m-0 space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-xs font-medium text-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="analyst@enterprise.com"
                      className="pl-9 text-xs sm:text-sm"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="signup-password" className="text-xs font-medium text-foreground">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="pl-9 text-xs sm:text-sm"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <div className="text-center">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Continue as Guest (Scan results are not saved)
        </Link>
      </div>
    </div>
  )
}
