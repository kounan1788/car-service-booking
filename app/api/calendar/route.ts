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
    
    // タイムゾーンオフセットを計算（ミリ秒）
    const offset = startTime.getTimezoneOffset() * 60 * 1000;
    // JSTに調整（-offset で現地時間に、+9時間でJSTに）
    const jstStartTime = new Date(startTime.getTime() - offset + (9 * 60 * 60 * 1000));
    
    // 車検の場合は1時間、それ以外はSERVICE_CONFIGから取得
    const duration = data.service === '車検' ? 60 : SERVICE_CONFIG[data.service as ServiceType]?.duration || 60;
    
    const jstEndTime = new Date(jstStartTime.getTime() + (duration * 60 * 1000));

    const event = {
      summary: `${data.service} - ${data.companyName || data.fullName}`,
      description: `
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