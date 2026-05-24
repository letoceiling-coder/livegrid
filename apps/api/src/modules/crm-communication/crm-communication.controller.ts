import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import {
  CrmMessageType,
  CrmMessageVisibility,
} from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, Public, Roles } from '../../auth/decorators';
import { CrmCommunicationService } from './crm-communication.service';

class AppendThreadMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;

  @ApiPropertyOptional({ enum: CrmMessageType })
  @IsOptional()
  @IsEnum(CrmMessageType)
  type?: CrmMessageType;

  @ApiPropertyOptional({ enum: CrmMessageVisibility })
  @IsOptional()
  @IsEnum(CrmMessageVisibility)
  visibility?: CrmMessageVisibility;
}

class ScheduleCallbackDto {
  @ApiProperty()
  @IsISO8601()
  scheduledAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  channel?: string;
}

class ContactAttemptDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

class BuyerMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

@ApiTags('Admin / CRM Communication')
@ApiBearerAuth()
@Controller('admin/crm/communication')
export class CrmCommunicationAdminController {
  constructor(private readonly communication: CrmCommunicationService) {}

  @Get('conversations')
  @Roles('admin', 'editor', 'manager', 'agent')
  @ApiOperation({ summary: 'Agent inbox — active conversations' })
  listConversations(
    @CurrentUser('sub') userId: string,
    @Query('filter') filter?: 'all' | 'pending' | 'callbacks',
  ) {
    return this.communication.listConversationsForAgent(userId, filter ?? 'all');
  }

  @Get('metrics')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Communication observability metrics (DEV/admin)' })
  metrics() {
    return this.communication.getCommunicationMetrics();
  }
}

@ApiTags('Admin / Request Communication')
@ApiBearerAuth()
@Controller('admin/requests')
export class RequestCommunicationController {
  constructor(private readonly communication: CrmCommunicationService) {}

  @Get(':id/communication')
  @Roles('admin', 'editor', 'manager', 'agent')
  @ApiOperation({ summary: 'Thread + messages for CRM request' })
  getThread(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.communication.getThreadForRequest(id, userId, role);
  }

  @Post(':id/communication/messages')
  @Roles('admin', 'editor', 'manager', 'agent')
  @ApiOperation({ summary: 'Append message to request thread' })
  async appendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AppendThreadMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    const thread = await this.communication.ensureThreadForRequest(id);
    return this.communication.appendMessage({
      threadId: thread.id,
      type: dto.type ?? CrmMessageType.NOTE,
      visibility: dto.visibility ?? CrmMessageVisibility.INTERNAL,
      body: dto.body,
      actorId: userId,
      requestId: id,
    });
  }

  @Post(':id/communication/contact')
  @Roles('admin', 'editor', 'manager', 'agent')
  @ApiOperation({ summary: 'Log contact attempt' })
  async contactAttempt(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ContactAttemptDto,
    @CurrentUser('sub') userId: string,
  ) {
    const thread = await this.communication.ensureThreadForRequest(id);
    return this.communication.appendMessage({
      threadId: thread.id,
      type: CrmMessageType.CONTACT_ATTEMPT,
      visibility: CrmMessageVisibility.INTERNAL,
      body: dto.body,
      actorId: userId,
      requestId: id,
    });
  }

  @Post(':id/communication/callback')
  @Roles('admin', 'editor', 'manager', 'agent')
  @ApiOperation({ summary: 'Schedule callback' })
  async scheduleCallback(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScheduleCallbackDto,
    @CurrentUser('sub') userId: string,
  ) {
    const thread = await this.communication.ensureThreadForRequest(id);
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduledAt');
    }
    const body = dto.note?.trim() || `Обратный звонок запланирован на ${scheduledAt.toLocaleString('ru-RU')}`;
    return this.communication.appendMessage({
      threadId: thread.id,
      type: CrmMessageType.CALLBACK_SCHEDULED,
      visibility: CrmMessageVisibility.INTERNAL,
      body,
      actorId: userId,
      requestId: id,
      meta: { scheduledAt: scheduledAt.toISOString(), channel: dto.channel ?? 'phone' },
    });
  }
}

@ApiTags('Public / Inquiry Communication')
@Controller('communication/inquiry')
export class BuyerCommunicationController {
  constructor(private readonly communication: CrmCommunicationService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Buyer inquiry thread history (token from form submit)' })
  getThread(@Param('token') token: string) {
    return this.communication.getBuyerThread(token);
  }

  @Public()
  @Post(':token/messages')
  @ApiOperation({ summary: 'Buyer reply on inquiry thread' })
  appendMessage(@Param('token') token: string, @Body() dto: BuyerMessageDto) {
    return this.communication.appendBuyerMessage(token, dto.body);
  }
}
