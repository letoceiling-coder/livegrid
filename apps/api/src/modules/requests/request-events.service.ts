import { Injectable } from '@nestjs/common';
import { Prisma, RequestEventType, RequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const actorSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
} as const;

@Injectable()
export class RequestEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async append(
    requestId: number,
    type: RequestEventType,
    opts?: {
      actorId?: string | null;
      note?: string | null;
      fromStatus?: RequestStatus | null;
      toStatus?: RequestStatus | null;
    },
  ) {
    const now = new Date();
    const [event] = await this.prisma.$transaction([
      this.prisma.requestEvent.create({
        data: {
          requestId,
          type,
          actorId: opts?.actorId ?? null,
          note: opts?.note ?? null,
          fromStatus: opts?.fromStatus ?? null,
          toStatus: opts?.toStatus ?? null,
        },
        include: { actor: { select: actorSelect } },
      }),
      this.prisma.request.update({
        where: { id: requestId },
        data: { lastActivityAt: now },
      }),
    ]);
    return event;
  }

  async listForRequest(requestId: number, take = 100) {
    return this.prisma.requestEvent.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
      take,
      include: { actor: { select: actorSelect } },
    });
  }
}

export type RequestEventRow = Prisma.RequestEventGetPayload<{
  include: { actor: { select: typeof actorSelect } };
}>;
