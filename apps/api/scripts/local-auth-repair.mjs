#!/usr/bin/env node
/**
 * Local-only auth repair — upserts dev admin users without touching production.
 * Usage: pnpm db:auth-repair
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run local-auth-repair in production.');
  process.exit(1);
}

const prisma = new PrismaClient();

const LOCAL_USERS = [
  {
    email: 'dsc-23@yandex.ru',
    password: '123123123',
    fullName: 'Джон Уик',
    role: 'admin',
  },
  {
    email: 'admin@livegrid.ru',
    password: 'admin123!',
    fullName: 'Администратор',
    role: 'admin',
  },
];

async function main() {
  console.log('Local auth repair — table: users');
  for (const u of LOCAL_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        isActive: true,
      },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        isActive: true,
      },
      select: { id: true, email: true, role: true, isActive: true },
    });
    const verify = await bcrypt.compare(u.password, passwordHash);
    console.log(`  ✓ ${row.email} (${row.role}) verify=${verify} id=${row.id}`);
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
