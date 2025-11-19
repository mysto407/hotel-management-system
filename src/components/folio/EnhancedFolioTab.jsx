import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  CreditCard,
  Download,
  Filter,
  Search,
  Calendar,
  FileText,
  History,
  TrendingUp,
  ChevronDown,
  Receipt
} from 'lucide-react'
import { useFolio } from '../../context/FolioContext'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'

// Import child components (we'll create these)
import TransactionsTable from './TransactionsTable'
import FolioSummaryCard from './FolioSummaryCard'
import AddTransactionDialog from './AddTransactionDialog'
import PaymentDialog from './PaymentDialog'
import SettlementDialog from './SettlementDialog'
import AuditTrailDialog from './AuditTrailDialog'
import TransferDialog from './TransferDialog'

export default function EnhancedFolioTab({ reservationIds, primaryReservation }) {
  const {
    getOrCreateMasterFolio,
    loadTransactionsByReservation,
    calculateTotals,
    loadRevenueBreakdown,
    searchFolioTransactions,
    loadTransactionsByDateRange,
    loadTransactionsByType
  } = useFolio()

  const { user } = useAuth()

  // State
  const [masterFolio, setMasterFolio] = useState(null)
  const [allFolios, setAllFolios] = useState([])
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [totals, setTotals] = useState(null)
  const [revenueBreakdown, setRevenueBreakdown] = useState({})
  const [loading, setLoading] = useState(true)

  // View and filter states
  const [viewMode, setViewMode] = useState('standard') // 'standard', 'grouped'
  const [dateFilter, setDateFilter] = useState('all') // 'all', 'today', 'this_stay', 'custom'
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Dialog states
  const [showAddTransactionDialog, setShowAddTransactionDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showSettlementDialog, setShowSettlementDialog] = useState(false)
  const [showAuditDialog, setShowAuditDialog] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [selectedTransactions, setSelectedTransactions] = useState([])

  // Load initial data
  useEffect(() => {
    loadFolioData()
  }, [reservationIds])

  const loadFolioData = async () => {
    if (!primaryReservation || !reservationIds || reservationIds.length === 0) return

    setLoading(true)
    try {
      // Get or create master folio
      const folio = await getOrCreateMasterFolio(primaryReservation.id, primaryReservation)
      setMasterFolio(folio)

      if (folio) {
        // Load all transactions for this reservation
        const txns = await loadTransactionsByReservation(primaryReservation.id)
        setTransactions(txns || [])
        setFilteredTransactions(txns || [])

        // Calculate totals
        const calculatedTotals = await calculateTotals(folio.id)
        setTotals(calculatedTotals)

        // Load revenue breakdown
        const breakdown = await loadRevenueBreakdown(folio.id)
        setRevenueBreakdown(breakdown || {})
      }
    } catch (error) {
      console.error('Error loading folio data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Apply filters to transactions
  useEffect(() => {
    applyFilters()
  }, [transactions, searchTerm, categoryFilter, typeFilter, statusFilter, dateFilter, customDateRange])

  const applyFilters = () => {
    let filtered = [...transactions]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(txn =>
        txn.description?.toLowerCase().includes(term) ||
        txn.transaction_number?.toLowerCase().includes(term) ||
        txn.reference_number?.toLowerCase().includes(term) ||
        txn.category?.toLowerCase().includes(term)
      )
    }

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(txn => txn.category === categoryFilter)
    }

    // Type filter
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(txn => txn.transaction_type === typeFilter)
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(txn => txn.status === statusFilter)
    }

    // Date filter
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0]
      filtered = filtered.filter(txn => txn.post_date === today)
    } else if (dateFilter === 'this_stay') {
      const checkIn = primaryReservation.check_in_date
      const checkOut = primaryReservation.check_out_date
      filtered = filtered.filter(txn =>
        txn.post_date >= checkIn && txn.post_date <= checkOut
      )
    } else if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
      filtered = filtered.filter(txn =>
        txn.post_date >= customDateRange.start && txn.post_date <= customDateRange.end
      )
    }

    setFilteredTransactions(filtered)
  }

  // Group transactions by type for grouped view
  const groupedTransactions = useMemo(() => {
    const groups = {
      charges: [],
      payments: [],
      taxes: [],
      discounts: [],
      refunds: [],
      other: []
    }

    filteredTransactions.forEach(txn => {
      switch (txn.transaction_type) {
        case 'room_charge':
        case 'addon_charge':
        case 'fee':
          groups.charges.push(txn)
          break
        case 'payment':
        case 'deposit':
          groups.payments.push(txn)
          break
        case 'tax':
          groups.taxes.push(txn)
          break
        case 'discount':
          groups.discounts.push(txn)
          break
        case 'refund':
          groups.refunds.push(txn)
          break
        default:
          groups.other.push(txn)
      }
    })

    return groups
  }, [filteredTransactions])

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(transactions.map(txn => txn.category).filter(Boolean))
    return ['all', ...Array.from(cats)]
  }, [transactions])

  const transactionTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'room_charge', label: 'Room Charges' },
    { value: 'addon_charge', label: 'Add-on Charges' },
    { value: 'payment', label: 'Payments' },
    { value: 'refund', label: 'Refunds' },
    { value: 'tax', label: 'Taxes' },
    { value: 'discount', label: 'Discounts' },
    { value: 'fee', label: 'Fees' },
    { value: 'adjustment', label: 'Adjustments' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading folio...</p>
        </div>
      </div>
    )
  }

  if (!masterFolio) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-destructive">Failed to load folio</p>
          <Button onClick={loadFolioData} className="mt-4">Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <FolioSummaryCard
        folio={masterFolio}
        totals={totals}
        revenueBreakdown={revenueBreakdown}
      />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowAddTransactionDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Charge
        </Button>
        <Button onClick={() => setShowPaymentDialog(true)} variant="outline" className="gap-2">
          <CreditCard className="h-4 w-4" />
          Post Payment
        </Button>
        <Button onClick={() => setShowSettlementDialog(true)} variant="outline" className="gap-2">
          <Receipt className="h-4 w-4" />
          Settle & Checkout
        </Button>
        <Button onClick={() => setShowAuditDialog(true)} variant="outline" className="gap-2">
          <History className="h-4 w-4" />
          Audit Trail
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Folio
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions by description, number, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* View Mode */}
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard View</SelectItem>
                  <SelectItem value="grouped">Grouped View</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_stay">This Stay</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions View */}
      {viewMode === 'standard' ? (
        <TransactionsTable
          transactions={filteredTransactions}
          onReload={loadFolioData}
          selectedTransactions={selectedTransactions}
          setSelectedTransactions={setSelectedTransactions}
          masterFolio={masterFolio}
        />
      ) : (
        <Tabs defaultValue="charges" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="charges">
              Charges ({groupedTransactions.charges.length})
            </TabsTrigger>
            <TabsTrigger value="payments">
              Payments ({groupedTransactions.payments.length})
            </TabsTrigger>
            <TabsTrigger value="taxes">
              Taxes ({groupedTransactions.taxes.length})
            </TabsTrigger>
            <TabsTrigger value="discounts">
              Discounts ({groupedTransactions.discounts.length})
            </TabsTrigger>
            <TabsTrigger value="other">
              Other ({groupedTransactions.refunds.length + groupedTransactions.other.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="charges">
            <TransactionsTable
              transactions={groupedTransactions.charges}
              onReload={loadFolioData}
              masterFolio={masterFolio}
            />
          </TabsContent>

          <TabsContent value="payments">
            <TransactionsTable
              transactions={groupedTransactions.payments}
              onReload={loadFolioData}
              masterFolio={masterFolio}
            />
          </TabsContent>

          <TabsContent value="taxes">
            <TransactionsTable
              transactions={groupedTransactions.taxes}
              onReload={loadFolioData}
              masterFolio={masterFolio}
            />
          </TabsContent>

          <TabsContent value="discounts">
            <TransactionsTable
              transactions={groupedTransactions.discounts}
              onReload={loadFolioData}
              masterFolio={masterFolio}
            />
          </TabsContent>

          <TabsContent value="other">
            <TransactionsTable
              transactions={[...groupedTransactions.refunds, ...groupedTransactions.other]}
              onReload={loadFolioData}
              masterFolio={masterFolio}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <AddTransactionDialog
        open={showAddTransactionDialog}
        onOpenChange={setShowAddTransactionDialog}
        folio={masterFolio}
        reservation={primaryReservation}
        onSuccess={loadFolioData}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        folio={masterFolio}
        reservation={primaryReservation}
        balance={totals?.balance || 0}
        onSuccess={loadFolioData}
      />

      <SettlementDialog
        open={showSettlementDialog}
        onOpenChange={setShowSettlementDialog}
        folio={masterFolio}
        reservation={primaryReservation}
        totals={totals}
        onSuccess={loadFolioData}
      />

      <AuditTrailDialog
        open={showAuditDialog}
        onOpenChange={setShowAuditDialog}
        folio={masterFolio}
      />

      {selectedTransactions.length > 0 && (
        <TransferDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          transactions={selectedTransactions}
          currentFolio={masterFolio}
          onSuccess={() => {
            loadFolioData()
            setSelectedTransactions([])
          }}
        />
      )}
    </div>
  )
}
