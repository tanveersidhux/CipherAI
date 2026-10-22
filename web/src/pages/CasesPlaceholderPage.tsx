import React from 'react'
import { FolderLock } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { EMPTY_STATES } from '@/lib/content/wording'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function CasesPlaceholderPage() {
  return (
    <div className="py-12 max-w-md mx-auto space-y-6 text-center">
      <EmptyState
        title={EMPTY_STATES.cases.title}
        description={EMPTY_STATES.cases.description}
        icon={FolderLock}
      />
      <div>
        <Link to="/">
          <Button variant="outline" size="sm">
            Return to Scanner
          </Button>
        </Link>
      </div>
    </div>
  )
}
