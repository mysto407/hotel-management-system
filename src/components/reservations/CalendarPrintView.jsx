// src/components/reservations/CalendarPrintView.jsx
import { forwardRef } from 'react';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';

// Status colors for print (lighter versions for better printing)
const STATUS_COLORS_PRINT = {
  'Confirmed': '#22c55e',
  'Checked-in': '#3b82f6',
  'Hold': '#f97316',
  'Tentative': '#eab308',
  'Cancelled': '#ef4444',
  'Checked-out': '#9ca3af',
};

const CalendarPrintView = forwardRef(({
  startDate,
  viewDays,
  rooms,
  roomTypes,
  reservations,
  blockings,
  guests
}, ref) => {
  // Generate date range
  const dateRange = Array.from({ length: viewDays }, (_, i) => addDays(startDate, i));

  // Group rooms by type
  const roomsByType = roomTypes.map(type => ({
    type,
    rooms: rooms.filter(r => r.room_type_id === type.id)
      .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }))
  })).filter(group => group.rooms.length > 0);

  // Get reservations for a room
  const getReservationsForRoom = (roomId) => {
    const rangeStart = startDate;
    const rangeEnd = addDays(startDate, viewDays);

    return reservations.filter(res => {
      if (res.room_id !== roomId) return false;
      if (res.status === 'Cancelled') return false;

      const checkIn = parseISO(res.check_in_date);
      const checkOut = parseISO(res.check_out_date);

      return checkIn < rangeEnd && checkOut > rangeStart;
    });
  };

  // Get blockings for a room
  const getBlockingsForRoom = (roomId) => {
    if (!blockings) return [];
    const rangeStart = startDate;
    const rangeEnd = addDays(startDate, viewDays);

    return blockings.filter(blocking => {
      if (blocking.room_id !== roomId) return false;

      const blockStart = parseISO(blocking.start_date);
      const blockEnd = parseISO(blocking.end_date);

      return blockStart < rangeEnd && blockEnd > rangeStart;
    });
  };

  // Calculate position for a reservation/blocking bar
  const calculateBarPosition = (itemStartDate, itemEndDate, isReservation = true) => {
    const itemStart = typeof itemStartDate === 'string' ? parseISO(itemStartDate) : itemStartDate;
    const itemEnd = typeof itemEndDate === 'string' ? parseISO(itemEndDate) : itemEndDate;
    const rangeStart = startDate;
    const rangeEnd = addDays(startDate, viewDays);

    const visibleStart = itemStart < rangeStart ? rangeStart : itemStart;
    const visibleEnd = itemEnd > rangeEnd ? rangeEnd : itemEnd;

    const startOffset = differenceInDays(visibleStart, rangeStart);
    const daySpan = differenceInDays(visibleEnd, visibleStart);

    if (daySpan <= 0) return null;

    const cellWidth = 100 / viewDays; // percentage per day

    // For reservations, use partial positioning (mid-day)
    // For blockings, use full cell coverage
    if (isReservation) {
      const extendsLeft = itemStart < rangeStart;
      const extendsRight = itemEnd > rangeEnd;

      let left = extendsLeft ? 0 : (startOffset + 0.5) * cellWidth;
      let width = extendsRight
        ? (viewDays * cellWidth) - left
        : ((startOffset + daySpan + 0.5) * cellWidth) - left;

      return { left: `${left}%`, width: `${width}%` };
    } else {
      return {
        left: `${startOffset * cellWidth}%`,
        width: `${daySpan * cellWidth}%`
      };
    }
  };

  return (
    <div ref={ref} className="print-calendar bg-white p-4 text-black" style={{ fontSize: '10px' }}>
      {/* Header */}
      <div className="mb-4 border-b pb-2">
        <h1 className="text-xl font-bold text-center">Reservation Calendar</h1>
        <p className="text-center text-gray-600">
          {format(startDate, 'MMMM d, yyyy')} - {format(addDays(startDate, viewDays - 1), 'MMMM d, yyyy')}
        </p>
        <p className="text-center text-gray-500 text-xs">
          Printed on {format(new Date(), 'MMMM d, yyyy h:mm a')}
        </p>
      </div>

      {/* Calendar Grid */}
      <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th className="border p-1 text-left bg-gray-100" style={{ width: '80px' }}>Room</th>
            {dateRange.map((date, idx) => (
              <th
                key={idx}
                className="border p-1 text-center bg-gray-100"
                style={{ minWidth: '40px' }}
              >
                <div className="font-normal text-gray-500">{format(date, 'EEE')}</div>
                <div className="font-semibold">{format(date, 'd')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roomsByType.map(group => (
            <>
              {/* Room Type Header */}
              <tr key={`type-${group.type.id}`} className="bg-gray-200">
                <td colSpan={viewDays + 1} className="border p-1 font-semibold">
                  {group.type.name} ({group.rooms.length} rooms)
                </td>
              </tr>

              {/* Room Rows */}
              {group.rooms.map(room => {
                const roomReservations = getReservationsForRoom(room.id);
                const roomBlockings = getBlockingsForRoom(room.id);

                return (
                  <tr key={room.id} style={{ height: '30px' }}>
                    <td className="border p-1 font-medium bg-gray-50">
                      {room.room_number}
                    </td>
                    <td colSpan={viewDays} className="border p-0 relative">
                      <div className="relative" style={{ height: '24px' }}>
                        {/* Blocking bars */}
                        {roomBlockings.map(blocking => {
                          const pos = calculateBarPosition(blocking.start_date, blocking.end_date, false);
                          if (!pos) return null;
                          return (
                            <div
                              key={blocking.id}
                              className="absolute top-0 h-full flex items-center justify-center text-white"
                              style={{
                                ...pos,
                                backgroundColor: '#6b7280',
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.2) 3px, rgba(255,255,255,0.2) 6px)',
                                fontSize: '8px',
                              }}
                            >
                              <span className="truncate px-1">{blocking.reason || 'Blocked'}</span>
                            </div>
                          );
                        })}

                        {/* Reservation bars */}
                        {roomReservations.map(res => {
                          const pos = calculateBarPosition(res.check_in_date, res.check_out_date, true);
                          if (!pos) return null;
                          const guest = guests.find(g => g.id === res.guest_id);
                          return (
                            <div
                              key={res.id}
                              className="absolute top-0 h-full flex items-center text-white"
                              style={{
                                ...pos,
                                backgroundColor: STATUS_COLORS_PRINT[res.status] || '#6b7280',
                                fontSize: '8px',
                              }}
                            >
                              <span className="truncate px-1">{guest?.name || 'Guest'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-4 pt-2 border-t">
        <div className="flex flex-wrap gap-3 justify-center">
          {Object.entries(STATUS_COLORS_PRINT).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div
                className="w-4 h-3"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs">{status}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-3"
              style={{
                backgroundColor: '#6b7280',
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
              }}
            />
            <span className="text-xs">Blocked/Maintenance</span>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print-calendar {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page {
            size: landscape;
            margin: 0.5cm;
          }
        }
      `}</style>
    </div>
  );
});

CalendarPrintView.displayName = 'CalendarPrintView';

export default CalendarPrintView;
