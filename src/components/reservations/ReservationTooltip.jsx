import { useState, useEffect, useRef, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import {
  ExternalLink,
  UserMinus,
  Edit2,
  ArrowLeftRight,
  RefreshCw,
  X,
  LogIn,
  LogOut,
  StickyNote,
  Calendar,
  Users,
  Clock,
  IndianRupee,
  FileText
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useBilling } from '@/context/BillingContext'
import { formatCurrency } from '@/utils/currency'

const STATUS_COLORS = {
  'Confirmed': 'bg-green-500',
  'Checked-in': 'bg-blue-500',
  'Hold': 'bg-orange-500',
  'Tentative': 'bg-yellow-500',
  'Cancelled': 'bg-red-500',
  'Checked-out': 'bg-gray-400',
}

const TOOLTIP_WIDTH = 400
const TOOLTIP_HEIGHT = 420 // Approximate height

export default function ReservationTooltip({
  reservation,
  guest,
  room,
  agent,
  relatedReservations = [],
  targetRect, // Bounding rect of the reservation bar
  containerRef, // Ref to the scrollable calendar container
  onClose,
  onNavigateToDetails,
  onQuickEdit,
  onResize,
  onSwapRoom,
  onCancel,
  onCheckIn,
  onCheckOut,
  onUnassignRoom
}) {
  const { getMasterBill } = useBilling()
  const [activeTab, setActiveTab] = useState('reservation')
  const [billingInfo, setBillingInfo] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, showAbove: false })
  const tooltipRef = useRef(null)

  // Calculate tooltip position based on target rect and available space
  const calculatePosition = useCallback(() => {
    if (!targetRect) return

    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth

    // Calculate center of the reservation bar
    const targetCenterX = targetRect.left + targetRect.width / 2

    // Calculate horizontal position (centered on reservation, but constrained to viewport)
    let left = targetCenterX - TOOLTIP_WIDTH / 2
    left = Math.max(8, Math.min(left, viewportWidth - TOOLTIP_WIDTH - 8))

    // Calculate if there's more space above or below
    const spaceAbove = targetRect.top
    const spaceBelow = viewportHeight - targetRect.bottom

    // Prefer showing below, but show above if not enough space below
    const showAbove = spaceBelow < TOOLTIP_HEIGHT && spaceAbove > spaceBelow

    let top
    if (showAbove) {
      top = targetRect.top - TOOLTIP_HEIGHT - 4 // 4px gap above
    } else {
      top = targetRect.bottom + 4 // 4px gap below
    }

    // Constrain to viewport
    top = Math.max(4, Math.min(top, viewportHeight - TOOLTIP_HEIGHT - 4))

    setTooltipPosition({ top, left, showAbove })
  }, [targetRect])

  // Update position on mount and when targetRect changes
  useEffect(() => {
    calculatePosition()
  }, [calculatePosition])

  // Update position on scroll
  useEffect(() => {
    const container = containerRef?.current
    if (!container) return

    const handleScroll = () => {
      // Close tooltip on scroll since the reservation bar moves
      onClose()
    }

    container.addEventListener('scroll', handleScroll)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [containerRef, onClose])

  // Get billing info for the reservation
  useEffect(() => {
    if (reservation?.id) {
      const masterBill = getMasterBill(reservation.id)
      setBillingInfo(masterBill)
    }
  }, [reservation?.id, getMasterBill])

  if (!reservation || !targetRect) return null

  const checkInDate = parseISO(reservation.check_in_date)
  const checkOutDate = parseISO(reservation.check_out_date)
  const guestName = guest?.name || 'Guest'
  const referenceNo = reservation.booking_reference || reservation.id.substring(0, 8).toUpperCase()
  const bookingSource = reservation.booking_source || 'Direct'
  const guestCount = (reservation.number_of_adults || 1) + (reservation.number_of_children || 0) + (reservation.number_of_infants || 0)
  const estimatedArrival = reservation.estimated_arrival || 'Not specified'

  // Grand total from reservation or billing
  const grandTotal = billingInfo?.grandTotal || reservation.total_amount || 0
  const balanceDue = billingInfo?.balance ?? (grandTotal - (reservation.advance_payment || 0))

  const isGroupBooking = relatedReservations.length > 0
  const canCheckIn = reservation.status === 'Confirmed' && new Date(reservation.check_in_date) <= new Date()
  const canCheckOut = reservation.status === 'Checked-in'

  // Format source display
  const getSourceDisplay = () => {
    if (reservation.booking_source === 'agent' && agent) {
      return agent.name
    }
    if (reservation.booking_source === 'direct' && reservation.direct_source) {
      return reservation.direct_source
    }
    return reservation.booking_source || 'Walk-in'
  }

  // Calculate arrow position (centered on reservation bar)
  const arrowLeft = targetRect ? Math.max(20, Math.min(targetRect.left + targetRect.width / 2 - tooltipPosition.left, TOOLTIP_WIDTH - 20)) : TOOLTIP_WIDTH / 2

  return (
    <>
      {/* Arrow indicator - rendered outside main container to avoid clipping */}
      <div
        className="fixed z-[51] pointer-events-none"
        style={{
          left: tooltipPosition.left + arrowLeft - 6,
          top: tooltipPosition.showAbove
            ? tooltipPosition.top + TOOLTIP_HEIGHT - 6
            : tooltipPosition.top - 6
        }}
      >
        <div
          className={cn(
            "w-3 h-3 bg-card border rotate-45 shadow-sm",
            tooltipPosition.showAbove
              ? "border-t-0 border-l-0"
              : "border-b-0 border-r-0"
          )}
        />
      </div>

      <div
        ref={tooltipRef}
        className="action-menu fixed z-50 bg-card border rounded-xl shadow-2xl overflow-hidden"
        style={{
          left: tooltipPosition.left,
          top: tooltipPosition.top,
          width: `${TOOLTIP_WIDTH}px`
        }}
      >
      {/* Header Section */}
      <div className="bg-muted/50 px-4 py-3 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base truncate">{guestName}</h3>
              <Badge className={cn("text-xs shrink-0", STATUS_COLORS[reservation.status])}>
                {reservation.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{referenceNo}</span>
              <span className="text-muted-foreground/50">|</span>
              <span>{getSourceDisplay()}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {isGroupBooking && (
          <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <Users className="h-3 w-3" />
            Group booking ({relatedReservations.length + 1} rooms)
          </div>
        )}
      </div>

      {/* Body Section */}
      <div className="flex divide-x">
        {/* Left Side - Details */}
        <div className="w-1/2 p-4 space-y-3">
          {/* Check-in/out dates */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Check-in:</span>
            </div>
            <p className="font-medium pl-6">{format(checkInDate, 'EEE, MMM d, yyyy')}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Check-out:</span>
            </div>
            <p className="font-medium pl-6">{format(checkOutDate, 'EEE, MMM d, yyyy')}</p>
          </div>

          {/* Guest Count */}
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Guests:</span>
            <span className="font-medium">
              {reservation.number_of_adults || 1}A
              {(reservation.number_of_children || 0) > 0 && `, ${reservation.number_of_children}C`}
              {(reservation.number_of_infants || 0) > 0 && `, ${reservation.number_of_infants}I`}
            </span>
          </div>

          {/* Estimated Arrival */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Arrival:</span>
            <span className="font-medium">{estimatedArrival}</span>
          </div>

          {/* Grand Total */}
          <div className="flex items-center gap-2 text-sm">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{formatCurrency(grandTotal)}</span>
          </div>

          {/* Balance Due */}
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Balance:</span>
            <span className={cn(
              "font-semibold",
              balanceDue > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            )}>
              {formatCurrency(balanceDue)}
            </span>
          </div>
        </div>

        {/* Right Side - Tabs */}
        <div className="w-1/2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="w-full rounded-none border-b bg-transparent h-10">
              <TabsTrigger
                value="reservation"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Actions
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reservation" className="mt-0 p-2">
              <div className="space-y-1">
                {/* Quick Check-in/Check-out */}
                {canCheckIn && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-9 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                    onClick={onCheckIn}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Check-in Now
                  </Button>
                )}
                {canCheckOut && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    onClick={onCheckOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Check-out Now
                  </Button>
                )}

                {(canCheckIn || canCheckOut) && <div className="border-t my-1" />}

                {/* Reservation Details */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9"
                  onClick={onNavigateToDetails}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Reservation Details
                </Button>

                {/* Unassign Room */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 text-muted-foreground"
                  onClick={onUnassignRoom}
                  disabled
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Unassign Room
                </Button>

                {/* Quick Edit */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9"
                  onClick={onQuickEdit}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Quick Edit
                </Button>

                {/* Resize */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9"
                  onClick={onResize}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2 rotate-90" />
                  Resize
                </Button>

                {/* Swap Room */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9"
                  onClick={onSwapRoom}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Swap Room
                </Button>

                <div className="border-t my-1" />

                {/* Cancel Reservation */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  onClick={onCancel}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Reservation
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-0 p-3">
              <div className="h-[200px] overflow-y-auto">
                {reservation.special_requests ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <StickyNote className="h-4 w-4" />
                      <span>Booking Notes</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                      {reservation.special_requests}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <StickyNote className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No notes for this reservation</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
    </>
  )
}
