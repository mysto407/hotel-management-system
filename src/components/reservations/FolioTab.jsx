import { useState, useEffect, useRef } from 'react'
import { Plus, Download, Filter, RotateCcw, Ban, X, ArrowRightLeft, FileText, History, TrendingUp, Calendar, RefreshCw, AlertCircle, Split, Building2, ShoppingBag } from 'lucide-react'
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
import { Checkbox } from '../ui/checkbox'
import { getCurrencySymbol, DEFAULT_BASE_CURRENCY, formatCurrency } from '../../utils/currency'
import AddTransactionModal from './AddTransactionModal'
import InvoiceReceipt from './InvoiceReceipt'
import SplitTransactionModal from './SplitTransactionModal'
import { FOLIO_TYPES, getFolioTypeName } from '../../lib/supabase'
import { format } from 'date-fns'
import { useReactToPrint } from 'react-to-print'

export default function FolioTab({ reservationIds, primaryReservation }) {
  const {
    getTransactionsByFolio,
    getFolioSummary,
    reverseTransactionById,
    voidTransactionById,
    TRANSACTION_TYPES,
    TRANSACTION_STATUS,
    getFolios,
    createFolio,
    transferTransaction,
    transferMultipleTransactions,
    checkoutFolio,
    getInvoiceData,
    canEditFolio,
    getAuditLogByFolio,
    getAuditStatsByFolio,
    getBaseCurrency,
    retryGatewayTransaction,
    updateGatewayStatus
  } = useBilling()

  // State management
  const [folios, setFolios] = useState([])
  const [selectedFolioId, setSelectedFolioId] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [baseCurrency, setBaseCurrency] = useState(DEFAULT_BASE_CURRENCY)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReverseModal, setShowReverseModal] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showNewFolioModal, setShowNewFolioModal] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)

  // Selected items
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [selectedTransactions, setSelectedTransactions] = useState([])
  const [reverseReason, setReverseReason] = useState('')
  const [voidReason, setVoidReason] = useState('')

  // View modes
  const [viewMode, setViewMode] = useState('transactions') // 'transactions' or 'audit'
  const [displayMode, setDisplayMode] = useState('chronological') // 'chronological', 'grouped', or 'nightly'
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: ''
  })

  // Audit log state
  const [auditLogs, setAuditLogs] = useState([])
  const [auditStats, setAuditStats] = useState(null)

  // Checkout state
  const [invoiceData, setInvoiceData] = useState(null)
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const invoiceRef = useRef()

  // Transfer state
  const [transferToFolioId, setTransferToFolioId] = useState(null)
  const [transferNotes, setTransferNotes] = useState('')

  // New folio state
  const [newFolioData, setNewFolioData] = useState({
    folio_type: 'room',
    folio_name: '',
    company_name: '',
    notes: ''
  })

  // Load base currency
  useEffect(() => {
    const loadBaseCurrency = async () => {
      const { data } = await getBaseCurrency()
      setBaseCurrency(data || DEFAULT_BASE_CURRENCY)
    }
    loadBaseCurrency()
  }, [])

  // Load folios for the reservation
  const loadFolios = async () => {
    if (!primaryReservation?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await getFolios(primaryReservation.id)
      if (error) {
        console.error('Error loading folios:', error)
        setLoading(false)
        return
      }

      setFolios(data || [])

      // Auto-select the first active folio
      if (data && data.length > 0 && !selectedFolioId) {
        const activeFolio = data.find(f => f.is_active) || data[0]
        setSelectedFolioId(activeFolio.id)
      }
    } catch (error) {
      console.error('Error loading folios:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load transactions and summary for selected folio
  const loadFolioData = async () => {
    if (!selectedFolioId) return

    setLoading(true)
    try {
      // Load transactions
      const { data: txData, error: txError } = await getTransactionsByFolio(selectedFolioId)
      if (txError) {
        console.error('Error loading transactions:', txError)
      } else {
        setTransactions(txData || [])
      }

      // Load summary
      const { data: summaryData, error: summaryError } = await getFolioSummary(selectedFolioId)
      if (summaryError) {
        console.error('Error loading summary:', summaryError)
      } else {
        setSummary(summaryData)
      }

      // Load audit logs if in audit view
      if (viewMode === 'audit') {
        await loadAuditData()
      }
    } catch (error) {
      console.error('Error loading folio data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load audit log data
  const loadAuditData = async () => {
    if (!selectedFolioId) return

    try {
      const { data: logs, error: logsError } = await getAuditLogByFolio(selectedFolioId)
      if (logsError) {
        console.error('Error loading audit logs:', logsError)
      } else {
        setAuditLogs(logs || [])
      }

      const { data: stats, error: statsError } = await getAuditStatsByFolio(selectedFolioId)
      if (statsError) {
        console.error('Error loading audit stats:', statsError)
      } else {
        setAuditStats(stats)
      }
    } catch (error) {
      console.error('Error loading audit data:', error)
    }
  }

  // Effects
  useEffect(() => {
    loadFolios()
  }, [primaryReservation?.id])

  useEffect(() => {
    if (selectedFolioId) {
      loadFolioData()
    }
  }, [selectedFolioId, viewMode])

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    // Type filter
    if (filters.type !== 'all' && tx.transaction_type !== filters.type) return false

    // Status filter
    if (filters.status !== 'all' && tx.transaction_status !== filters.status) return false

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase()
      const matchesDescription = tx.description?.toLowerCase().includes(search)
      const matchesReference = tx.reference_number?.toLowerCase().includes(search)
      const matchesPaymentRef = tx.payment_reference?.toLowerCase().includes(search)
      if (!matchesDescription && !matchesReference && !matchesPaymentRef) return false
    }

    // Date range filter
    if (filters.dateFrom) {
      const txDate = new Date(tx.transaction_date)
      const fromDate = new Date(filters.dateFrom)
      if (txDate < fromDate) return false
    }
    if (filters.dateTo) {
      const txDate = new Date(tx.transaction_date)
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999) // Include entire end date
      if (txDate > toDate) return false
    }

    // Amount range filter
    const absAmount = Math.abs(tx.amount)
    if (filters.amountMin && absAmount < parseFloat(filters.amountMin)) return false
    if (filters.amountMax && absAmount > parseFloat(filters.amountMax)) return false

    return true
  })

  // Group transactions by type
  const groupedByType = filteredTransactions.reduce((acc, tx) => {
    const type = tx.transaction_type
    if (!acc[type]) acc[type] = []
    acc[type].push(tx)
    return acc
  }, {})

  // Group transactions by date (nightly breakdown)
  const groupedByDate = filteredTransactions.reduce((acc, tx) => {
    const date = tx.scheduled_post_date
      ? format(new Date(tx.scheduled_post_date), 'yyyy-MM-dd')
      : format(new Date(tx.transaction_date), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = { transactions: [], totals: { charges: 0, taxes: 0, payments: 0 } }
    acc[date].transactions.push(tx)

    // Calculate daily totals
    if (tx.transaction_type === 'tax') {
      acc[date].totals.taxes += Math.abs(tx.amount)
    } else if (tx.amount < 0) {
      acc[date].totals.payments += Math.abs(tx.amount)
    } else {
      acc[date].totals.charges += tx.amount
    }
    return acc
  }, {})

  // Sort dates chronologically
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b))

  // Format transaction type for display
  const formatTransactionType = (type) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  // Format amount with currency
  const formatAmount = (transaction) => {
    const isCredit = transaction.amount < 0
    const absAmount = Math.abs(transaction.amount)
    const txCurrency = transaction.transaction_currency || baseCurrency
    const txSymbol = getCurrencySymbol(txCurrency)
    const baseSymbol = getCurrencySymbol(baseCurrency)
    const baseAmount = transaction.base_currency_amount || absAmount

    const colorClass = isCredit
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-gray-900 dark:text-gray-100'

    if (txCurrency !== baseCurrency) {
      return (
        <div className={colorClass}>
          <div className="font-semibold">
            {isCredit && '- '}{txSymbol}{absAmount.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            ≈ {baseSymbol}{Math.abs(baseAmount).toFixed(2)}
          </div>
        </div>
      )
    }

    return (
      <span className={colorClass}>
        {isCredit && '- '}{baseSymbol}{absAmount.toFixed(2)}
      </span>
    )
  }

  // Handle reverse
  const handleReverse = async () => {
    if (!selectedTransaction || !reverseReason) return

    const result = await reverseTransactionById(selectedTransaction.id, reverseReason)
    if (result) {
      setShowReverseModal(false)
      setReverseReason('')
      setSelectedTransaction(null)
      loadFolioData()
    }
  }

  // Handle void
  const handleVoid = async () => {
    if (!selectedTransaction || !voidReason) return

    const result = await voidTransactionById(selectedTransaction.id, voidReason)
    if (result) {
      setShowVoidModal(false)
      setVoidReason('')
      setSelectedTransaction(null)
      loadFolioData()
    }
  }

  // Handle transfer
  const handleTransfer = async () => {
    if (!transferToFolioId) return

    try {
      if (selectedTransactions.length > 1) {
        await transferMultipleTransactions(selectedTransactions, transferToFolioId, transferNotes)
      } else if (selectedTransactions.length === 1) {
        await transferTransaction(selectedTransactions[0], transferToFolioId, transferNotes)
      }

      setShowTransferModal(false)
      setTransferToFolioId(null)
      setTransferNotes('')
      setSelectedTransactions([])
      loadFolioData()
    } catch (error) {
      console.error('Error transferring transactions:', error)
    }
  }

  // Handle checkout
  const handleCheckout = async () => {
    if (!selectedFolioId) return

    try {
      // Get invoice data first
      const { data: invData, error: invError } = await getInvoiceData(selectedFolioId)
      if (invError) {
        console.error('Error loading invoice data:', invError)
        return
      }

      setInvoiceData(invData)
      setShowCheckoutModal(true)
    } catch (error) {
      console.error('Error preparing checkout:', error)
    }
  }

  // Confirm checkout
  const confirmCheckout = async () => {
    if (!selectedFolioId) return

    try {
      const result = await checkoutFolio(selectedFolioId, checkoutNotes)
      if (result) {
        setShowCheckoutModal(false)
        setCheckoutNotes('')
        loadFolios()
        loadFolioData()
      }
    } catch (error) {
      console.error('Error checking out folio:', error)
    }
  }

  // Get selected folio
  const selectedFolio = folios.find(f => f.id === selectedFolioId)

  // Check if folio can be edited
  const canEdit = selectedFolio ? canEditFolio(selectedFolio) : false

  // Handle print invoice
  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${selectedFolio?.folio_number || 'Unknown'}`
  })

  // Handle create new folio
  const handleCreateFolio = async () => {
    if (!primaryReservation?.id) return

    try {
      // Build folio data, setting folio_name from company_name if type is company
      const folioPayload = {
        reservation_id: primaryReservation.id,
        folio_type: newFolioData.folio_type,
        folio_name: newFolioData.folio_type === 'company' && newFolioData.company_name
          ? `${newFolioData.company_name} Folio`
          : newFolioData.folio_name || getFolioTypeName(newFolioData.folio_type),
        notes: newFolioData.notes
      }

      // Add company metadata if it's a company folio
      if (newFolioData.folio_type === 'company' && newFolioData.company_name) {
        folioPayload.metadata = { company_name: newFolioData.company_name }
      }

      const { data, error } = await createFolio(folioPayload)

      if (error) {
        console.error('Error creating folio:', error)
        return
      }

      setShowNewFolioModal(false)
      setNewFolioData({ folio_type: 'room', folio_name: '', company_name: '', notes: '' })
      await loadFolios()
      if (data) {
        setSelectedFolioId(data.id)
      }
    } catch (error) {
      console.error('Error creating folio:', error)
    }
  }

  // Toggle transaction selection
  const toggleTransactionSelection = (txId) => {
    setSelectedTransactions(prev =>
      prev.includes(txId)
        ? prev.filter(id => id !== txId)
        : [...prev, txId]
    )
  }

  // Handle retry gateway transaction
  const handleRetryTransaction = async (transactionId) => {
    const result = await retryGatewayTransaction(transactionId)
    if (result) {
      loadFolioData()
    }
  }

  // Render transaction table row
  const renderTransactionRow = (tx, showCheckbox = false, showTimeOnly = false) => {
    const isSelected = selectedTransactions.includes(tx.id)
    const isReversedOrVoided = tx.transaction_status === 'reversed' || tx.transaction_status === 'voided'
    const isPayment = tx.transaction_type?.includes('payment')
    const hasGatewayInfo = tx.gateway_transaction_id || tx.gateway_status

    return (
      <TableRow
        key={tx.id}
        className={`${isReversedOrVoided ? 'opacity-50' : ''} ${isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
      >
        {showCheckbox && (
          <TableCell>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleTransactionSelection(tx.id)}
              disabled={isReversedOrVoided || !canEdit}
            />
          </TableCell>
        )}
        <TableCell className="text-sm">
          {showTimeOnly
            ? format(new Date(tx.transaction_date), 'HH:mm')
            : format(new Date(tx.transaction_date), 'MMM dd, yyyy HH:mm')
          }
        </TableCell>
        <TableCell>
          <div>
            <div className="font-medium">{tx.description}</div>
            {tx.notes && (
              <div className="text-xs text-muted-foreground">{tx.notes}</div>
            )}
            {/* Gateway Information */}
            {isPayment && hasGatewayInfo && (
              <div className="mt-1 space-y-0.5">
                {tx.gateway_transaction_id && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Gateway ID: {tx.gateway_transaction_id}
                  </div>
                )}
                {tx.authorization_number && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Auth: {tx.authorization_number}
                  </div>
                )}
                {tx.gateway_status && (
                  <Badge
                    variant={
                      tx.gateway_status === 'completed' ? 'default' :
                      tx.gateway_status === 'pending' || tx.gateway_status === 'authorized' ? 'secondary' :
                      tx.gateway_status === 'failed' ? 'destructive' :
                      'outline'
                    }
                    className="text-xs"
                  >
                    Gateway: {tx.gateway_status}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{formatTransactionType(tx.transaction_type)}</Badge>
        </TableCell>
        <TableCell>
          <Badge
            variant={
              tx.transaction_status === 'posted' ? 'default' :
              tx.transaction_status === 'pending' ? 'secondary' :
              tx.transaction_status === 'reversed' ? 'destructive' :
              'outline'
            }
          >
            {tx.transaction_status}
          </Badge>
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatAmount(tx)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-1 justify-end">
            {/* Retry button for failed gateway transactions */}
            {canEdit && isPayment && tx.gateway_status === 'failed' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRetryTransaction(tx.id)}
                title="Retry Payment"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {/* Regular reverse/void actions */}
            {canEdit && tx.transaction_status === 'posted' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedTransaction(tx)
                    setShowReverseModal(true)
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedTransaction(tx)
                    setShowVoidModal(true)
                  }}
                >
                  <Ban className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  // Render audit log entry
  const renderAuditLogEntry = (log) => {
    const getBorderColor = () => {
      switch (log.action_type.toLowerCase()) {
        case 'created':
        case 'create':
          return 'border-green-500'
        case 'modified':
        case 'update':
          return 'border-blue-500'
        case 'reversed':
        case 'reverse':
          return 'border-orange-500'
        case 'voided':
        case 'void':
          return 'border-red-500'
        case 'transferred':
        case 'transfer':
          return 'border-purple-500'
        default:
          return 'border-gray-500'
      }
    }

    // Get the transaction details from old_values or new_values
    const getTransactionDetails = () => {
      const data = log.new_values || log.old_values || {}
      return {
        description: data.description || 'N/A',
        amount: data.amount || 0,
        type: data.transaction_type || 'Unknown',
        status: data.transaction_status || 'Unknown',
        currency: data.transaction_currency || baseCurrency,
        reference: data.reference_number || data.payment_reference || null
      }
    }

    // Extract meaningful changes from old/new values
    const formatChanges = () => {
      const actionType = log.action_type.toLowerCase()
      const changes = []
      const details = getTransactionDetails()

      // For created transactions, show all key details
      if (actionType === 'created' || actionType === 'create') {
        changes.push({ label: 'Transaction', value: details.description })
        changes.push({ label: 'Amount', value: formatCurrency(Math.abs(details.amount), details.currency) })
        changes.push({ label: 'Type', value: formatTransactionType(details.type) })
        if (details.reference) {
          changes.push({ label: 'Reference', value: details.reference })
        }
        return changes
      }

      // For reversed or voided, show what was reversed/voided
      if (actionType === 'reversed' || actionType === 'reverse' || actionType === 'voided' || actionType === 'void') {
        changes.push({ label: 'Transaction', value: details.description })
        changes.push({ label: 'Amount', value: formatCurrency(Math.abs(details.amount), details.currency) })
        changes.push({ label: 'Type', value: formatTransactionType(details.type) })
        changes.push({ label: 'Original Status', value: log.old_values?.transaction_status || 'posted' })

        // Show reason if available
        if (log.metadata?.reason || log.old_values?.reversal_reason || log.old_values?.void_reason) {
          const reason = log.metadata?.reason || log.old_values?.reversal_reason || log.old_values?.void_reason
          changes.push({ label: 'Reason', value: reason, highlight: true })
        }

        if (details.reference) {
          changes.push({ label: 'Reference', value: details.reference })
        }
        return changes
      }

      // For transferred, show from/to details
      if (actionType === 'transferred' || actionType === 'transfer') {
        changes.push({ label: 'Transaction', value: details.description })
        changes.push({ label: 'Amount', value: formatCurrency(Math.abs(details.amount), details.currency) })

        if (log.metadata?.from_folio || log.metadata?.to_folio) {
          changes.push({ label: 'From Folio', value: log.metadata.from_folio || 'N/A' })
          changes.push({ label: 'To Folio', value: log.metadata.to_folio || 'N/A' })
        }

        if (log.metadata?.notes) {
          changes.push({ label: 'Notes', value: log.metadata.notes })
        }
        return changes
      }

      // For modifications, show what changed
      if (actionType === 'modified' || actionType === 'update') {
        if (log.old_values && log.new_values) {
          const oldVal = log.old_values
          const newVal = log.new_values

          // Always show the transaction being modified
          changes.push({ label: 'Transaction', value: newVal.description || oldVal.description || 'N/A' })

          if (oldVal.description !== newVal.description) {
            changes.push({
              label: 'Description Changed',
              value: `"${oldVal.description || 'none'}" → "${newVal.description}"`,
              isChange: true
            })
          }
          if (oldVal.amount !== newVal.amount) {
            changes.push({
              label: 'Amount Changed',
              value: `${formatCurrency(Math.abs(oldVal.amount || 0), baseCurrency)} → ${formatCurrency(Math.abs(newVal.amount), baseCurrency)}`,
              isChange: true
            })
          }
          if (oldVal.transaction_status !== newVal.transaction_status) {
            changes.push({
              label: 'Status Changed',
              value: `${oldVal.transaction_status || 'none'} → ${newVal.transaction_status}`,
              isChange: true
            })
          }
          if (oldVal.transaction_type !== newVal.transaction_type) {
            changes.push({
              label: 'Type Changed',
              value: `${formatTransactionType(oldVal.transaction_type)} → ${formatTransactionType(newVal.transaction_type)}`,
              isChange: true
            })
          }
          if (oldVal.notes !== newVal.notes && newVal.notes) {
            changes.push({
              label: 'Notes Changed',
              value: `"${oldVal.notes || 'none'}" → "${newVal.notes}"`,
              isChange: true
            })
          }
        }
        return changes
      }

      return changes
    }

    const changes = formatChanges()

    return (
      <div key={log.id} className={`border-l-4 ${getBorderColor()} pl-4 py-3 hover:bg-muted/50 rounded-r transition-colors`}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Action Type Badge */}
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-semibold">
                {log.action_type}
              </Badge>
              {log.user && (
                <span className="text-xs text-muted-foreground">
                  by {log.user.name || 'System'}
                </span>
              )}
            </div>

            {/* Description */}
            {log.action_description && (
              <div className="text-sm text-foreground mb-2">
                {log.action_description}
              </div>
            )}

            {/* Changes */}
            {changes && changes.length > 0 && (
              <div className="space-y-1 mt-2">
                {changes.map((change, idx) => (
                  <div
                    key={idx}
                    className={`text-xs px-2 py-1 rounded ${
                      change.highlight
                        ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 font-medium'
                        : change.isChange
                        ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100'
                        : 'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span className="font-semibold">{change.label}:</span> {change.value}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
            <div>{format(new Date(log.created_at), 'MMM dd, yyyy')}</div>
            <div>{format(new Date(log.created_at), 'HH:mm:ss')}</div>
          </div>
        </div>
      </div>
    )
  }

  if (loading && folios.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading folios...</p>
        </div>
      </div>
    )
  }

  if (!loading && folios.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Folio Available</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Folios are created automatically when a reservation is made. If no folio exists, it may have been deleted or there was an error during reservation creation.
            </p>
            {primaryReservation?.status && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Current reservation status: <strong>{primaryReservation?.status}</strong>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Folio Tabs */}
      <div className="flex items-center gap-2 border-b overflow-x-auto">
        {folios.map(folio => {
          // Get icon based on folio type
          const getFolioIcon = (type) => {
            switch (type) {
              case 'company': return <Building2 className="h-3 w-3" />
              case 'incidentals': return <ShoppingBag className="h-3 w-3" />
              default: return null
            }
          }
          const icon = getFolioIcon(folio.folio_type)

          return (
            <button
              key={folio.id}
              onClick={() => setSelectedFolioId(folio.id)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                selectedFolioId === folio.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {icon}
              {folio.folio_name || `Folio #${folio.folio_number}`}
              {folio.folio_type && folio.folio_type !== 'master' && folio.folio_type !== 'room' && (
                <Badge variant="outline" className="text-xs py-0 px-1 ml-1">
                  {getFolioTypeName(folio.folio_type)}
                </Badge>
              )}
              {!folio.is_active && <span className="ml-1 text-xs text-muted-foreground">(Closed)</span>}
            </button>
          )
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewFolioModal(true)}
          className="whitespace-nowrap"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Folio
        </Button>
      </div>

      {/* Summary Card */}
      {summary && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Charges</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.total_charges || 0, baseCurrency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Payments</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(summary.total_payments || 0, baseCurrency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Balance Due</div>
                <div className={`text-2xl font-bold ${
                  summary.balance_due > 0 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {formatCurrency(summary.balance_due || 0, baseCurrency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Taxes</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(summary.total_taxes || 0, baseCurrency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Discounts</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(summary.total_discounts || 0, baseCurrency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View Mode Toggle */}
        <div className="flex border rounded-lg">
          <Button
            variant={viewMode === 'transactions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('transactions')}
          >
            <FileText className="h-4 w-4 mr-1" />
            Transactions
          </Button>
          <Button
            variant={viewMode === 'audit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('audit')}
          >
            <History className="h-4 w-4 mr-1" />
            Audit Log
          </Button>
        </div>

        {/* Display Mode Toggle (Transactions only) */}
        {viewMode === 'transactions' && (
          <div className="flex border rounded-lg">
            <Button
              variant={displayMode === 'chronological' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDisplayMode('chronological')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Chronological
            </Button>
            <Button
              variant={displayMode === 'grouped' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDisplayMode('grouped')}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              By Type
            </Button>
            <Button
              variant={displayMode === 'nightly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDisplayMode('nightly')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Nightly
            </Button>
          </div>
        )}

        <div className="flex-1"></div>

        {/* Actions */}
        {viewMode === 'transactions' && canEdit && (
          <>
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Transaction
            </Button>
            {selectedTransactions.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTransferModal(true)}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-1" />
                  Transfer ({selectedTransactions.length})
                </Button>
                {selectedTransactions.length === 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const tx = transactions.find(t => t.id === selectedTransactions[0])
                      if (tx) {
                        setSelectedTransaction(tx)
                        setShowSplitModal(true)
                      }
                    }}
                  >
                    <Split className="h-4 w-4 mr-1" />
                    Split
                  </Button>
                )}
              </>
            )}
          </>
        )}

        {viewMode === 'transactions' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheckout}
            >
              <Download className="h-4 w-4 mr-1" />
              Checkout & Invoice
            </Button>
          </>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && viewMode === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Advanced Filters</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFilters({
                  type: 'all',
                  status: 'all',
                  search: '',
                  dateFrom: '',
                  dateTo: '',
                  amountMin: '',
                  amountMax: ''
                })}
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Transaction Type</Label>
                <Select value={filters.type} onValueChange={(val) => setFilters({ ...filters, type: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(TRANSACTION_TYPES).map(([key, value]) => (
                      <SelectItem key={value} value={value}>
                        {formatTransactionType(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(val) => setFilters({ ...filters, status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(TRANSACTION_STATUS).map(([key, value]) => (
                      <SelectItem key={value} value={value}>
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Search</Label>
                <Input
                  placeholder="Description, reference..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>

              <div>
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>

              <div>
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>

              <div>
                <Label>Amount Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.amountMin}
                    onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.amountMax}
                    onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Area */}
      {viewMode === 'transactions' ? (
        <Card>
          <CardContent className="pt-6">
            {displayMode === 'chronological' && (
              /* Chronological View */
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canEdit && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedTransactions.length === filteredTransactions.filter(tx => tx.transaction_status === 'posted').length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTransactions(
                                  filteredTransactions
                                    .filter(tx => tx.transaction_status === 'posted')
                                    .map(tx => tx.id)
                                )
                              } else {
                                setSelectedTransactions([])
                              }
                            }}
                          />
                        </TableHead>
                      )}
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map(tx => renderTransactionRow(tx, canEdit))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {displayMode === 'grouped' && (
              /* Grouped by Type View */
              <div className="space-y-4">
                {Object.keys(groupedByType).length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No transactions found
                  </div>
                ) : (
                  Object.entries(groupedByType).map(([type, txs]) => (
                    <div key={type} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-2 font-semibold">
                        {formatTransactionType(type)} ({txs.length})
                      </div>
                      <div className="rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {canEdit && <TableHead className="w-12"></TableHead>}
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {txs.map(tx => renderTransactionRow(tx, canEdit))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {displayMode === 'nightly' && (
              /* Nightly Breakdown View */
              <div className="space-y-4">
                {sortedDates.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No transactions found
                  </div>
                ) : (
                  sortedDates.map(date => {
                    const { transactions: dateTxs, totals } = groupedByDate[date]
                    const dayTotal = totals.charges + totals.taxes - totals.payments
                    return (
                      <div key={date} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-3 flex items-center justify-between">
                          <div className="font-semibold">
                            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Charges: <span className="font-medium text-foreground">{formatCurrency(totals.charges, baseCurrency)}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Tax: <span className="font-medium text-foreground">{formatCurrency(totals.taxes, baseCurrency)}</span>
                            </span>
                            {totals.payments > 0 && (
                              <span className="text-muted-foreground">
                                Payments: <span className="font-medium text-emerald-600">{formatCurrency(totals.payments, baseCurrency)}</span>
                              </span>
                            )}
                            <span className="text-muted-foreground border-l pl-4">
                              Day Total: <span className="font-bold text-foreground">{formatCurrency(dayTotal, baseCurrency)}</span>
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {canEdit && <TableHead className="w-12"></TableHead>}
                                <TableHead>Time</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dateTxs.map(tx => renderTransactionRow(tx, canEdit, true))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Audit Log View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Audit Trail</span>
              {auditStats && (
                <div className="text-sm font-normal text-muted-foreground">
                  {auditStats.total_actions} actions by {auditStats.unique_users} users
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No audit logs found
                </div>
              ) : (
                auditLogs.map(log => renderAuditLogEntry(log))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Transaction Modal */}
      <AddTransactionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        reservationId={primaryReservation?.id}
        folioId={selectedFolioId}
        billId={null}
        onSuccess={loadFolioData}
      />

      {/* Reverse Transaction Modal */}
      <Dialog open={showReverseModal} onOpenChange={setShowReverseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Transaction</DialogTitle>
            <DialogDescription>
              This will create a reversing entry for this transaction. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTransaction && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <div><strong>Description:</strong> {selectedTransaction.description}</div>
                <div><strong>Amount:</strong> {formatCurrency(Math.abs(selectedTransaction.amount), baseCurrency)}</div>
                <div><strong>Date:</strong> {format(new Date(selectedTransaction.transaction_date), 'MMM dd, yyyy')}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason for Reversal *</Label>
              <Textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Enter reason for reversing this transaction..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReverseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleReverse} disabled={!reverseReason}>
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
              This will mark the transaction as void. This action cannot be undone. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTransaction && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <div><strong>Description:</strong> {selectedTransaction.description}</div>
                <div><strong>Amount:</strong> {formatCurrency(Math.abs(selectedTransaction.amount), baseCurrency)}</div>
                <div><strong>Date:</strong> {format(new Date(selectedTransaction.transaction_date), 'MMM dd, yyyy')}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason for Voiding *</Label>
              <Textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Enter reason for voiding this transaction..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVoid} disabled={!voidReason}>
              Void Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Transactions Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Transactions</DialogTitle>
            <DialogDescription>
              Transfer {selectedTransactions.length} transaction(s) to another folio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destination Folio *</Label>
              <Select value={transferToFolioId || ''} onValueChange={setTransferToFolioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folio" />
                </SelectTrigger>
                <SelectContent>
                  {folios
                    .filter(f => f.id !== selectedFolioId && f.is_active)
                    .map(folio => (
                      <SelectItem key={folio.id} value={folio.id}>
                        {folio.folio_name || `Folio #${folio.folio_number}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Add transfer notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={!transferToFolioId}>
              Transfer Transactions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal with Invoice Preview */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkout Folio & Generate Invoice</DialogTitle>
            <DialogDescription>
              Review the invoice and complete checkout for this folio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Invoice Preview */}
            {invoiceData && (
              <div className="border rounded-lg overflow-hidden">
                <InvoiceReceipt ref={invoiceRef} invoiceData={invoiceData} type="invoice" />
              </div>
            )}

            {/* Checkout Notes */}
            <div className="space-y-2">
              <Label>Checkout Notes (Optional)</Label>
              <Textarea
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="Add checkout notes..."
                rows={2}
              />
            </div>

            {/* Warning if balance due */}
            {summary && summary.balance_due > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="text-amber-600 dark:text-amber-400">⚠️</div>
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100">
                      Outstanding Balance
                    </div>
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      There is an outstanding balance of {formatCurrency(summary.balance_due, baseCurrency)}.
                      You can still checkout, but payment should be collected.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckoutModal(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-1" />
              Print Invoice
            </Button>
            <Button onClick={confirmCheckout}>
              Complete Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folio Modal */}
      <Dialog open={showNewFolioModal} onOpenChange={setShowNewFolioModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folio</DialogTitle>
            <DialogDescription>
              Add a new folio to this reservation for split billing or separate charges
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Folio Type *</Label>
              <Select
                value={newFolioData.folio_type}
                onValueChange={(val) => setNewFolioData({
                  ...newFolioData,
                  folio_type: val,
                  folio_name: '',
                  company_name: ''
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">
                    <div className="flex items-center gap-2">
                      <span>Room Folio</span>
                      <span className="text-xs text-muted-foreground">- Room charges</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="guest">
                    <div className="flex items-center gap-2">
                      <span>Guest Folio</span>
                      <span className="text-xs text-muted-foreground">- Personal expenses</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="company">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>Company Folio</span>
                      <span className="text-xs text-muted-foreground">- Direct billing</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="incidentals">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      <span>Incidentals Folio</span>
                      <span className="text-xs text-muted-foreground">- Extras & services</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="master">
                    <div className="flex items-center gap-2">
                      <span>Master Folio</span>
                      <span className="text-xs text-muted-foreground">- Primary account</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <span>Other Folio</span>
                      <span className="text-xs text-muted-foreground">- Custom purpose</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Name Field - shown only for company folios */}
            {newFolioData.folio_type === 'company' && (
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  value={newFolioData.company_name}
                  onChange={(e) => setNewFolioData({ ...newFolioData, company_name: e.target.value })}
                  placeholder="Enter company name for billing"
                />
                <p className="text-xs text-muted-foreground">
                  This company will be billed directly for charges on this folio
                </p>
              </div>
            )}

            {/* Folio Name Field - shown for non-company folios */}
            {newFolioData.folio_type !== 'company' && (
              <div className="space-y-2">
                <Label>Folio Name</Label>
                <Input
                  value={newFolioData.folio_name}
                  onChange={(e) => setNewFolioData({ ...newFolioData, folio_name: e.target.value })}
                  placeholder={`e.g., ${getFolioTypeName(newFolioData.folio_type)} - Guest 2`}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={newFolioData.notes}
                onChange={(e) => setNewFolioData({ ...newFolioData, notes: e.target.value })}
                placeholder="Add notes about this folio..."
                rows={2}
              />
            </div>

            {/* Folio Type Descriptions */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              {newFolioData.folio_type === 'company' && (
                <p>Company folios are used for direct corporate billing. All charges posted to this folio will be invoiced to the specified company.</p>
              )}
              {newFolioData.folio_type === 'incidentals' && (
                <p>Incidentals folios are for extra services like minibar, laundry, room service, and other miscellaneous charges.</p>
              )}
              {newFolioData.folio_type === 'guest' && (
                <p>Guest folios are for personal expenses that the guest will pay directly, separate from the main room charges.</p>
              )}
              {newFolioData.folio_type === 'room' && (
                <p>Room folios are for room-related charges like accommodation, room service, and in-room amenities.</p>
              )}
              {newFolioData.folio_type === 'master' && (
                <p>Master folios are the primary account for a reservation. Most reservations have one master folio by default.</p>
              )}
              {newFolioData.folio_type === 'other' && (
                <p>Use this for any other billing purpose not covered by the standard folio types.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolioModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolio}
              disabled={newFolioData.folio_type === 'company' && !newFolioData.company_name}
            >
              Create Folio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Transaction Modal */}
      <SplitTransactionModal
        open={showSplitModal}
        onOpenChange={setShowSplitModal}
        transaction={selectedTransaction}
        folios={folios}
        currentFolioId={selectedFolioId}
        reservationId={primaryReservation?.id}
        onSuccess={() => {
          loadFolioData()
          setSelectedTransactions([])
          setSelectedTransaction(null)
        }}
      />
    </div>
  )
}
