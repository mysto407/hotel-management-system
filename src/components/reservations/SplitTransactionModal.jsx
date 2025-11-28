import { useState, useEffect } from 'react'
import { Loader2, Scissors, Plus, Trash2 } from 'lucide-react'
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
import { splitTransaction } from '@/lib/supabase'
import { formatCurrency } from '@/utils/currency'

export default function SplitTransactionModal({ open, onOpenChange, transaction, folios = [], onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [splits, setSplits] = useState([
    { amount: '', folioId: '', description: '' },
    { amount: '', folioId: '', description: '' }
  ])

  // Reset form when modal opens
  useEffect(() => {
    if (open && transaction) {
      const halfAmount = (Math.abs(transaction.amount) / 2).toFixed(2)
      const defaultFolioId = transaction.folio_id || (folios.length > 0 ? folios[0].id : '')
      setSplits([
        { amount: halfAmount, folioId: defaultFolioId, description: '' },
        { amount: halfAmount, folioId: defaultFolioId, description: '' }
      ])
    }
  }, [open, transaction, folios])

  const originalAmount = transaction ? Math.abs(transaction.amount) : 0

  // Calculate remaining amount
  const totalSplitAmount = splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
  const remaining = originalAmount - totalSplitAmount
  const isValid = Math.abs(remaining) < 0.01 && splits.every(s => parseFloat(s.amount) > 0)

  // Update a split
  const updateSplit = (index, field, value) => {
    setSplits(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Add a new split
  const addSplit = () => {
    const defaultFolioId = transaction?.folio_id || (folios.length > 0 ? folios[0].id : '')
    setSplits(prev => [...prev, { amount: '', folioId: defaultFolioId, description: '' }])
  }

  // Remove a split
  const removeSplit = (index) => {
    if (splits.length <= 2) return // Must have at least 2 splits
    setSplits(prev => prev.filter((_, i) => i !== index))
  }

  // Distribute evenly
  const distributeEvenly = () => {
    const count = splits.length
    const evenAmount = (originalAmount / count).toFixed(2)
    const lastAmount = (originalAmount - (parseFloat(evenAmount) * (count - 1))).toFixed(2)

    setSplits(prev => prev.map((s, i) => ({
      ...s,
      amount: i === count - 1 ? lastAmount : evenAmount
    })))
  }

  // Auto-fill remaining to last split
  const fillRemaining = () => {
    if (remaining <= 0) return
    const lastIndex = splits.length - 1
    const currentLast = parseFloat(splits[lastIndex].amount || 0)
    updateSplit(lastIndex, 'amount', (currentLast + remaining).toFixed(2))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!transaction || !isValid) {
      alert('Please ensure split amounts add up to the original amount')
      return
    }

    setLoading(true)
    try {
      const splitData = splits.map(s => ({
        amount: parseFloat(s.amount),
        folioId: s.folioId || undefined,
        description: s.description || undefined
      }))

      const { error } = await splitTransaction(transaction.id, splitData)

      if (error) throw error

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      console.error('Error splitting transaction:', err)
      alert('Failed to split transaction: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Split Transaction
          </DialogTitle>
          <DialogDescription>
            Split this charge into multiple parts
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Original Transaction */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Splitting:</p>
            <p className="font-medium">{transaction.description}</p>
            <p className="text-lg font-bold">{formatCurrency(originalAmount)}</p>
          </div>

          {/* Split Distribution Buttons */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={distributeEvenly}>
              Distribute Evenly
            </Button>
            {remaining > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={fillRemaining}>
                Fill Remaining ({formatCurrency(remaining)})
              </Button>
            )}
          </div>

          {/* Split Items */}
          <div className="space-y-3">
            <Label>Split Parts</Label>
            {splits.map((split, index) => (
              <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={split.amount}
                        onChange={(e) => updateSplit(index, 'amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    {folios.length > 1 && (
                      <div className="flex-1">
                        <Label className="text-xs">Folio</Label>
                        <Select
                          value={split.folioId}
                          onValueChange={(val) => updateSplit(index, 'folioId', val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select folio" />
                          </SelectTrigger>
                          <SelectContent>
                            {folios.map(folio => (
                              <SelectItem key={folio.id} value={folio.id}>
                                {folio.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Description (optional)</Label>
                    <Input
                      value={split.description}
                      onChange={(e) => updateSplit(index, 'description', e.target.value)}
                      placeholder={`Part ${index + 1}`}
                    />
                  </div>
                </div>
                {splits.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeSplit(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addSplit}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Part
            </Button>
          </div>

          {/* Summary */}
          <div className={`p-3 rounded-lg border ${isValid ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800'}`}>
            <div className="flex justify-between text-sm">
              <span>Original Amount:</span>
              <span className="font-medium">{formatCurrency(originalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Split:</span>
              <span className="font-medium">{formatCurrency(totalSplitAmount)}</span>
            </div>
            <div className="flex justify-between text-sm border-t mt-2 pt-2">
              <span>Remaining:</span>
              <span className={`font-medium ${Math.abs(remaining) < 0.01 ? 'text-green-600' : 'text-orange-600'}`}>
                {formatCurrency(Math.abs(remaining))}
                {remaining > 0 && ' (unallocated)'}
                {remaining < -0.01 && ' (over-allocated)'}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isValid}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Split Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
