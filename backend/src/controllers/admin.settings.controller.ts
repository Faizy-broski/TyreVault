import type { Request, Response, NextFunction } from 'express'
import * as SettingsService from '../services/admin.settings.service'

type P = Record<string, string>

export async function getSetting(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await SettingsService.getSetting(String((req.params as P).key))
    if (!row) return res.status(404).json({ error: 'Setting not found' })
    res.json(row)
  } catch (err) { next(err) }
}

export async function updateSetting(req: Request, res: Response, next: NextFunction) {
  try {
    const { value } = req.body
    if (value === undefined) return res.status(400).json({ error: 'value is required' })
    const row = await SettingsService.setSetting(String((req.params as P).key), value)
    res.json(row)
  } catch (err) { next(err) }
}
