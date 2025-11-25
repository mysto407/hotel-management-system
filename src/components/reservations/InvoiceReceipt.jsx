import { forwardRef } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Badge } from '../ui/badge'

const InvoiceReceipt = forwardRef(({ invoiceData, type = 'invoice' }, ref) => {
  const { folio, transactions, summary, hotelInfo } = invoiceData

  const isInvoice = type === 'invoice'
  const reservation = folio?.reservation
  const guest = reservation?.guest
  const room = reservation?.room

  // Filter transactions by status (only posted for receipts)
  const displayTransactions = isInvoice
    ? transactions
    : transactions?.filter(tx => tx.transaction_status === 'posted')

  // Group transactions by type
  const groupedTransactions = displayTransactions?.reduce((acc, tx) => {
    let category
    if (tx.transaction_type.startsWith('payment_')) {
      category = 'Payments'
    } else if (tx.transaction_type === 'tax') {
      category = 'Taxes'
    } else if (tx.transaction_type === 'discount' || tx.transaction_type === 'write_off') {
      category = 'Discounts'
    } else {
      category = 'Charges'
    }
    if (!acc[category]) acc[category] = []
    acc[category].push(tx)
    return acc
  }, {})

  return (
    <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="border-b-2 border-gray-300 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {hotelInfo?.hotel_name || 'Hotel Name'}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {hotelInfo?.hotel_address || 'Hotel Address'}
            </p>
            <p className="text-sm text-gray-600">
              {hotelInfo?.hotel_city || 'City'}, {hotelInfo?.hotel_state || 'State'} {hotelInfo?.hotel_pincode || ''}
            </p>
            <p className="text-sm text-gray-600">
              Phone: {hotelInfo?.hotel_phone || 'N/A'} | Email: {hotelInfo?.hotel_email || 'N/A'}
            </p>
            {hotelInfo?.hotel_gstin && (
              <p className="text-sm text-gray-600">GSTIN: {hotelInfo.hotel_gstin}</p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800">
              {isInvoice ? 'INVOICE' : 'RECEIPT'}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Folio #: {folio?.folio_number || 'N/A'}
            </p>
            <p className="text-sm text-gray-600">
              Date: {format(new Date(), 'MMM dd, yyyy')}
            </p>
            {folio?.checked_out_at && (
              <p className="text-sm text-gray-600">
                Checkout: {format(new Date(folio.checked_out_at), 'MMM dd, yyyy HH:mm')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Guest & Reservation Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">GUEST DETAILS</h3>
          <p className="text-sm text-gray-800 font-medium">{guest?.name || 'N/A'}</p>
          {guest?.email && <p className="text-sm text-gray-600">{guest.email}</p>}
          {guest?.phone && <p className="text-sm text-gray-600">{guest.phone}</p>}
          {guest?.address && <p className="text-sm text-gray-600">{guest.address}</p>}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">RESERVATION DETAILS</h3>
          <p className="text-sm text-gray-600">
            Reservation #: <span className="font-medium text-gray-800">{reservation?.confirmation_number || 'N/A'}</span>
          </p>
          <p className="text-sm text-gray-600">
            Room: <span className="font-medium text-gray-800">{room?.room_number || 'N/A'}</span>
          </p>
          {reservation?.check_in_date && reservation?.check_out_date && (
            <>
              <p className="text-sm text-gray-600">
                Check-in: <span className="font-medium text-gray-800">{format(new Date(reservation.check_in_date), 'MMM dd, yyyy')}</span>
              </p>
              <p className="text-sm text-gray-600">
                Check-out: <span className="font-medium text-gray-800">{format(new Date(reservation.check_out_date), 'MMM dd, yyyy')}</span>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">ITEMIZED {isInvoice ? 'CHARGES' : 'STATEMENT'}</h3>

        {Object.entries(groupedTransactions || {}).map(([category, txs]) => (
          <div key={category} className="mb-4">
            <h4 className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-2 rounded">
              {category}
            </h4>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-300">
                <tr>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Description</th>
                  <th className="text-right py-2 px-3 text-gray-600 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {txs.map(tx => (
                  <tr key={tx.id} className="border-b border-gray-200">
                    <td className="py-2 px-3 text-gray-700">
                      {format(new Date(tx.transaction_date), 'MMM dd')}
                    </td>
                    <td className="py-2 px-3 text-gray-700">
                      {tx.description}
                      {tx.quantity > 1 && <span className="text-gray-500 text-xs ml-1">({tx.quantity}x)</span>}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700 font-medium">
                      ₹{Math.abs(tx.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t-2 border-gray-300 pt-4">
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-800 font-medium">₹{summary?.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">Taxes:</span>
              <span className="text-gray-800 font-medium">₹{summary?.total_taxes?.toFixed(2) || '0.00'}</span>
            </div>
            {summary?.total_discounts > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">Discounts:</span>
                <span className="text-gray-800 font-medium">- ₹{summary.total_discounts.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-sm border-t border-gray-300">
              <span className="text-gray-700 font-semibold">Total Charges:</span>
              <span className="text-gray-800 font-bold">₹{summary?.total_charges?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">Payments Received:</span>
              <span className="text-emerald-600 font-medium">₹{summary?.total_payments?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between py-3 text-lg border-t-2 border-gray-400 mt-2">
              <span className="text-gray-800 font-bold">Balance Due:</span>
              <span className={`font-bold ${
                summary?.balance_due > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}>
                ₹{summary?.balance_due?.toFixed(2) || '0.00'}
              </span>
            </div>
            {summary?.credit_balance > 0 && (
              <div className="flex justify-between py-2 text-sm bg-emerald-50 px-3 rounded">
                <span className="text-emerald-700 font-semibold">Credit Balance:</span>
                <span className="text-emerald-700 font-bold">₹{summary.credit_balance.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-300 text-center">
        <p className="text-sm text-gray-600">
          Thank you for staying with us! We hope to see you again soon.
        </p>
        {folio?.checkout_status === 'checked_out' && (
          <div className="mt-4">
            <Badge variant="secondary" className="text-sm">
              This folio has been checked out and finalized
            </Badge>
          </div>
        )}
      </div>

      {/* Terms & Conditions (Invoice only) */}
      {isInvoice && (
        <div className="mt-6 text-xs text-gray-500">
          <p className="font-semibold">Terms & Conditions:</p>
          <p>Payment is due upon receipt. Late payments may incur additional charges.</p>
          <p>This is a computer-generated document and does not require a signature.</p>
        </div>
      )}
    </div>
  )
})

InvoiceReceipt.displayName = 'InvoiceReceipt'

export default InvoiceReceipt
