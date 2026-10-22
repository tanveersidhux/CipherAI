import React from 'react'
import { Link2, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UrlScanForm } from './UrlScanForm'
import { MessageScanForm, type MessageChannel } from './MessageScanForm'
import { cn } from '@/lib/utils'

export interface ScanInputCardProps {
  onScanUrl: (url: string, options: { use_ai: boolean; persist: boolean }) => Promise<void>
  onScanMessage: (
    message: string,
    channel: MessageChannel,
    options: { use_ai: boolean; persist: boolean }
  ) => Promise<void>
  isSubmitting?: boolean
  defaultTab?: 'url' | 'message'
  className?: string
}

export function ScanInputCard({
  onScanUrl,
  onScanMessage,
  isSubmitting = false,
  defaultTab = 'url',
  className,
}: ScanInputCardProps) {
  return (
    <Card className={cn('border-border/60 bg-card/85 shadow-lg backdrop-blur-md', className)}>
      <CardContent className="p-5 sm:p-7">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="h-4 w-4" />
              <span>URL Inspection</span>
            </TabsTrigger>
            <TabsTrigger value="message" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Scam Message</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="focus-visible:outline-none">
            <UrlScanForm onSubmit={onScanUrl} isSubmitting={isSubmitting} />
          </TabsContent>

          <TabsContent value="message" className="focus-visible:outline-none">
            <MessageScanForm onSubmit={onScanMessage} isSubmitting={isSubmitting} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
