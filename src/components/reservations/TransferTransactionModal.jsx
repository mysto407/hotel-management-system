import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Loader2, ArrowRightLeft, Search, User, Home, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { searchActiveReservations, transferTransactionToReservation } from '@/lib/supabase'
import { formatCurrency } from '@/utils/currency'

export default function TransferTransactionModal({ open, onOpenChange, transaction, currentReservationId, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [reservations, setReservations] = useState([])
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [reason, setReason] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm('')
      setReservations([])
      setSelectedReservation(null)
      setReason('')
      // Load initial reservations
      handleSearch('')
    }
  }, [open])

  // Search for reservations
  const handleSearch = async (term) => {
    setSearching(true)
    try {
      const { data, error } = await searchActiveReservations(term, currentReservationId)
      if (!error && data) {
        setReservations(data)
      }
    } catch (err) {
      console.error('Error searching reservations:', err)
    } finally {
      setSearching(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (open) {
        handleSearch(searchTerm)
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, open])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!transaction || !selectedReservation) {
      alert('Please select a target reservation')
      return
    }

    setLoading(true)
    try {
      const { error } = await transferTransactionToReservation(
        transaction.id,
        selectedReservation.id,
        reason
      )

      if (error) throw error

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      console.error('Error transferring transaction:', err)
      alert('Failed to transfer transaction: ' + err.message)
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
            <ArrowRightLeft className="h-5 w-5" />
            Transfer to Another Room
          </DialogTitle>
          <DialogDescription>
            Transfer this charge to a different reservation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Details */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Transferring:</p>
            <p className="font-medium">{transaction.description}</p>
            <p className="text-lg font-bold">{formatCurrency(Math.abs(transaction.amount))}</p>
          </div>

          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Target Reservation</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by room number, guest name, or confirmation #"
                className="pl-9"
              />
            </div>
          </div>

          {/* Reservation List */}
          <div className="space-y-2">
            <Label>Select Target Reservation</Label>
            <div className="border rounded-lg max-h-[200px] overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No reservations found</p>
                  <p className="text-xs">Try a different search term</p>
                </div>
              ) : (
                reservations.map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => setSelectedReservation(res)}
                    className={`w-full p-3 text-left border-b last:border-b-0 transition-colors
                      ${selectedReservation?.id === res.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          Room {res.room?.room_number || 'N/A'}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        res.status === 'Checked-in'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                      }`}>
                        {res.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{res.guest?.name || 'Unknown Guest'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(res.check_in_date), 'MMM dd')} - {format(new Date(res.check_out_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      #{res.confirmation_number}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Reason/Notes */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you transferring this charge?"
              rows={2}
            />
          </div>

          {/* Selected Reservation Summary */}
          {selectedReservation && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Transfer to: <span className="font-medium">Room {selectedReservation.room?.room_number}</span> - {selectedReservation.guest?.name}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedReservation}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Transfer Charge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
