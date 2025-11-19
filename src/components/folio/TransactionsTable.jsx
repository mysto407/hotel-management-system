import { useState } from 'react'
import { format } from 'date-fns'
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  XCircle,
  FileText,
  Tag,
  MoreVertical,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { useFolio } from '../../context/FolioContext'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Card, CardContent } from '../ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { cn } from '../../lib/utils'

export default function TransactionsTable({
  transactions = [],
  onReload,
  selectedTransactions = [],
  setSelectedTransactions,
  masterFolio
}) {
  const { voidTransactionById, updateTransactionData } = useFolio()

  // Local state
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [editNotesDialogOpen, setEditNotesDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editTags, setEditTags] = useState('')
  const [processing, setProcessing] = useState(false)

  // Toggle row expansion
  const toggleRowExpansion = (transactionId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId)
    } else {
      newExpanded.add(transactionId)
    }
    setExpandedRows(newExpanded)
  }

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTransactions(transactions.map(t => t.id))
    } else {
      setSelectedTransactions([])
    }
  }

  // Handle individual selection
  const handleSelectTransaction = (transactionId, checked) => {
    if (checked) {
      setSelectedTransactions([...selectedTransactions, transactionId])
    } else {
      setSelectedTransactions(selectedTransactions.filter(id => id !== transactionId))
    }
  }

  // Open void dialog
  const openVoidDialog = (transaction) => {
    setSelectedTransaction(transaction)
    setVoidReason('')
    setVoidDialogOpen(true)
  }

  // Handle void transaction
  const handleVoidTransaction = async () => {
    if (!selectedTransaction || !voidReason.trim()) {
      return
    }

    setProcessing(true)
    const success = await voidTransactionById(selectedTransaction.id, voidReason)
    setProcessing(false)

    if (success) {
      setVoidDialogOpen(false)
      setSelectedTransaction(null)
      setVoidReason('')
      if (onReload) onReload()
    }
  }

  // Open edit notes dialog
  const openEditNotesDialog = (transaction) => {
    setSelectedTransaction(transaction)
    setEditNotes(transaction.notes || '')
    setEditTags(transaction.tags?.join(', ') || '')
    setEditNotesDialogOpen(true)
  }

  // Handle update notes
  const handleUpdateNotes = async () => {
    if (!selectedTransaction) return

    setProcessing(true)
    const tags = editTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    const success = await updateTransactionData(selectedTransaction.id, {
      notes: editNotes,
      tags: tags.length > 0 ? tags : null
    })
    setProcessing(false)

    if (success) {
      setEditNotesDialogOpen(false)
      setSelectedTransaction(null)
      setEditNotes('')
      setEditTags('')
      if (onReload) onReload()
    }
  }

  // Get transaction type badge color
  const getTypeColor = (type) => {
    switch (type) {
      case 'room_charge':
      case 'addon_charge':
      case 'fee':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'payment':
      case 'deposit':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'tax':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'discount':
      case 'refund':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'posted':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'voided':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'posted':
        return <CheckCircle2 className="h-3 w-3" />
      case 'pending':
        return <AlertCircle className="h-3 w-3" />
      case 'voided':
        return <XCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  // Format transaction type display
  const formatType = (type) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0)
  }

  // Empty state
  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
            <p className="text-sm text-muted-foreground">
              No transactions have been posted to this folio yet.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const allSelected = transactions.length > 0 && selectedTransactions.length === transactions.length
  const someSelected = selectedTransactions.length > 0 && selectedTransactions.length < transactions.length

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {setSelectedTransactions && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all transactions"
                      className={cn(someSelected && "data-[state=checked]:bg-muted")}
                    />
                  </TableHead>
                )}
                <TableHead className="w-12"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Transaction #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const isExpanded = expandedRows.has(transaction.id)
                const isSelected = selectedTransactions.includes(transaction.id)
                const isVoided = transaction.status === 'voided'
                const canVoid = transaction.status === 'posted' && !isVoided

                return (
                  <Collapsible
                    key={transaction.id}
                    open={isExpanded}
                    onOpenChange={() => toggleRowExpansion(transaction.id)}
                    asChild
                  >
                    <>
                      <TableRow
                        className={cn(
                          isVoided && "opacity-60",
                          isSelected && "bg-muted/50"
                        )}
                      >
                        {setSelectedTransactions && (
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleSelectTransaction(transaction.id, checked)
                              }
                              aria-label={`Select transaction ${transaction.transaction_number}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          {transaction.post_date
                            ? format(new Date(transaction.post_date), 'MMM dd, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <span className={cn(isVoided && "line-through")}>
                            {transaction.transaction_number || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className={cn("font-medium", isVoided && "line-through")}>
                              {transaction.description}
                            </span>
                            {transaction.tags && transaction.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {transaction.tags.map((tag, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs px-1.5 py-0"
                                  >
                                    <Tag className="h-2.5 w-2.5 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "border",
                              getTypeColor(transaction.transaction_type)
                            )}
                          >
                            {formatType(transaction.transaction_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "font-semibold",
                              isVoided && "line-through",
                              transaction.amount < 0 ? "text-red-600" : "text-green-600"
                            )}
                          >
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusVariant(transaction.status)}
                            className="gap-1"
                          >
                            {getStatusIcon(transaction.status)}
                            {transaction.status.charAt(0).toUpperCase() +
                              transaction.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditNotesDialog(transaction)}
                              title="Edit notes"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {canVoid && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openVoidDialog(transaction)}
                                title="Void transaction"
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Details Row */}
                      <TableRow>
                        <TableCell
                          colSpan={setSelectedTransactions ? 9 : 8}
                          className="p-0 border-0"
                        >
                          <CollapsibleContent asChild>
                            <div className="bg-muted/30 px-6 py-4 border-t">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Basic Details */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-muted-foreground">
                                    Transaction Details
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Category:</span>
                                      <span className="font-medium">
                                        {transaction.category || 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Quantity:</span>
                                      <span className="font-medium">
                                        {transaction.quantity || 1}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Rate:</span>
                                      <span className="font-medium">
                                        {formatCurrency(transaction.rate)}
                                      </span>
                                    </div>
                                    {transaction.reference_number && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Reference:</span>
                                        <span className="font-medium font-mono text-xs">
                                          {transaction.reference_number}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Payment Details (if applicable) */}
                                {(transaction.payment_method || transaction.payment_status) && (
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-muted-foreground">
                                      Payment Information
                                    </h4>
                                    <div className="space-y-1 text-sm">
                                      {transaction.payment_method && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Method:</span>
                                          <span className="font-medium">
                                            {transaction.payment_method}
                                          </span>
                                        </div>
                                      )}
                                      {transaction.payment_status && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Status:</span>
                                          <span className="font-medium">
                                            {transaction.payment_status}
                                          </span>
                                        </div>
                                      )}
                                      {transaction.card_last_four && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Card:</span>
                                          <span className="font-medium">
                                            {transaction.card_type} ****{transaction.card_last_four}
                                          </span>
                                        </div>
                                      )}
                                      {transaction.upi_id && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">UPI ID:</span>
                                          <span className="font-medium">{transaction.upi_id}</span>
                                        </div>
                                      )}
                                      {transaction.gateway_transaction_id && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Gateway Txn:</span>
                                          <span className="font-medium font-mono text-xs">
                                            {transaction.gateway_transaction_id}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Audit Information */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-muted-foreground">
                                    Audit Trail
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Created:</span>
                                      <span className="font-medium">
                                        {transaction.created_at
                                          ? format(
                                              new Date(transaction.created_at),
                                              'MMM dd, yyyy HH:mm'
                                            )
                                          : '-'}
                                      </span>
                                    </div>
                                    {transaction.modified_at && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Modified:</span>
                                        <span className="font-medium">
                                          {format(
                                            new Date(transaction.modified_at),
                                            'MMM dd, yyyy HH:mm'
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {isVoided && transaction.voided_at && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Voided:</span>
                                        <span className="font-medium text-destructive">
                                          {format(
                                            new Date(transaction.voided_at),
                                            'MMM dd, yyyy HH:mm'
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {isVoided && transaction.void_reason && (
                                      <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground">Void Reason:</span>
                                        <span className="font-medium text-sm text-destructive">
                                          {transaction.void_reason}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Notes Section */}
                              {transaction.notes && (
                                <div className="mt-4 p-3 bg-background rounded-md border">
                                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                                    Notes
                                  </h4>
                                  <p className="text-sm whitespace-pre-wrap">{transaction.notes}</p>
                                </div>
                              )}

                              {/* Transfer Information */}
                              {transaction.transferred_from_id && (
                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200">
                                  <p className="text-sm text-blue-700 dark:text-blue-400">
                                    Transferred from another folio
                                  </p>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </TableCell>
                      </TableRow>
                    </>
                  </Collapsible>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Void Transaction Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Transaction</DialogTitle>
            <DialogDescription>
              This action will void the transaction. Please provide a reason for voiding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTransaction && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction:</span>
                    <span className="font-medium">
                      {selectedTransaction.transaction_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Description:</span>
                    <span className="font-medium">{selectedTransaction.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedTransaction.amount)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Void Reason *</label>
              <Textarea
                placeholder="Enter reason for voiding this transaction..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVoidDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoidTransaction}
              disabled={!voidReason.trim() || processing}
            >
              {processing ? 'Voiding...' : 'Void Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Notes Dialog */}
      <Dialog open={editNotesDialogOpen} onOpenChange={setEditNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction Notes & Tags</DialogTitle>
            <DialogDescription>
              Update notes and tags for this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTransaction && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction:</span>
                    <span className="font-medium">
                      {selectedTransaction.transaction_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Description:</span>
                    <span className="font-medium">{selectedTransaction.description}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Enter transaction notes..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <Input
                placeholder="Enter tags separated by commas (e.g., important, reviewed, flagged)"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple tags with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditNotesDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateNotes} disabled={processing}>
              {processing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
