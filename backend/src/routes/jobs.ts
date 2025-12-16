import { FastifyInstance } from 'fastify';
import { JobStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { listJobsByDate, updateJobStatus } from '../services/jobService';
import { sendMessage } from '../services/messagingService';

export async function jobRoutes(app: FastifyInstance) {
app.get("/jobs", { preValidation: authenticate }, async (request, reply) => {
  const { date } = request.query as { date?: string };

  // jwtVerify already ran in authenticate, so request.user is present
  const { shopId } = request.user;

  const jobs = await listJobsByDate(shopId, date);
  return { jobs };
});


  app.post('/jobs/:id/status', { preValidation: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, message } = request.body as { status: JobStatus | string; message?: string };

    if (!Object.values(JobStatus).includes(status as JobStatus)) {
      return reply.code(400).send({ message: 'Invalid status' });
    }

    const updated = await updateJobStatus(id, status as JobStatus);

    if (message) {
      await sendMessage(id, message);
    }

    return { job: updated };
  });
}
