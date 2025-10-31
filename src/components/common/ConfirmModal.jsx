import { X, Info } from 'lucide-react';
import styles from './ConfirmModal.module.css';
import { Modal } from './Modal'; // We reuse your existing base Modal

/**
 * A generic confirmation modal.
 *
 * @param {boolean} isOpen - Controls if the modal is visible.
 * @param {function} onClose - Function to call when closing (e.g., 'X' or background click).
 * @param {string} title - The modal's title.
 * @param {string} message - The main text/question of the modal.
 * @param {node} [icon] - Optional icon to display. Defaults to an 'Info' icon.
 * @param {array} [actions] - Array of action buttons, e.g.:
 * [
 * { label: 'Cancel', onClick: handleCancel, variant: 'secondary' },
 * { label: 'Confirm', onClick: handleConfirm, variant: 'primary' }
 * ]
 */
export const ConfirmModal = ({ isOpen, onClose, title, message, icon, actions = [] }) => {
  if (!isOpen) {
    return null;
  }

  // Default icon if one isn't provided
  const displayIcon = icon || <Info size={24} className={styles.defaultIcon} />;

  return (
    <Modal isOpen={isOpen} onClose={onClose} modalClassName={styles.confirmModal}>
      <div className={styles.modalHeader}>
        <h2 className={styles.modalTitle}>{title}</h2>
        <button onClick={onClose} className={styles.closeButton}>
          <X size={20} />
        </button>
      </div>
      
      <div className={styles.modalBody}>
        <div className={styles.iconWrapper}>
          {displayIcon}
        </div>
        <div className={styles.messageWrapper}>
          <p>{message}</p>
        </div>
      </div>
      
      <div className={styles.modalFooter}>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            // Use variant for styling, default to 'secondary'
            className={`${styles.actionButton} ${styles[action.variant] || styles.secondary}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </Modal>
  );
};