// src/components/common/PaymentStatusBadge.jsx
import React from 'react';

/* NOTE: This component assumes the status styles 
  (e.g., .status-available, .status-maintenance, .status-blocked)
  are defined in your global data-table.css file.
*/

export const PaymentStatusBadge = ({ status }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'Paid':
        return 'status-available';
      case 'Partial':
        return 'status-maintenance';
      case 'Pending':
      default:
        return 'status-blocked';
    }
  };

  return (
    <span className={`status-badge ${getStatusClass()}`}>
      {status}
    </span>
  );
};