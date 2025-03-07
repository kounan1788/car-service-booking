import { SERVICE_CONFIG } from './services';
import { format } from 'date-fns';

interface ParsedEvent {
  start: string;
  end: string;
  title?: string;
  duration?: string;
}

export interface BookingRequest {
  service: keyof typeof SERVICE_CONFIG;
  selectedDate: Date;
  selectedTime: string;
  visitType: "来店" | "引取";
  userType: "new" | "existing" | "lease" | "admin";
}

export interface RestrictionRule {
  id: string;
  description: string;
  enabled: boolean;
  condition: (events: ParsedEvent[], newEvent: BookingRequest) => boolean;
  errorMessage: string;
}

export const RESTRICTION_RULES: RestrictionRule[] = [
  {
    id: 'pickup_access_control',
    description: '引取予約アクセス制御',
    enabled: true,
    condition: (events, newEvent) => {
      // 管理者は制限を無視
      if (newEvent.userType === 'admin') return false;
      
      // 引取予約は管理者以外不可
      return newEvent.visitType === '引取';
    },
    errorMessage: '引取サービスは管理者フォームからのみ予約可能です。'
  },
  {
    id: 'pickup_limit',
    description: '引取予約制限',
    enabled: true,
    condition: (events, newEvent) => {
      // 管理者は制限を無視
      if (newEvent.userType === 'admin') return false;

      const selectedDate = new Date(newEvent.selectedDate);
      
      // 同じ日の引取予約をカウント
      const todayPickups = events.filter(event => {
        const eventDate = new Date(event.start);
        return (
          eventDate.getFullYear() === selectedDate.getFullYear() &&
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getDate() === selectedDate.getDate() &&
          (event.title?.includes('引取') || 
           event.title?.startsWith('引取') || 
           event.title?.endsWith('(引取)') ||
           event.title?.startsWith('(引取)'))
        );
      });

      // デバッグ用ログ
      console.log('Selected Date:', format(selectedDate, 'yyyy-MM-dd'));
      console.log('Today\'s Pickup Count:', todayPickups.length);
      console.log('Today\'s Pickups:', todayPickups);

      // 3件以上の場合のみブロック
      return todayPickups.length >= 4;
    },
    errorMessage: 'この日は引取予約が上限に達しているため、新規予約を受け付けられません。'
  },
  {
    id: 'inspection_12month_limit',
    description: '車検と12ヵ月点検の制限',
    enabled: true,
    condition: (events, newEvent) => {
      // 管理者は制限を無視
      if (newEvent.userType === 'admin') return false;

      const selectedDate = new Date(newEvent.selectedDate);
      
      // 同じ日の車検予約をカウント
      const todayInspections = events.filter(event => {
        const eventDate = new Date(event.start);
        return (
          eventDate.getFullYear() === selectedDate.getFullYear() &&
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getDate() === selectedDate.getDate() &&
          event.title?.includes('車検')
        );
      });

      // 同じ日の12ヵ月点検予約をカウント
      const today12MonthInspections = events.filter(event => {
        const eventDate = new Date(event.start);
        return (
          eventDate.getFullYear() === selectedDate.getFullYear() &&
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getDate() === selectedDate.getDate() &&
          event.title?.includes('12ヵ月点検')
        );
      });

      // デバッグ用ログ
      console.log('Selected Date:', format(selectedDate, 'yyyy-MM-dd'));
      console.log('Today\'s Inspections:', todayInspections.length);
      console.log('Today\'s 12-Month Inspections:', today12MonthInspections.length);

      // 車検が2件以上ある場合、12ヵ月点検は1件まで
      if (todayInspections.length >= 2 && newEvent.service === '12ヵ月点検') {
        return today12MonthInspections.length >= 1;
      }

      return false;
    },
    errorMessage: '申し訳ありません。車検予約数により12ヵ月点検は予約できません。'
  }
]; 