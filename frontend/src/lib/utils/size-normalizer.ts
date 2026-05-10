/**
 * Converts any tyre size format into a normalized numeric code.
 * Used as the primary key for supplier product matching.
 *
 * Examples:
 *   245/35R20   → "2453520"
 *   245/35ZR20  → "2453520"
 *   33x12.50R17 → "33125017"
 */
export function normalizeTyreSize(raw: string): string {
  const cleaned = raw.trim().toUpperCase()

  // Standard metric: 245/35R20 or 245/35ZR20
  const metricMatch = cleaned.match(/^(\d{2,3})\s*\/\s*(\d{2,3})\s*Z?R\s*(\d{2,3}(?:\.\d+)?)/)
  if (metricMatch) {
    const width = metricMatch[1]
    const profile = metricMatch[2]
    const rim = Math.round(parseFloat(metricMatch[3])).toString()
    return `${width}${profile}${rim}`
  }

  // Imperial/LT: 33x12.50R17
  const imperialMatch = cleaned.match(/^(\d{2,3})\s*[Xx]\s*(\d{2,3}(?:\.\d+)?)\s*R\s*(\d{2,3})/)
  if (imperialMatch) {
    const diameter = imperialMatch[1]
    const width = imperialMatch[2].replace('.', '')
    const rim = imperialMatch[3]
    return `${diameter}${width}${rim}`
  }

  // Fallback: strip all non-digits
  return cleaned.replace(/\D/g, '')
}
