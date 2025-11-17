// src/components/reservations/DiscountSelector.jsx
import { useState, useEffect } from 'react';
import { Tag, X, Plus, Check } from 'lucide-react';
import { useDiscounts } from '../../context/DiscountContext';
import { useAlert } from '../../context/AlertContext';
import { formatDiscount, getDiscountBadgeColor } from '../../utils/discountCalculations';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { cn } from '@/lib/utils';

export function DiscountSelector({
  checkInDate,
  checkOutDate,
  roomTypeId,
  nights,
  selectedDiscounts = [],
  appliedPromoCode,
  onAddDiscount,
  onRemoveDiscount,
  onApplyPromoCode
}) {
  const { getApplicableDiscounts } = useDiscounts();
  const { success: showSuccess, error: showError } = useAlert();

  const [applicableDiscounts, setApplicableDiscounts] = useState([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [applyingPromoCode, setApplyingPromoCode] = useState(false);
  const [showAllDiscounts, setShowAllDiscounts] = useState(false);

  useEffect(() => {
    const loadApplicableDiscounts = async () => {
      if (checkInDate && checkOutDate && nights > 0) {
        const discounts = await getApplicableDiscounts(
          checkInDate,
          checkOutDate,
          roomTypeId,
          nights
        );
        setApplicableDiscounts(discounts || []);
      } else {
        setApplicableDiscounts([]);
      }
    };

    loadApplicableDiscounts();
  }, [checkInDate, checkOutDate, roomTypeId, nights, getApplicableDiscounts]);

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      showError('Please enter a promo code');
      return;
    }

    setApplyingPromoCode(true);
    const result = await onApplyPromoCode(promoCodeInput.trim());

    if (result.success) {
      showSuccess('Promo code applied successfully!');
      setPromoCodeInput('');
    } else {
      showError(result.error || 'Invalid promo code');
    }
    setApplyingPromoCode(false);
  };

  const isDiscountSelected = (discountId) => {
    return selectedDiscounts.some(d => d.id === discountId);
  };

  const handleToggleDiscount = (discount) => {
    if (isDiscountSelected(discount.id)) {
      onRemoveDiscount(discount.id);
    } else {
      onAddDiscount(discount);
    }
  };

  // Separate auto-applicable and promo code discounts
  const autoDiscounts = applicableDiscounts.filter(d => d.discount_type !== 'promo_code');
  const displayedDiscounts = showAllDiscounts ? autoDiscounts : autoDiscounts.slice(0, 3);

  if (!checkInDate || !checkOutDate) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Discounts & Offers
        </CardTitle>
        <CardDescription>
          Apply available discounts to your reservation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Promo Code Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Have a Promo Code?</label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter promo code"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleApplyPromoCode();
                }
              }}
              disabled={applyingPromoCode || !!appliedPromoCode}
            />
            <Button
              onClick={handleApplyPromoCode}
              disabled={applyingPromoCode || !!appliedPromoCode || !promoCodeInput.trim()}
              className="min-w-[100px]"
            >
              {applyingPromoCode ? 'Applying...' : 'Apply'}
            </Button>
          </div>
          {appliedPromoCode && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-2 text-sm">
              <Check className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">
                Promo code "{appliedPromoCode.promo_code}" applied
              </span>
              <Badge className="ml-auto bg-green-100 text-green-800">
                {formatDiscount(appliedPromoCode)}
              </Badge>
            </div>
          )}
        </div>

        {/* Available Discounts */}
        {autoDiscounts.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Available Offers</label>
            <div className="space-y-2">
              {displayedDiscounts.map((discount) => {
                const isSelected = isDiscountSelected(discount.id);
                return (
                  <div
                    key={discount.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 transition-colors",
                      isSelected ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{discount.name}</p>
                        <Badge className={getDiscountBadgeColor(discount.discount_type)}>
                          {formatDiscount(discount)}
                        </Badge>
                      </div>
                      {discount.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {discount.description}
                        </p>
                      )}
                      {discount.minimum_nights > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Minimum {discount.minimum_nights} night(s) required
                        </p>
                      )}
                    </div>
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleDiscount(discount)}
                      className="ml-4"
                    >
                      {isSelected ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Applied
                        </>
                      ) : (
                        <>
                          <Plus className="mr-1 h-3 w-3" />
                          Apply
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            {autoDiscounts.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllDiscounts(!showAllDiscounts)}
                className="w-full"
              >
                {showAllDiscounts ? 'Show Less' : `Show ${autoDiscounts.length - 3} More Offers`}
              </Button>
            )}
          </div>
        )}

        {/* Selected Discounts Summary */}
        {selectedDiscounts.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <label className="text-sm font-medium">Applied Discounts ({selectedDiscounts.length})</label>
            <div className="space-y-2">
              {selectedDiscounts.map((discount) => (
                <div
                  key={discount.id}
                  className="flex items-center justify-between rounded-md bg-primary/5 p-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getDiscountBadgeColor(discount.discount_type)}>
                      {formatDiscount(discount)}
                    </Badge>
                    <span className="text-sm font-medium">{discount.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onRemoveDiscount(discount.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {applicableDiscounts.length === 0 && !appliedPromoCode && (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No discounts available for this reservation. Try applying a promo code!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
