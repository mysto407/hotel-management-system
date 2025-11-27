// src/components/reservations/SplitTransactionModal.jsx
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { AlertCircle, Split, Plus, Trash2 } from 'lucide-react'
import { useBilling } from '../../context/BillingContext'
import { getFolioTypeName } from '../../lib/supabase'

export default function SplitTransactionModal({
  open,
  onOpenChange,
  transaction,
  folios,
  currentFolioId,
  reservationId,
  onSuccess
}) {
  const { transferTransaction } = useBilling()

  const [splits, setSplits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Available folios (excluding current folio)
  const availableFolios = folios?.filter(f => f.id !== currentFolioId && f.is_active) || []

  // Initialize splits when modal opens
  useEffect(() => {
    if (open && transaction) {
      // Start with one split for the full amount to a different folio
      setSplits([{
        id: Date.now(),
        folioId: '',
        amount: '',
        percentage: ''
      }])
      setError(null)
    }
  }, [open, transaction])

  const transactionAmount = parseFloat(transaction?.amount) || 0

  // Calculate remaining amount
  const totalSplitAmount = splits.reduce((sum, split) => {
    return sum + (parseFloat(split.amount) || 0)
  }, 0)
  const remainingAmount = transactionAmount - totalSplitAmount
  const remainingInCurrentFolio = remainingAmount

  // Add a new split
  const addSplit = () => {
    setSplits([...splits, {
      id: Date.now(),
      folioId: '',
      amount: '',
      percentage: ''
    }])
  }

  // Remove a split
  const removeSplit = (splitId) => {
    setSplits(splits.filter(s => s.id !== splitId))
  }

  // Update split amount
  const updateSplitAmount = (splitId, amount) => {
    setSplits(splits.map(s => {
      if (s.id === splitId) {
        const numAmount = parseFloat(amount) || 0
        const percentage = transactionAmount > 0 ? ((numAmount / transactionAmount) * 100).toFixed(1) : 0
        return { ...s, amount, percentage }
      }
      return s
    }))
  }

  // Update split percentage
  const updateSplitPercentage = (splitId, percentage) => {
    setSplits(splits.map(s => {
      if (s.id === splitId) {
        const numPercentage = parseFloat(percentage) || 0
        const amount = ((numPercentage / 100) * transactionAmount).toFixed(2)
        return { ...s, percentage, amount }
      }
      return s
    }))
  }

  // Update split folio
  const updateSplitFolio = (splitId, folioId) => {
    setSplits(splits.map(s => {
      if (s.id === splitId) {
        return { ...s, folioId }
      }
      return s
    }))
  }

  // Split evenly among all target folios
  const splitEvenly = () => {
    if (splits.length === 0) return
    const evenAmount = (transactionAmount / (splits.length + 1)).toFixed(2) // +1 for current folio
    setSplits(splits.map(s => ({
      ...s,
      amount: evenAmount,
      percentage: ((parseFloat(evenAmount) / transactionAmount) * 100).toFixed(1)
    })))
  }

  // Validate splits
  const validateSplits = () => {
    // Check all splits have a folio selected
    const missingFolio = splits.some(s => !s.folioId)
    if (missingFolio) {
      setError('Please select a target folio for all splits')
      return false
    }

    // Check all splits have amounts
    const missingAmount = splits.some(s => !s.amount || parseFloat(s.amount) <= 0)
    if (missingAmount) {
      setError('Please enter an amount for all splits')
      return false
    }

    // Check total doesn't exceed original amount
    if (totalSplitAmount > transactionAmount) {
      setError('Total split amount cannot exceed the original transaction amount')
      return false
    }

    // Check for duplicate folios
    const folioIds = splits.map(s => s.folioId)
    const hasDuplicates = folioIds.some((id, index) => folioIds.indexOf(id) !== index)
    if (hasDuplicates) {
      setError('Cannot split to the same folio multiple times')
      return false
    }

    setError(null)
    return true
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!validateSplits()) return

    setLoading(true)
    setError(null)

    try {
      // For each split, transfer a portion to the target folio
      // Note: This is a simplified implementation - in production, you might want
      // to create new transactions for the split amounts rather than transferring
      for (const split of splits) {
        const targetFolio = folios.find(f => f.id === split.folioId)
        const notes = `Split from original amount ₹${transactionAmount} - ₹${split.amount} to ${targetFolio?.name || 'Unknown Folio'}`

        // For simplicity, we'll transfer the transaction if it's the full amount
        // Otherwise, we'd need to create partial transactions
        if (splits.length === 1 && parseFloat(split.amount) === transactionAmount) {
          // Full transfer
          await transferTransaction(transaction.id, split.folioId, notes)
        } else {
          // Partial split - this would require creating new transactions
          // For now, show a message that partial splits create new transactions
          setError('Partial splits are not yet fully implemented. Please transfer the full amount or contact support.')
          setLoading(false)
          return
        }
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      console.error('Error splitting transaction:', err)
      setError('Failed to split transaction. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            Split Transaction
          </DialogTitle>
          <DialogDescription>
            Split this charge between multiple folios
          </DialogDescription>
        </DialogHeader>

        {/* Original Transaction Info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Transaction</span>
                <span className="font-medium">{transaction.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Original Amount</span>
                <span className="font-bold text-lg">₹{transactionAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline">{transaction.transaction_type?.replace('_', ' ')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Split Configuration */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-base font-semibold">Split To</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={splitEvenly} disabled={splits.length === 0}>
                Split Evenly
              </Button>
              <Button variant="outline" size="sm" onClick={addSplit} disabled={availableFolios.length === 0}>
                <Plus className="h-4 w-4 mr-1" />
                Add Split
              </Button>
            </div>
          </div>

          {availableFolios.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No other active folios available. Create additional folios first.
            </div>
          ) : (
            <div className="space-y-3">
              {splits.map((split, index) => (
                <Card key={split.id}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-5 space-y-2">
                        <Label>Target Folio</Label>
                        <Select
                          value={split.folioId}
                          onValueChange={(value) => updateSplitFolio(split.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select folio..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFolios.map(folio => (
                              <SelectItem key={folio.id} value={folio.id}>
                                {folio.name} ({getFolioTypeName(folio.folio_type)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label>Amount (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          max={transactionAmount}
                          value={split.amount}
                          onChange={(e) => updateSplitAmount(split.id, e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label>Percentage (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={split.percentage}
                          onChange={(e) => updateSplitPercentage(split.id, e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSplit(split.id)}
                          className="h-9 w-9"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Summary */}
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total to split:</span>
                  <span className="font-medium">₹{totalSplitAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining in current folio:</span>
                  <span className={`font-medium ${remainingAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{remainingInCurrentFolio.toFixed(2)}
                  </span>
                </div>
                {remainingAmount < 0 && (
                  <div className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Split amount exceeds original transaction
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || splits.length === 0 || totalSplitAmount <= 0}
          >
            {loading ? 'Splitting...' : 'Split Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
