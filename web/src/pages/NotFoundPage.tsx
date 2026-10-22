import React from 'react'
import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="py-16 max-w-md mx-auto text-center space-y-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mx-auto">
        <FileQuestion className="h-7 w-7" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          404 — Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The requested route or threat intelligence document does not exist or has been relocated.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Link to="/">
          <Button variant="default" size="sm" className="gap-2">
            <Home className="h-4 w-4" />
            <span>Return Home</span>
          </Button>
        </Link>
        <Link to="/history">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Scan History</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
