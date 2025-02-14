export default function useConversionUtils() {
  const formatAmount = (amount: number, decimals: number = 6): string => {
    return (amount / Math.pow(10, decimals)).toFixed(decimals)
  }

  const parseAmount = (amount: string, decimals: number = 6): number => {
    return Math.floor(Number(amount) * Math.pow(10, decimals))
  }

  return {
    formatAmount,
    parseAmount
  }
} 