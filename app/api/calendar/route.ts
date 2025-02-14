import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { addMinutes } from 'date-fns';

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

const calendar = google.calendar({
  version: 'v3',
  auth: new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/calendar']
  )
});

export async function POST(request: Request) {
  try {
    const reservation = await request.json();
    
    if (!reservation.selectedDate) {
      return NextResponse.json({ error: '日付が選択されていません' }, { status: 400 });
    }

    const [hour, minute] = reservation.selectedTime.split(':');
    const startDate = new Date(reservation.selectedDate);
    startDate.setHours(parseInt(hour), parseInt(minute), 0);
    
    // サービスごとの作業時間を取得
    const serviceConfig = SERVICE_CONFIG[reservation.service as keyof typeof SERVICE_CONFIG];
    const duration = serviceConfig?.duration || 60;
    
    // 終了時刻を計算
    const endDate = addMinutes(startDate, duration);

    const event = {
      summary: `${reservation.service} - ${reservation.companyName || reservation.fullName}`,
      description: `
        【お客様情報】
        ${reservation.companyName ? `会社名: ${reservation.companyName}` : `お名前: ${reservation.fullName}`}
        ${reservation.phone ? `電話番号: ${reservation.phone}` : ''}
        ${reservation.address ? `住所: ${reservation.address}` : ''}
        ${reservation.carModel ? `車種: ${reservation.carModel}` : ''}
        ${reservation.yearNumber ? `年式: ${reservation.yearEra}${reservation.yearNumber}年` : ''}
        ${reservation.registrationNumber ? `登録番号: ${reservation.registrationNumber}` : ''}
        
        【予約内容】
        サービス: ${reservation.service}
        作業時間: ${duration}分
        ${reservation.notes ? `備考: ${reservation.notes}` : ''}
      `.trim(),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
    };

    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Calendar API Error:', error);
    return NextResponse.json({ error: '予約の追加に失敗しました' }, { status: 500 });
  }
} 