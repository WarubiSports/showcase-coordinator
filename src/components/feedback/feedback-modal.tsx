'use client'

import { useState, useRef } from 'react'
import { MessageSquarePlus, Bug, Lightbulb, Sparkles, MessageCircle, Upload, X, Image } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type FeedbackType = 'bug' | 'feature' | 'idea' | 'other'
type Importance = 'nice_to_have' | 'helpful' | 'important' | 'critical'

const TYPES = [
  { value: 'bug' as const, label: 'Bug', icon: Bug, color: 'bg-red-500 text-white', inactiveColor: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
  { value: 'feature' as const, label: 'Feature', icon: Sparkles, color: 'bg-blue-500 text-white', inactiveColor: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { value: 'idea' as const, label: 'Idea', icon: Lightbulb, color: 'bg-amber-500 text-white', inactiveColor: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { value: 'other' as const, label: 'Other', icon: MessageCircle, color: 'bg-gray-500 text-white', inactiveColor: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100' },
]

const IMPORTANCE = [
  { value: 'nice_to_have' as const, label: 'Nice to have' },
  { value: 'helpful' as const, label: 'Helpful' },
  { value: 'important' as const, label: 'Important' },
  { value: 'critical' as const, label: 'Critical' },
]

function generateAIPrompt(type: FeedbackType, description: string, details?: string, pageUrl?: string): string {
  const typeLabels: Record<FeedbackType, string> = {
    bug: 'Fix this bug',
    feature: 'Implement this feature',
    idea: 'Consider implementing this idea',
    other: 'Address this feedback',
  }

  let prompt = `${typeLabels[type]} in the Showcase Coordinator app:\n\n`
  prompt += `**Issue:** ${description}\n`

  if (details) {
    prompt += `\n**Details:** ${details}\n`
  }

  if (pageUrl) {
    const path = new URL(pageUrl).pathname
    prompt += `\n**Affected page:** ${path}\n`
  }

  if (type === 'bug') {
    prompt += `\n**Instructions:**\n1. Investigate the root cause\n2. Implement a fix\n3. Test the fix thoroughly\n4. Deploy the changes`
  } else if (type === 'feature') {
    prompt += `\n**Instructions:**\n1. Analyze the feature request\n2. Design the implementation\n3. Implement the feature\n4. Test and deploy`
  }

  return prompt
}

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
  userName?: string
}

export function FeedbackModal({ open, onClose, userName }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('bug')
  const [description, setDescription] = useState('')
  const [details, setDetails] = useState('')
  const [importance, setImportance] = useState<Importance>('helpful')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Screenshot must be under 5MB')
        return
      }
      setScreenshot(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeScreenshot = () => {
    setScreenshot(null)
    setScreenshotPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    const fileName = `feedback/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('screenshots')
      .upload(fileName, file)

    if (error) {
      console.error('Screenshot upload failed:', error)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('screenshots')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please provide a description')
      return
    }

    setIsSubmitting(true)

    try {
      let screenshotUrl: string | null = null
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot)
      }

      const aiPrompt = generateAIPrompt(type, description, details, currentUrl)

      const { error } = await supabase.from('showcase_feedback').insert([
        {
          type,
          description: description.trim(),
          details: details.trim() || null,
          importance,
          page_url: currentUrl,
          screenshot_url: screenshotUrl,
          ai_prompt: aiPrompt,
          submitted_by: userName || 'Anonymous',
        },
      ])

      if (error) throw error

      toast.success('Feedback submitted! Thank you.')
      onClose()
      setDescription('')
      setDetails('')
      setType('bug')
      setImportance('helpful')
      removeScreenshot()
    } catch (err) {
      console.error('Failed to submit feedback:', err)
      toast.error('Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>Feedback & Ideas</DialogTitle>
              <p className="text-sm text-muted-foreground">Help us build what you need</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">What type of feedback?</Label>
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all',
                    type === t.value ? t.color : t.inactiveColor
                  )}
                >
                  <t.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {type === 'bug' ? 'What went wrong?' : 'What would you like?'} *
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'bug' ? 'Brief description of the issue' : 'Brief description'}
            />
          </div>

          {/* Details */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tell us more (optional)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What happened? What did you expect to happen?"
              rows={3}
            />
          </div>

          {/* Importance */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">How important is this to you?</Label>
            <div className="flex gap-2">
              {IMPORTANCE.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => setImportance(i.value)}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-full text-xs font-medium border transition-all',
                    importance === i.value
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          {/* Current Page */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Current Page</Label>
            <Input
              value={currentUrl}
              readOnly
              className="text-sm text-muted-foreground bg-muted"
            />
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Screenshot (optional)</Label>
            {screenshotPreview ? (
              <div className="relative border rounded-lg overflow-hidden">
                <img src={screenshotPreview} alt="Screenshot preview" className="w-full max-h-40 object-cover" />
                <button
                  type="button"
                  onClick={removeScreenshot}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload a screenshot</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleScreenshotChange}
              className="hidden"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!description.trim() || isSubmitting}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
