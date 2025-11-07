// src/components/common/ConfirmModal.jsx
import { AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  
  const getIcon = () => {
    const iconSize = 40;
    switch (variant) {
      case 'warning':
        return <AlertTriangle size={iconSize} className="text-yellow-500" />;
      case 'danger':
        return <XCircle size={iconSize} className="text-red-500" />;
      case 'success':
        return <CheckCircle size={iconSize} className="text-green-500" />;
      case 'info':
      default:
        return <Info size={iconSize} className="text-blue-500" />;
    }
  };

  const confirmVariant = {
    info: 'default',
    success: 'default', // You might want to add a 'success' variant to your button
    warning: 'default',
    danger: 'destructive',
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center whitespace-pre-line">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          {type === 'confirm' && (
            <AlertDialogCancel onClick={onClose}>{cancelText}</AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: confirmVariant[variant] }))}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};