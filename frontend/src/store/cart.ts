import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PriceType = 'retail' | 'wholesale'

export interface CartItem {
  skuId: string
  quantity: number
  priceType: PriceType
  // Snapshot at time of add — do not use for final price (re-validate at checkout)
  unitPrice: number
  tyreSize: string
  brandName: string
  patternName: string
  imageUrl: string | null
}

interface CartStore {
  items: CartItem[]
  selectedFitmentCentreId: string | null
  addItem: (item: CartItem) => void
  removeItem: (skuId: string) => void
  updateQuantity: (skuId: string, quantity: number) => void
  setFitmentCentre: (fitmentCentreId: string | null) => void
  clearCart: () => void
  itemCount: () => number
  subtotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      selectedFitmentCentreId: null,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.skuId === item.skuId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.skuId === item.skuId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            }
          }
          return { items: [...state.items, item] }
        }),

      removeItem: (skuId) =>
        set((state) => ({
          items: state.items.filter((i) => i.skuId !== skuId),
        })),

      updateQuantity: (skuId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.skuId !== skuId)
              : state.items.map((i) =>
                  i.skuId === skuId ? { ...i, quantity } : i
                ),
        })),

      setFitmentCentre: (fitmentCentreId) =>
        set({ selectedFitmentCentreId: fitmentCentreId }),

      clearCart: () => set({ items: [], selectedFitmentCentreId: null }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    }),
    {
      name: 'onyx-cart',
    }
  )
)
