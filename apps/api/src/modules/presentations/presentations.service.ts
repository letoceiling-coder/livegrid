import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type PDFKit from 'pdfkit';
import { ListingKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  formatPdfFooterContact,
  formatPdfHeaderAgentLine,
  listingPdfParamRows,
  PDF_BRAND_COLOR,
  PDF_TEXT_DARK,
  PDF_TEXT_MUTED,
  resolveGeoPoint,
  yandexStaticMapImageUrl,
  type PdfAgentContact,
} from './presentation-pdf';
import type { ListingPresentationPayload, PresentationPayload } from './presentation.types';

export type { ListingPresentationPayload, PresentationPayload } from './presentation.types';

function listingKindLabel(kind: ListingKind): string {
  const m: Record<ListingKind, string> = {
    APARTMENT: 'Квартира',
    HOUSE: 'Дом',
    LAND: 'Участок',
    COMMERCIAL: 'Коммерция',
    PARKING: 'Машиноместо',
  };
  return m[kind] ?? String(kind);
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&laquo;/gi, '«')
    .replace(/&raquo;/gi, '»')
    .replace(/&hellip;/gi, '…');
}

function normalizeDescription(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const decoded = decodeHtmlEntities(raw);
  const withBreaks = decoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n');
  const text = withBreaks
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return text.length > 0 ? text : null;
}

function quarterLabel(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  return `${value.getUTCFullYear()} Q${Math.ceil((value.getUTCMonth() + 1) / 3)}`;
}

function roomLabel(raw: string | null | undefined): string {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('студ')) return 'Студии';
  const m = t.match(/\b(\d)\b/);
  if (m) return `${m[1]}-комн.`;
  return 'Другие';
}

function extraPhotoUrlsFromJson(j: unknown): string[] {
  if (!Array.isArray(j)) return [];
  return j.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const k = u.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

@Injectable()
export class PresentationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySlug(slug: string): Promise<PresentationPayload> {
    const block = await this.prisma.block.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        builder: { select: { name: true } },
        addresses: { take: 1, orderBy: { id: 'asc' }, select: { address: true } },
        images: { take: 1, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { url: true } },
        subways: {
          take: 1,
          orderBy: [{ distanceTime: 'asc' }, { id: 'asc' }],
          select: {
            distanceTime: true,
            subway: { select: { name: true } },
          },
        },
        buildings: {
          where: { deadline: { not: null } },
          orderBy: { deadline: 'asc' },
          select: { deadline: true },
        },
      },
    });
    if (!block) throw new NotFoundException('Block not found');

    const listings = await this.prisma.listing.findMany({
      where: {
        blockId: block.id,
        kind: 'APARTMENT',
        status: 'ACTIVE',
        isPublished: true,
      },
      select: {
        price: true,
        builder: { select: { name: true } },
        apartment: {
          select: {
            roomType: { select: { name: true } },
          },
        },
      },
      orderBy: { price: 'asc' },
    });

    const metro = block.subways[0]
      ? `${block.subways[0].subway.name}${block.subways[0].distanceTime != null ? ` · ${block.subways[0].distanceTime} мин` : ''}`
      : null;
    const priceValues = listings
      .map((x) => (x.price == null ? null : Number(x.price)))
      .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    const roomMixMap = new Map<string, { label: string; count: number; priceFrom: number | null }>();
    for (const row of listings) {
      const label = roomLabel(row.apartment?.roomType?.name);
      const price = row.price == null ? null : Number(row.price);
      const current = roomMixMap.get(label);
      if (!current) {
        roomMixMap.set(label, { label, count: 1, priceFrom: Number.isFinite(price ?? NaN) ? (price as number) : null });
        continue;
      }
      current.count += 1;
      if (price != null && Number.isFinite(price) && (current.priceFrom == null || price < current.priceFrom)) {
        current.priceFrom = price;
      }
    }
    const roomMix = Array.from(roomMixMap.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const deadlineValues = block.buildings
      .map((x) => x.deadline)
      .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
    const deadlineFrom = quarterLabel(deadlineValues[0] ?? null);
    const deadlineTo = quarterLabel(deadlineValues[deadlineValues.length - 1] ?? null);
    const deadline =
      deadlineFrom && deadlineTo
        ? deadlineFrom === deadlineTo
          ? deadlineFrom
          : `${deadlineFrom} - ${deadlineTo}`
        : deadlineFrom ?? null;
    const fallbackBuilder =
      listings
        .map((x) => x.builder?.name?.trim() ?? '')
        .find((name) => name.length > 0) ?? null;

    return {
      slug: block.slug,
      name: block.name,
      description: normalizeDescription(block.description),
      imageUrl: block.images[0]?.url ?? null,
      address: block.addresses[0]?.address ?? null,
      metro,
      builder: block.builder?.name ?? fallbackBuilder,
      deadline,
      availableApartments: listings.length,
      priceFrom: priceValues.length ? Math.min(...priceValues) : null,
      priceTo: priceValues.length ? Math.max(...priceValues) : null,
      roomMix,
      generatedAt: new Date().toISOString(),
    };
  }

  async generatePdf(slug: string, creatorUserId?: string): Promise<Buffer> {
    const p = await this.getBySlug(slug);
    const contact = await this.resolvePdfAgentContact(creatorUserId);
    const { doc, chunks } = this.createPdfDoc();
    this.drawPdfBrandHeader(doc, contact);

    doc.font('Bold').fontSize(22).fillColor(PDF_BRAND_COLOR).text(p.name, { align: 'left' });
    doc.moveDown(0.5);
    doc.font('Regular').fontSize(11).fillColor('#666666').text('Краткая презентация для клиента');
    doc.moveDown();

    doc.fillColor('#000000').fontSize(12);
    if (p.address) doc.font('Regular').text('Адрес: ' + p.address);
    if (p.builder) doc.font('Regular').text('Застройщик: ' + p.builder);
    if (p.metro) doc.font('Regular').text('Метро: ' + p.metro);
    if (p.deadline) doc.font('Regular').text('Срок сдачи: ' + p.deadline);
    if (p.availableApartments > 0) {
      doc.font('Regular').text('Квартир в наличии: ' + p.availableApartments);
    }
    if (p.priceFrom != null) {
      const range =
        p.priceTo != null && p.priceTo !== p.priceFrom
          ? `${new Intl.NumberFormat('ru-RU').format(p.priceFrom)} - ${new Intl.NumberFormat('ru-RU').format(p.priceTo)} руб.`
          : `${new Intl.NumberFormat('ru-RU').format(p.priceFrom)} руб.`;
      doc.font('Regular').text('Диапазон цен: ' + range);
    }

    if (p.description?.trim()) {
      doc.moveDown();
      doc.font('Bold').fontSize(12).fillColor('#000000').text('Описание:');
      doc.moveDown(0.3);
      doc.font('Regular').fontSize(11).fillColor('#1f1f1f').text(p.description.trim(), { align: 'left' });
    }

    if (p.roomMix.length > 0) {
      doc.moveDown();
      doc.font('Bold').fontSize(12).fillColor('#000000').text('Квартиры в наличии:');
      doc.moveDown(0.3);
      doc.font('Regular').fontSize(11).fillColor('#1f1f1f');
      for (const row of p.roomMix.slice(0, 8)) {
        const priceText =
          row.priceFrom != null
            ? `от ${new Intl.NumberFormat('ru-RU').format(row.priceFrom)} руб.`
            : 'цена по запросу';
        doc.text(`- ${row.label}: ${row.count} шт., ${priceText}`);
      }
    }

    doc.moveDown();
    doc.font('Regular').fontSize(9).fillColor(PDF_TEXT_MUTED).text('Сформировано: ' + new Date(p.generatedAt).toLocaleString('ru-RU'));
    this.drawPdfFooterBar(doc, contact);
    return this.pdfFinish(doc, chunks);
  }

  private siteBase(): string {
    return (process.env.PUBLIC_SITE_URL ?? 'https://livegrid.ru').replace(/\/+$/, '');
  }

  private toAbsoluteUrl(url: string): string {
    const u = url.trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    return `${this.siteBase()}${u.startsWith('/') ? '' : '/'}${u}`;
  }

  private async fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
      const abs = this.toAbsoluteUrl(url);
      const res = await fetch(abs, { redirect: 'follow' });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  async getListingPresentation(listingId: number): Promise<ListingPresentationPayload> {
    const row = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        apartment: { include: { roomType: true, finishing: true } },
        house: true,
        land: true,
        commercial: true,
        parking: true,
        region: true,
        district: true,
        builder: true,
        block: { select: { name: true, slug: true, latitude: true, longitude: true } },
      },
    });
    if (!row) throw new NotFoundException('Listing not found');
    if (!row.isPublished || row.status !== 'ACTIVE') {
      throw new NotFoundException('Listing not available');
    }

    const media = await this.prisma.mediaFile.findMany({
      where: { entityType: 'listing', entityId: listingId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const rawPhotos: string[] = [];
    const rawPlans: string[] = [];
    for (const m of media) {
      const u = m.url?.trim();
      if (!u) continue;
      if (m.kind === 'PLAN') rawPlans.push(u);
      else if (m.kind === 'PHOTO') rawPhotos.push(u);
    }

    if (row.kind === 'APARTMENT' && row.apartment) {
      const a = row.apartment;
      if (a.planUrl?.trim()) rawPlans.push(a.planUrl.trim());
      if (a.finishingPhotoUrl?.trim()) rawPhotos.push(a.finishingPhotoUrl.trim());
      rawPhotos.push(...extraPhotoUrlsFromJson(a.extraPhotoUrls));
    }
    if (row.kind === 'HOUSE' && row.house) {
      const h = row.house;
      if (h.photoUrl?.trim()) rawPhotos.push(h.photoUrl.trim());
      rawPhotos.push(...extraPhotoUrlsFromJson(h.extraPhotoUrls));
    }
    if (row.kind === 'LAND' && row.land) {
      const land = row.land;
      if (land.photoUrl?.trim()) rawPhotos.push(land.photoUrl.trim());
      rawPhotos.push(...extraPhotoUrlsFromJson(land.extraPhotoUrls));
    }

    const planUrls = dedupeUrls(rawPlans);
    const photoUrls = dedupeUrls(rawPhotos.filter((u) => !planUrls.includes(u)));

    const kl = listingKindLabel(row.kind);
    let subtitle: string | null = null;
    switch (row.kind) {
      case 'APARTMENT': {
        const a = row.apartment;
        if (a) {
          const parts: string[] = [];
          if (a.roomType?.name?.trim()) parts.push(a.roomType.name.trim());
          if (a.areaTotal != null && Number(a.areaTotal) > 0) parts.push(`${Number(a.areaTotal)} м²`);
          if (a.floor != null)
            parts.push(`этаж ${a.floor}${a.floorsTotal != null ? ` из ${a.floorsTotal}` : ''}`);
          subtitle = parts.length ? parts.join(' · ') : null;
        }
        break;
      }
      case 'HOUSE': {
        const h = row.house;
        if (h?.areaTotal != null && Number(h.areaTotal) > 0) subtitle = `${Number(h.areaTotal)} м²`;
        break;
      }
      case 'LAND': {
        const land = row.land;
        if (land?.areaSotki != null && Number(land.areaSotki) > 0)
          subtitle = `${Number(land.areaSotki)} сот.`;
        break;
      }
      case 'COMMERCIAL': {
        const c = row.commercial;
        if (c?.area != null && Number(c.area) > 0) subtitle = `${Number(c.area)} м²`;
        break;
      }
      case 'PARKING': {
        const pk = row.parking;
        if (pk?.area != null && Number(pk.area) > 0) subtitle = `${Number(pk.area)} м²`;
        break;
      }
      default:
        break;
    }

    const titleFallback = subtitle ? `${kl} · ${subtitle}` : kl;
    const title = row.title?.trim() || titleFallback;

    const price =
      row.price != null && Number.isFinite(Number(row.price)) ? Number(row.price) : null;

    const geo = resolveGeoPoint({
      lat: row.lat,
      lng: row.lng,
      blockLat: row.block?.latitude,
      blockLng: row.block?.longitude,
    });

    return {
      listingId: row.id,
      kind: row.kind,
      kindLabel: kl,
      title,
      description: normalizeDescription(row.description),
      price,
      address: row.address?.trim() ?? null,
      region: row.region?.name ?? null,
      district: row.district?.name ?? null,
      builder: row.builder?.name ?? null,
      blockName: row.block?.name ?? null,
      blockSlug: row.block?.slug ?? null,
      subtitle,
      photoUrls,
      planUrls,
      latitude: geo?.lat ?? null,
      longitude: geo?.lng ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Контакты агента/создателя PDF (имя, телефон, email). */
  async resolvePdfAgentContact(
    creatorUserId?: string,
    listingOwnerUserId?: string | null,
  ): Promise<PdfAgentContact | null> {
    const userId = creatorUserId ?? listingOwnerUserId ?? undefined;
    if (!userId) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        phone: true,
        email: true,
        agencyProfile: { select: { displayName: true, phone: true, email: true } },
      },
    });
    if (!user) return null;

    const name =
      user.fullName?.trim() ||
      user.agencyProfile?.displayName?.trim() ||
      null;
    const phone = user.phone?.trim() || user.agencyProfile?.phone?.trim() || null;
    const email = user.email?.trim() || user.agencyProfile?.email?.trim() || null;

    if (!name && !phone && !email) return null;
    return { name, phone, email };
  }

  private pdfFonts(): { regular: string; bold: string } {
    return {
      regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    };
  }

  private createPdfDoc(): { doc: PDFKit.PDFDocument; chunks: Buffer[] } {
    const { regular, bold } = this.pdfFonts();
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.registerFont('Regular', regular);
    doc.registerFont('Bold', bold);
    doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    return { doc, chunks };
  }

  private pdfFinish(doc: PDFKit.PDFDocument, chunks: Buffer[]): Promise<Buffer> {
    doc.end();
    return new Promise<Buffer>((resolve, reject) => {
      doc.once('end', () => resolve(Buffer.concat(chunks)));
      doc.once('error', reject);
    });
  }

  private drawPdfBrandHeader(doc: PDFKit.PDFDocument, contact: PdfAgentContact | null): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const y0 = doc.y;

    doc.font('Bold').fontSize(16).fillColor(PDF_BRAND_COLOR).text('LiveGrid', left, y0, { lineBreak: false });
    doc.font('Regular').fontSize(8).fillColor(PDF_TEXT_MUTED).text('Платформа недвижимости', left, y0 + 18, {
      lineBreak: false,
    });

    const agentLine = formatPdfHeaderAgentLine(contact);
    if (agentLine) {
      doc.font('Regular').fontSize(9).fillColor(PDF_TEXT_DARK).text(agentLine, left, y0, {
        width: right - left,
        align: 'right',
      });
    }

    const headerBottom = Math.max(y0 + 32, doc.y);
    doc
      .moveTo(left, headerBottom + 6)
      .lineTo(right, headerBottom + 6)
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .stroke();
    doc.y = headerBottom + 14;
    return doc.y;
  }

  private drawPdfFooterBar(doc: PDFKit.PDFDocument, contact: PdfAgentContact | null): void {
    const footerLine = formatPdfFooterContact(contact);
    if (!footerLine) return;
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const bottom = doc.page.height - doc.page.margins.bottom;
    doc
      .font('Regular')
      .fontSize(8)
      .fillColor(PDF_TEXT_MUTED)
      .text(`По вопросам: ${footerLine}`, left, bottom - 28, { width: right - left, align: 'center' });
  }

  private drawPdfParamTable(doc: PDFKit.PDFDocument, rows: ReturnType<typeof listingPdfParamRows>): void {
    const left = doc.page.margins.left;
    const colW = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2;
    for (const row of rows) {
      const y = doc.y;
      doc.font('Regular').fontSize(9).fillColor(PDF_TEXT_MUTED).text(row.label, left, y, {
        width: colW - 8,
        lineBreak: false,
      });
      doc.font('Regular').fontSize(10).fillColor(PDF_TEXT_DARK).text(row.value, left + colW, y, {
        width: colW,
      });
      doc.moveDown(0.35);
    }
  }

  private async renderListingPdfFirstPage(
    doc: PDFKit.PDFDocument,
    p: ListingPresentationPayload,
    contact: PdfAgentContact | null,
  ): Promise<void> {
    this.drawPdfBrandHeader(doc, contact);
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const heroUrl = p.photoUrls[0];
    if (heroUrl) {
      const hero = await this.fetchImageBuffer(heroUrl);
      if (hero) {
        try {
          doc.image(hero, { width: contentWidth, height: 200 });
          doc.moveDown(0.6);
        } catch {
          /* skip broken hero */
        }
      }
    }

    doc.font('Bold').fontSize(18).fillColor(PDF_BRAND_COLOR).text(p.title, { align: 'left' });
    doc.moveDown(0.35);
    if (p.price != null && Number.isFinite(p.price)) {
      doc
        .font('Bold')
        .fontSize(16)
        .fillColor(PDF_TEXT_DARK)
        .text(`${new Intl.NumberFormat('ru-RU').format(Math.trunc(p.price))} ₽`);
      doc.moveDown(0.5);
    }

    doc.font('Bold').fontSize(11).fillColor(PDF_BRAND_COLOR).text('Параметры');
    doc.moveDown(0.3);
    this.drawPdfParamTable(doc, listingPdfParamRows(p));

    if (p.description?.trim()) {
      doc.moveDown(0.4);
      doc.font('Bold').fontSize(11).fillColor(PDF_BRAND_COLOR).text('Описание');
      doc.moveDown(0.2);
      doc.font('Regular').fontSize(10).fillColor(PDF_TEXT_DARK).text(p.description.trim());
    }

    if (p.latitude != null && p.longitude != null) {
      const mapBuf = await this.fetchImageBuffer(yandexStaticMapImageUrl(p.latitude, p.longitude));
      doc.moveDown(0.5);
      doc.font('Bold').fontSize(11).fillColor(PDF_BRAND_COLOR).text('Расположение');
      doc.moveDown(0.25);
      if (mapBuf) {
        try {
          doc.image(mapBuf, { width: contentWidth, height: 140 });
        } catch {
          doc.font('Regular').fontSize(9).fillColor(PDF_TEXT_MUTED).text(p.address ?? 'Карта недоступна');
        }
      } else if (p.address) {
        doc.font('Regular').fontSize(10).fillColor(PDF_TEXT_DARK).text(p.address);
      }
    }

    this.drawPdfFooterBar(doc, contact);
  }

  async generateListingPdf(listingId: number, creatorUserId?: string): Promise<Buffer> {
    const row = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerUserId: true },
    });
    const p = await this.getListingPresentation(listingId);
    const contact = await this.resolvePdfAgentContact(creatorUserId, row?.ownerUserId);

    const { doc, chunks } = this.createPdfDoc();
    await this.renderListingPdfFirstPage(doc, p, contact);

    const fit = { fit: [500, 700] as [number, number] };

    const plans = p.planUrls.slice(0, 10);
    for (let i = 0; i < plans.length; i++) {
      const url = plans[i];
      const buf = await this.fetchImageBuffer(url);
      doc.addPage();
      this.drawPdfBrandHeader(doc, contact);
      doc.font('Bold').fontSize(13).fillColor(PDF_BRAND_COLOR).text(`Планировка (${i + 1}/${plans.length})`);
      doc.moveDown(0.4);
      if (buf) {
        try {
          doc.image(buf, fit);
        } catch {
          doc.font('Regular').fontSize(10).fillColor(PDF_TEXT_MUTED).text('Не удалось встроить изображение.');
        }
      } else {
        doc.font('Regular').fontSize(10).fillColor(PDF_TEXT_MUTED).text('Изображение недоступно по ссылке.');
      }
      this.drawPdfFooterBar(doc, contact);
    }

    const photos = p.photoUrls.slice(1, 15);
    for (let i = 0; i < photos.length; i++) {
      const url = photos[i];
      const buf = await this.fetchImageBuffer(url);
      doc.addPage();
      this.drawPdfBrandHeader(doc, contact);
      doc.font('Bold').fontSize(13).fillColor(PDF_BRAND_COLOR).text(`Фото (${i + 2}/${p.photoUrls.length})`);
      doc.moveDown(0.4);
      if (buf) {
        try {
          doc.image(buf, fit);
        } catch {
          doc.font('Regular').fontSize(10).fillColor(PDF_TEXT_MUTED).text('Не удалось встроить изображение.');
        }
      } else {
        doc.font('Regular').fontSize(10).fillColor(PDF_TEXT_MUTED).text('Изображение недоступно по ссылке.');
      }
      this.drawPdfFooterBar(doc, contact);
    }

    return this.pdfFinish(doc, chunks);
  }
}
