import { Controller, Get, Headers, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../auth/decorators';
import { SitemapService } from './sitemap.service';

@ApiTags('Sitemap')
@Controller('sitemap')
export class SitemapController {
  constructor(private readonly service: SitemapService) {}

  @Public()
  @Get('sitemap-index.xml')
  @ApiOperation({ summary: 'Sitemap index (chunked entity URLs)' })
  serveIndex(@Headers('accept-encoding') acceptEncoding: string | undefined, @Res() res: Response) {
    return this.serveFile('sitemap-index.xml', acceptEncoding, res);
  }

  @Public()
  @Get(':filename')
  @ApiOperation({ summary: 'Sitemap chunk file' })
  serveChunk(
    @Param('filename') filename: string,
    @Headers('accept-encoding') acceptEncoding: string | undefined,
    @Res() res: Response,
  ) {
    return this.serveFile(filename, acceptEncoding, res);
  }

  private serveFile(filename: string, acceptEncoding: string | undefined, res: Response) {
    const acceptGzip = (acceptEncoding ?? '').includes('gzip');
    const file = this.service.readFileForServe(filename, acceptGzip);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (file.encoding) res.setHeader('Content-Encoding', file.encoding);
    res.send(file.body);
  }
}
