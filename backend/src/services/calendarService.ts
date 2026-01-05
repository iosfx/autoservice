import { google } from 'googleapis';
import { prisma } from '../db/client';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export class CalendarService {
  /**
   * Generate OAuth URL for Google Calendar authorization
   */
  static getAuthUrl(): string {
    const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens and store them
   */
  static async handleCallback(code: string, garageId: string) {
    try {
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Missing tokens from Google OAuth');
      }

      const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));

      // Store or update calendar token
      await prisma.calendarToken.upsert({
        where: { garageId },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
        },
        create: {
          garageId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      throw error;
    }
  }

  /**
   * Get authenticated calendar client for a garage
   */
  static async getCalendarClient(garageId: string): Promise<any> {
    const calendarToken = await prisma.calendarToken.findUnique({
      where: { garageId },
    });

    if (!calendarToken) {
      throw new Error('No calendar token found for garage');
    }

    // Check if token is expired and refresh if needed
    if (new Date() >= calendarToken.expiresAt) {
      await this.refreshToken(garageId, calendarToken.refreshToken);
      return this.getCalendarClient(garageId); // Recursive call with new token
    }

    oauth2Client.setCredentials({
      access_token: calendarToken.accessToken,
      refresh_token: calendarToken.refreshToken,
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Refresh access token using refresh token
   */
  private static async refreshToken(garageId: string, refreshToken: string) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    const expiresAt = new Date(Date.now() + (credentials.expiry_date || 3600 * 1000));

    await prisma.calendarToken.update({
      where: { garageId },
      data: {
        accessToken: credentials.access_token,
        expiresAt,
      },
    });
  }

  /**
   * Sync calendar events to database as ServiceVisits
   */
  static async syncCalendarEvents(garageId: string, calendarId: string = 'primary') {
    try {
      const calendar = await this.getCalendarClient(garageId);

      // Get events from the past 30 days to future 90 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);

      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 90);

      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      const syncedEvents = [];

      for (const event of events) {
        if (!event.id || !event.start?.dateTime) {
          continue; // Skip events without ID or start time
        }

        // Try to extract client information from event
        const { clientId, carId } = await this.extractClientFromEvent(event, garageId);

        if (!clientId) {
          continue; // Skip events without identifiable client
        }

        // Upsert service visit
        const serviceVisit = await prisma.serviceVisit.upsert({
          where: { calendarEventId: event.id },
          update: {
            serviceDate: new Date(event.start.dateTime),
            notes: event.description || event.summary,
          },
          create: {
            garageId,
            clientId,
            carId,
            calendarEventId: event.id,
            serviceDate: new Date(event.start.dateTime),
            notes: event.description || event.summary,
          },
        });

        syncedEvents.push(serviceVisit);
      }

      return {
        success: true,
        syncedCount: syncedEvents.length,
        events: syncedEvents,
      };
    } catch (error) {
      console.error('Error syncing calendar events:', error);
      throw error;
    }
  }

  /**
   * Extract client and car information from calendar event
   * This can be enhanced based on how garage owners structure their events
   */
  private static async extractClientFromEvent(event: any, garageId: string) {
    let clientId: string | null = null;
    let carId: string | null = null;

    // Strategy 1: Look for phone number in event description or title
    const text = `${event.summary || ''} ${event.description || ''}`;
    const phoneMatch = text.match(/\+?[\d\s()-]{10,}/);

    if (phoneMatch) {
      const phone = phoneMatch[0].replace(/[^\d+]/g, '');
      const client = await prisma.client.findFirst({
        where: {
          garageId,
          phone: { contains: phone },
        },
      });

      if (client) {
        clientId = client.id;

        // Try to find car by license plate in event
        const licensePlateMatch = text.match(/[A-Z0-9]{2,8}/);
        if (licensePlateMatch) {
          const car = await prisma.car.findFirst({
            where: {
              clientId: client.id,
              licensePlate: { contains: licensePlateMatch[0] },
            },
          });
          carId = car?.id || null;
        }
      }
    }

    // Strategy 2: Look for client name
    if (!clientId) {
      const summary = event.summary || '';
      const client = await prisma.client.findFirst({
        where: {
          garageId,
          name: { contains: summary, mode: 'insensitive' },
        },
      });
      clientId = client?.id || null;
    }

    return { clientId, carId };
  }

  /**
   * Get upcoming service visits for a garage
   */
  static async getUpcomingVisits(garageId: string, days: number = 7) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return prisma.serviceVisit.findMany({
      where: {
        garageId,
        serviceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: true,
        car: true,
      },
      orderBy: {
        serviceDate: 'asc',
      },
    });
  }
}
