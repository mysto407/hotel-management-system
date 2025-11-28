import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, Filter, Printer, MoreVertical, Eye, XCircle, RotateCcw, Loader2, Receipt, CreditCard, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getTransactionsByReservation,
  voidTransaction,
  reverseTransaction,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS
} from '@/lib/supabase'
import { formatCurrency } from '@/utils/currency'
import AddChargeModal from './AddChargeModal'
import AddPaymentModal from './AddPaymentModal'

export default function FolioTab({ reservationIds, primaryReservation }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [addChargeOpen, setAddChargeOpen] = useState(false)
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false)
  const [reverseConfirmOpen, setReverseConfirmOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch transactions for all reservations in the group
  const fetchTransactions = async () => {
    if (!reservationIds || reservationIds.length === 0) return

    setLoading(true)
    try {
      // Fetch transactions for all reservations in the group
      const allTransactions = []
      for (const resId of reservationIds) {
        const { data, error } = await getTransactionsByReservation(resId, {
          includeVoided: true
        })
        if (error) {
          console.error('Error fetching transactions:', error)
        } else if (data) {
          allTransactions.push(...data)
        }
      }

      // Sort by created_at for running balance calculation
      allTransactions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      setTransactions(allTransactions)
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [reservationIds])

  // Calculate transactions with running balance
  const transactionsWithBalance = useMemo(() => {
    let runningBalance = 0
    return transactions.map(txn => {
      // Only include in balance if not voided/reversed
      if (txn.transaction_status !== 'voided' && txn.transaction_status !== 'reversed') {
        runningBalance += parseFloat(txn.amount || 0)
      }
      return { ...txn, runningBalance }
    })
  }, [transactions])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactionsWithBalance

    return transactionsWithBalance.filter(txn => {
      switch (filter) {
        case 'charges':
          return parseFloat(txn.amount) > 0 && !txn.transaction_type.startsWith('payment')
        case 'payments':
          return parseFloat(txn.amount) < 0 || txn.transaction_type.startsWith('payment')
        case 'pending':
          return txn.transaction_status === 'pending'
        case 'posted':
          return txn.transaction_status === 'posted'
        default:
          return true
      }
    })
  }, [transactionsWithBalance, filter])

  // Calculate summary
  const summary = useMemo(() => {
    const activeTransactions = transactions.filter(
      txn => txn.transaction_status !== 'voided' && txn.transaction_status !== 'reversed'
    )

    const totalCharges = activeTransactions
      .filter(txn => parseFloat(txn.amount) > 0)
      .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0)

    const totalPayments = Math.abs(activeTransactions
      .filter(txn => parseFloat(txn.amount) < 0)
      .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0))

    const balance = totalCharges - totalPayments

    return { totalCharges, totalPayments, balance }
  }, [transactions])

  // Get transaction type display
  const getTransactionTypeDisplay = (type) => {
    const typeMap = {
      room_charge: 'Room Charge',
      service_charge: 'Service',
      tax: 'Tax',
      fee: 'Fee',
      discount: 'Discount',
      payment_cash: 'Cash Payment',
      payment_card: 'Card Payment',
      payment_online: 'Online Payment',
      payment_bank_transfer: 'Bank Transfer',
      payment_other: 'Other Payment',
      refund: 'Refund',
      adjustment: 'Adjustment',
      write_off: 'Write-off',
      reversal: 'Reversal',
      void: 'Void',
      deposit: 'Deposit',
      deposit_usage: 'Deposit Applied'
    }
    return typeMap[type] || type
  }

  // Get status badge variant
  const getStatusBadge = (status) => {
    switch (status) {
      case 'posted':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Posted</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Pending</Badge>
      case 'voided':
        return <Badge variant="outline" className="text-muted-foreground line-through">Voided</Badge>
      case 'reversed':
        return <Badge variant="outline" className="text-muted-foreground line-through">Reversed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Handle void transaction
  const handleVoid = async () => {
    if (!selectedTransaction) return

    setActionLoading(true)
    try {
      const { error } = await voidTransaction(selectedTransaction.id, 'User voided', null)
      if (error) throw error

      await fetchTransactions()
      setVoidConfirmOpen(false)
      setSelectedTransaction(null)
    } catch (err) {
      console.error('Error voiding transaction:', err)
      alert('Failed to void transaction: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle reverse transaction
  const handleReverse = async () => {
    if (!selectedTransaction) return

    setActionLoading(true)
    try {
      const { error } = await reverseTransaction(selectedTransaction.id, 'User reversed', null)
      if (error) throw error

      await fetchTransactions()
      setReverseConfirmOpen(false)
      setSelectedTransaction(null)
    } catch (err) {
      console.error('Error reversing transaction:', err)
      alert('Failed to reverse transaction: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Can void a transaction?
  const canVoid = (txn) => {
    return txn.transaction_status === 'pending'
  }

  // Can reverse a transaction?
  const canReverse = (txn) => {
    return txn.transaction_status === 'posted'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Charges</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(summary.totalCharges)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payments</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(summary.totalPayments)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance Due</p>
              <p className={`text-2xl font-bold ${summary.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddChargeOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Charge
          </Button>
          <Button onClick={() => setAddPaymentOpen(true)} variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-1" />
            Add Payment
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="charges">Charges</SelectItem>
              <SelectItem value="payments">Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" disabled>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No transactions yet</p>
              <p className="text-sm">Add charges or payments to see them here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[120px]">Debit</TableHead>
                  <TableHead className="text-right w-[120px]">Credit</TableHead>
                  <TableHead className="text-right w-[120px]">Balance</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((txn) => {
                  const amount = parseFloat(txn.amount || 0)
                  const isCharge = amount > 0
                  const isVoidedOrReversed = txn.transaction_status === 'voided' || txn.transaction_status === 'reversed'

                  return (
                    <TableRow
                      key={txn.id}
                      className={isVoidedOrReversed ? 'opacity-50' : ''}
                    >
                      <TableCell className="text-sm">
                        {format(new Date(txn.transaction_date || txn.created_at), 'MMM dd')}
                      </TableCell>
                      <TableCell>
                        <div className={isVoidedOrReversed ? 'line-through' : ''}>
                          <span className="font-medium">{txn.description || getTransactionTypeDisplay(txn.transaction_type)}</span>
                          {txn.service_category && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({txn.service_category})
                            </span>
                          )}
                        </div>
                        {txn.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{txn.notes}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(txn.transaction_status)}
                      </TableCell>
                      <TableCell className={`text-right ${isVoidedOrReversed ? 'line-through' : ''}`}>
                        {isCharge ? formatCurrency(amount) : ''}
                      </TableCell>
                      <TableCell className={`text-right text-green-600 dark:text-green-400 ${isVoidedOrReversed ? 'line-through' : ''}`}>
                        {!isCharge ? formatCurrency(Math.abs(amount)) : ''}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${isVoidedOrReversed ? 'line-through' : ''}`}>
                        {formatCurrency(txn.runningBalance)}
                      </TableCell>
                      <TableCell>
                        {!isVoidedOrReversed && (canVoid(txn) || canReverse(txn)) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {canVoid(txn) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTransaction(txn)
                                    setVoidConfirmOpen(true)
                                  }}
                                  className="text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Void
                                </DropdownMenuItem>
                              )}
                              {canReverse(txn) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTransaction(txn)
                                    setReverseConfirmOpen(true)
                                  }}
                                  className="text-orange-600"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Reverse
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Charge Modal */}
      <AddChargeModal
        open={addChargeOpen}
        onOpenChange={setAddChargeOpen}
        reservationId={primaryReservation?.id}
        onSuccess={fetchTransactions}
      />

      {/* Add Payment Modal */}
      <AddPaymentModal
        open={addPaymentOpen}
        onOpenChange={setAddPaymentOpen}
        reservationId={primaryReservation?.id}
        balanceDue={summary.balance}
        onSuccess={fetchTransactions}
      />

      {/* Void Confirmation Dialog */}
      <AlertDialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Void Transaction
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this transaction? This action will remove the charge from the balance.
              {selectedTransaction && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">{selectedTransaction.description}</p>
                  <p className="text-sm">{formatCurrency(Math.abs(selectedTransaction.amount))}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Void Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reverse Confirmation Dialog */}
      <AlertDialog open={reverseConfirmOpen} onOpenChange={setReverseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              Reverse Transaction
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reverse this posted transaction? This will create a reversal entry that offsets the original amount.
              {selectedTransaction && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">{selectedTransaction.description}</p>
                  <p className="text-sm">{formatCurrency(Math.abs(selectedTransaction.amount))}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReverse}
              disabled={actionLoading}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reverse Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
