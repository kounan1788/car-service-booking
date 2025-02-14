export const SERVICE_CONFIG = {
  '車検': {
    duration: 0,
    maxPerDay: 2,
    requiresTimeSlot: false
  },
  'オイル交換': {
    duration: 30,
    maxPerDay: null,
    requiresTimeSlot: true
  },
  '12ヵ月点検': {
    duration: 90,
    maxPerDay: 2,
    requiresTimeSlot: true
  },
  '6ヵ月点検(貨物車)': {
    duration: 90,
    maxPerDay: 2,
    requiresTimeSlot: true
  },
  'スケジュール点検': {
    duration: 60,
    maxPerDay: null,
    requiresTimeSlot: true
  },
  'タイヤ交換': {
    duration: 30,
    maxPerDay: null,
    requiresTimeSlot: true
  }
} as const;

export type ServiceType = keyof typeof SERVICE_CONFIG; 