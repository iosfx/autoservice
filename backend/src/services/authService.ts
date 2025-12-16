import bcrypt from 'bcryptjs';
import { prisma } from '../db/client';

export async function registerShopAndUser(params: {
  shopName: string;
  email: string;
  password: string;
  name?: string;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);

  return prisma.$transaction(async (tx) => {
    const shop = await tx.shop.create({
      data: { name: params.shopName },
    });

    const user = await tx.user.create({
      data: {
        email: params.email,
        passwordHash,
        name: params.name,
        shopId: shop.id,
      },
    });

    return { shop, user };
  });
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return user;
}
