import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client';

export async function carRoutes(app: FastifyInstance) {
  // Create a new car
  app.post('/cars', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { clientId, licensePlate, vin, currentMileage } = request.body as {
        clientId: string;
        licensePlate: string;
        vin?: string;
        currentMileage?: number;
      };

      if (!clientId || !licensePlate) {
        return reply.code(400).send({
          message: 'Client ID and license plate are required',
        });
      }

      // Verify client belongs to garage
      const client = await prisma.client.findFirst({
        where: { id: clientId, garageId },
      });

      if (!client) {
        return reply.code(404).send({ message: 'Client not found' });
      }

      const car = await prisma.car.create({
        data: {
          clientId,
          licensePlate,
          vin,
          currentMileage: currentMileage || 0,
        },
        include: {
          client: true,
        },
      });

      return reply.code(201).send({ car });
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to create car',
      });
    }
  });

  // Get car by ID
  app.get('/cars/:id', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { id } = request.params as { id: string };

      const car = await prisma.car.findFirst({
        where: {
          id,
          client: { garageId },
        },
        include: {
          client: true,
          serviceVisits: {
            orderBy: { serviceDate: 'desc' },
            take: 10,
          },
        },
      });

      if (!car) {
        return reply.code(404).send({ message: 'Car not found' });
      }

      return { car };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to get car',
      });
    }
  });

  // Update car mileage
  app.put('/cars/:id/mileage', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { id } = request.params as { id: string };
      const { currentMileage } = request.body as { currentMileage: number };

      if (currentMileage === undefined || currentMileage < 0) {
        return reply.code(400).send({
          message: 'Valid mileage is required',
        });
      }

      // Verify car belongs to garage
      const existingCar = await prisma.car.findFirst({
        where: {
          id,
          client: { garageId },
        },
      });

      if (!existingCar) {
        return reply.code(404).send({ message: 'Car not found' });
      }

      const car = await prisma.car.update({
        where: { id },
        data: {
          currentMileage,
          lastServiceDate: new Date(), // Update last service date when mileage is updated
        },
      });

      return { car };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to update mileage',
      });
    }
  });

  // Update car details
  app.put('/cars/:id', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { id } = request.params as { id: string };
      const { licensePlate, vin, currentMileage } = request.body as {
        licensePlate?: string;
        vin?: string;
        currentMileage?: number;
      };

      // Verify car belongs to garage
      const existingCar = await prisma.car.findFirst({
        where: {
          id,
          client: { garageId },
        },
      });

      if (!existingCar) {
        return reply.code(404).send({ message: 'Car not found' });
      }

      const car = await prisma.car.update({
        where: { id },
        data: {
          licensePlate,
          vin,
          currentMileage,
        },
      });

      return { car };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to update car',
      });
    }
  });

  // Delete a car
  app.delete('/cars/:id', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { id } = request.params as { id: string };

      // Verify car belongs to garage
      const existingCar = await prisma.car.findFirst({
        where: {
          id,
          client: { garageId },
        },
      });

      if (!existingCar) {
        return reply.code(404).send({ message: 'Car not found' });
      }

      await prisma.car.delete({
        where: { id },
      });

      return { success: true, message: 'Car deleted' };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to delete car',
      });
    }
  });
}
