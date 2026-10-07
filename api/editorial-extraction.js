'use strict';
// Bounded structural extraction; no network, guessed dates or execution of page code.
function dateValue(value) {
    if (typeof value !== 'string') return null;
    let v = value.trim();
    const br = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?)(?:\s*(Z|[+-]\d{2}:?\d{2}))?)?$/.exec(v);
    if (br) v = `${br[3]}-${br[2]}-${br[1]}` + (br[4] ? 'T' + br[4] + (br[5] || '') : '');
    if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(v) && !/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+.*(?:GMT|UTC|[+-]\d{4})$/i.test(v)) return null;
    const stamp = Date.parse(v);
    if (!Number.isFinite(stamp)) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(stamp).toISOString().slice(0,10) !== v) return null;
    return new Date(stamp).toISOString().slice(0,10);
}
function resolveDate(data, html, metadata) {
    const candidates = [
        [data.datePublished,'JSON_LD_DATE_PUBLISHED'], [data.dateCreated,'JSON_LD_DATE_CREATED'],
        [metadata(html,'article:published_time'),'ARTICLE_PUBLISHED_TIME'], [metadata(html,'og:published_time'),'OG_PUBLISHED_TIME'],
        ...['date','pubdate','publishdate','datePublished','parsely-pub-date','sailthru.date','DC.date.issued'].map(k=>[metadata(html,k),'HTML_META'])
    ];
    // uploadDate is publication metadata only for the article itself, never a nested video.
    if ([].concat(data['@type'] || []).some(t=>/^(Article|NewsArticle|BlogPosting)$/.test(t))) candidates.push([data.uploadDate,'JSON_LD_UPLOAD_DATE']);
    for (const [v, dateSource] of candidates) { const publishedAt = dateValue(v); if (publishedAt) return {publishedAt,dateSource}; }
    return {publishedAt:null,dateSource:'DATE_UNKNOWN'};
}
function bodyText(html, plain) {
    const stack = [], paragraphs = [], zones = [];
    const voids = /^(meta|link|img|br|hr|input|source|embed|wbr)$/;
    const cleaned = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
    for (const match of cleaned.matchAll(/<\/?([a-z][\w:-]*)\b[^>]*>/gi)) {
        const tag = match[1].toLowerCase(), closing = match[0][1] === '/';
        if (closing) {
            const index = stack.map(x=>x.tag).lastIndexOf(tag);
            if (index < 0) continue;
            const node = stack[index];
            if (/^(p|h2|h3)$/.test(tag) && node.editorial && !node.excluded) {
                const text = plain(cleaned.slice(node.start,match.index));
                if (text && !/^(?:\+\s|compartilhe|leia também|assine|publicidade|newsletter|aceitar cookies|todos os direitos)/i.test(text)) paragraphs.push(text);
            }
            if (node.editorial && !node.excluded && /^(article|main)$/.test(tag)) zones.push(tag);
            stack.length = index; continue;
        }
        const parent = stack.at(-1);
        const editorial = parent?.editorial || /^(article|main)$/.test(tag) || /itemprop\s*=\s*["']articleBody["']/i.test(match[0]);
        const excluded = parent?.excluded || /^(nav|footer|aside|form)$/.test(tag) || /(?:class|id)\s*=\s*["'][^"']*(?:cookie|newsletter|breadcrumb|share-bar|publicidade|content-ads|related|ultimas-noticias|menu|navigation|content-publication|content__signature|content__signa-share|cxm-block-video)[^"']*["']/i.test(match[0]);
        if (!voids.test(tag) && !/\/>$/.test(match[0])) stack.push({tag,start:match.index+match[0].length,editorial,excluded});
    }
    return { paragraphs:[...new Set(paragraphs)].slice(0,16), semantic:zones.length>0 };
}
function pageType(html, data, url) {
    const typed = [].concat(data['@type'] || []).some(t=>/^(Article|NewsArticle|BlogPosting)$/.test(t));
    const marked = /item(?:type|prop)\s*=\s*["'][^"']*(?:NewsArticle|articleBody)/i.test(html) || /article:published_time/i.test(html);
    const section = /\/models-and-research\/[^/]+\/?$/.test(new URL(url).pathname);
    return section && !typed && !marked ? 'DISCOVERY_PAGE' : typed || marked || /<article\b/i.test(html) ? 'ARTICLE_PAGE' : 'DISCOVERY_PAGE';
}
function evidenceQuality(units, bodyUnits) {
    const words = units.map(x=>x.text).join(' ').split(/\s+/).filter(Boolean).length;
    if (bodyUnits.length >= 2 && words >= 25) return 'FULL_EVIDENCE';
    if (words >= 25 && units.length) return 'PARTIAL_EVIDENCE';
    return 'INSUFFICIENT_EVIDENCE';
}
module.exports = { dateValue, resolveDate, bodyText, pageType, evidenceQuality };
