import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { addDays } from 'date-fns';

const SERVICE_CONFIG = {
  '車検': {
    duration: 0, // 1日
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

export async function GET() {
  try {
    const today = new Date();
    const threeMonthsLater = addDays(today, 90);

    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: today.toISOString(),
      timeMax: threeMonthsLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items?.map(event => ({
      start: event.start?.dateTime,
      end: event.end?.dateTime,
      title: event.summary,
      duration: event.description?.match(/作業時間: (\d+)分/)?.[1] // 作業時間を抽出
    })) || [];

    return NextResponse.json(events);
  } catch (error) {
    console.error('Calendar API Error:', error);
    return NextResponse.json({ error: '予定の取得に失敗しました' }, { status: 500 });
  }
} 