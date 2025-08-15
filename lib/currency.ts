export interface Currency {
  code: string
  name: string
  symbol: string
  flag: string
}

export const CURRENCIES: Currency[] = [
  { code: "DOP", name: "Peso Dominicano", symbol: "RD$", flag: "🇩🇴" },
  { code: "USD", name: "Dólar Estadounidense", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "MXN", name: "Peso Mexicano", symbol: "$", flag: "🇲🇽" },
  { code: "BRL", name: "Real Brasileño", symbol: "R$", flag: "🇧🇷" },
  { code: "ARS", name: "Peso Argentino", symbol: "$", flag: "🇦🇷" },
  { code: "COP", name: "Peso Colombiano", symbol: "$", flag: "🇨🇴" },
  { code: "CLP", name: "Peso Chileno", symbol: "$", flag: "🇨🇱" },
  { code: "PEN", name: "Sol Peruano", symbol: "S/", flag: "🇵🇪" },
  { code: "UYU", name: "Peso Uruguayo", symbol: "$U", flag: "🇺🇾" },
  { code: "BOB", name: "Boliviano", symbol: "Bs", flag: "🇧🇴" },
  { code: "PYG", name: "Guaraní Paraguayo", symbol: "₲", flag: "🇵🇾" },
  { code: "VES", name: "Bolívar Venezolano", symbol: "Bs.S", flag: "🇻🇪" },
  { code: "CRC", name: "Colón Costarricense", symbol: "₡", flag: "🇨🇷" },
  { code: "GTQ", name: "Quetzal Guatemalteco", symbol: "Q", flag: "🇬🇹" },
  { code: "HNL", name: "Lempira Hondureña", symbol: "L", flag: "🇭🇳" },
  { code: "NIO", name: "Córdoba Nicaragüense", symbol: "C$", flag: "🇳🇮" },
  { code: "PAB", name: "Balboa Panameña", symbol: "B/.", flag: "🇵🇦" },
  { code: "CAD", name: "Dólar Canadiense", symbol: "C$", flag: "🇨🇦" },
  { code: "GBP", name: "Libra Esterlina", symbol: "£", flag: "🇬🇧" },
  { code: "JPY", name: "Yen Japonés", symbol: "¥", flag: "🇯🇵" },
]

export function formatCurrency(amount: number, currencyCode = "DOP", currencySymbol = "RD$"): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode)
  const symbol = currency?.symbol || currencySymbol

  // Formatear el número con separadores de miles
  const formattedAmount = new Intl.NumberFormat("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  return `${symbol}${formattedAmount}`
}
