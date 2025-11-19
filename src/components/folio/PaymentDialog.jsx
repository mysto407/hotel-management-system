// src/components/folio/PaymentDialog.jsx
import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Printer } from 'lucide-react';
import { useFolio } from '../../context/FolioContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const PaymentDialog = ({
  open,
  onOpenChange,
  folio,
  reservation,
  balance,
  onSuccess
}) => {
  const { postPayment } = useFolio();
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useAlert();

  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'cash',
    payment_status: 'completed',
    reference_number: '',
    notes: '',
    // Card details
    card_last_four: '',
    card_type: '',
    // UPI details
    upi_id: '',
    // Bank transfer details
    bank_name: '',
    account_number: '',
    // Cheque details
    cheque_number: '',
    cheque_date: '',
    // Online gateway details
    gateway_name: '',
    gateway_transaction_id: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastPayment, setLastPayment] = useState(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        amount: '',
        payment_method: 'cash',
        payment_status: 'completed',
        reference_number: '',
        notes: '',
        card_last_four: '',
        card_type: '',
        upi_id: '',
        bank_name: '',
        account_number: '',
        cheque_number: '',
        cheque_date: '',
        gateway_name: '',
        gateway_transaction_id: '',
      });
      setErrors({});
      setLastPayment(null);
    }
  }, [open]);

  // Calculate remaining balance after payment
  const remainingBalance = balance - (parseFloat(formData.amount) || 0);

  // Handle quick amount buttons (percentage of balance)
  const setQuickAmount = (percentage) => {
    const amount = (balance * percentage).toFixed(2);
    setFormData({ ...formData, amount });
    setErrors({ ...errors, amount: '' });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Amount validation
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount)) {
      newErrors.amount = 'Amount is required';
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (amount > balance) {
      newErrors.amount = `Amount cannot exceed balance of ₹${balance.toFixed(2)}`;
    }

    // Payment method specific validations
    if (formData.payment_method === 'card') {
      if (!formData.card_last_four) {
        newErrors.card_last_four = 'Last 4 digits required';
      } else if (!/^\d{4}$/.test(formData.card_last_four)) {
        newErrors.card_last_four = 'Must be 4 digits';
      }
      if (!formData.card_type) {
        newErrors.card_type = 'Card type required';
      }
    }

    if (formData.payment_method === 'upi' && !formData.upi_id) {
      newErrors.upi_id = 'UPI ID required';
    }

    if (formData.payment_method === 'bank_transfer') {
      if (!formData.bank_name) {
        newErrors.bank_name = 'Bank name required';
      }
      if (!formData.account_number) {
        newErrors.account_number = 'Account number required';
      }
    }

    if (formData.payment_method === 'cheque') {
      if (!formData.cheque_number) {
        newErrors.cheque_number = 'Cheque number required';
      }
      if (!formData.cheque_date) {
        newErrors.cheque_date = 'Cheque date required';
      }
      if (!formData.bank_name) {
        newErrors.bank_name = 'Bank name required';
      }
    }

    if (formData.payment_method === 'online') {
      if (!formData.gateway_name) {
        newErrors.gateway_name = 'Gateway name required';
      }
      if (!formData.gateway_transaction_id) {
        newErrors.gateway_transaction_id = 'Transaction ID required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const paymentData = {
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        reference_number: formData.reference_number,
        notes: formData.notes,
        description: `Payment via ${formData.payment_method}`,
      };

      // Add method-specific fields
      if (formData.payment_method === 'card') {
        paymentData.card_last_four = formData.card_last_four;
        paymentData.card_type = formData.card_type;
      } else if (formData.payment_method === 'upi') {
        paymentData.upi_id = formData.upi_id;
      } else if (formData.payment_method === 'bank_transfer') {
        paymentData.bank_name = formData.bank_name;
        paymentData.account_number = formData.account_number;
      } else if (formData.payment_method === 'cheque') {
        paymentData.cheque_number = formData.cheque_number;
        paymentData.cheque_date = formData.cheque_date;
        paymentData.bank_name = formData.bank_name;
      } else if (formData.payment_method === 'online') {
        paymentData.gateway_name = formData.gateway_name;
        paymentData.gateway_transaction_id = formData.gateway_transaction_id;
      }

      const result = await postPayment(folio.id, reservation.id, paymentData);

      if (result) {
        setLastPayment(result);
        await showSuccess(
          `Payment of ₹${formData.amount} posted successfully!\nReceipt #: ${result.id}\n\nWould you like to print the receipt?`,
          'Payment Posted'
        );

        if (onSuccess) {
          onSuccess(result);
        }

        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error posting payment:', error);
      showError('Failed to post payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get payment method display name
  const getPaymentMethodName = (method) => {
    const methodNames = {
      cash: 'Cash',
      card: 'Card',
      upi: 'UPI',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      online: 'Online Gateway',
      other: 'Other'
    };
    return methodNames[method] || method;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Post Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Balance Due Display */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Current Balance Due
              </span>
              <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                ₹{balance.toFixed(2)}
              </span>
            </div>
            {formData.amount && !errors.amount && (
              <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Remaining Balance
                </span>
                <span className={`text-xl font-bold ${remainingBalance === 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-900 dark:text-blue-100'}`}>
                  ₹{remainingBalance.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={balance}
              value={formData.amount}
              onChange={(e) => {
                setFormData({ ...formData, amount: e.target.value });
                setErrors({ ...errors, amount: '' });
              }}
              placeholder="0.00"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(0.25)}
              >
                25%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(0.50)}
              >
                50%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(0.75)}
              >
                75%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(1.0)}
              >
                100% (Full)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online Gateway</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <Label htmlFor="payment_status">Payment Status *</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="authorized">Authorized</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional Fields Based on Payment Method */}

          {/* Card Details */}
          {formData.payment_method === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="card_last_four">Card Last 4 Digits *</Label>
                <Input
                  id="card_last_four"
                  type="text"
                  maxLength="4"
                  value={formData.card_last_four}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, card_last_four: value });
                    setErrors({ ...errors, card_last_four: '' });
                  }}
                  placeholder="1234"
                  className={errors.card_last_four ? 'border-red-500' : ''}
                />
                {errors.card_last_four && (
                  <p className="text-sm text-red-500">{errors.card_last_four}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="card_type">Card Type *</Label>
                <Select
                  value={formData.card_type}
                  onValueChange={(value) => {
                    setFormData({ ...formData, card_type: value });
                    setErrors({ ...errors, card_type: '' });
                  }}
                >
                  <SelectTrigger className={errors.card_type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select card type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                    <SelectItem value="amex">American Express</SelectItem>
                    <SelectItem value="rupay">RuPay</SelectItem>
                    <SelectItem value="diners">Diners Club</SelectItem>
                    <SelectItem value="discover">Discover</SelectItem>
                  </SelectContent>
                </Select>
                {errors.card_type && (
                  <p className="text-sm text-red-500">{errors.card_type}</p>
                )}
              </div>
            </div>
          )}

          {/* UPI Details */}
          {formData.payment_method === 'upi' && (
            <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Label htmlFor="upi_id">UPI ID *</Label>
              <Input
                id="upi_id"
                type="text"
                value={formData.upi_id}
                onChange={(e) => {
                  setFormData({ ...formData, upi_id: e.target.value });
                  setErrors({ ...errors, upi_id: '' });
                }}
                placeholder="user@bank"
                className={errors.upi_id ? 'border-red-500' : ''}
              />
              {errors.upi_id && (
                <p className="text-sm text-red-500">{errors.upi_id}</p>
              )}
            </div>
          )}

          {/* Bank Transfer Details */}
          {formData.payment_method === 'bank_transfer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name *</Label>
                <Input
                  id="bank_name"
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => {
                    setFormData({ ...formData, bank_name: e.target.value });
                    setErrors({ ...errors, bank_name: '' });
                  }}
                  placeholder="Bank name"
                  className={errors.bank_name ? 'border-red-500' : ''}
                />
                {errors.bank_name && (
                  <p className="text-sm text-red-500">{errors.bank_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => {
                    setFormData({ ...formData, account_number: e.target.value });
                    setErrors({ ...errors, account_number: '' });
                  }}
                  placeholder="Account number"
                  className={errors.account_number ? 'border-red-500' : ''}
                />
                {errors.account_number && (
                  <p className="text-sm text-red-500">{errors.account_number}</p>
                )}
              </div>
            </div>
          )}

          {/* Cheque Details */}
          {formData.payment_method === 'cheque' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="cheque_number">Cheque Number *</Label>
                <Input
                  id="cheque_number"
                  type="text"
                  value={formData.cheque_number}
                  onChange={(e) => {
                    setFormData({ ...formData, cheque_number: e.target.value });
                    setErrors({ ...errors, cheque_number: '' });
                  }}
                  placeholder="Cheque number"
                  className={errors.cheque_number ? 'border-red-500' : ''}
                />
                {errors.cheque_number && (
                  <p className="text-sm text-red-500">{errors.cheque_number}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cheque_date">Cheque Date *</Label>
                <Input
                  id="cheque_date"
                  type="date"
                  value={formData.cheque_date}
                  onChange={(e) => {
                    setFormData({ ...formData, cheque_date: e.target.value });
                    setErrors({ ...errors, cheque_date: '' });
                  }}
                  className={errors.cheque_date ? 'border-red-500' : ''}
                />
                {errors.cheque_date && (
                  <p className="text-sm text-red-500">{errors.cheque_date}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name_cheque">Bank Name *</Label>
                <Input
                  id="bank_name_cheque"
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => {
                    setFormData({ ...formData, bank_name: e.target.value });
                    setErrors({ ...errors, bank_name: '' });
                  }}
                  placeholder="Bank name"
                  className={errors.bank_name ? 'border-red-500' : ''}
                />
                {errors.bank_name && (
                  <p className="text-sm text-red-500">{errors.bank_name}</p>
                )}
              </div>
            </div>
          )}

          {/* Online Gateway Details */}
          {formData.payment_method === 'online' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="gateway_name">Gateway Name *</Label>
                <Input
                  id="gateway_name"
                  type="text"
                  value={formData.gateway_name}
                  onChange={(e) => {
                    setFormData({ ...formData, gateway_name: e.target.value });
                    setErrors({ ...errors, gateway_name: '' });
                  }}
                  placeholder="e.g., Razorpay, Stripe"
                  className={errors.gateway_name ? 'border-red-500' : ''}
                />
                {errors.gateway_name && (
                  <p className="text-sm text-red-500">{errors.gateway_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gateway_transaction_id">Transaction ID *</Label>
                <Input
                  id="gateway_transaction_id"
                  type="text"
                  value={formData.gateway_transaction_id}
                  onChange={(e) => {
                    setFormData({ ...formData, gateway_transaction_id: e.target.value });
                    setErrors({ ...errors, gateway_transaction_id: '' });
                  }}
                  placeholder="Gateway transaction ID"
                  className={errors.gateway_transaction_id ? 'border-red-500' : ''}
                />
                {errors.gateway_transaction_id && (
                  <p className="text-sm text-red-500">{errors.gateway_transaction_id}</p>
                )}
              </div>
            </div>
          )}

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="Optional reference number"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about this payment..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.amount}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Processing...' : 'Post Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
