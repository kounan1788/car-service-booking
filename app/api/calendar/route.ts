import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { ServiceType } from '@/app/config/services';
import { parseISO, format } from 'date-fns';

const SERVICE_CONFIG = {
  '車検': {
    duration: 510, // 8時間30分 (9:00-17:30)
  },
  'オイル交換': {
    duration: 30,
  },
  '12ヵ月点検': {
    duration: 90,
  },
  '6ヵ月点検(貨物車)': {
    duration: 90,
  },
  'スケジュール点検': {
    duration: 60,
  },
  'タイヤ交換': {
    duration: 30,
  }
} as const;

const SERVICE_COLORS = {
  '車検': '11',         // 赤
  'オイル交換': '5',    // 黄
  '12ヵ月点検': '9',    // 青
  '6ヵ月点検(貨物車)': '9', // 青
  'スケジュール点検': '7',  // 緑
  '一般整備': '8',      // 緑
  'タイヤ交換': '6'     // オレンジ
} as const;

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const calendar = google.calendar({
      version: 'v3',
      auth: new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        undefined,
        process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/calendar']
      )
    });

    // 日本時間で予約時間を設定
    const [hour, minute] = data.selectedTime.split(':');
    const startTime = new Date(data.selectedDate);
    startTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    const offset = startTime.getTimezoneOffset() * 60 * 1000;
    const jstStartTime = new Date(startTime.getTime() - offset + (15 * 60 * 60 * 1000));
    
    // 作業時間を1時間に設定
    const duration = 60;
    const jstEndTime = new Date(jstStartTime.getTime() + (duration * 60 * 1000));

    // 管理者予約かどうかを判定
    const isAdminBooking = 'repairDetails' in data;

    const event = {
      summary: isAdminBooking 
        ? `【未確認】${data.customerName} - ${data.serviceType}`
        : `【未確認】${data.service} - ${data.companyName || data.fullName}`,
      description: isAdminBooking 
        ? `
          【お客様情報】
          お客様名: ${data.customerName}
          登録番号: ${data.registrationNumber}
          整備メニュー: ${data.serviceType}
          修理内容: ${data.repairDetails}
          納車希望日: ${data.deliveryDate}
          来店/引取: ${data.visitType}
          代車: ${data.needsRentalCar ? `必要\n${data.rentalCarDetails ? `代車詳細: ${data.rentalCarDetails}` : ''}` : '不要'}
          ${data.notes ? `備考: ${data.notes}` : ''}
        `.trim()
        : `
          【お客様情報】
          ${data.companyName ? `会社名: ${data.companyName}` : `お名前: ${data.fullName}`}
          ${data.phone ? `電話番号: ${data.phone}` : ''}
          ${data.address ? `住所: ${data.address}` : ''}
          ${data.carModel ? `車種: ${data.carModel}` : ''}
          ${data.yearNumber ? `年式: ${data.yearEra}${data.yearNumber}年` : ''}
          ${data.registrationNumber ? `登録番号: ${data.registrationNumber}` : ''}
          
          【予約内容】
          サービス: ${data.service}
          作業時間: ${duration}分
          ${data.notes ? `備考: ${data.notes}` : ''}
          ${data.concerns ? `気になる点: ${data.concerns}` : ''}
        `.trim(),
      start: {
        dateTime: jstStartTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: jstEndTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      colorId: isAdminBooking 
        ? SERVICE_COLORS[data.serviceType as ServiceType] 
        : SERVICE_COLORS[data.service as ServiceType]
    };

    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event,
    });

    return NextResponse.json({ message: '予約が完了しました' });
  } catch (error) {
    console.error('Calendar API Error:', error);
    return NextResponse.json({ error: '予約の登録に失敗しました' }, { status: 500 });
  }
} 