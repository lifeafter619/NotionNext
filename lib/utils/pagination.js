export function parsePositivePageNumber(value) {
  if (Array.isArray(value)) return null
  const normalized = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(normalized)) return null

  const page = Number(normalized)
  return Number.isSafeInteger(page) ? page : null
}

export function normalizePageSize(value, fallback = 12) {
  const pageSize = parsePositivePageNumber(value)
  return pageSize || fallback
}

export function getPaginationSlice({
  page: pageValue,
  totalItems,
  pageSize: pageSizeValue,
  minimumPage = 1
}) {
  const page = parsePositivePageNumber(pageValue)
  const pageSize = normalizePageSize(pageSizeValue)
  const itemCount = Math.max(Number(totalItems) || 0, 0)
  const totalPages = Math.ceil(itemCount / pageSize)
  const isValid = Boolean(
    page && page >= minimumPage && totalPages > 0 && page <= totalPages
  )

  return {
    end: isValid ? page * pageSize : 0,
    isValid,
    page,
    pageSize,
    start: isValid ? (page - 1) * pageSize : 0,
    totalPages
  }
}
