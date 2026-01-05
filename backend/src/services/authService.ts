import bcrypt from 'bcryptjs';
import { prisma } from '../db/client';

export async function registerGarageAndUser(params: {
  garageName: string;
  email: string;
  password: string;
  name?: string;
  timezone?: string;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);

  return prisma.$transaction(async (tx) => {
    const garage = await tx.garage.create({
      data: {
        name: params.garageName,
        timezone: params.timezone || 'UTC',
      },
    });

    const user = await tx.user.create({
      data: {
        email: params.email,
        passwordHash,
        name: params.name,
        garageId: garage.id,
      },
    });

    return { garage, user };
  });
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return user;
}
