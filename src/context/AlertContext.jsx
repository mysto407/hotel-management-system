// src/context/AlertContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
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
import { AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AlertContext = createContext(null);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const useConfirm = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useConfirm must be used within an AlertProvider');
  }
  return context.confirm;
};

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'alert', // 'alert' or 'confirm'
    variant: 'info', // 'info', 'success', 'warning', 'danger'
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = useCallback(({
    title,
    message,
    variant = 'info',
    confirmText = 'OK',
    onConfirm
  }) => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        type: 'alert',
        variant,
        title,
        message,
        confirmText,
        cancelText: 'Cancel',
        onConfirm: () => {
          if (onConfirm) onConfirm();
          resolve(true);
          setAlertState(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          resolve(false);
          setAlertState(prev => ({ ...prev, isOpen: false }));
        }
      });
    });
  }, []);

  const confirm = useCallback(({
    title,
    message,
    variant = 'warning',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel
  }) => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        type: 'confirm',
        variant,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          if (onConfirm) onConfirm();
          resolve(true);
          setAlertState(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          if (onCancel) onCancel();
          resolve(false);
          setAlertState(prev => ({ ...prev, isOpen: false }));
        }
      });
    });
  }, []);

  const success = useCallback((message, title = 'Success') => {
    return showAlert({ title, message, variant: 'success' });
  }, [showAlert]);

  const error = useCallback((message, title = 'Error') => {
    return showAlert({ title, message, variant: 'danger' });
  }, [showAlert]);

  const warning = useCallback((message, title = 'Warning') => {
    return showAlert({ title, message, variant: 'warning' });
  }, [showAlert]);

  const info = useCallback((message, title = 'Information') => {
    return showAlert({ title, message, variant: 'info' });
  }, [showAlert]);

  const handleClose = (confirmed) => {
    if (confirmed && alertState.onConfirm) {
      alertState.onConfirm();
    } else if (!confirmed && alertState.onCancel) {
      alertState.onCancel();
    }
  };

  const getIcon = () => {
    const iconSize = 40;
    switch (alertState.variant) {
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
    success: 'default',
    warning: 'default',
    danger: 'destructive',
  };

  const value = {
    alert: showAlert,
    confirm,
    success,
    error,
    warning,
    info,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertDialog
        open={alertState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              {getIcon()}
            </div>
            <AlertDialogTitle className="text-center">
              {alertState.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center whitespace-pre-line">
              {alertState.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            {alertState.type === 'confirm' && (
              <AlertDialogCancel onClick={() => handleClose(false)}>
                {alertState.cancelText}
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={() => handleClose(true)}
              className={cn(buttonVariants({ variant: confirmVariant[alertState.variant] }))}
            >
              {alertState.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  );
};
