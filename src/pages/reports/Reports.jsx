// ==========================================
// FILE: src/pages/reports/Reports.jsx
// ==========================================
import { useState, useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, FileText, Download, Printer, Filter } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { useBilling } from '../../context/BillingContext';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';

const Reports = () => {
  const { bills } = useBilling();
  const { reservations } = useReservations();
  const { rooms } = useRooms();
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reportType, setReportType] = useState('daily');

  // Filter bills by date range
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return billDate >= start && billDate <= end;
    });
  }, [bills, startDate, endDate]);

  // Calculate totals
  const totals = useMemo(() => {
    const total = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    const paid = filteredBills.reduce((sum, bill) => sum + bill.paidAmount, 0);
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
      if (!breakdown[bill.billType]) {
        breakdown[bill.billType] = {
          count: 0,
          total: 0,
          paid: 0,
          outstanding: 0
        };
      }
      breakdown[bill.billType].count++;
      breakdown[bill.billType].total += bill.total;
      breakdown[bill.billType].paid += bill.paidAmount;
      breakdown[bill.billType].outstanding += bill.balance;
    });
    return breakdown;
  }, [filteredBills]);

  // Reservations in date range
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      const checkIn = new Date(r.checkInDate);
      const checkOut = new Date(r.checkOutDate);
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
    const pending = filteredBills.filter(b => b.paymentStatus === 'Pending').length;
    const partial = filteredBills.filter(b => b.paymentStatus === 'Partial').length;
    const paid = filteredBills.filter(b => b.paymentStatus === 'Paid').length;

    return { pending, partial, paid };
  }, [filteredBills]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Simple CSV export
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
    <div className="reports-container">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <div className="action-buttons">
          <button onClick={handleExport} className="btn-secondary">
            <Download size={18} /> Export CSV
          </button>
          <button onClick={handlePrint} className="btn-primary">
            <Printer size={18} /> Print Report
          </button>
        </div>
      </div>

      {/* Date Range Filters */}
      <Card>
        <div className="report-filters">
          <div className="quick-dates">
            <button onClick={() => setQuickDate('today')} className="quick-date-btn">Today</button>
            <button onClick={() => setQuickDate('yesterday')} className="quick-date-btn">Yesterday</button>
            <button onClick={() => setQuickDate('this-week')} className="quick-date-btn">This Week</button>
            <button onClick={() => setQuickDate('this-month')} className="quick-date-btn">This Month</button>
            <button onClick={() => setQuickDate('last-month')} className="quick-date-btn">Last Month</button>
          </div>
          <div className="date-range">
            <div className="form-group">
              <label>From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="stats-grid">
        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Total Revenue</p>
              <p className="stat-value">₹{totals.total.toFixed(2)}</p>
              <small style={{ color: '#6b7280' }}>{filteredBills.length} bills</small>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
              <DollarSign color="white" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Amount Collected</p>
              <p className="stat-value">₹{totals.paid.toFixed(2)}</p>
              <small style={{ color: '#10b981' }}>
                {((totals.paid / totals.total) * 100 || 0).toFixed(1)}% collected
              </small>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
              <TrendingUp color="white" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Outstanding</p>
              <p className="stat-value">₹{totals.outstanding.toFixed(2)}</p>
              <small style={{ color: '#ef4444' }}>
                {((totals.outstanding / totals.total) * 100 || 0).toFixed(1)}% pending
              </small>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#ef4444' }}>
              <FileText color="white" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Occupancy Rate</p>
              <p className="stat-value">{occupancyStats.occupancyRate}%</p>
              <small style={{ color: '#6b7280' }}>
                {occupancyStats.occupiedRooms}/{occupancyStats.totalRooms} rooms
              </small>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
              <Calendar color="white" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card title="Revenue Breakdown by Bill Type">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill Type</th>
                <th>Number of Bills</th>
                <th>Total Amount</th>
                <th>Amount Collected</th>
                <th>Outstanding</th>
                <th>Collection %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(revenueByType).sort((a, b) => b[1].total - a[1].total).map(([type, data]) => (
                <tr key={type}>
                  <td><strong>{type}</strong></td>
                  <td>{data.count}</td>
                  <td>₹{data.total.toFixed(2)}</td>
                  <td style={{ color: '#10b981' }}>₹{data.paid.toFixed(2)}</td>
                  <td style={{ color: '#ef4444' }}>₹{data.outstanding.toFixed(2)}</td>
                  <td>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${(data.paid / data.total * 100) || 0}%` }}
                      />
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {((data.paid / data.total * 100) || 0).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: '700', borderTop: '2px solid #e5e7eb' }}>
                <td>TOTAL</td>
                <td>{filteredBills.length}</td>
                <td>₹{totals.total.toFixed(2)}</td>
                <td style={{ color: '#10b981' }}>₹{totals.paid.toFixed(2)}</td>
                <td style={{ color: '#ef4444' }}>₹{totals.outstanding.toFixed(2)}</td>
                <td>{((totals.paid / totals.total * 100) || 0).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Financial Summary */}
      <div className="dashboard-grid">
        <Card title="Financial Summary">
          <div className="financial-summary">
            <div className="summary-row">
              <span>Subtotal (Before Tax):</span>
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax Collected:</span>
              <span>₹{totals.tax.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Discounts Given:</span>
              <span style={{ color: '#ef4444' }}>- ₹{totals.discount.toFixed(2)}</span>
            </div>
            <div className="summary-row" style={{ fontWeight: '700', borderTop: '2px solid #e5e7eb', paddingTop: '12px', fontSize: '18px' }}>
              <span>Net Revenue:</span>
              <span style={{ color: '#10b981' }}>₹{totals.total.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <Card title="Payment Status">
          <div className="payment-status-chart">
            <div className="status-item">
              <div className="status-indicator" style={{ backgroundColor: '#ef4444' }} />
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Pending</p>
                <p style={{ fontSize: '20px', fontWeight: '700' }}>{paymentStatusBreakdown.pending}</p>
              </div>
            </div>
            <div className="status-item">
              <div className="status-indicator" style={{ backgroundColor: '#f59e0b' }} />
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Partial</p>
                <p style={{ fontSize: '20px', fontWeight: '700' }}>{paymentStatusBreakdown.partial}</p>
              </div>
            </div>
            <div className="status-item">
              <div className="status-indicator" style={{ backgroundColor: '#10b981' }} />
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Paid</p>
                <p style={{ fontSize: '20px', fontWeight: '700' }}>{paymentStatusBreakdown.paid}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Reservations Report */}
      <Card title="Reservations in Period">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Room</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map(reservation => {
                const room = rooms.find(r => r.id === reservation.roomId);
                return (
                  <tr key={reservation.id}>
                    <td><strong>{reservation.guestName}</strong></td>
                    <td>{room?.roomNumber || 'N/A'}</td>
                    <td>{reservation.checkInDate}</td>
                    <td>{reservation.checkOutDate}</td>
                    <td>₹{reservation.totalAmount.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-${reservation.status.toLowerCase()}`}>
                        {reservation.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Occupancy Report */}
      <Card title="Occupancy Details">
        <div className="occupancy-grid">
          <div className="occupancy-item">
            <h4>Total Rooms</h4>
            <p className="occupancy-number">{occupancyStats.totalRooms}</p>
          </div>
          <div className="occupancy-item">
            <h4>Occupied</h4>
            <p className="occupancy-number" style={{ color: '#ef4444' }}>{occupancyStats.occupiedRooms}</p>
          </div>
          <div className="occupancy-item">
            <h4>Available</h4>
            <p className="occupancy-number" style={{ color: '#10b981' }}>{occupancyStats.availableRooms}</p>
          </div>
          <div className="occupancy-item">
            <h4>Occupancy Rate</h4>
            <p className="occupancy-number" style={{ color: '#3b82f6' }}>{occupancyStats.occupancyRate}%</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Reports;