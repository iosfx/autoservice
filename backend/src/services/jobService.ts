import { JobStatus } from '@prisma/client';
import { prisma } from '../db/client';

export async function listJobsByDate(shopId: string, date?: string) {
  const filters: { shopId: string; scheduledDate?: { gte: Date; lt: Date } } = {
    shopId,
  };

  if (date) {
    const target = new Date(date);
    if (!isNaN(target.getTime())) {
      const start = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()));
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      filters.scheduledDate = { gte: start, lt: end };
    }
  }

  return prisma.job.findMany({
    where: filters,
    include: {
      client: true,
      vehicle: true,
    },
    orderBy: { scheduledDate: 'asc' },
  });
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  return prisma.job.update({
    where: { id: jobId },
    data: { status },
  });
}
