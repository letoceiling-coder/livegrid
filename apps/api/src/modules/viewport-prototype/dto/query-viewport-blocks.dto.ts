import { IntersectionType } from '@nestjs/swagger';
import { QueryBlocksDto } from '../../blocks/dto/query-blocks.dto';
import { QueryViewportBboxDto } from './query-viewport-bbox.dto';

/** Prototype blocks viewport — full catalog filters + bbox */
export class QueryViewportBlocksDto extends IntersectionType(QueryBlocksDto, QueryViewportBboxDto) {}
