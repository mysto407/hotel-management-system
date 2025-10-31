// src/components/common/ReservationStatusBadge.jsx
import React from 'react';
// We will use the styles from Reservations.module.css
import styles from '../../pages/reservations/Reservations.module.css';

/* NOTE: This component assumes the status styles 
  (e.g., .statusInquiry, .statusTentative, .statusHold)
  are defined in Reservations.module.css and are globally available
  or that you move them to a global CSS file.
  
  For a cleaner approach, you could move the 9 status styles
  from Reservations.module.css into a new
  src/components/common/ReservationStatusBadge.module.css file.
*/

export const ReservationStatusBadge = ({ status }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'Inquiry':
        return styles.statusInquiry;
      case 'Tentative':
        return styles.statusTentative;
      case 'Hold':
        return styles.statusHold;
      case 'Confirmed':
        return 'status-maintenance'; // from data-table.css
      case 'Checked-in':
        return 'status-occupied'; // from data-table.css
      case 'Checked-out':
        return 'status-available'; // from data-table.css
      case 'Cancelled':
        return 'status-blocked'; // from data-table.css
      default:
        return 'status-blocked'; // from data-table.css
    }
  };

  return (
    <span className={`status-badge ${getStatusClass()}`}>
      {status}
    </span>
  );
};