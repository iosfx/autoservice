import { FastifyInstance } from 'fastify';
import { CalendarService } from '../services/calendarService';

export async function calendarRoutes(app: FastifyInstance) {
  // Sync calendar events
  app.post('/calendar/sync', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { calendarId } = request.body as { calendarId?: string };

      const result = await CalendarService.syncCalendarEvents(
        garageId,
        calendarId || 'primary'
      );

      return result;
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to sync calendar events',
      });
    }
  });

  // Get upcoming visits
  app.get('/calendar/visits', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { days } = request.query as { days?: string };

      const visits = await CalendarService.getUpcomingVisits(
        garageId,
        days ? parseInt(days) : 7
      );

      return { visits };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to get visits',
      });
    }
  });
}
