export const dummyproducts = [
  {
    id: 'prod_1',
    name: 'Pilot Sport 5',
    brand: 'Michelin',
    collection: 'Performance',
    variantCount: 6,
    activeVariants: 5,
    isActive: true,
    showOnWebsite: true,
    updatedAt: '2026-05-11T10:00:00Z',
    createdAt: '2026-04-20T09:00:00Z',
  },
  {
    id: 'prod_2',
    name: 'P Zero',
    brand: 'Pirelli',
    collection: 'Ultra High Performance',
    variantCount: 4,
    activeVariants: 4,
    isActive: true,
    showOnWebsite: true,
    updatedAt: '2026-05-10T14:20:00Z',
    createdAt: '2026-03-15T12:30:00Z',
  },
  {
    id: 'prod_3',
    name: 'Turanza T005',
    brand: 'Bridgestone',
    collection: 'Touring',
    variantCount: 3,
    activeVariants: 2,
    isActive: true,
    showOnWebsite: false,
    updatedAt: '2026-05-08T08:15:00Z',
    createdAt: '2026-02-01T11:10:00Z',
  },
  {
    id: 'prod_4',
    name: 'Eagle F1 Asymmetric 6',
    brand: 'Goodyear',
    collection: 'Sport',
    variantCount: 8,
    activeVariants: 7,
    isActive: true,
    showOnWebsite: true,
    updatedAt: '2026-05-09T16:40:00Z',
    createdAt: '2026-01-28T15:45:00Z',
  },
  {
    id: 'prod_5',
    name: 'Ventus S1 Evo3',
    brand: 'Hankook',
    collection: null,
    variantCount: 2,
    activeVariants: 1,
    isActive: false,
    showOnWebsite: false,
    updatedAt: '2026-05-07T13:25:00Z',
    createdAt: '2025-12-10T10:05:00Z',
  },
  {
    id: 'prod_6',
    name: 'CrossClimate 2',
    brand: 'Michelin',
    collection: 'All Season',
    variantCount: 5,
    activeVariants: 5,
    isActive: true,
    showOnWebsite: true,
    updatedAt: '2026-05-06T09:10:00Z',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'prod_7',
    name: 'Potenza Sport',
    brand: 'Bridgestone',
    collection: 'Performance',
    variantCount: 7,
    activeVariants: 6,
    isActive: true,
    showOnWebsite: true,
    updatedAt: '2026-05-05T11:45:00Z',
    createdAt: '2026-02-20T14:30:00Z',
  },
  {
    id: 'prod_8',
    name: 'Cinturato P7',
    brand: 'Pirelli',
    collection: 'Touring',
    variantCount: 4,
    activeVariants: 4,
    isActive: true,
    showOnWebsite: true,
    updatedAt: '2026-05-04T16:00:00Z',
    createdAt: '2026-03-08T10:00:00Z',
  },
  {
    id: 'prod_9',
    name: 'Alenza Sport A/S',
    brand: 'Bridgestone',
    collection: 'SUV',
    variantCount: 3,
    activeVariants: 2,
    isActive: true,
    showOnWebsite: false,
    updatedAt: '2026-05-03T08:30:00Z',
    createdAt: '2026-04-01T09:00:00Z',
  },
  {
    id: 'prod_10',
    name: 'SportContact 7',
    brand: 'Continental',
    collection: 'Ultra High Performance',
    variantCount: 6,
    activeVariants: 6,
    isActive: true,
    showOnWebsite: true,
    updatedAt: '2026-05-02T12:00:00Z',
    createdAt: '2026-01-25T11:00:00Z',
  },
]

export const pattern = {
  pattern_id: 'pattern_1',
  pattern_name: 'Pilot Sport 5',
  pattern_slug: 'pilot-sport-5',
  pattern_short_description:
    'Ultra high-performance summer tyre designed for precision handling and road grip.',
  is_active: true,
  show_on_website: true,
  on_sale: true,
  discountable: true,
  tags: ['summer', 'performance', 'sport'],

  updated_at: '2026-05-12T10:00:00Z',
  created_at: '2026-04-01T09:00:00Z',

  brands: {
    brand_name: 'Michelin',
  },

  collections: {
    collection_name: 'Performance',
  },

  pattern_categories: [
    {
      categories: {
        category_id: 'cat_1',
        category_name: 'Sports Tyres',
      },
    },
  ],
}

export const skus = [
  {
    product_id: 'sku_1',
    sku: 'MIC-PS5-22545R17',
    tyre_size_display: '225/45R17',
    status: 'active',
    total_available_stock: 24,
    width: 225,
    profile: 45,
    rim_size: 17,
    speed_rating: 'Y',
    load_index: '94',

    product_stock: [
      {
        available_stock: 12,
        warehouses: {
          warehouse_id: 'wh_1',
          warehouse_name: 'Lahore Warehouse',
        },
      },
      {
        available_stock: 12,
        warehouses: {
          warehouse_id: 'wh_2',
          warehouse_name: 'Karachi Warehouse',
        },
      },
    ],
    product_prices: [
      { price_inc_gst: 299, customer_groups: { group_name: 'Retail' } },
      { price_inc_gst: 279, customer_groups: { group_name: 'Wholesale' } },
      { price_inc_gst: 265, customer_groups: { group_name: 'VIP Dealers' } },
    ],
  },

  {
    product_id: 'sku_2',
    sku: 'MIC-PS5-23540R18',
    tyre_size_display: '235/40R18',
    status: 'active',
    total_available_stock: 8,
    width: 235,
    profile: 40,
    rim_size: 18,
    speed_rating: 'Y',
    load_index: '95',

    product_stock: [
      {
        available_stock: 8,
        warehouses: {
          warehouse_id: 'wh_3',
          warehouse_name: 'Islamabad Warehouse',
        },
      },
    ],
    product_prices: [
      { price_inc_gst: 309, customer_groups: { group_name: 'Retail' } },
      { price_inc_gst: 289, customer_groups: { group_name: 'Wholesale' } },
    ],
  },

  {
    product_id: 'sku_3',
    sku: 'MIC-PS5-24535R19',
    tyre_size_display: '245/35R19',
    status: 'draft',
    total_available_stock: 0,
    width: 245,
    profile: 35,
    rim_size: 19,
    speed_rating: 'Y',
    load_index: '93',

    product_stock: [],
    product_prices: [],
  },
]

export const sku = {
  product_id: 'sku_1',
  sku: 'MIC-PS5-22545R17',
  tyre_size_display: '225/45R17',
  status: 'active',

  width: 225,
  profile: 45,
  rim_size: 17,
  speed_rating: 'Y',
  load_index: '94',

  fuel_rating: 'A',
  wet_grip: 'A',
  noise_db: '71 dB',
  noise_class: 'B',

  runflat: true,
  xl_reinforced: true,

  ply_rating: '4PR',
  load_range: 'XL',

  country_of_origin: 'France',

  cost_price: 185,
  compare_at_price: 349,

  variant_images: [
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600',
    'https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?q=80&w=600',
  ],

  patterns: {
    pattern_id: 'pattern_1',
    pattern_name: 'Pilot Sport 5',
    pattern_slug: 'pilot-sport-5',

    brands: {
      brand_name: 'Michelin',
    },
  },

  product_prices: [
    {
      price_inc_gst: 299,
      customer_groups: {
        group_name: 'Retail',
      },
    },

    {
      price_inc_gst: 279,
      customer_groups: {
        group_name: 'Wholesale',
      },
    },

    {
      price_inc_gst: 265,
      customer_groups: {
        group_name: 'VIP Dealers',
      },
    },
  ],

  product_stock: [
    {
      available_stock: 12,
      reserved_stock: 2,

      warehouses: {
        warehouse_id: 'wh_1',
        warehouse_name: 'Lahore Warehouse',
      },
    },

    {
      available_stock: 5,
      reserved_stock: 1,

      warehouses: {
        warehouse_id: 'wh_2',
        warehouse_name: 'Karachi Warehouse',
      },
    },

    {
      available_stock: 0,
      reserved_stock: 0,

      warehouses: {
        warehouse_id: 'wh_3',
        warehouse_name: 'Islamabad Warehouse',
      },
    },
  ],
}