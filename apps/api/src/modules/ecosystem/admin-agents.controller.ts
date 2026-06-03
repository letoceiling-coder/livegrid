import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../auth/decorators';
import { EcosystemAdminAgentsService } from './ecosystem-admin-agents.service';
import { AdminSaveAgentDto } from './dto/ecosystem.dto';

@ApiTags('Admin / Agents')
@ApiBearerAuth()
@Controller('admin/agents')
export class AdminAgentsController {
  constructor(private readonly adminAgents: EcosystemAdminAgentsService) {}

  @Get()
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'List users with role agent and public profile summary' })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('per_page', new DefaultValuePipe(50), ParseIntPipe) perPage: number,
    @Query('search') search?: string,
  ) {
    return this.adminAgents.listAgents(page, perPage, search);
  }

  @Get(':userId')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Agent card edit payload' })
  getOne(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminAgents.getAgent(userId);
  }

  @Put(':userId')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Save agent user fields and ecosystem profile' })
  save(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdminSaveAgentDto,
  ) {
    return this.adminAgents.saveAgent(userId, dto);
  }

  @Post(':userId/avatar')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Upload agent avatar photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAvatar(
    @Param('userId', ParseUUIDPipe) userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.adminAgents.uploadAvatar(userId, file);
  }
}
