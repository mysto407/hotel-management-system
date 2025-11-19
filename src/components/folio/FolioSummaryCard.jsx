import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { TrendingUp, DollarSign, CreditCard, Receipt, PieChart } from 'lucide-react'

export default function FolioSummaryCard({ folio, totals, revenueBreakdown }) {
  if (!folio || !totals) {
    return null
  }

  const revenueCategories = Object.entries(revenueBreakdown || {}).map(([category, amount]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    amount
  }))

  const getStatusColor = (balance) => {
    if (balance <= 0) return 'success'
    if (balance > 0 && totals.total_payments > 0) return 'warning'
    return 'destructive'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Charges */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Charges</p>
              <p className="text-2xl font-bold">
                ₹{(totals.total_charges + totals.total_fees).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                + ₹{totals.total_taxes.toFixed(2)} tax
              </p>
            </div>
            <div className="rounded-full bg-blue-100 dark:bg-blue-950 p-2">
              <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Payments */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ₹{totals.total_payments.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                - ₹{totals.total_discounts.toFixed(2)} discounts
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-950 p-2">
              <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Due */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Balance Due</p>
              <p className={`text-2xl font-bold ${
                totals.balance > 0
                  ? 'text-red-600 dark:text-red-400'
                  : totals.balance < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
              }`}>
                ₹{Math.abs(totals.balance).toFixed(2)}
              </p>
              <Badge variant={getStatusColor(totals.balance)} className="text-xs">
                {totals.balance > 0 ? 'Outstanding' : totals.balance < 0 ? 'Credit' : 'Settled'}
              </Badge>
            </div>
            <div className="rounded-full bg-amber-100 dark:bg-amber-950 p-2">
              <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <p className="text-sm font-medium">Revenue Breakdown</p>
            </div>
            <div className="space-y-2">
              {revenueCategories.slice(0, 3).map(({ category, amount }) => (
                <div key={category} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{category}:</span>
                  <span className="font-medium">₹{amount.toFixed(2)}</span>
                </div>
              ))}
              {revenueCategories.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{revenueCategories.length - 3} more categories
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Summary */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-base">Folio Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Folio Number</p>
              <p className="font-medium">{folio.folio_number}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={folio.status === 'open' ? 'default' : folio.status === 'settled' ? 'success' : 'secondary'}>
                {folio.status}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Room Charges</p>
              <p className="font-medium">₹{totals.total_charges.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Fees</p>
              <p className="font-medium">₹{totals.total_fees.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Taxes</p>
              <p className="font-medium">₹{totals.total_taxes.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Refunds</p>
              <p className="font-medium text-red-600 dark:text-red-400">
                -₹{totals.total_refunds?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Grand Total</p>
                <p className="text-lg font-bold">
                  ₹{(totals.total_charges + totals.total_fees + totals.total_taxes).toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Total Paid</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{totals.total_payments.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Balance</p>
                <p className={`text-lg font-bold ${
                  totals.balance > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  ₹{totals.balance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
