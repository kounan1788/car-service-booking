import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { ServiceType } from '@/app/config/services';

// サービスごとの色設定
const SERVICE_COLORS = {
  '車検': '11',         // 赤
  'オイル交換': '5',    // 黄
  '12ヵ月点検': '9',    // 青
  '6ヵ月点検(貨物車)': '9', // 青
  'スケジュール点検': '7',  // 緑
  '一般整備': '8',      // 緑
  'タイヤ交換': '6',    // オレンジ
  '引取': '10'          // 緑
} as const;

// サービスごとの作業時間（分）
const SERVICE_DURATIONS = {
  '車検': 60,
  '12ヵ月点検': 120,  // 90分から120分に変更
  '6ヵ月点検(貨物車)': 90,
  'スケジュール点検': 60,
  '一般整備': 60,
  'オイル交換': 30,
  'タイヤ交換': 30
} as const;

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const isAdminBooking = 'repairDetails' in data;
    const serviceType = isAdminBooking ? data.serviceType : data.service;

    // カレンダーAPIの初期化
    const calendar = google.calendar({
      version: 'v3',
      auth: new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        undefined,
        process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/calendar']
      )
    });

    // 予約時間の設定
    const [hour, minute] = data.selectedTime.split(':');
    const startTime = new Date(data.selectedDate);
    startTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    // JST調整
    const offset = startTime.getTimezoneOffset() * 60 * 1000;
    const jstStartTime = new Date(startTime.getTime() - offset + (15 * 60 * 60 * 1000));
    
    // 終了時間の計算
    const duration = SERVICE_DURATIONS[serviceType as keyof typeof SERVICE_DURATIONS] || 60;
    const jstEndTime = new Date(jstStartTime.getTime() + (duration * 60 * 1000));

    // イベントの作成
    const event = {
      summary: `【未確認】${data.visitType === '引取' ? '(引取) ' : ''}${isAdminBooking ? data.customerName : (data.companyName || data.fullName)} - ${serviceType}`,
      description: isAdminBooking 
        ? `
          【お客様情報】
          お客様名: ${data.customerName}
          登録番号: ${data.registrationNumber}
          整備メニュー: ${serviceType}
          修理内容: ${data.repairDetails || ''}
          納車希望日: ${data.deliveryDate}
          来店/引取: ${data.visitType}
          代車: ${data.needsRentalCar ? `必要\n${data.rentalCarDetails ? `代車詳細: ${data.rentalCarDetails}` : ''}` : '不要'}
          ${data.notes ? `備考: ${data.notes}` : ''}
          作業時間: ${duration}分  
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
          サービス: ${serviceType}
          作業時間: ${duration}分
          ${data.notes ? `備考: ${data.notes}` : ''}
          ${data.concerns ? `気になる点: ${data.concerns}` : ''}
        `.trim(),
      start: { dateTime: jstStartTime.toISOString(), timeZone: 'Asia/Tokyo' },
      end: { dateTime: jstEndTime.toISOString(), timeZone: 'Asia/Tokyo' },
      colorId: SERVICE_COLORS[serviceType as ServiceType]
    };

    // カレンダーに予約を追加
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