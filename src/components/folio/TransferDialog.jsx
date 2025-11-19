// src/components/folio/TransferDialog.jsx
import { useState, useEffect, useMemo } from 'react'
import { ArrowRight, Loader2, AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import { useFolio } from '../../context/FolioContext'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { format } from 'date-fns'

export default function TransferDialog({ open, onOpenChange, transactions = [], currentFolio, onSuccess }) {
  const {
    loadFoliosByReservation,
    createNewFolio,
    transferTransactionToFolio,
    loadTransferHistory,
    calculateTotals
  } = useFolio()

  // State
  const [step, setStep] = useState(1) // 1: Select Target, 2: Confirm
  const [availableFolios, setAvailableFolios] = useState([])
  const [targetFolioId, setTargetFolioId] = useState('')
  const [targetFolio, setTargetFolio] = useState(null)
  const [newFolioType, setNewFolioType] = useState('room') // 'room' or 'guest'
  const [newFolioName, setNewFolioName] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [transferHistory, setTransferHistory] = useState([])
  const [currentTotals, setCurrentTotals] = useState(null)
  const [targetTotals, setTargetTotals] = useState(null)
  const [errors, setErrors] = useState([])
  const [showCreateNew, setShowCreateNew] = useState(false)

  // Load available folios when dialog opens
  useEffect(() => {
    if (open && currentFolio) {
      loadAvailableFolios()
      loadCurrentTotals()
      loadHistory()
    }
  }, [open, currentFolio])

  // Load target folio totals when selected
  useEffect(() => {
    if (targetFolioId && targetFolioId !== 'new') {
      loadTargetTotals()
    }
  }, [targetFolioId])

  const loadAvailableFolios = async () => {
    if (!currentFolio?.reservation_id) return

    setLoading(true)
    const folios = await loadFoliosByReservation(currentFolio.reservation_id)
    if (folios) {
      // Filter out current folio and settled folios
      const available = folios.filter(f =>
        f.id !== currentFolio.id && f.status !== 'settled'
      )
      setAvailableFolios(available)
    }
    setLoading(false)
  }

  const loadCurrentTotals = async () => {
    if (!currentFolio) return
    const totals = await calculateTotals(currentFolio.id)
    setCurrentTotals(totals)
  }

  const loadTargetTotals = async () => {
    if (!targetFolioId || targetFolioId === 'new') return
    const totals = await calculateTotals(targetFolioId)
    setTargetTotals(totals)

    // Find the folio object
    const folio = availableFolios.find(f => f.id === targetFolioId)
    setTargetFolio(folio)
  }

  const loadHistory = async () => {
    if (!currentFolio) return
    const history = await loadTransferHistory(currentFolio.id)
    setTransferHistory(history || [])
  }

  // Calculate totals
  const transferTotal = useMemo(() => {
    return transactions.reduce((sum, txn) => sum + (txn.amount || 0), 0)
  }, [transactions])

  // Projected balances after transfer
  const projectedCurrentBalance = useMemo(() => {
    if (!currentTotals) return 0
    return (currentTotals.balance || 0) - transferTotal
  }, [currentTotals, transferTotal])

  const projectedTargetBalance = useMemo(() => {
    if (targetFolioId === 'new') return transferTotal
    if (!targetTotals) return 0
    return (targetTotals.balance || 0) + transferTotal
  }, [targetTotals, transferTotal, targetFolioId])

  // Validation
  const canProceed = useMemo(() => {
    if (step === 1) {
      // Step 1: Must select target and provide reason
      if (targetFolioId === 'new') {
        return newFolioName.trim() !== '' && transferReason.trim() !== ''
      }
      return targetFolioId !== '' && transferReason.trim() !== ''
    }
    return true // Step 2: Always can proceed to transfer
  }, [step, targetFolioId, newFolioName, transferReason])

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    }
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleCreateNewFolio = async () => {
    const folioData = {
      reservation_id: currentFolio.reservation_id,
      folio_type: newFolioType,
      folio_name: newFolioName.trim(),
      status: 'open',
      notes: `Created for transaction transfer: ${transferReason}`
    }

    // Add room_id or guest_id based on type
    if (newFolioType === 'room' && currentFolio.room_id) {
      folioData.room_id = currentFolio.room_id
    } else if (newFolioType === 'guest' && currentFolio.guest_id) {
      folioData.guest_id = currentFolio.guest_id
    }

    const newFolio = await createNewFolio(folioData)
    return newFolio
  }

  const handleTransfer = async () => {
    setTransferring(true)
    setCurrentProgress(0)
    setErrors([])

    try {
      // Step 1: Create new folio if needed
      let finalTargetFolioId = targetFolioId

      if (targetFolioId === 'new') {
        const newFolio = await handleCreateNewFolio()
        if (!newFolio) {
          setErrors(['Failed to create new folio'])
          setTransferring(false)
          return
        }
        finalTargetFolioId = newFolio.id
        setTargetFolio(newFolio)
      }

      // Step 2: Transfer each transaction
      const failedTransfers = []
      for (let i = 0; i < transactions.length; i++) {
        const txn = transactions[i]
        const success = await transferTransactionToFolio(
          txn.id,
          finalTargetFolioId,
          transferReason
        )

        if (!success) {
          failedTransfers.push(txn.transaction_number || txn.description)
        }

        setCurrentProgress(((i + 1) / transactions.length) * 100)
      }

      // Step 3: Handle results
      if (failedTransfers.length > 0) {
        setErrors([
          `Failed to transfer ${failedTransfers.length} transaction(s):`,
          ...failedTransfers
        ])
      } else {
        // Success - close dialog and refresh
        if (onSuccess) {
          onSuccess()
        }
        handleClose()
      }
    } catch (error) {
      console.error('Transfer error:', error)
      setErrors(['An unexpected error occurred during transfer'])
    } finally {
      setTransferring(false)
      setCurrentProgress(0)
    }
  }

  const handleClose = () => {
    // Reset state
    setStep(1)
    setTargetFolioId('')
    setTargetFolio(null)
    setTransferReason('')
    setNewFolioName('')
    setNewFolioType('room')
    setShowCreateNew(false)
    setErrors([])
    setCurrentProgress(0)
    onOpenChange(false)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const getTransactionTypeColor = (type) => {
    const colors = {
      room_charge: 'bg-blue-100 text-blue-800',
      addon_charge: 'bg-purple-100 text-purple-800',
      payment: 'bg-green-100 text-green-800',
      tax: 'bg-orange-100 text-orange-800',
      discount: 'bg-yellow-100 text-yellow-800',
      refund: 'bg-red-100 text-red-800',
      adjustment: 'bg-gray-100 text-gray-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Transfer Transactions
            {step === 2 && ' - Confirmation'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        {transferring && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Transferring transactions... {Math.round(currentProgress)}%
            </AlertDescription>
          </Alert>
        )}

        {/* Error messages */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* STEP 1: Select Target Folio */}
          {step === 1 && (
            <>
              {/* Selected Transactions Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Selected Transactions ({transactions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {transactions.map((txn) => (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{txn.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {txn.transaction_number} • {txn.post_date && format(new Date(txn.post_date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getTransactionTypeColor(txn.transaction_type)}>
                            {txn.transaction_type?.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <div className="font-semibold text-sm">
                            {formatCurrency(txn.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="font-semibold">Total Amount</span>
                    <span className="text-lg font-bold">{formatCurrency(transferTotal)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Target Folio Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="target-folio">Target Folio *</Label>
                  {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading available folios...
                    </div>
                  ) : (
                    <>
                      <Select
                        value={targetFolioId}
                        onValueChange={(value) => {
                          setTargetFolioId(value)
                          setShowCreateNew(value === 'new')
                        }}
                      >
                        <SelectTrigger id="target-folio">
                          <SelectValue placeholder="Select destination folio or create new" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFolios.map((folio) => (
                            <SelectItem key={folio.id} value={folio.id}>
                              {folio.folio_name || `Folio #${folio.id}`}
                              {' '}- {folio.folio_type}
                              {folio.status === 'open' && ' (Open)'}
                            </SelectItem>
                          ))}
                          <SelectItem value="new">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Create New Folio
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {availableFolios.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No other folios available. You can create a new one.
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* New Folio Creation Fields */}
                {showCreateNew && (
                  <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                    <h4 className="font-semibold text-sm">New Folio Details</h4>

                    <div className="space-y-2">
                      <Label htmlFor="folio-type">Folio Type *</Label>
                      <Select value={newFolioType} onValueChange={setNewFolioType}>
                        <SelectTrigger id="folio-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="room">Room-Level Folio</SelectItem>
                          <SelectItem value="guest">Guest-Level Folio</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {newFolioType === 'room'
                          ? 'Charges specific to this room'
                          : 'Personal charges for a specific guest'
                        }
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="folio-name">Folio Name *</Label>
                      <input
                        id="folio-name"
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="e.g., Room Service, Mini Bar, Guest Extras"
                        value={newFolioName}
                        onChange={(e) => setNewFolioName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Transfer Reason */}
                <div className="space-y-2">
                  <Label htmlFor="transfer-reason">Transfer Reason *</Label>
                  <Textarea
                    id="transfer-reason"
                    placeholder="Explain why these transactions are being transferred..."
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be recorded in the audit trail
                  </p>
                </div>
              </div>

              {/* Transfer History Preview */}
              {transferHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Transfer History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {transferHistory.slice(0, 5).map((history) => (
                        <div
                          key={history.id}
                          className="text-xs p-2 border rounded-md bg-muted/30"
                        >
                          <div className="flex justify-between items-center">
                            <span>
                              {history.from_folio?.folio_name} → {history.to_folio?.folio_name}
                            </span>
                            <span className="text-muted-foreground">
                              {history.transferred_at && format(new Date(history.transferred_at), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          {history.reason && (
                            <div className="text-muted-foreground italic mt-1">
                              {history.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* STEP 2: Confirmation */}
          {step === 2 && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please review the transfer details carefully. This action will move {transactions.length} transaction(s)
                  to {targetFolio?.folio_name || 'the new folio'}.
                </AlertDescription>
              </Alert>

              {/* Side-by-side Folio Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Folio (FROM) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      From: {currentFolio.folio_name}
                      <Badge variant="outline">Current</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Current Balance</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(currentTotals?.balance || 0)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">After Transfer</div>
                      <div className="text-xl font-bold text-orange-600">
                        {formatCurrency(projectedCurrentBalance)}
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Transferring: </span>
                        <span className="font-semibold text-red-600">
                          -{formatCurrency(transferTotal)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Target Folio (TO) */}
                <Card className="border-2 border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      To: {targetFolio?.folio_name || newFolioName}
                      <Badge>Target</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {targetFolioId === 'new' ? 'Starting Balance' : 'Current Balance'}
                      </div>
                      <div className="text-xl font-bold">
                        {formatCurrency(targetFolioId === 'new' ? 0 : targetTotals?.balance || 0)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">After Transfer</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(projectedTargetBalance)}
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Receiving: </span>
                        <span className="font-semibold text-green-600">
                          +{formatCurrency(transferTotal)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions to be transferred */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Transactions Being Transferred ({transactions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {transactions.map((txn) => (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{txn.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {txn.transaction_number}
                          </div>
                        </div>
                        <div className="font-semibold">{formatCurrency(txn.amount)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Transfer Details */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">Transfer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Reason: </span>
                    <span>{transferReason}</span>
                  </div>
                  {targetFolioId === 'new' && (
                    <div>
                      <span className="font-semibold">New Folio Type: </span>
                      <span className="capitalize">{newFolioType}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={transferring}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!canProceed || transferring}>
                Next: Review Transfer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack} disabled={transferring}>
                Back
              </Button>
              <Button onClick={handleTransfer} disabled={transferring}>
                {transferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm Transfer
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
