import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { addDays } from 'date-fns';
import { SERVICE_CONFIG, type ServiceType } from '@/app/config/services';

interface CalendarEvent {
  start: string;
  end: string;
  title?: string;
  duration?: string;
}

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

    const events: CalendarEvent[] = response.data.items?.map(event => {
      const serviceType = event.summary?.split(' - ')[0] as ServiceType;
      const duration = SERVICE_CONFIG[serviceType]?.duration || 60;
      
      return {
        start: event.start?.dateTime ?? '',
        end: event.end?.dateTime ?? '',
        title: event.summary ?? undefined,
        duration: duration.toString()
      };
    }) || [];

    return NextResponse.json(events);
  } catch (error) {
    console.error('Calendar API Error:', error);
    return NextResponse.json({ error: '予定の取得に失敗しました' }, { status: 500 });
  }
} 