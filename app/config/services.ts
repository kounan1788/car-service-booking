export const SERVICE_CONFIG = {
  '引取': {
    duration: 30,
    maxPerDay: 3,
    requiresTimeSlot: true
  },
  '車検': {
    duration: 60,
    maxPerDay: 3,
    requiresTimeSlot: true
  },
  'オイル交換': {
    duration: 30,
    maxPerDay: 2,
    requiresTimeSlot: true
  },
  '12ヵ月点検': {
    duration: 120,
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
    maxPerDay: 4,
    requiresTimeSlot: true
  },
  '一般整備': {
    duration: 60,
    maxPerDay: 4,
    requiresTimeSlot: true
  },
  'タイヤ交換': {
    duration: 30,
    maxPerDay: 8,
    requiresTimeSlot: true
  }
} as const;

export type ServiceType = keyof typeof SERVICE_CONFIG; 