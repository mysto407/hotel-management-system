import { useState, useMemo } from 'react'
import { Loader2, Trash2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { deleteFolio, getTransactionsByFolio } from '@/lib/supabase'
import { formatCurrency } from '@/utils/currency'

export default function DeleteFolioModal({
  open,
  onOpenChange,
  folio,
  folios,
  reservationId,
  bookingId,
  onSuccess
}) {
  const [loading, setLoading] = useState(false)
  const [targetFolioId, setTargetFolioId] = useState('')
  const [transactionCount, setTransactionCount] = useState(0)
  const [loadingCount, setLoadingCount] = useState(false)

  // Get available target folios (exclude the one being deleted)
  const availableFolios = useMemo(() => {
    if (!folio || !folios) return []
    return folios.filter(f => f.id !== folio.id && f.is_active !== false)
  }, [folio, folios])

  // Load transaction count when modal opens
  const handleOpenChange = async (newOpen) => {
    if (newOpen && folio) {
      setLoadingCount(true)
      try {
        const { data } = await getTransactionsByFolio(folio.id, { includeVoided: true })
        setTransactionCount(data?.length || 0)
      } catch (err) {
        console.error('Error loading transaction count:', err)
      } finally {
        setLoadingCount(false)
      }

      // Pre-select master folio or first available folio as target
      const masterFolio = availableFolios.find(f => f.folio_type === 'master')
      setTargetFolioId(masterFolio?.id || availableFolios[0]?.id || '')
    } else {
      setTargetFolioId('')
      setTransactionCount(0)
    }
    onOpenChange(newOpen)
  }

  const handleDelete = async () => {
    if (!folio || !targetFolioId) {
      alert('Please select a folio to move transactions to')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await deleteFolio(folio.id, targetFolioId, reservationId, bookingId)

      if (error) throw error

      onSuccess?.(data)
      handleOpenChange(false)
    } catch (err) {
      console.error('Error deleting folio:', err)
      alert('Failed to delete folio: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Validation checks
  const isMasterFolio = folio?.folio_type === 'master'
  const isLastFolio = folios?.filter(f => f.is_active !== false).length <= 1
  const canDelete = !isMasterFolio && !isLastFolio && availableFolios.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Folio
          </DialogTitle>
          <DialogDescription>
            {folio ? `Delete "${folio.name}" folio` : 'Delete folio'}
          </DialogDescription>
        </DialogHeader>

        {/* Validation Errors */}
        {isMasterFolio && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Cannot delete master folio</p>
              <p className="text-sm text-muted-foreground">
                The master folio is required for billing. You can only delete secondary folios.
              </p>
            </div>
          </div>
        )}

        {isLastFolio && !isMasterFolio && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Cannot delete the last folio</p>
              <p className="text-sm text-muted-foreground">
                At least one folio must exist for billing purposes.
              </p>
            </div>
          </div>
        )}

        {canDelete && (
          <div className="space-y-4">
            {/* Transaction Count Info */}
            <div className="p-3 bg-muted rounded-lg">
              {loadingCount ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading transactions...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium">
                    {transactionCount} transaction{transactionCount !== 1 ? 's' : ''} will be moved
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All transactions from this folio will be transferred to the selected folio below.
                  </p>
                </div>
              )}
            </div>

            {/* Target Folio Selection */}
            <div className="space-y-2">
              <Label htmlFor="targetFolio">Move transactions to</Label>
              <Select value={targetFolioId} onValueChange={setTargetFolioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target folio" />
                </SelectTrigger>
                <SelectContent>
                  {availableFolios.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        <span>{f.name}</span>
                        {f.folio_type === 'master' && (
                          <span className="text-xs text-muted-foreground">(Master)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visual Summary */}
            {targetFolioId && (
              <div className="flex items-center justify-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm font-medium text-destructive line-through">{folio?.name}</p>
                  <p className="text-xs text-muted-foreground">Will be deleted</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {availableFolios.find(f => f.id === targetFolioId)?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Receives transactions</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || !targetFolioId}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Folio
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
