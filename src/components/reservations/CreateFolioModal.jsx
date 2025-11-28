import { useState } from 'react'
import { Loader2, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createFolio } from '@/lib/supabase'

const FOLIO_TYPES = [
  { value: 'incidentals', label: 'Incidentals', description: 'For minibar, spa, room service charges' },
  { value: 'guest', label: 'Split / Guest B', description: 'For splitting charges between guests' },
  { value: 'company', label: 'Company', description: 'For corporate billing' },
  { value: 'other', label: 'Other', description: 'Custom folio type' }
]

export default function CreateFolioModal({ open, onOpenChange, reservationId, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [folioType, setFolioType] = useState('guest')
  const [name, setName] = useState('')

  // Reset form when modal opens
  const handleOpenChange = (newOpen) => {
    if (newOpen) {
      setFolioType('guest')
      setName('')
    }
    onOpenChange(newOpen)
  }

  // Generate default name based on type
  const getDefaultName = (type) => {
    const typeInfo = FOLIO_TYPES.find(t => t.value === type)
    return typeInfo?.label || 'New Folio'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!reservationId) {
      alert('No reservation selected')
      return
    }

    const folioName = name.trim() || getDefaultName(folioType)

    setLoading(true)
    try {
      const { data, error } = await createFolio(reservationId, folioType, folioName)

      if (error) throw error

      onSuccess?.(data)
      handleOpenChange(false)
    } catch (err) {
      console.error('Error creating folio:', err)
      alert('Failed to create folio: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Create New Folio
          </DialogTitle>
          <DialogDescription>
            Add a new folio to split charges or organize billing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Folio Type */}
          <div className="space-y-2">
            <Label htmlFor="folioType">Folio Type</Label>
            <Select value={folioType} onValueChange={setFolioType}>
              <SelectTrigger>
                <SelectValue placeholder="Select folio type" />
              </SelectTrigger>
              <SelectContent>
                {FOLIO_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Folio Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Folio Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={getDefaultName(folioType)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use default name based on type
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Folio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
