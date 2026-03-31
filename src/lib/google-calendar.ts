import { CalendarEvent } from '@/lib/types'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

/** Exchange a refresh token for a fresh access token. */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`)
  }

  const data = await res.json()
  return data.access_token as string
}

/** Fetch events from the user's primary Google Calendar for a given date range. */
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })

  const res = await fetch(`${GOOGLE_CALENDAR_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Google Calendar API failed: ${res.status}`)
  }

  const data = await res.json()
  const items: GoogleCalendarEvent[] = data.items ?? []

  return items.map((item) => mapGoogleEvent(item, userId))
}

interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  created?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

function mapGoogleEvent(item: GoogleCalendarEvent, userId: string): CalendarEvent {
  const allDay = !item.start.dateTime
  return {
    id: `google_${item.id}`,
    user_id: userId,
    title: item.summary || '(No title)',
    description: item.description || null,
    start_time: allDay ? `${item.start.date}T00:00:00.000Z` : item.start.dateTime!,
    end_time: allDay ? `${item.end.date}T00:00:00.000Z` : item.end.dateTime!,
    all_day: allDay,
    created_at: item.created || new Date().toISOString(),
  }
}
