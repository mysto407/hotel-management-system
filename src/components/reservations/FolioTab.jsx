import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, Filter, Printer, MoreVertical, Eye, XCircle, RotateCcw, Loader2, Receipt, CreditCard, AlertCircle, FolderPlus, ArrowRightLeft, Scissors, CalendarDays, List, SplitSquareVertical, Merge, ChevronDown, Trash2, MoveRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
  getFoliosByReservation,
  getFolioBalance,
  moveTransactionToFolio,
  voidTransactionWithChildren,
  reverseTransaction,
  splitMasterFolioByRooms,
  mergeFoliosIntoMaster,
  mergeAllFoliosIntoMaster,
  mergeSelectedFolios
} from '@/lib/supabase'
import { formatCurrency } from '@/utils/currency'
import AddChargeModal from './AddChargeModal'
import AddPaymentModal from './AddPaymentModal'
import CreateFolioModal from './CreateFolioModal'
import TransferTransactionModal from './TransferTransactionModal'
import SplitTransactionModal from './SplitTransactionModal'
import DeleteFolioModal from './DeleteFolioModal'

export default function FolioTab({ reservationIds, primaryReservation, groupedReservations = [], guests = [], onFolioChange }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [addChargeOpen, setAddChargeOpen] = useState(false)
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false)
  const [reverseConfirmOpen, setReverseConfirmOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Multi-folio state
  const [folios, setFolios] = useState([])
  const [activeFolioId, setActiveFolioId] = useState(null)
  const [folioBalances, setFolioBalances] = useState({})
  const [createFolioOpen, setCreateFolioOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [splitModalOpen, setSplitModalOpen] = useState(false)

  // Split/Merge folio state
  const [splitFolioConfirmOpen, setSplitFolioConfirmOpen] = useState(false)
  const [mergeFolioConfirmOpen, setMergeFolioConfirmOpen] = useState(false)
  const [mergeAllConfirmOpen, setMergeAllConfirmOpen] = useState(false)
  const [mergeSelectedOpen, setMergeSelectedOpen] = useState(false)
  const [selectedFoliosForMerge, setSelectedFoliosForMerge] = useState(new Set())
  const [mergeTargetFolioId, setMergeTargetFolioId] = useState('')
  const [folioActionLoading, setFolioActionLoading] = useState(false)

  // Delete folio state
  const [deleteFolioOpen, setDeleteFolioOpen] = useState(false)
  const [selectedFolioForDelete, setSelectedFolioForDelete] = useState(null)

  // View mode state
  const [groupByDate, setGroupByDate] = useState(false)

  // Move transaction state
  const [moveTransactionOpen, setMoveTransactionOpen] = useState(false)
  const [moveMode, setMoveMode] = useState(null) // 'individual' or 'type'
  const [moveTargetFolioId, setMoveTargetFolioId] = useState('')
  const [moveTransactionType, setMoveTransactionType] = useState('')
  const [selectedTransactionIds, setSelectedTransactionIds] = useState(new Set())
  const [moveLoading, setMoveLoading] = useState(false)

  // Check if this is a multi-room booking
  const bookingId = primaryReservation?.booking_id
  const isMultiRoomBooking = groupedReservations.length > 1 || (reservationIds && reservationIds.length > 1)
  const hasMasterFolio = folios.some(f => f.folio_type === 'master' && f.booking_id === bookingId)
  const hasRoomFolios = folios.some(f => f.folio_type === 'room' && f.booking_id === bookingId)
  const hasMultipleFolios = folios.length > 1
  const nonMasterFolios = folios.filter(f => f.folio_type !== 'master')
  const canSplitFolios = isMultiRoomBooking && hasMasterFolio && bookingId
  const canMergeFolios = isMultiRoomBooking && hasRoomFolios && bookingId
  // Can merge all if there are non-master folios to merge
  const canMergeAll = nonMasterFolios.length > 0
  // Can merge selected if there are at least 2 folios
  const canMergeSelected = hasMultipleFolios

  // Create lookup map for room and guest info by reservation_id
  const reservationInfoMap = useMemo(() => {
    const map = new Map()
    for (const res of groupedReservations) {
      map.set(res.id, {
        roomNumber: res.rooms?.room_number || 'TBD',
        guestName: res.guests?.name || 'Guest'
      })
    }
    return map
  }, [groupedReservations])

  // Helper to get room/guest info for a transaction
  const getTransactionRoomInfo = (txn) => {
    const info = reservationInfoMap.get(txn.reservation_id)
    return info || { roomNumber: 'N/A', guestName: 'N/A' }
  }

  // Fetch folios for ALL reservations in the group
  const fetchFolios = async () => {
    if (!reservationIds || reservationIds.length === 0) return

    try {
      const allFolios = []
      const balances = {}
      const seenFolioIds = new Set()

      // Fetch folios for ALL reservations in the group
      for (const resId of reservationIds) {
        const { data, error } = await getFoliosByReservation(resId, bookingId)
        if (error) {
          console.error('Error fetching folios for reservation:', resId, error)
          continue
        }
        if (data) {
          // Deduplicate folios (same folio can be returned for multiple reservations in a booking)
          for (const folio of data) {
            if (!seenFolioIds.has(folio.id)) {
              seenFolioIds.add(folio.id)
              allFolios.push(folio)
            }
          }
        }
      }

      // Sort folios: master first, room second, all others last (by created_at)
      allFolios.sort((a, b) => {
        const typeOrder = { master: 0, room: 1 }
        const aOrder = typeOrder[a.folio_type] ?? 2
        const bOrder = typeOrder[b.folio_type] ?? 2
        if (aOrder !== bOrder) return aOrder - bOrder
        // Within same priority, sort by created_at
        return new Date(a.created_at) - new Date(b.created_at)
      })

      setFolios(allFolios)

      // Set active folio to first one (master) if not already set
      if (allFolios.length > 0 && !activeFolioId) {
        setActiveFolioId(allFolios[0].id)
      }

      // Fetch balances for all folios
      for (const folio of allFolios) {
        const { data: balanceData } = await getFolioBalance(folio.id)
        if (balanceData) {
          balances[folio.id] = balanceData
        }
      }
      setFolioBalances(balances)
    } catch (err) {
      console.error('Error fetching folios:', err)
    }
  }

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

      // Sort by created_at for chronological order (newest at bottom)
      allTransactions.sort((a, b) => {
        return new Date(a.created_at) - new Date(b.created_at)
      })
      setTransactions(allTransactions)
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFolios()
    fetchTransactions()
  }, [reservationIds])

  // Handle folio creation success
  const handleFolioCreated = async (newFolio) => {
    await fetchFolios()
    setActiveFolioId(newFolio.id)
  }

  // Handle folio deletion success
  const handleFolioDeleted = async (result) => {
    await fetchFolios()
    await fetchTransactions()
    onFolioChange?.()
    // Switch to the target folio that received the transactions
    if (result?.targetFolio?.id) {
      setActiveFolioId(result.targetFolio.id)
    }
    setSelectedFolioForDelete(null)
  }

  // Handle moving transaction to another folio
  const handleMoveToFolio = async (transactionId, targetFolioId) => {
    if (!transactionId || !targetFolioId) return

    setActionLoading(true)
    try {
      const { error } = await moveTransactionToFolio(transactionId, targetFolioId)
      if (error) throw error

      await fetchTransactions()
      await fetchFolios()
      onFolioChange?.()
    } catch (err) {
      console.error('Error moving transaction:', err)
      alert('Failed to move transaction: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle splitting master folio into room folios
  const handleSplitFolios = async () => {
    if (!bookingId) return

    setFolioActionLoading(true)
    try {
      const { data, error } = await splitMasterFolioByRooms(bookingId)
      if (error) throw error

      await fetchTransactions()
      await fetchFolios()
      onFolioChange?.()
      setSplitFolioConfirmOpen(false)

      // Set active folio to the first room folio
      if (data?.roomFolios?.[0]) {
        setActiveFolioId(data.roomFolios[0].id)
      }
    } catch (err) {
      console.error('Error splitting folios:', err)
      alert('Failed to split folios: ' + err.message)
    } finally {
      setFolioActionLoading(false)
    }
  }

  // Handle merging room folios into master
  const handleMergeFolios = async () => {
    if (!bookingId) return

    setFolioActionLoading(true)
    try {
      const { data, error } = await mergeFoliosIntoMaster(bookingId)
      if (error) throw error

      await fetchTransactions()
      await fetchFolios()
      onFolioChange?.()
      setMergeFolioConfirmOpen(false)

      // Set active folio to the new master
      if (data?.masterFolio) {
        setActiveFolioId(data.masterFolio.id)
      }
    } catch (err) {
      console.error('Error merging folios:', err)
      alert('Failed to merge folios: ' + err.message)
    } finally {
      setFolioActionLoading(false)
    }
  }

  // Handle merging ALL folios (including custom ones) into master
  const handleMergeAllFolios = async () => {
    if (!primaryReservation?.id) return

    setFolioActionLoading(true)
    try {
      const { data, error } = await mergeAllFoliosIntoMaster(
        bookingId,
        primaryReservation.id
      )
      if (error) throw error

      await fetchTransactions()
      await fetchFolios()
      onFolioChange?.()
      setMergeAllConfirmOpen(false)

      // Set active folio to the master
      if (data?.masterFolio) {
        setActiveFolioId(data.masterFolio.id)
      }
    } catch (err) {
      console.error('Error merging all folios:', err)
      alert('Failed to merge folios: ' + err.message)
    } finally {
      setFolioActionLoading(false)
    }
  }

  // Handle merging selected folios into target
  const handleMergeSelectedFolios = async () => {
    if (selectedFoliosForMerge.size === 0 || !mergeTargetFolioId) {
      alert('Please select folios to merge and a target folio')
      return
    }

    setFolioActionLoading(true)
    try {
      const { data, error } = await mergeSelectedFolios(
        Array.from(selectedFoliosForMerge),
        mergeTargetFolioId
      )
      if (error) throw error

      await fetchTransactions()
      await fetchFolios()
      onFolioChange?.()
      setMergeSelectedOpen(false)
      setSelectedFoliosForMerge(new Set())
      setMergeTargetFolioId('')

      // Set active folio to the target
      if (data?.targetFolio) {
        setActiveFolioId(data.targetFolio.id)
      }
    } catch (err) {
      console.error('Error merging selected folios:', err)
      alert('Failed to merge folios: ' + err.message)
    } finally {
      setFolioActionLoading(false)
    }
  }

  // Toggle folio selection for merge
  const handleToggleFolioForMerge = (folioId) => {
    setSelectedFoliosForMerge(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folioId)) {
        newSet.delete(folioId)
      } else {
        newSet.add(folioId)
      }
      return newSet
    })
  }

  // Filter transactions by folio and type, then compute running balance
  const filteredTransactions = useMemo(() => {
    let result = transactions

    // Filter by active folio FIRST (before computing running balance)
    if (activeFolioId) {
      result = result.filter(txn => txn.folio_id === activeFolioId)
    }

    // Filter by type
    if (filter !== 'all') {
      result = result.filter(txn => {
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
    }

    // Now compute running balance on the FILTERED set
    let runningBalance = 0
    return result.map(txn => {
      // Only include in balance if not voided/reversed
      if (txn.transaction_status !== 'voided' && txn.transaction_status !== 'reversed') {
        runningBalance += parseFloat(txn.amount || 0)
      }
      return { ...txn, runningBalance }
    })
  }, [transactions, filter, activeFolioId])

  // Group transactions by date for grouped view
  const groupedTransactions = useMemo(() => {
    if (!groupByDate) return null

    const groups = {}
    filteredTransactions.forEach(txn => {
      const dateKey = format(new Date(txn.transaction_date || txn.created_at), 'yyyy-MM-dd')
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          displayDate: format(new Date(txn.transaction_date || txn.created_at), 'EEEE, MMM dd, yyyy'),
          transactions: [],
          dayTotal: 0
        }
      }
      groups[dateKey].transactions.push(txn)
      // Calculate day total (charges - payments, excluding voided/reversed)
      if (txn.transaction_status !== 'voided' && txn.transaction_status !== 'reversed') {
        groups[dateKey].dayTotal += parseFloat(txn.amount || 0)
      }
    })

    // Sort by date descending (most recent first)
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredTransactions, groupByDate])

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
      const { error, childrenVoided } = await voidTransactionWithChildren(
        selectedTransaction.id,
        'User voided',
        null
      )
      if (error) throw error

      await fetchTransactions()
      await fetchFolios()
      onFolioChange?.()
      setVoidConfirmOpen(false)
      setSelectedTransaction(null)

      // Show message if child transactions were also voided
      if (childrenVoided > 0) {
        console.log(`Voided transaction and ${childrenVoided} related tax entries`)
      }
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
      await fetchFolios()
      onFolioChange?.()
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

  // Get unique transaction types for the move by type feature
  const transactionTypes = useMemo(() => {
    const types = new Set()
    filteredTransactions.forEach(txn => {
      if (txn.transaction_status !== 'voided' && txn.transaction_status !== 'reversed') {
        // Group payment types together
        if (txn.transaction_type.startsWith('payment_')) {
          types.add('all_payments')
        }
        types.add(txn.transaction_type)
        // Also add service_category if it exists (for Add-ons, Restaurant, etc.)
        if (txn.service_category) {
          types.add(`category:${txn.service_category}`)
        }
      }
    })
    return Array.from(types).sort()
  }, [filteredTransactions])

  // Get display name for transaction type
  const getTypeOptionDisplay = (type) => {
    if (type === 'all_payments') return 'All Payments'
    if (type.startsWith('category:')) return type.replace('category:', '')
    return getTransactionTypeDisplay(type)
  }

  // Handle toggling transaction selection
  const handleToggleTransaction = (txnId) => {
    setSelectedTransactionIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(txnId)) {
        newSet.delete(txnId)
      } else {
        newSet.add(txnId)
      }
      return newSet
    })
  }

  // Handle select all visible transactions
  const handleSelectAll = () => {
    const allIds = filteredTransactions
      .filter(txn => txn.transaction_status !== 'voided' && txn.transaction_status !== 'reversed' && !txn.parent_transaction_id)
      .map(txn => txn.id)
    setSelectedTransactionIds(new Set(allIds))
  }

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedTransactionIds(new Set())
  }

  // Reset move mode
  const resetMoveMode = () => {
    setMoveMode(null)
    setMoveTargetFolioId('')
    setMoveTransactionType('')
    setSelectedTransactionIds(new Set())
    setMoveTransactionOpen(false)
  }

  // Handle activating move mode
  const handleActivateMoveMode = () => {
    if (!moveTargetFolioId) {
      alert('Please select a target folio')
      return
    }
    if (moveMode === 'individual') {
      // Keep popover closed, allow selection in ledger
      setMoveTransactionOpen(false)
    } else if (moveMode === 'type') {
      if (!moveTransactionType) {
        alert('Please select a transaction type')
        return
      }
      // Execute bulk move by type immediately
      handleBulkMoveByType()
    }
  }

  // Handle bulk move selected transactions
  const handleBulkMoveSelected = async () => {
    if (selectedTransactionIds.size === 0) {
      alert('Please select at least one transaction to move')
      return
    }
    if (!moveTargetFolioId) {
      alert('Please select a target folio')
      return
    }

    setMoveLoading(true)
    try {
      // Move each selected transaction (and its children via the existing function)
      for (const txnId of selectedTransactionIds) {
        const { error } = await moveTransactionToFolio(txnId, moveTargetFolioId)
        if (error) {
          console.error('Error moving transaction:', error)
        }
      }

      await fetchTransactions()
      await fetchFolios()
      onFolioChange?.()
      resetMoveMode()
    } catch (err) {
      console.error('Error moving transactions:', err)
      alert('Failed to move some transactions: ' + err.message)
    } finally {
      setMoveLoading(false)
    }
  }

  // Handle bulk move by transaction type
  const handleBulkMoveByType = async () => {
    if (!moveTransactionType || !moveTargetFolioId) return

    setMoveLoading(true)
    try {
      // Find all transactions matching the selected type
      const txnsToMove = filteredTransactions.filter(txn => {
        if (txn.transaction_status === 'voided' || txn.transaction_status === 'reversed') return false
        if (txn.parent_transaction_id) return false // Don't move child transactions directly

        if (moveTransactionType === 'all_payments') {
          return txn.transaction_type.startsWith('payment_')
        }
        if (moveTransactionType.startsWith('category:')) {
          return txn.service_category === moveTransactionType.replace('category:', '')
        }
        return txn.transaction_type === moveTransactionType
      })

      // Move each transaction (and its children via the existing function)
      for (const txn of txnsToMove) {
        const { error } = await moveTransactionToFolio(txn.id, moveTargetFolioId)
        if (error) {
          console.error('Error moving transaction:', error)
        }
      }

      await fetchTransactions()
      await fetchFolios()
      onFolioChange?.()
      resetMoveMode()
    } catch (err) {
      console.error('Error moving transactions:', err)
      alert('Failed to move some transactions: ' + err.message)
    } finally {
      setMoveLoading(false)
    }
  }

  // Check if a transaction is selectable (not voided/reversed, not a child tax)
  const isTransactionSelectable = (txn) => {
    return txn.transaction_status !== 'voided' &&
           txn.transaction_status !== 'reversed' &&
           !txn.parent_transaction_id
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
      {/* Folio Tabs & Summary Bar */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Folio Tabs Row */}
          {folios.length > 0 && (
            <div className="flex items-center border-b">
              {/* Scrollable Tabs */}
              <div className="flex-1 flex items-center gap-0 overflow-x-auto">
                {folios.map((folio, index) => {
                  const balance = folioBalances[folio.id]?.balance || 0
                  const isActive = activeFolioId === folio.id
                  const canDeleteFolio = folio.folio_type !== 'master' && folios.length > 1
                  return (
                    <div key={folio.id} className="relative group flex-shrink-0">
                      <button
                        onClick={() => setActiveFolioId(folio.id)}
                        className={`
                          flex items-center gap-3 px-5 py-3 border-b-2 transition-all
                          ${isActive
                            ? 'border-primary bg-muted/50'
                            : 'border-transparent hover:bg-muted/30'
                          }
                          ${index > 0 ? 'border-l border-l-border' : ''}
                        `}
                      >
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-medium text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {folio.name}
                            </span>
                            {folio.folio_type === 'master' && folio.booking_id && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                Master
                              </span>
                            )}
                            {folio.folio_type === 'room' && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                Room
                              </span>
                            )}
                          </div>
                          <span className={`text-xs tabular-nums ${balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {formatCurrency(balance)}
                          </span>
                        </div>
                        {/* Delete button */}
                        {canDeleteFolio && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFolioForDelete(folio)
                              setDeleteFolioOpen(true)
                            }}
                            className="ml-1 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete folio"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </button>
                    </div>
                  )
                })}
                {/* Add Folio Button - sits beside the last tab */}
                <button
                  onClick={() => setCreateFolioOpen(true)}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 mx-3 rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted hover:shadow-sm transition-all"
                  title="New Folio"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* Manage Dropdown - for folio operations */}
              {(canSplitFolios || canMergeFolios || canMergeAll || canMergeSelected) && (
                <div className="flex items-center px-3 border-l">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2.5 text-muted-foreground hover:text-foreground">
                        <SplitSquareVertical className="h-4 w-4" />
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canSplitFolios && (
                        <DropdownMenuItem onClick={() => setSplitFolioConfirmOpen(true)}>
                          <SplitSquareVertical className="h-4 w-4 mr-2" />
                          Split into Room Folios
                        </DropdownMenuItem>
                      )}
                      {canMergeFolios && (
                        <DropdownMenuItem onClick={() => setMergeFolioConfirmOpen(true)}>
                          <Merge className="h-4 w-4 mr-2" />
                          Merge Room Folios
                        </DropdownMenuItem>
                      )}
                      {canMergeAll && (
                        <DropdownMenuItem onClick={() => setMergeAllConfirmOpen(true)}>
                          <Merge className="h-4 w-4 mr-2" />
                          Merge All into Master
                        </DropdownMenuItem>
                      )}
                      {canMergeSelected && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setMergeSelectedOpen(true)}>
                            <Merge className="h-4 w-4 mr-2" />
                            Merge Selected Folios...
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}

          {/* Summary Row */}
          <div className="flex items-center justify-between px-6 py-4 bg-muted/30">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Charges</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(activeFolioId ? (folioBalances[activeFolioId]?.charges || 0) : summary.totalCharges)}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payments</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(activeFolioId ? (folioBalances[activeFolioId]?.payments || 0) : summary.totalPayments)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Balance Due</p>
              <p className={`text-xl font-bold tabular-nums ${(activeFolioId ? (folioBalances[activeFolioId]?.balance || 0) : summary.balance) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(activeFolioId ? (folioBalances[activeFolioId]?.balance || 0) : summary.balance)}
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
          {folios.length > 1 && (
            <Popover open={moveTransactionOpen} onOpenChange={setMoveTransactionOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoveRight className="h-4 w-4 mr-1" />
                  Move Transaction
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div className="font-medium">Move Transactions</div>

                  {/* Move Individual Transactions Option */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="move-individual"
                        checked={moveMode === 'individual'}
                        onCheckedChange={(checked) => {
                          setMoveMode(checked ? 'individual' : null)
                          if (!checked) setSelectedTransactionIds(new Set())
                        }}
                      />
                      <Label htmlFor="move-individual" className="text-sm font-medium cursor-pointer">
                        Move individual transactions
                      </Label>
                    </div>
                    {moveMode === 'individual' && (
                      <div className="ml-6">
                        <Label className="text-xs text-muted-foreground mb-1 block">Target Folio</Label>
                        <Select value={moveTargetFolioId} onValueChange={setMoveTargetFolioId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select folio" />
                          </SelectTrigger>
                          <SelectContent>
                            {folios
                              .filter(f => f.id !== activeFolioId)
                              .map(folio => (
                                <SelectItem key={folio.id} value={folio.id}>
                                  {folio.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Move by Transaction Type Option */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="move-type"
                        checked={moveMode === 'type'}
                        onCheckedChange={(checked) => {
                          setMoveMode(checked ? 'type' : null)
                          setMoveTransactionType('')
                        }}
                      />
                      <Label htmlFor="move-type" className="text-sm font-medium cursor-pointer">
                        Move by transaction type
                      </Label>
                    </div>
                    {moveMode === 'type' && (
                      <div className="ml-6 space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Target Folio</Label>
                          <Select value={moveTargetFolioId} onValueChange={setMoveTargetFolioId}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select folio" />
                            </SelectTrigger>
                            <SelectContent>
                              {folios
                                .filter(f => f.id !== activeFolioId)
                                .map(folio => (
                                  <SelectItem key={folio.id} value={folio.id}>
                                    {folio.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Transaction Type</Label>
                          <Select value={moveTransactionType} onValueChange={setMoveTransactionType}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {transactionTypes.map(type => (
                                <SelectItem key={type} value={type}>
                                  {getTypeOptionDisplay(type)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={handleActivateMoveMode}
                    disabled={!moveMode || !moveTargetFolioId || moveLoading}
                    className="w-full"
                    size="sm"
                  >
                    {moveLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <MoveRight className="h-4 w-4 mr-1" />
                    )}
                    {moveMode === 'individual' ? 'Select Transactions' : 'Move Transactions'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
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

          <Button
            variant={groupByDate ? "default" : "outline"}
            size="sm"
            onClick={() => setGroupByDate(!groupByDate)}
            title={groupByDate ? "Switch to list view" : "Group by date"}
          >
            {groupByDate ? <List className="h-4 w-4 mr-1" /> : <CalendarDays className="h-4 w-4 mr-1" />}
            {groupByDate ? "List" : "By Date"}
          </Button>

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
          ) : groupByDate && groupedTransactions ? (
            /* Grouped by Date View */
            <div className="divide-y">
              {groupedTransactions.map((group) => (
                <div key={group.date} className="py-2">
                  {/* Date Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/50 sticky top-0">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{group.displayDate}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.transactions.length} item{group.transactions.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <span className={`font-semibold text-sm ${group.dayTotal >= 0 ? 'text-foreground' : 'text-green-600 dark:text-green-400'}`}>
                      {group.dayTotal >= 0 ? '+' : ''}{formatCurrency(group.dayTotal)}
                    </span>
                  </div>
                  {/* Transactions for this date */}
                  <Table>
                    <TableBody>
                      {group.transactions.map((txn) => {
                        const amount = parseFloat(txn.amount || 0)
                        const isCharge = amount > 0
                        const isVoidedOrReversed = txn.transaction_status === 'voided' || txn.transaction_status === 'reversed'
                        const roomInfo = getTransactionRoomInfo(txn)

                        return (
                          <TableRow
                            key={txn.id}
                            className={`${isVoidedOrReversed ? 'opacity-50' : ''} ${moveMode === 'individual' && selectedTransactionIds.has(txn.id) ? 'bg-primary/10' : ''}`}
                          >
                            <TableCell className="w-[60px]">
                              {moveMode === 'individual' && (
                                isTransactionSelectable(txn) ? (
                                  <Checkbox
                                    checked={selectedTransactionIds.has(txn.id)}
                                    onCheckedChange={() => handleToggleTransaction(txn.id)}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground w-[70px]">
                              {format(new Date(txn.transaction_date || txn.created_at), 'hh:mm a')}
                            </TableCell>
                            {isMultiRoomBooking && (
                              <>
                                <TableCell className="text-sm font-medium w-[80px]">
                                  {roomInfo.roomNumber}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground truncate max-w-[100px] w-[100px]">
                                  {roomInfo.guestName}
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              <div className={isVoidedOrReversed ? 'line-through' : ''}>
                                <span className="font-medium">{txn.description || getTransactionTypeDisplay(txn.transaction_type)}</span>
                                {txn.service_category && (
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    ({txn.service_category})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-[150px]">
                              {txn.notes ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="text-sm text-muted-foreground truncate max-w-[150px] block text-left hover:text-foreground hover:underline cursor-pointer">
                                      {txn.notes}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 max-h-60 overflow-y-auto" align="start">
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-sm">Notes</h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{txn.notes}</p>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm w-[50px]">
                              {txn.quantity ? txn.quantity : '—'}
                            </TableCell>
                            <TableCell className="w-[80px]">
                              {getStatusBadge(txn.transaction_status)}
                            </TableCell>
                            <TableCell className={`text-right w-[100px] ${isVoidedOrReversed ? 'line-through' : ''}`}>
                              {isCharge ? formatCurrency(amount) : ''}
                            </TableCell>
                            <TableCell className={`text-right w-[100px] text-green-600 dark:text-green-400 ${isVoidedOrReversed ? 'line-through' : ''}`}>
                              {!isCharge ? formatCurrency(Math.abs(amount)) : ''}
                            </TableCell>
                            <TableCell className="w-[50px]">
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
                                    {folios.length > 1 && (
                                      <>
                                        <DropdownMenuSeparator />
                                        {folios
                                          .filter(f => f.id !== txn.folio_id)
                                          .map(targetFolio => (
                                            <DropdownMenuItem
                                              key={targetFolio.id}
                                              onClick={() => handleMoveToFolio(txn.id, targetFolio.id)}
                                            >
                                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                                              Move to {targetFolio.name}
                                            </DropdownMenuItem>
                                          ))
                                        }
                                      </>
                                    )}
                                    {parseFloat(txn.amount) > 0 && txn.transaction_status === 'posted' && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedTransaction(txn)
                                            setTransferModalOpen(true)
                                          }}
                                        >
                                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                                          Transfer to Another Room
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedTransaction(txn)
                                            setSplitModalOpen(true)
                                          }}
                                        >
                                          <Scissors className="h-4 w-4 mr-2" />
                                          Split Transaction
                                        </DropdownMenuItem>
                                      </>
                                    )}
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
                </div>
              ))}
            </div>
          ) : (
            /* Standard List View */
            <Table>
              <TableHeader>
                <TableRow>
                  {moveMode === 'individual' && (
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedTransactionIds.size > 0 &&
                          selectedTransactionIds.size === filteredTransactions.filter(isTransactionSelectable).length}
                        onCheckedChange={(checked) => {
                          if (checked) handleSelectAll()
                          else handleDeselectAll()
                        }}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[120px]">Date & Time</TableHead>
                  {isMultiRoomBooking && (
                    <>
                      <TableHead className="w-[80px]">Room</TableHead>
                      <TableHead className="w-[100px]">Guest</TableHead>
                    </>
                  )}
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[150px]">Notes</TableHead>
                  <TableHead className="w-[50px] text-center">Qty</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="text-right w-[100px]">Debit</TableHead>
                  <TableHead className="text-right w-[100px]">Credit</TableHead>
                  <TableHead className="text-right w-[100px]">Balance</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((txn) => {
                  const amount = parseFloat(txn.amount || 0)
                  const isCharge = amount > 0
                  const isVoidedOrReversed = txn.transaction_status === 'voided' || txn.transaction_status === 'reversed'
                  const roomInfo = getTransactionRoomInfo(txn)

                  return (
                    <TableRow
                      key={txn.id}
                      className={`${isVoidedOrReversed ? 'opacity-50' : ''} ${moveMode === 'individual' && selectedTransactionIds.has(txn.id) ? 'bg-primary/10' : ''}`}
                    >
                      {moveMode === 'individual' && (
                        <TableCell className="w-[40px]">
                          {isTransactionSelectable(txn) ? (
                            <Checkbox
                              checked={selectedTransactionIds.has(txn.id)}
                              onCheckedChange={() => handleToggleTransaction(txn.id)}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        <div>{format(new Date(txn.transaction_date || txn.created_at), 'MMM dd, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(txn.transaction_date || txn.created_at), 'hh:mm a')}</div>
                      </TableCell>
                      {isMultiRoomBooking && (
                        <>
                          <TableCell className="text-sm font-medium">
                            {roomInfo.roomNumber}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[100px]">
                            {roomInfo.guestName}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <div className={isVoidedOrReversed ? 'line-through' : ''}>
                          <span className="font-medium">{txn.description || getTransactionTypeDisplay(txn.transaction_type)}</span>
                          {txn.service_category && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({txn.service_category})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        {txn.notes ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-sm text-muted-foreground truncate max-w-[150px] block text-left hover:text-foreground hover:underline cursor-pointer">
                                {txn.notes}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 max-h-60 overflow-y-auto" align="start">
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Notes</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{txn.notes}</p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {txn.quantity ? txn.quantity : '—'}
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
                              {/* Move to Folio options */}
                              {folios.length > 1 && (
                                <>
                                  <DropdownMenuSeparator />
                                  {folios
                                    .filter(f => f.id !== txn.folio_id)
                                    .map(targetFolio => (
                                      <DropdownMenuItem
                                        key={targetFolio.id}
                                        onClick={() => handleMoveToFolio(txn.id, targetFolio.id)}
                                      >
                                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                                        Move to {targetFolio.name}
                                      </DropdownMenuItem>
                                    ))
                                  }
                                </>
                              )}
                              {/* Transfer to another room (only for charges) */}
                              {parseFloat(txn.amount) > 0 && txn.transaction_status === 'posted' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTransaction(txn)
                                      setTransferModalOpen(true)
                                    }}
                                  >
                                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                                    Transfer to Another Room
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTransaction(txn)
                                      setSplitModalOpen(true)
                                    }}
                                  >
                                    <Scissors className="h-4 w-4 mr-2" />
                                    Split Transaction
                                  </DropdownMenuItem>
                                </>
                              )}
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

      {/* Floating Action Bar for Selection Mode */}
      {moveMode === 'individual' && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="shadow-lg border-2">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="font-medium">{selectedTransactionIds.size}</span>
                  <span className="text-muted-foreground ml-1">
                    transaction{selectedTransactionIds.size !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetMoveMode}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkMoveSelected}
                    disabled={selectedTransactionIds.size === 0 || moveLoading}
                  >
                    {moveLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <MoveRight className="h-4 w-4 mr-1" />
                    )}
                    Move to {folios.find(f => f.id === moveTargetFolioId)?.name || 'Folio'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Charge Modal */}
      <AddChargeModal
        open={addChargeOpen}
        onOpenChange={setAddChargeOpen}
        reservationId={primaryReservation?.id}
        primaryReservation={primaryReservation}
        groupedReservations={groupedReservations}
        guests={guests}
        folios={folios}
        activeFolioId={activeFolioId}
        onSuccess={() => {
          fetchTransactions()
          fetchFolios()
          onFolioChange?.()
        }}
      />

      {/* Add Payment Modal */}
      <AddPaymentModal
        open={addPaymentOpen}
        onOpenChange={setAddPaymentOpen}
        reservationId={primaryReservation?.id}
        primaryReservation={primaryReservation}
        groupedReservations={groupedReservations}
        guests={guests}
        folios={folios}
        activeFolioId={activeFolioId}
        balanceDue={activeFolioId ? (folioBalances[activeFolioId]?.balance || 0) : summary.balance}
        onSuccess={() => {
          fetchTransactions()
          fetchFolios()
          onFolioChange?.()
        }}
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

      {/* Create Folio Modal */}
      <CreateFolioModal
        open={createFolioOpen}
        onOpenChange={setCreateFolioOpen}
        reservationId={primaryReservation?.id}
        onSuccess={handleFolioCreated}
      />

      {/* Transfer Transaction Modal */}
      <TransferTransactionModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        transaction={selectedTransaction}
        currentReservationId={primaryReservation?.id}
        onSuccess={() => {
          fetchTransactions()
          fetchFolios()
          onFolioChange?.()
          setSelectedTransaction(null)
        }}
      />

      {/* Split Transaction Modal */}
      <SplitTransactionModal
        open={splitModalOpen}
        onOpenChange={setSplitModalOpen}
        transaction={selectedTransaction}
        folios={folios}
        onSuccess={() => {
          fetchTransactions()
          fetchFolios()
          onFolioChange?.()
          setSelectedTransaction(null)
        }}
      />

      {/* Split Folio Confirmation Dialog */}
      <AlertDialog open={splitFolioConfirmOpen} onOpenChange={setSplitFolioConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <SplitSquareVertical className="h-5 w-5 text-primary" />
              Split into Room Folios
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will split the master folio into separate folios for each room in this booking.
              Each room's charges will be moved to its respective folio.
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">This booking has {groupedReservations.length || reservationIds?.length || 0} rooms</p>
                <p className="text-sm mt-1">After splitting, you can manage billing separately for each room.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={folioActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSplitFolios}
              disabled={folioActionLoading}
            >
              {folioActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SplitSquareVertical className="h-4 w-4 mr-2" />}
              Split Folios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Room Folios Confirmation Dialog */}
      <AlertDialog open={mergeFolioConfirmOpen} onOpenChange={setMergeFolioConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-primary" />
              Merge Room Folios
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will merge all room folios back into a single master folio.
              All transactions from each room will be combined.
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">All room charges will appear on one folio</p>
                <p className="text-sm mt-1">This is useful for single-bill checkout or group payments.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={folioActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMergeFolios}
              disabled={folioActionLoading}
            >
              {folioActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Merge className="h-4 w-4 mr-2" />}
              Merge Folios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge All Folios Confirmation Dialog */}
      <AlertDialog open={mergeAllConfirmOpen} onOpenChange={setMergeAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-primary" />
              Merge All Folios into Master
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will merge ALL folios (room folios, incidentals, custom folios) into a single master folio.
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">{nonMasterFolios.length} folio{nonMasterFolios.length !== 1 ? 's' : ''} will be merged:</p>
                <ul className="text-sm mt-2 space-y-1">
                  {nonMasterFolios.map(f => (
                    <li key={f.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {f.name}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={folioActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMergeAllFolios}
              disabled={folioActionLoading}
            >
              {folioActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Merge className="h-4 w-4 mr-2" />}
              Merge All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Selected Folios Dialog */}
      <AlertDialog open={mergeSelectedOpen} onOpenChange={(open) => {
        setMergeSelectedOpen(open)
        if (!open) {
          setSelectedFoliosForMerge(new Set())
          setMergeTargetFolioId('')
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-primary" />
              Merge Selected Folios
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Select the folios you want to merge and choose a target folio.</p>

                {/* Target Folio Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Merge into:</Label>
                  <Select value={mergeTargetFolioId} onValueChange={setMergeTargetFolioId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select target folio" />
                    </SelectTrigger>
                    <SelectContent>
                      {folios.map(folio => (
                        <SelectItem key={folio.id} value={folio.id}>
                          {folio.name}
                          {folio.folio_type === 'master' && ' (Master)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Folios to Merge */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Folios to merge:</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {folios
                      .filter(f => f.id !== mergeTargetFolioId)
                      .map(folio => (
                        <div key={folio.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`merge-folio-${folio.id}`}
                            checked={selectedFoliosForMerge.has(folio.id)}
                            onCheckedChange={() => handleToggleFolioForMerge(folio.id)}
                          />
                          <Label
                            htmlFor={`merge-folio-${folio.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {folio.name}
                            {folio.folio_type === 'master' && (
                              <span className="ml-1 text-xs text-primary">(Master)</span>
                            )}
                            {folio.folio_type === 'room' && (
                              <span className="ml-1 text-xs text-muted-foreground">(Room)</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    {folios.filter(f => f.id !== mergeTargetFolioId).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Select a target folio first
                      </p>
                    )}
                  </div>
                </div>

                {selectedFoliosForMerge.size > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      {selectedFoliosForMerge.size} folio{selectedFoliosForMerge.size !== 1 ? 's' : ''} will be merged into {folios.find(f => f.id === mergeTargetFolioId)?.name || 'target folio'}.
                      All transactions will be moved and the merged folios will be deactivated.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={folioActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMergeSelectedFolios}
              disabled={folioActionLoading || selectedFoliosForMerge.size === 0 || !mergeTargetFolioId}
            >
              {folioActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Merge className="h-4 w-4 mr-2" />}
              Merge {selectedFoliosForMerge.size} Folio{selectedFoliosForMerge.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folio Modal */}
      <DeleteFolioModal
        open={deleteFolioOpen}
        onOpenChange={setDeleteFolioOpen}
        folio={selectedFolioForDelete}
        folios={folios}
        reservationId={primaryReservation?.id}
        bookingId={bookingId}
        onSuccess={handleFolioDeleted}
      />
    </div>
  )
}
