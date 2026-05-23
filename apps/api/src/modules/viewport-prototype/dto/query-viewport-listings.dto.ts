import { IntersectionType } from '@nestjs/swagger';
import { QueryListingsDto } from '../../listings/dto/query-listings.dto';
import { QueryViewportBboxDto } from './query-viewport-bbox.dto';

/** Prototype listings viewport — full catalog filters + bbox */
export class QueryViewportListingsDto extends IntersectionType(QueryListingsDto, QueryViewportBboxDto) {}
