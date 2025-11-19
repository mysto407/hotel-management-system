// src/components/folio/AuditTrailDialog.jsx
import { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  User,
  Filter,
  Search,
  Download,
  Calendar,
  ChevronRight,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  ArrowRightLeft,
  DollarSign,
  FileText
} from 'lucide-react'
import { useFolio } from '../../context/FolioContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Card, CardContent } from '../ui/card'
import { formatDate } from '../../utils/helpers'

export default function AuditTrailDialog({ open, onOpenChange, folio }) {
  const { loadAuditLog } = useFolio()

  // State
  const [auditLogs, setAuditLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState(null)

  // Filters
  const [actionFilter, setActionFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [dateRangeFilter, setDateRangeFilter] = useState('all')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })

  const ITEMS_PER_PAGE = 20

  // Load audit logs when dialog opens
  useEffect(() => {
    if (open && folio) {
      loadAuditData()
    }
  }, [open, folio])

  const loadAuditData = async () => {
    if (!folio) return

    setLoading(true)
    try {
      // Load audit logs for this folio
      const logs = await loadAuditLog('folio', folio.id)
      setAuditLogs(logs || [])
      setFilteredLogs(logs || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    applyFilters()
  }, [auditLogs, searchTerm, actionFilter, userFilter, entityTypeFilter, dateRangeFilter, customDateRange])

  const applyFilters = () => {
    let filtered = [...auditLogs]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(log =>
        log.action?.toLowerCase().includes(term) ||
        log.description?.toLowerCase().includes(term) ||
        log.user?.name?.toLowerCase().includes(term) ||
        log.user?.email?.toLowerCase().includes(term)
      )
    }

    // Action filter
    if (actionFilter && actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter)
    }

    // User filter
    if (userFilter && userFilter !== 'all') {
      filtered = filtered.filter(log => log.user_id === userFilter)
    }

    // Entity type filter
    if (entityTypeFilter && entityTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.entity_type === entityTypeFilter)
    }

    // Date range filter
    if (dateRangeFilter === 'today') {
      const today = new Date().toISOString().split('T')[0]
      filtered = filtered.filter(log => log.timestamp?.startsWith(today))
    } else if (dateRangeFilter === 'yesterday') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      filtered = filtered.filter(log => log.timestamp?.startsWith(yesterdayStr))
    } else if (dateRangeFilter === 'this_week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filtered = filtered.filter(log => new Date(log.timestamp) >= weekAgo)
    } else if (dateRangeFilter === 'custom' && customDateRange.start && customDateRange.end) {
      filtered = filtered.filter(log => {
        const logDate = log.timestamp?.split('T')[0]
        return logDate >= customDateRange.start && logDate <= customDateRange.end
      })
    }

    setFilteredLogs(filtered)
    setCurrentPage(1) // Reset to first page
  }

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const users = new Map()
    auditLogs.forEach(log => {
      if (log.user) {
        users.set(log.user_id, log.user)
      }
    })
    return Array.from(users.values())
  }, [auditLogs])

  // Group logs by date sections
  const groupedLogs = useMemo(() => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    filteredLogs.forEach(log => {
      const logDate = new Date(log.timestamp)
      logDate.setHours(0, 0, 0, 0)

      if (logDate.getTime() === today.getTime()) {
        groups.today.push(log)
      } else if (logDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(log)
      } else if (logDate >= weekAgo) {
        groups.thisWeek.push(log)
      } else {
        groups.older.push(log)
      }
    })

    return groups
  }, [filteredLogs])

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Get action color and icon
  const getActionStyle = (action) => {
    switch (action) {
      case 'create':
        return { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle }
      case 'update':
        return { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Edit }
      case 'delete':
      case 'void':
        return { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle }
      case 'transfer':
        return { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: ArrowRightLeft }
      case 'settle':
      case 'reverse':
        return { color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: DollarSign }
      default:
        return { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: FileText }
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp)
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Entity Type', 'Description']
    const rows = filteredLogs.map(log => [
      formatTimestamp(log.timestamp),
      log.user?.name || 'N/A',
      log.user?.email || 'N/A',
      log.action || 'N/A',
      log.entity_type || 'N/A',
      log.description || 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `folio-audit-trail-${folio?.folio_number || 'export'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Render changes
  const renderChanges = (log) => {
    if (!log.old_values && !log.new_values) return null

    return (
      <div className="mt-2 text-xs space-y-1">
        {log.old_values && log.new_values && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-red-500/5 border border-red-500/20 rounded">
              <div className="font-semibold text-red-600 mb-1">Before</div>
              <pre className="text-xs overflow-auto max-h-20">
                {typeof log.old_values === 'object'
                  ? JSON.stringify(log.old_values, null, 2)
                  : log.old_values}
              </pre>
            </div>
            <div className="p-2 bg-green-500/5 border border-green-500/20 rounded">
              <div className="font-semibold text-green-600 mb-1">After</div>
              <pre className="text-xs overflow-auto max-h-20">
                {typeof log.new_values === 'object'
                  ? JSON.stringify(log.new_values, null, 2)
                  : log.new_values}
              </pre>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Audit Trail - Folio {folio?.folio_number}
          </DialogTitle>
          <DialogDescription>
            Complete history of all changes and actions performed on this folio
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading audit logs...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Filters and Search */}
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by user, action, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="settle">Settle</SelectItem>
                    <SelectItem value="reverse">Reverse</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    <SelectItem value="folio">Folio</SelectItem>
                    <SelectItem value="folio_transaction">Transaction</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {uniqueUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {dateRangeFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">End Date</label>
                    <Input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Results and Export */}
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  Showing {paginatedLogs.length} of {filteredLogs.length} entries
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={filteredLogs.length === 0}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[200px]">User</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                    <TableHead className="w-[120px]">Entity Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[80px] text-center">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log) => {
                      const { color, icon: Icon } = getActionStyle(log.action)
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">
                            {formatTimestamp(log.timestamp)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{log.user?.name || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {log.user?.email || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${color} border gap-1`} variant="outline">
                              <Icon className="h-3 w-3" />
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {log.entity_type?.replace('folio_', '')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{log.description}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            {(log.old_values || log.new_values) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                              >
                                <ChevronRight className={`h-4 w-4 transition-transform ${selectedLog?.id === log.id ? 'rotate-90' : ''}`} />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Detailed View */}
            {selectedLog && (
              <Card className="border-2">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-sm">Change Details</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedLog.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(null)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  {renderChanges(selectedLog)}
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
