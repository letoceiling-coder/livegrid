import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import {
  CreateWizardDraftDto,
  ListingModerationDto,
  SaveWizardDraftDto,
  SubmitWizardDraftDto,
} from './dto/listing-wizard.dto';
import { ListingsWizardService } from './listings-wizard.service';
import type { ListingWizardUiKind } from '@lg/shared';

@ApiTags('Admin / Listings Wizard')
@ApiBearerAuth()
@Controller('admin/listings/wizard')
export class ListingsWizardController {
  constructor(private readonly wizard: ListingsWizardService) {}

  @Get('moderation-config')
  @Roles('agent')
  @ApiOperation({ summary: 'Настройки модерации объявлений' })
  moderationConfig() {
    return this.wizard.getModerationConfig();
  }

  @Post('drafts')
  @Roles('agent')
  @ApiOperation({ summary: 'Создать серверный черновик объявления' })
  createDraft(
    @Body() dto: CreateWizardDraftDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.wizard.createDraft(dto.regionId, dto.kind as ListingWizardUiKind | undefined, {
      userId,
      role,
    });
  }

  @Get(':id/draft')
  @Roles('agent')
  @ApiOperation({ summary: 'Загрузить черновик мастера (hydration)' })
  getDraft(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.wizard.getDraft(id, { userId, role });
  }

  @Put(':id/draft')
  @Roles('agent')
  @ApiOperation({ summary: 'Автосохранение черновика мастера' })
  saveDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveWizardDraftDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.wizard.saveDraft(id, dto, { userId, role });
  }

  @Post(':id/submit')
  @Roles('agent')
  @ApiOperation({ summary: 'Финализировать черновик (publish/draft/archive/review)' })
  submitDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitWizardDraftDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.wizard.submitDraft(id, dto, { userId, role });
  }

  @Patch(':id/moderation')
  @Roles('manager')
  @ApiOperation({ summary: 'Одобрить или отклонить объявление (moderation)' })
  moderate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ListingModerationDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.wizard.applyModeration(id, dto.action, { userId, role }, dto.note);
  }

  @Get(':id/history')
  @Roles('agent')
  @ApiOperation({ summary: 'История изменений объявления' })
  history(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit: string | undefined,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const n = limit ? Number.parseInt(limit, 10) : 30;
    return this.wizard.getEditHistory(id, { userId, role }, Number.isFinite(n) ? n : 30);
  }
}
