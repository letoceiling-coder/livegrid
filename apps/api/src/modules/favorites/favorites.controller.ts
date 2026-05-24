import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators';
import { UpdateFavoriteDto } from '../retention/dto/retention.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List user favorites' })
  list(@CurrentUser('sub') userId: string) {
    return this.service.list(userId);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Get favorite block/listing IDs (for quick checks)' })
  ids(@CurrentUser('sub') userId: string) {
    return this.service.ids(userId);
  }

  @Post('block/:blockId')
  @ApiOperation({ summary: 'Add block to favorites' })
  addBlock(
    @CurrentUser('sub') userId: string,
    @Param('blockId', ParseIntPipe) blockId: number,
  ) {
    return this.service.addBlock(userId, blockId);
  }

  @Post('listing/:listingId')
  @ApiOperation({ summary: 'Add listing to favorites' })
  addListing(
    @CurrentUser('sub') userId: string,
    @Param('listingId', ParseIntPipe) listingId: number,
  ) {
    return this.service.addListing(userId, listingId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove from favorites by favorite ID' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update favorite note or collection' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFavoriteDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Mark favorite as viewed' })
  markViewed(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.markViewed(userId, id);
  }
}
