import { useState, useEffect } from 'react'
import { Plus, Download, Filter, RotateCcw, Ban, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useBilling } from '../../context/BillingContext'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import AddTransactionModal from './AddTransactionModal'

export default function FolioTab({ reservationIds, primaryReservation }) {
  const {
    getTransactions,
    getTransactionSummary,
    reverseTransactionById,
    voidTransactionById,
    TRANSACTION_TYPES,
    TRANSACTION_STATUS
  } = useBilling()

  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReverseModal, setShowReverseModal] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [reverseReason, setReverseReason] = useState('')
  const [voidReason, setVoidReason] = useState('')

  // Filters
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  // Load transactions and summary
  const loadData = async () => {
    setLoading(true)
    try {
      // For simplicity, load transactions for primary reservation
      // In production, you might aggregate across all reservation IDs
      const txData = await getTransactions(primaryReservation.id)
      setTransactions(txData)

      const summaryData = await getTransactionSummary(primaryReservation.id)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (primaryReservation?.id) {
      loadData()
    }
  }, [primaryReservation])

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    if (filters.type !== 'all' && tx.transaction_type !== filters.type) return false
    if (filters.status !== 'all' && tx.transaction_status !== filters.status) return false
    if (filters.search) {
      const search = filters.search.toLowerCase()
      return tx.description?.toLowerCase().includes(search) ||
             tx.reference_number?.toLowerCase().includes(search) ||
             tx.payment_reference?.toLowerCase().includes(search)
    }
    return true
  })

  // Group transactions by type for summary
  const groupedByType = filteredTransactions.reduce((acc, tx) => {
    const type = tx.transaction_type
    if (!acc[type]) acc[type] = []
    acc[type].push(tx)
    return acc
  }, {})

  // Handle reverse
  const handleReverse = async () => {
    if (!selectedTransaction || !reverseReason) return

    await reverseTransactionById(selectedTransaction.id, reverseReason)
    setShowReverseModal(false)
    setReverseReason('')
    setSelectedTransaction(null)
    loadData()
  }

  // Handle void
  const handleVoid = async () => {
    if (!selectedTransaction || !voidReason) return

    await voidTransactionById(selectedTransaction.id, voidReason)
    setShowVoidModal(false)
    setVoidReason('')
    setSelectedTransaction(null)
    loadData()
  }

  // Get badge variant for transaction type
  const getTypeVariant = (type) => {
    if (type.startsWith('payment_')) return 'success'
    if (type === 'discount' || type === 'refund' || type === 'write_off') return 'warning'
    if (type === 'reversal' || type === 'void') return 'destructive'
    return 'default'
  }

  // Get badge variant for status
  const getStatusVariant = (status) => {
    switch (status) {
      case 'posted': return 'success'
      case 'pending': return 'warning'
      case 'reversed': case 'voided': return 'destructive'
      default: return 'default'
    }
  }

  // Format transaction type for display
  const formatType = (type) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  // Format amount with color
  const formatAmount = (amount, type) => {
    const isCredit = amount < 0
    const absAmount = Math.abs(amount)
    const colorClass = isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'

    return (
      <span className={colorClass}>
        {isCredit && '- '}₹{absAmount.toFixed(2)}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Print Folio
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters({ ...filters, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="room_charge">Room Charge</SelectItem>
                    <SelectItem value="service_charge">Service Charge</SelectItem>
                    <SelectItem value="tax">Tax</SelectItem>
                    <SelectItem value="fee">Fee</SelectItem>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="payment_cash">Payment - Cash</SelectItem>
                    <SelectItem value="payment_card">Payment - Card</SelectItem>
                    <SelectItem value="payment_online">Payment - Online</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reversed">Reversed</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search description, ref #..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {summary && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader>
            <CardTitle>Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Charges</p>
                <p className="text-2xl font-bold">₹{summary.total_charges?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ₹{summary.total_payments?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Discounts</p>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{summary.total_discounts?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className={`text-2xl font-bold ${
                  (summary.net_balance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  ₹{Math.abs(summary.net_balance || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(summary.net_balance || 0) > 0 ? 'Due' : 'Credit'}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Posted: </span>
                <span className="font-semibold">{summary.total_posted_transactions || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pending: </span>
                <span className="font-semibold">{summary.total_pending_transactions || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Reversed: </span>
                <span className="font-semibold">{summary.total_reversed_transactions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transaction History ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {new Date(tx.transaction_date).toLocaleDateString()}
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.transaction_date).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeVariant(tx.transaction_type)}>
                        {formatType(tx.transaction_type)}
                      </Badge>
                      {tx.service_category && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatType(tx.service_category)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {tx.description}
                        {tx.notes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {tx.notes}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.reference_number || tx.payment_reference || '-'}
                      {tx.payment_method && (
                        <div className="text-xs text-muted-foreground">
                          {tx.payment_method}
                          {tx.card_last_four && ` •••• ${tx.card_last_four}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatAmount(tx.amount, tx.transaction_type)}
                      {tx.quantity && tx.quantity > 1 && (
                        <div className="text-xs text-muted-foreground">
                          {tx.quantity} × ₹{tx.rate?.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(tx.transaction_status)}>
                        {formatType(tx.transaction_status)}
                      </Badge>
                      {tx.reversal_reason && (
                        <div className="text-xs text-muted-foreground mt-1" title={tx.reversal_reason}>
                          {tx.reversal_reason.substring(0, 20)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.created_by_user?.name || 'System'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {tx.transaction_status === 'posted' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransaction(tx)
                              setShowReverseModal(true)
                            }}
                            title="Reverse Transaction"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {tx.transaction_status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransaction(tx)
                              setShowVoidModal(true)
                            }}
                            title="Void Transaction"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        reservationId={primaryReservation?.id}
        billId={null}
        onSuccess={loadData}
      />

      {/* Reverse Transaction Modal */}
      <Dialog open={showReverseModal} onOpenChange={setShowReverseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Transaction</DialogTitle>
            <DialogDescription>
              This will create a reversal transaction with the opposite amount.
              The original transaction will be marked as reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTransaction && (
              <div className="bg-muted p-3 rounded-lg space-y-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Type: </span>
                  <span className="font-semibold">{formatType(selectedTransaction.transaction_type)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Description: </span>
                  <span>{selectedTransaction.description}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Amount: </span>
                  <span className="font-semibold">₹{Math.abs(selectedTransaction.amount).toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason for Reversal</Label>
              <Textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Enter the reason for reversing this transaction..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReverseModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReverse}
              disabled={!reverseReason}
              variant="destructive"
            >
              Reverse Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Transaction Modal */}
      <Dialog open={showVoidModal} onOpenChange={setShowVoidModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Transaction</DialogTitle>
            <DialogDescription>
              This will mark the transaction as voided. Only pending transactions can be voided.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTransaction && (
              <div className="bg-muted p-3 rounded-lg space-y-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Type: </span>
                  <span className="font-semibold">{formatType(selectedTransaction.transaction_type)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Description: </span>
                  <span>{selectedTransaction.description}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Amount: </span>
                  <span className="font-semibold">₹{Math.abs(selectedTransaction.amount).toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason for Void</Label>
              <Textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Enter the reason for voiding this transaction..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleVoid}
              disabled={!voidReason}
              variant="destructive"
            >
              Void Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
