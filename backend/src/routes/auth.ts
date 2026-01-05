import { FastifyInstance } from 'fastify';
import { registerGarageAndUser, verifyCredentials } from '../services/authService';
import { CalendarService } from '../services/calendarService';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const { garageName, email, password, name, timezone } = request.body as {
      garageName: string;
      email: string;
      password: string;
      name?: string;
      timezone?: string;
    };

    if (!garageName || !email || !password) {
      return reply.code(400).send({ message: 'Missing required fields' });
    }

    try {
      const { garage, user } = await registerGarageAndUser({
        garageName,
        email,
        password,
        name,
        timezone,
      });
      const token = app.jwt.sign({ id: user.id, garageId: garage.id });
      return reply.code(201).send({
        token,
        garage,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Registration failed' });
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.code(400).send({ message: 'Email and password are required' });
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const token = app.jwt.sign({ id: user.id, garageId: user.garageId });
    return { token, user: { id: user.id, email: user.email, name: user.name, garageId: user.garageId } };
  });

  // Google Calendar OAuth endpoints
  app.post('/auth/google-calendar/connect', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const authUrl = CalendarService.getAuthUrl();
      return { authUrl };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Failed to generate auth URL' });
    }
  });

  app.get('/auth/google-calendar/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };

    if (!code) {
      return reply.code(400).send({ message: 'Missing authorization code' });
    }

    // In production, you'd verify the state parameter and get garageId from it
    // For now, we'll require the user to call this with a token
    try {
      // Extract garageId from JWT token if provided
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ message: 'Authorization required' });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = app.jwt.verify(token) as { garageId: string };

      await CalendarService.handleCallback(code, decoded.garageId);

      return {
        success: true,
        message: 'Google Calendar connected successfully',
      };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Failed to connect Google Calendar' });
    }
  });
}
