// src/components/reservations/ReservationListPrintView.jsx
import { forwardRef } from 'react';
import { format, parseISO, differenceInDays, isWithinInterval, addDays } from 'date-fns';

const ReservationListPrintView = forwardRef(({
  startDate,
  viewDays,
  rooms,
  roomTypes,
  reservations,
  guests,
  statusFilter = 'all',
  listType = 'all' // 'all', 'arrivals', 'departures', 'in-house'
}, ref) => {
  const rangeStart = startDate;
  const rangeEnd = addDays(startDate, viewDays);

  // Filter reservations based on view settings
  const filteredReservations = reservations.filter(res => {
    if (res.status === 'Cancelled') return false;

    const checkIn = parseISO(res.check_in_date);
    const checkOut = parseISO(res.check_out_date);

    // Must overlap with date range
    if (checkIn >= rangeEnd || checkOut <= rangeStart) return false;

    // Status filter
    if (statusFilter !== 'all' && res.status !== statusFilter) return false;

    // List type filter
    switch (listType) {
      case 'arrivals':
        // Check-in date within range
        return isWithinInterval(checkIn, { start: rangeStart, end: addDays(rangeEnd, -1) });
      case 'departures':
        // Check-out date within range
        return isWithinInterval(checkOut, { start: rangeStart, end: rangeEnd });
      case 'in-house':
        // Currently checked-in
        return res.status === 'Checked-in';
      default:
        return true;
    }
  });

  // Sort by check-in date, then by room number
  const sortedReservations = [...filteredReservations].sort((a, b) => {
    const dateCompare = a.check_in_date.localeCompare(b.check_in_date);
    if (dateCompare !== 0) return dateCompare;
    const roomA = rooms.find(r => r.id === a.room_id);
    const roomB = rooms.find(r => r.id === b.room_id);
    return (roomA?.room_number || '').localeCompare(roomB?.room_number || '', undefined, { numeric: true });
  });

  // Group by date for arrivals/departures view
  const groupedByDate = {};
  sortedReservations.forEach(res => {
    const dateKey = listType === 'departures' ? res.check_out_date : res.check_in_date;
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(res);
  });

  // Get helper info
  const getRoom = (roomId) => rooms.find(r => r.id === roomId);
  const getRoomType = (room) => roomTypes.find(rt => rt.id === room?.room_type_id);
  const getGuest = (guestId) => guests.find(g => g.id === guestId);

  // Get title based on list type
  const getTitle = () => {
    switch (listType) {
      case 'arrivals':
        return 'Arrivals Report';
      case 'departures':
        return 'Departures Report';
      case 'in-house':
        return 'In-House Guests';
      default:
        return 'Reservation List';
    }
  };

  return (
    <div ref={ref} className="print-list bg-white p-4 text-black" style={{ fontSize: '11px' }}>
      {/* Header */}
      <div className="mb-4 border-b pb-2">
        <h1 className="text-xl font-bold text-center">{getTitle()}</h1>
        <p className="text-center text-gray-600">
          {format(rangeStart, 'MMMM d, yyyy')} - {format(addDays(rangeEnd, -1), 'MMMM d, yyyy')}
        </p>
        <p className="text-center text-gray-500 text-xs">
          Printed on {format(new Date(), 'MMMM d, yyyy h:mm a')} • Total: {sortedReservations.length} reservation(s)
        </p>
      </div>

      {sortedReservations.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No reservations found for this period.</p>
      ) : listType === 'arrivals' || listType === 'departures' ? (
        // Grouped by date view
        <div className="space-y-4">
          {Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, reservationList]) => (
            <div key={date}>
              <h2 className="font-semibold bg-gray-100 p-2 border">
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')} ({reservationList.length} {listType === 'arrivals' ? 'arrival' : 'departure'}{reservationList.length !== 1 ? 's' : ''})
              </h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-left">Room</th>
                    <th className="border p-2 text-left">Room Type</th>
                    <th className="border p-2 text-left">Guest Name</th>
                    <th className="border p-2 text-center">Adults</th>
                    <th className="border p-2 text-center">Children</th>
                    <th className="border p-2 text-center">Nights</th>
                    <th className="border p-2 text-left">Status</th>
                    <th className="border p-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {reservationList.map(res => {
                    const room = getRoom(res.room_id);
                    const roomType = getRoomType(room);
                    const guest = getGuest(res.guest_id);
                    const nights = differenceInDays(parseISO(res.check_out_date), parseISO(res.check_in_date));

                    return (
                      <tr key={res.id}>
                        <td className="border p-2 font-medium">{room?.room_number || 'N/A'}</td>
                        <td className="border p-2">{roomType?.name || 'N/A'}</td>
                        <td className="border p-2">{guest?.name || 'N/A'}</td>
                        <td className="border p-2 text-center">{res.number_of_adults || 1}</td>
                        <td className="border p-2 text-center">{res.number_of_children || 0}</td>
                        <td className="border p-2 text-center">{nights}</td>
                        <td className="border p-2">
                          <span className={`px-2 py-0.5 rounded text-white text-xs ${
                            res.status === 'Confirmed' ? 'bg-green-500' :
                            res.status === 'Checked-in' ? 'bg-blue-500' :
                            res.status === 'Hold' ? 'bg-orange-500' :
                            res.status === 'Tentative' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`}>
                            {res.status}
                          </span>
                        </td>
                        <td className="border p-2 text-xs text-gray-600">{res.special_requests || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        // Standard table view
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Check-in</th>
              <th className="border p-2 text-left">Check-out</th>
              <th className="border p-2 text-left">Room</th>
              <th className="border p-2 text-left">Room Type</th>
              <th className="border p-2 text-left">Guest Name</th>
              <th className="border p-2 text-center">Guests</th>
              <th className="border p-2 text-center">Nights</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sortedReservations.map(res => {
              const room = getRoom(res.room_id);
              const roomType = getRoomType(room);
              const guest = getGuest(res.guest_id);
              const nights = differenceInDays(parseISO(res.check_out_date), parseISO(res.check_in_date));
              const totalGuests = (res.number_of_adults || 1) + (res.number_of_children || 0);

              return (
                <tr key={res.id}>
                  <td className="border p-2">{format(parseISO(res.check_in_date), 'MMM d')}</td>
                  <td className="border p-2">{format(parseISO(res.check_out_date), 'MMM d')}</td>
                  <td className="border p-2 font-medium">{room?.room_number || 'N/A'}</td>
                  <td className="border p-2">{roomType?.name || 'N/A'}</td>
                  <td className="border p-2">{guest?.name || 'N/A'}</td>
                  <td className="border p-2 text-center">{totalGuests}</td>
                  <td className="border p-2 text-center">{nights}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-0.5 rounded text-white text-xs ${
                      res.status === 'Confirmed' ? 'bg-green-500' :
                      res.status === 'Checked-in' ? 'bg-blue-500' :
                      res.status === 'Hold' ? 'bg-orange-500' :
                      res.status === 'Tentative' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}>
                      {res.status}
                    </span>
                  </td>
                  <td className="border p-2 text-xs text-gray-600 max-w-32 truncate">{res.special_requests || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div className="mt-4 pt-2 border-t text-xs text-gray-500 flex justify-between">
        <span>Generated from Reservation Calendar</span>
        <span>Page 1</span>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print-list {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page {
            size: portrait;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
});

ReservationListPrintView.displayName = 'ReservationListPrintView';

export default ReservationListPrintView;
