/**
 * Structured query key factory for all admin data.
 * Keys follow the hierarchy: [domain, entity, operation, params]
 * This lets us invalidate at any level (e.g. all orders, or just a specific list page).
 */
export const adminKeys = {
  // Orders
  orderStats:    ()                           => ['admin', 'orders', 'stats']                as const,
  orderList:     (p: Record<string, string>)  => ['admin', 'orders', 'list', p]             as const,
  orderDetail:   (id: string)                 => ['admin', 'orders', 'detail', id]          as const,

  // Customers
  customerStats: ()                           => ['admin', 'customers', 'stats']            as const,
  customerList:  (p: Record<string, string>)  => ['admin', 'customers', 'list', p]         as const,
  customerDetail:(id: string)                 => ['admin', 'customers', 'detail', id]      as const,

  // Products
  productMeta:   ()                           => ['admin', 'products', 'meta']             as const,
  productList:   (p: Record<string, string>)  => ['admin', 'products', 'list', p]          as const,
  productDetail: (id: string)                 => ['admin', 'products', 'detail', id]       as const,
  productCategories: ()                       => ['admin', 'products', 'categories']       as const,
  productCollections: ()                      => ['admin', 'products', 'collections']      as const,

  // Fitment centres & fitters
  centreList:         (p: Record<string, string>) => ['admin', 'fitment-centres', 'list', p]      as const,
  fitterApplications: (p: Record<string, string>) => ['admin', 'fitters', 'applications', p]     as const,
  fitterDetail:       (id: string)                => ['admin', 'fitters', 'detail', id]           as const,

  // Suppliers
  supplierList:  (p: Record<string, string>)  => ['admin', 'suppliers', 'list', p]        as const,
  supplierDetail:(id: string)                 => ['admin', 'suppliers', 'detail', id]     as const,
}

export const fitterKeys = {
  kpis:            ()                          => ['fitter', 'kpis']                              as const,
  jobs:            ()                          => ['fitter', 'jobs']                              as const,
  jobDetail:       (id: string)                => ['fitter', 'jobs', 'detail', id]               as const,
  schedule:        (start: string, end: string)=> ['fitter', 'schedule', start, end]             as const,
  earningsSummary: ()                          => ['fitter', 'earnings', 'summary']              as const,
  earningsList:    (p: Record<string, string>) => ['fitter', 'earnings', 'list', p]             as const,
  pricing:         ()                          => ['fitter', 'pricing']                          as const,
  profile:         ()                          => ['fitter', 'profile']                          as const,
  services:        ()                          => ['fitter', 'services']                         as const,
}
