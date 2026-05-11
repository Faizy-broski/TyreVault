import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import Papa from 'papaparse'
import { randomUUID } from 'crypto'
import * as SuppliersService from '../services/admin.suppliers.service'

type P = Record<string, string>

// ============================================================
// Multer — memory storage, 10MB hard cap (prevents OOM crash)
// ============================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only .csv files are accepted'))
    }
  },
})

export const csvUploadMiddleware = upload.single('file')

// ============================================================
// LIST
// ============================================================
export async function listSuppliers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await SuppliersService.listSuppliers()
    res.json(data)
  } catch (err) { next(err) }
}

// ============================================================
// GET SINGLE
// ============================================================
export async function getSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await SuppliersService.getSupplier(String((req.params as P).id))
    res.json(data)
  } catch (err) { next(err) }
}

// ============================================================
// CREATE
// ============================================================
export async function createSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await SuppliersService.createSupplier(req.body)
    res.status(201).json(data)
  } catch (err) { next(err) }
}

// ============================================================
// UPDATE
// ============================================================
export async function updateSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    await SuppliersService.updateSupplier(String((req.params as P).id), req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ============================================================
// UPLOAD CSV + ENQUEUE IMPORT JOB
// POST /api/admin/suppliers/:id/import
// Body (multipart): file (CSV), column_map (JSON string)
// ============================================================
export async function uploadCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }

    // Parse column_map from body — maps our field names to CSV header names
    // e.g. { size_raw: "TyreSize", brand_name: "Brand", ... }
    let columnMap: Record<string, string> = {}
    try {
      columnMap = req.body.column_map ? JSON.parse(String(req.body.column_map)) : {}
    } catch {
      res.status(400).json({ error: 'Invalid column_map JSON' })
      return
    }

    // Parse CSV from buffer
    const csvText = req.file.buffer.toString('utf-8')
    const parsed  = Papa.parse<Record<string, string>>(csvText, {
      header:         true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
    })

    if (parsed.errors.length > 0) {
      res.status(400).json({ error: 'CSV parse error', details: parsed.errors.slice(0, 5) })
      return
    }

    // Map CSV rows to SupplierRow shape using column_map
    const rows: SuppliersService.SupplierRow[] = parsed.data.map(raw => ({
      supplier_sku:          raw[columnMap.supplier_sku]          ?? undefined,
      supplier_product_name: raw[columnMap.product_name]          ?? undefined,
      supplier_brand_name:   raw[columnMap.brand_name]            ?? undefined,
      supplier_pattern_name: raw[columnMap.pattern_name]          ?? undefined,
      supplier_size_raw:     raw[columnMap.size_raw]              ?? undefined,
      load_index:            raw[columnMap.load_index]            ?? undefined,
      speed_rating:          raw[columnMap.speed_rating]          ?? undefined,
      ply_rating:            raw[columnMap.ply_rating]            ?? undefined,
      supplier_price:        raw[columnMap.supplier_price]
                               ? parseFloat(raw[columnMap.supplier_price])
                               : undefined,
      supplier_stock:        raw[columnMap.supplier_stock]
                               ? parseInt(raw[columnMap.supplier_stock], 10)
                               : undefined,
      lead_time_days:        raw[columnMap.lead_time_days]
                               ? parseInt(raw[columnMap.lead_time_days], 10)
                               : undefined,
    }))

    const supplierId = String((req.params as P).id)
    const sessionId  = randomUUID()
    const jobId      = await SuppliersService.enqueueImport(supplierId, rows, sessionId)

    res.json({ jobId, rowCount: rows.length, sessionId })
  } catch (err) { next(err) }
}

// ============================================================
// GET MAPPINGS (review queue)
// ============================================================
export async function getMappings(req: Request, res: Response, next: NextFunction) {
  try {
    const supplierId = String((req.params as P).id)
    const filter = (req.query.filter as SuppliersService.MappingFilter) ?? 'pending'
    const page   = req.query.page ? Number(req.query.page) : 1

    const result = await SuppliersService.getSupplierMappings(supplierId, { page, filter })
    res.json(result)
  } catch (err) { next(err) }
}

// ============================================================
// APPROVE MAPPING
// ============================================================
export async function approveMapping(req: Request, res: Response, next: NextFunction) {
  try {
    await SuppliersService.approveMapping(String((req.params as P).mapId))
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ============================================================
// REJECT MAPPING
// ============================================================
export async function rejectMapping(req: Request, res: Response, next: NextFunction) {
  try {
    await SuppliersService.rejectMapping(String((req.params as P).mapId))
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ============================================================
// MANUAL MAP
// ============================================================
export async function manualMap(req: Request, res: Response, next: NextFunction) {
  try {
    const { product_id } = req.body
    if (!product_id) {
      res.status(400).json({ error: 'product_id is required' })
      return
    }
    await SuppliersService.manualMap(String((req.params as P).mapId), String(product_id))
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ============================================================
// GET IMPORT JOB STATUS
// ============================================================
export async function getJobStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const status = await SuppliersService.getImportJobStatus(String((req.params as P).jobId))
    res.json(status)
  } catch (err) { next(err) }
}
