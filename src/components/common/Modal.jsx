// src/components/common/Modal.jsx
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(sizeClasses[size] || sizeClasses.medium, "max-h-[90vh] overflow-y-auto")}
        onEscapeKeyDown={onClose}
        onPointerDownOutside={(e) => e.preventDefault()} // Prevents closing on overlay click
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogClose 
            onClick={onClose} 
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>
        <div className="modal-body">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};