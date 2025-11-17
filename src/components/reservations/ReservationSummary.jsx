// src/components/reservations/ReservationSummary.jsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMealPlans } from '../../context/MealPlanContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";

const ReservationSummary = ({
  reservations,
  filteredReservations,
  dateFilterType = 'all',
  startDate = '',
  endDate = '',
  showToggle = true,
  defaultExpanded = true
}) => {
  const [showSummary, setShowSummary] = useState(defaultExpanded);
  const { mealPlans } = useMealPlans();

  // Helper function to group reservations (remains the same)
  const groupReservations = (reservations) => {
    const groups = [];
    const processed = new Set();

    reservations.forEach(reservation => {
      if (processed.has(reservation.id)) return;
      const group = reservations.filter(r => {
        if (processed.has(r.id)) return false;
        const sameGuest = r.guest_id === reservation.guest_id;
        const sameDates = r.check_in_date === reservation.check_in_date && 
                         r.check_out_date === reservation.check_out_date;
        const sameSource = r.booking_source === reservation.booking_source && 
                          r.agent_id === reservation.agent_id;
        const sameMealPlan = r.meal_plan === reservation.meal_plan;
        const timeDiff = Math.abs(new Date(r.created_at) - new Date(reservation.created_at));
        const createdTogether = timeDiff < 30000;
        return sameGuest && sameDates && sameSource && sameMealPlan && createdTogether;
      });
      group.forEach(r => processed.add(r.id));
      groups.push(group);
    });
    return groups;
  };

  const totalBookings = groupReservations(reservations).length;
  const filteredBookings = groupReservations(filteredReservations).length;
  const filteredRooms = filteredReservations.length;

  const activeGuests = filteredReservations
    .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
    .reduce((sum, r) => 
      sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
    );
  
  const activeAdults = filteredReservations
    .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
    .reduce((sum, r) => sum + (r.number_of_adults || 0), 0);
  
  const activeChildren = filteredReservations
    .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
    .reduce((sum, r) => sum + (r.number_of_children || 0), 0);
    
  const activeInfants = filteredReservations
    .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
    .reduce((sum, r) => sum + (r.number_of_infants || 0), 0);
    
  const totalRevenue = filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const totalAdvance = filteredReservations.reduce((sum, r) => sum + (r.advance_payment || 0), 0);
  const totalBalance = totalRevenue - totalAdvance;
  const paymentProgress = totalRevenue > 0 ? (totalAdvance / totalRevenue) * 100 : 0;

  return (
    <Collapsible
      open={showSummary}
      onOpenChange={showToggle ? setShowSummary : undefined}
      className="mb-6 border rounded-lg shadow-sm"
    >
      <CollapsibleTrigger asChild>
        <div className={cn(
          "flex justify-between items-center p-4 bg-muted/30",
          showToggle && "cursor-pointer",
          !showSummary && "rounded-lg",
          showSummary && "border-b rounded-t-lg"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <h3 className="text-base font-semibold">Summary</h3>
            <div className="text-sm text-muted-foreground flex items-center flex-wrap gap-x-2">
              <span>
                Showing <strong className="text-foreground">{filteredBookings}</strong> {filteredBookings === 1 ? 'booking' : 'bookings'}
                (<strong className="text-foreground">{filteredRooms}</strong> {filteredRooms === 1 ? 'room' : 'rooms'}) of
                <strong className="text-foreground"> {totalBookings}</strong> total
              </span>
              {(dateFilterType !== 'all' && (startDate || endDate)) && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <Badge variant="info" className="text-xs">
                    {dateFilterType === 'today' && 'Today'}
                    {dateFilterType === 'weekly' && 'Next 7 Days'}
                    {dateFilterType === 'fortnightly' && 'Next 14 Days'}
                    {dateFilterType === 'monthly' && 'Next 30 Days'}
                    {dateFilterType === 'custom' && startDate && endDate && `${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    {dateFilterType === 'custom' && startDate && !endDate && `From ${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    {dateFilterType === 'custom' && !startDate && endDate && `Until ${new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  </Badge>
                </>
              )}
            </div>
          </div>
          {showToggle && (
            <ChevronDown
              size={16}
              className={cn("transition-transform", showSummary && "rotate-180")}
            />
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Guests & Meals Summary */}
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-blue-800 dark:text-blue-300">Guest Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white dark:bg-blue-950/50 rounded-lg flex justify-between items-center">
                <span className="font-medium text-blue-700 dark:text-blue-400">Active Guests</span>
                <span className="text-3xl font-bold text-blue-900 dark:text-blue-200">{activeGuests}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Card className="text-center">
                  <CardContent className="p-3">
                    <div className="text-xl font-bold text-blue-800 dark:text-blue-300">{activeAdults}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Adults</div>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-3">
                    <div className="text-xl font-bold text-blue-800 dark:text-blue-300">{activeChildren}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Children</div>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-3">
                    <div className="text-xl font-bold text-blue-800 dark:text-blue-300">{activeInfants}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Infants</div>
                  </CardContent>
                </Card>
              </div>

              <div className="pt-4 border-t border-blue-200 dark:border-blue-900">
                <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Meal Plans (Active Guests)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {mealPlans.map((plan) => {
                    const guestCount = filteredReservations
                      .filter(r => r.meal_plan === plan.code && r.status !== 'Checked-out')
                      .reduce((sum, r) =>
                        sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                      );
                    if (guestCount === 0) return null;
                    return (
                      <Card key={plan.code}>
                        <CardContent className="p-3 flex justify-between items-center">
                          <span className="text-xl font-bold text-foreground">{guestCount}</span>
                          <span className="text-xs text-muted-foreground">{plan.name}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Financial Summary */}
          <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Financial Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white dark:bg-emerald-950/50 rounded-lg flex justify-between items-center">
                <span className="font-medium text-emerald-700 dark:text-emerald-400">Total Revenue</span>
                <span className="text-3xl font-bold text-emerald-900 dark:text-emerald-200">₹{totalRevenue.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Card className="text-center">
                  <CardContent className="p-3">
                    <div className="text-xl font-bold text-emerald-800 dark:text-emerald-300">₹{totalAdvance.toLocaleString()}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">Advance</div>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-3">
                    <div className="text-xl font-bold text-red-800 dark:text-red-300">₹{totalBalance.toLocaleString()}</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Balance Due</div>
                  </CardContent>
                </Card>
              </div>

              <div className="pt-4 border-t border-emerald-200 dark:border-emerald-900">
                <Progress value={paymentProgress} className="h-2" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400 text-center mt-2">
                  {paymentProgress.toFixed(0)}% Payment Collected
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Booking Status */}
          <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Booking Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { status: 'Inquiry', variant: 'purple' },
                  { status: 'Tentative', variant: 'warning' },
                  { status: 'Hold', variant: 'orange' },
                  { status: 'Confirmed', variant: 'info' },
                  { status: 'Checked-in', variant: 'default' },
                  { status: 'Checked-out', variant: 'success' },
                  { status: 'Cancelled', variant: 'destructive' }
                ].map(({ status, variant }) => {
                  const count = filteredReservations.filter(r => r.status === status).length;
                  if (count === 0) return null;
                  return (
                    <div key={status} className={cn("p-2 rounded-md border text-center", count === 0 && "opacity-50")}>
                      <span className="text-xl font-bold block">{count}</span>
                      <Badge variant={variant} className="text-xs">{status}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-purple-800 dark:text-purple-300">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {['Paid', 'Partial', 'Pending'].map(paymentStatus => {
                  const count = filteredReservations.filter(r => r.payment_status === paymentStatus).length;
                  return (
                    <div key={paymentStatus} className={cn("p-3 rounded-md border text-center", count === 0 && "opacity-50")}>
                      <span className="text-xl font-bold block">{count}</span>
                      <Badge variant={
                        paymentStatus === 'Paid' ? 'success' :
                        paymentStatus === 'Partial' ? 'warning' :
                        'destructive'
                      }>{paymentStatus}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ReservationSummary;