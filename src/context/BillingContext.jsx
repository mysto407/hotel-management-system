// ==========================================
// FILE: src/context/BillingContext.jsx
// ==========================================
import { createContext, useContext, useState } from 'react';

const BillingContext = createContext();

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) throw new Error('useBilling must be used within BillingProvider');
  return context;
};

export const BillingProvider = ({ children }) => {
  const [bills, setBills] = useState([
    {
      id: 1,
      reservationId: 1,
      guestName: 'John Doe',
      roomNumber: '102',
      billType: 'Room',
      items: [
        { description: 'Room Charges (2 nights)', quantity: 2, rate: 4000, amount: 8000 }
      ],
      subtotal: 8000,
      tax: 1440,
      discount: 0,
      total: 9440,
      paidAmount: 4000,
      balance: 5440,
      paymentStatus: 'Partial',
      createdAt: '2025-10-14',
      notes: ''
    },
    {
      id: 2,
      reservationId: 1,
      guestName: 'John Doe',
      roomNumber: '102',
      billType: 'Food',
      items: [
        { description: 'Breakfast', quantity: 2, rate: 500, amount: 1000 },
        { description: 'Dinner', quantity: 2, rate: 800, amount: 1600 }
      ],
      subtotal: 2600,
      tax: 468,
      discount: 0,
      total: 3068,
      paidAmount: 0,
      balance: 3068,
      paymentStatus: 'Pending',
      createdAt: '2025-10-15',
      notes: ''
    }
  ]);

  const addBill = (bill) => {
    const newBill = {
      ...bill,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setBills([...bills, newBill]);
    return newBill;
  };

  const updateBill = (id, updatedBill) => {
    setBills(bills.map(b => b.id === id ? { ...b, ...updatedBill } : b));
  };

  const deleteBill = (id) => {
    setBills(bills.filter(b => b.id !== id));
  };

  const recordPayment = (billId, amount) => {
    setBills(bills.map(bill => {
      if (bill.id === billId) {
        const newPaidAmount = bill.paidAmount + amount;
        const newBalance = bill.total - newPaidAmount;
        const newStatus = newBalance === 0 ? 'Paid' : newBalance === bill.total ? 'Pending' : 'Partial';
        return {
          ...bill,
          paidAmount: newPaidAmount,
          balance: newBalance,
          paymentStatus: newStatus
        };
      }
      return bill;
    }));
  };

  const getBillsByReservation = (reservationId) => {
    return bills.filter(b => b.reservationId === reservationId);
  };

  const getMasterBill = (reservationId) => {
    const reservationBills = getBillsByReservation(reservationId);
    if (reservationBills.length === 0) return null;

    const totalSubtotal = reservationBills.reduce((sum, bill) => sum + bill.subtotal, 0);
    const totalTax = reservationBills.reduce((sum, bill) => sum + bill.tax, 0);
    const totalDiscount = reservationBills.reduce((sum, bill) => sum + bill.discount, 0);
    const grandTotal = reservationBills.reduce((sum, bill) => sum + bill.total, 0);
    const totalPaid = reservationBills.reduce((sum, bill) => sum + bill.paidAmount, 0);
    const totalBalance = grandTotal - totalPaid;

    return {
      reservationId,
      guestName: reservationBills[0].guestName,
      roomNumber: reservationBills[0].roomNumber,
      bills: reservationBills,
      subtotal: totalSubtotal,
      tax: totalTax,
      discount: totalDiscount,
      grandTotal,
      totalPaid,
      balance: totalBalance,
      paymentStatus: totalBalance === 0 ? 'Paid' : totalBalance === grandTotal ? 'Pending' : 'Partial'
    };
  };

  return (
    <BillingContext.Provider value={{
      bills,
      addBill,
      updateBill,
      deleteBill,
      recordPayment,
      getBillsByReservation,
      getMasterBill
    }}>
      {children}
    </BillingContext.Provider>
  );
};