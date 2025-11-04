// src/components/common/ConfirmModal.jsx
import { AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';
import { Modal } from './Modal';
import styles from './ConfirmModal.module.css';

/**
 * ConfirmModal - A reusable confirmation dialog component
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Called when modal is closed
 * @param {function} onConfirm - Called when user confirms (for confirm type)
 * @param {string} type - 'alert' | 'confirm' - Dialog type
 * @param {string} variant - 'info' | 'warning' | 'danger' | 'success' - Visual style
 * @param {string} title - Modal title
 * @param {string|React.Node} message - Main message content
 * @param {string} confirmText - Text for confirm button (default: 'Confirm')
 * @param {string} cancelText - Text for cancel button (default: 'Cancel')
 */
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  type = 'confirm',
  variant = 'info',
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const getIcon = () => {
    switch (variant) {
      case 'warning':
        return <AlertTriangle size={48} className={styles.iconWarning} />;
      case 'danger':
        return <XCircle size={48} className={styles.iconDanger} />;
      case 'success':
        return <CheckCircle size={48} className={styles.iconSuccess} />;
      case 'info':
      default:
        return <Info size={48} className={styles.iconInfo} />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className={styles.confirmModal}>
        <div className={styles.iconContainer}>
          {getIcon()}
        </div>
        
        {title && (
          <h3 className={`${styles.title} ${styles[`title${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`}>
            {title}
          </h3>
        )}
        
        <div className={styles.message}>
          {typeof message === 'string' ? (
            <p className={styles.messageText}>{message}</p>
          ) : (
            message
          )}
        </div>
        
        <div className={styles.buttonGroup}>
          {type === 'confirm' && (
            <button
              onClick={handleCancel}
              className={`${styles.button} ${styles.buttonCancel}`}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`${styles.button} ${styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};