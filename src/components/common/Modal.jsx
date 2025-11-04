import { X } from 'lucide-react';
import styles from './Modal.module.css';

export const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};