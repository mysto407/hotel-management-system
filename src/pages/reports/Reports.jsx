// src/pages/reports/Reports.jsx
import { useState, useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, FileText, Download, Printer, Filter } from 'lucide-react';
import { useBilling } from '../../context/BillingContext';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const Reports = () => {
  const { bills } = useBilling();
  const { reservations } = useReservations();
  const { rooms } = useRooms();
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Filter bills by date range
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const billDate = new Date(bill.created_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      return billDate >= start && billDate <= end;
    });
  }, [bills, startDate, endDate]);

  // Calculate totals
  const totals = useMemo(() => {
    const total = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    const paid = filteredBills.reduce((sum, bill) => sum + bill.paid_amount, 0);
    const outstanding = filteredBills.reduce((sum, bill) => sum + bill.balance, 0);
    const tax = filteredBills.reduce((sum, bill) => sum + bill.tax, 0);
    const discount = filteredBills.reduce((sum, bill) => sum + bill.discount, 0);
    const subtotal = filteredBills.reduce((sum, bill) => sum + bill.subtotal, 0);

    return { total, paid, outstanding, tax, discount, subtotal };
  }, [filteredBills]);

  // Revenue breakdown by bill type
  const revenueByType = useMemo(() => {
    const breakdown = {};
    filteredBills.forEach(bill => {
      if (!breakdown[bill.bill_type]) {
        breakdown[bill.bill_type] = {
          count: 0,
          total: 0,
          paid: 0,
          outstanding: 0
        };
      }
      breakdown[bill.bill_type].count++;
      breakdown[bill.bill_type].total += bill.total;
      breakdown[bill.bill_type].paid += bill.paid_amount;
      breakdown[bill.bill_type].outstanding += bill.balance;
    });
    return breakdown;
  }, [filteredBills]);

  // Reservations in date range
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      const checkIn = new Date(r.check_in_date);
      const checkOut = new Date(r.check_out_date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return (checkIn >= start && checkIn <= end) || (checkOut >= start && checkOut <= end);
    });
  }, [reservations, startDate, endDate]);

  // Occupancy stats
  const occupancyStats = useMemo(() => {
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
    const availableRooms = rooms.filter(r => r.status === 'Available').length;
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyRate
    };
  }, [rooms]);

  // Payment status breakdown
  const paymentStatusBreakdown = useMemo(() => {
    const pending = filteredBills.filter(b => b.payment_status === 'Pending').length;
    const partial = filteredBills.filter(b => b.payment_status === 'Partial').length;
    const paid = filteredBills.filter(b => b.payment_status === 'Paid').length;

    return { pending, partial, paid };
  }, [filteredBills]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    let csv = 'Bill Type,Count,Total Amount,Paid Amount,Outstanding\n';
    Object.entries(revenueByType).forEach(([type, data]) => {
      csv += `${type},${data.count},${data.total.toFixed(2)},${data.paid.toFixed(2)},${data.outstanding.toFixed(2)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const setQuickDate = (type) => {
    const today = new Date();
    let start, end;

    switch(type) {
      case 'today':
        start = end = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        start = end = yesterday.toISOString().split('T')[0];
        break;
      case 'this-week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        start = weekStart.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'this-month':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'last-month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = lastMonth.toISOString().split('T')[0];
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        end = lastMonthEnd.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download size={18} className="mr-2" /> Export CSV
          </Button>
          <Button onClick={handlePrint}>
            <Printer size={18} className="mr-2" /> Print Report
          </Button>
        </div>
      </div>

      {/* Date Range Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setQuickDate('today')} variant="outline" size="sm">Today</Button>
            <Button onClick={() => setQuickDate('yesterday')} variant="outline" size="sm">Yesterday</Button>
            <Button onClick={() => setQuickDate('this-week')} variant="outline" size="sm">This Week</Button>
            <Button onClick={() => setQuickDate('this-month')} variant="outline" size="sm">This Month</Button>
            <Button onClick={() => setQuickDate('last-month')} variant="outline" size="sm">Last Month</Button>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="startDate">From Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="endDate">To Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center print:block hidden mb-4">
        <h2 className="text-2xl font-bold">Report for {startDate} to {endDate}</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{filteredBills.length} bills</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.paid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {((totals.paid / totals.total) * 100 || 0).toFixed(1)}% collected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.outstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {((totals.outstanding / totals.total) * 100 || 0).toFixed(1)}% pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Calendar className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyStats.occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">
              {occupancyStats.occupiedRooms}/{occupancyStats.totalRooms} rooms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown by Bill Type</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill Type</TableHead>
                <TableHead># of Bills</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Collection %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(revenueByType).sort((a, b) => b[1].total - a[1].total).map(([type, data]) => (
                <TableRow key={type}>
                  <TableCell className="font-medium">{type}</TableCell>
                  <TableCell>{data.count}</TableCell>
                  <TableCell>₹{data.total.toFixed(2)}</TableCell>
                  <TableCell className="text-emerald-600">₹{data.paid.toFixed(2)}</TableCell>
                  <TableCell className="text-destructive">₹{data.outstanding.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={((data.paid / data.total * 100) || 0)} className="w-20 h-2" />
                      <span className="text-xs text-muted-foreground">
                        {((data.paid / data.total * 100) || 0).toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableRow className="font-bold bg-gray-50 hover:bg-gray-50">
              <TableCell>TOTAL</TableCell>
              <TableCell>{filteredBills.length}</TableCell>
              <TableCell>₹{totals.total.toFixed(2)}</TableCell>
              <TableCell className="text-emerald-700">₹{totals.paid.toFixed(2)}</TableCell>
              <TableCell className="text-destructive">₹{totals.outstanding.toFixed(2)}</TableCell>
              <TableCell>{((totals.paid / totals.total * 100) || 0).toFixed(1)}%</TableCell>
            </TableRow>
          </Table>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (Before Tax):</span>
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax Collected:</span>
              <span>₹{totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discounts Given:</span>
              <span className="text-destructive">- ₹{totals.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-3 border-t">
              <span>Net Revenue:</span>
              <span className="text-emerald-600">₹{totals.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-around items-center pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive">{paymentStatusBreakdown.pending}</div>
              <Badge variant="destructive">Pending</Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500">{paymentStatusBreakdown.partial}</div>
              <Badge variant="warning">Partial</Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{paymentStatusBreakdown.paid}</div>
              <Badge variant="success">Paid</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations Report */}
      <Card>
        <CardHeader>
          <CardTitle>Reservations in Period</CardTitle>
          <CardDescription>
            Reservations checking in or out within the selected date range.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">No reservations found for this period</TableCell>
                </TableRow>
              )}
              {filteredReservations.map(reservation => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">{reservation.guests?.name || 'Unknown'}</TableCell>
                  <TableCell>{reservation.rooms?.room_number || 'N/A'}</TableCell>
                  <TableCell>{reservation.check_in_date}</TableCell>
                  <TableCell>{reservation.check_out_date}</TableCell>
                  <TableCell>₹{reservation.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={reservation.status === 'Checked-out' ? 'success' : (reservation.status === 'Cancelled' ? 'destructive' : 'secondary')}>
                      {reservation.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;