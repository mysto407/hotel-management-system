// Currency utilities for multi-currency support

// Common currency codes (ISO 4217)
export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimals: 2 },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', decimals: 2 },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2 },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2 },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 0 },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2 },
}

// Get list of all currency codes
export const getCurrencyCodes = () => Object.keys(CURRENCIES)

// Get currency info by code
export const getCurrencyInfo = (code) => CURRENCIES[code] || CURRENCIES.INR

// Format amount with currency symbol
export const formatCurrency = (amount, currencyCode = 'INR', options = {}) => {
  const currency = getCurrencyInfo(currencyCode)
  const decimals = options.decimals !== undefined ? options.decimals : currency.decimals

  const formattedAmount = parseFloat(amount).toFixed(decimals)

  if (options.showCode) {
    return `${currency.symbol}${formattedAmount} ${currency.code}`
  }

  return `${currency.symbol}${formattedAmount}`
}

// Format amount for display in two currencies
export const formatDualCurrency = (
  transactionAmount,
  transactionCurrency,
  baseAmount,
  baseCurrency,
  options = {}
) => {
  if (transactionCurrency === baseCurrency) {
    return formatCurrency(transactionAmount, transactionCurrency, options)
  }

  const transactionFormatted = formatCurrency(transactionAmount, transactionCurrency, { showCode: true })
  const baseFormatted = formatCurrency(baseAmount, baseCurrency, { showCode: false })

  return `${transactionFormatted} (${baseFormatted})`
}

// Convert amount from one currency to another
export const convertCurrency = (amount, fromCurrency, toCurrency, exchangeRate) => {
  if (fromCurrency === toCurrency) {
    return parseFloat(amount)
  }

  return parseFloat(amount) * parseFloat(exchangeRate)
}

// Calculate exchange rate from two amounts
export const calculateExchangeRate = (fromAmount, toAmount) => {
  if (!fromAmount || fromAmount === 0) return 1
  return parseFloat(toAmount) / parseFloat(fromAmount)
}

// Validate currency code
export const isValidCurrency = (code) => {
  return code && CURRENCIES.hasOwnProperty(code)
}

// Get currency symbol
export const getCurrencySymbol = (code) => {
  const currency = getCurrencyInfo(code)
  return currency.symbol
}

// Parse currency string to number
export const parseCurrencyAmount = (value) => {
  if (typeof value === 'number') return value
  if (!value) return 0

  // Remove currency symbols and spaces
  const cleaned = String(value).replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

// Round to currency decimal places
export const roundToCurrency = (amount, currencyCode) => {
  const currency = getCurrencyInfo(currencyCode)
  const multiplier = Math.pow(10, currency.decimals)
  return Math.round(amount * multiplier) / multiplier
}

// Common exchange rate sources
export const EXCHANGE_RATE_SOURCES = {
  MANUAL: 'manual',
  API: 'api',
  SYSTEM: 'system',
}

// Default base currency (can be configured in settings)
export const DEFAULT_BASE_CURRENCY = 'INR'

// Get approximate exchange rates (for display/estimation only)
// In production, these should be fetched from an API
export const getApproximateExchangeRate = (fromCurrency, toCurrency) => {
  // Sample rates (INR as base)
  const rates = {
    INR: 1,
    USD: 83.12,
    EUR: 90.15,
    GBP: 105.23,
    AED: 22.62,
    SAR: 22.16,
    JPY: 0.56,
    CNY: 11.54,
    AUD: 54.32,
    CAD: 61.45,
    SGD: 61.78,
    CHF: 95.42,
  }

  if (fromCurrency === toCurrency) return 1

  // Convert from -> INR -> to
  const fromRate = rates[fromCurrency] || 1
  const toRate = rates[toCurrency] || 1

  return toRate / fromRate
}

// Format exchange rate for display
export const formatExchangeRate = (rate, precision = 4) => {
  return parseFloat(rate).toFixed(precision)
}

// Get currency name with symbol
export const getCurrencyDisplay = (code) => {
  const currency = getCurrencyInfo(code)
  return `${currency.symbol} ${currency.code} - ${currency.name}`
}

// Validate exchange rate
export const isValidExchangeRate = (rate) => {
  const numRate = parseFloat(rate)
  return !isNaN(numRate) && numRate > 0
}

// Calculate base currency amount from transaction
export const calculateBaseCurrencyAmount = (amount, exchangeRate) => {
  return parseFloat(amount) * parseFloat(exchangeRate)
}

// Get all currencies as array for dropdown
export const getCurrenciesArray = () => {
  return Object.values(CURRENCIES).map(currency => ({
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    display: getCurrencyDisplay(currency.code)
  }))
}
