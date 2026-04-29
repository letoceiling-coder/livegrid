function formatPrice(price) {
    if (!price || price <= 0)
        return 'цена по запросу';
    const mln = price / 1_000_000;
    const rounded = mln >= 10 ? Math.round(mln).toString() : mln.toFixed(1).replace('.0', '');
    return `от ${rounded} млн ₽`;
}
function formatStatus(status, deadline) {
    if (status === 'completed')
        return '✅ Сдан';
    const normalizedDeadline = normalizeDeadline(deadline);
    if (!normalizedDeadline)
        return '🔑 Строится';
    return `🔑 Строится • Сдача ${normalizedDeadline}`;
}
function roomsLabel(rooms) {
    if (rooms === 0)
        return 'студии';
    return `${rooms}к`;
}
function normalizeDeadline(deadline) {
    if (!deadline)
        return null;
    const raw = deadline.trim();
    const qMatch = raw.match(/Q([1-4])\s*(20\d{2})/i);
    if (qMatch)
        return `Q${qMatch[1]} ${qMatch[2]}`;
    const kvartalMatch = raw.match(/(20\d{2})\s*([1-4])\s*квартал/i);
    if (kvartalMatch)
        return `Q${kvartalMatch[2]} ${kvartalMatch[1]}`;
    const altMatch = raw.match(/([1-4])\s*квартал\s*(20\d{2})/i);
    if (altMatch)
        return `Q${altMatch[1]} ${altMatch[2]}`;
    return raw;
}
export function renderComplexCard(item) {
    const district = item.district?.name ?? 'район не указан';
    const metro = item.subway?.name ? ` • м. ${item.subway.name}${item.subwayDistance ? ` (${item.subwayDistance})` : ''}` : '';
    const rooms = (item.roomsBreakdown ?? []).slice(0, 5).map((r) => roomsLabel(r.rooms)).join(' • ');
    return [
        `🏗 ${item.name}`,
        `📍 ${district}${metro}`,
        `💰 ${formatPrice(item.priceFrom)}`,
        formatStatus(item.status, item.deadline),
        rooms ? `🛏 ${rooms}` : '',
    ]
        .filter(Boolean)
        .join('\n');
}
