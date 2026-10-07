'use strict';

const config = require('./editorial-v2-config.json');
const { sourcePlan, publicUrl, evidenceUnits, normalizeCandidate, rankPool, classifyArticleUrl } = require('./editorial-pool');
const extraction = require('./editorial-extraction');

function plain(value) {
    return String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, ' ')
        .replace(/<[^>]*>/g, ' ').replace(/&(?:amp|quot|apos|lt|gt|nbsp);|&#(?:\d+|x[\da-f]+);/gi, entity => {
            const known = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
            if (known[entity.toLowerCase()]) return known[entity.toLowerCase()];
            const n = entity[2].toLowerCase() === 'x' ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1));
            return Number.isInteger(n) && n >= 32 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : ' ';
        }).replace(/\s+/g, ' ').trim();
}
function attribute(tag, name) {
    return plain(new RegExp('\\b' + name + '\\s*=\\s*["\']([^"\']*)["\']', 'i').exec(tag)?.[1] || '');
}
function metadata(html, name) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
        if ([attribute(tag, 'name'), attribute(tag, 'property'), attribute(tag, 'itemprop')].includes(name)) return attribute(tag, 'content');
    }
    return '';
}
function dateValue(value) {
    return extraction.dateValue(value);
}
function categoryFor(source, text) {
    const choices = source.categories;
    if (choices.length === 1) return choices[0];
    const mapping = { economia: /econom|infla|invest|juros|pib|mercado/i, oportunidades: /inscri|vagas|gratuit|curso|oportun/i,
        concursosCarreira: /concurso|edital|carreira/i, clima: /clima|chuva|tempo|meteorol/i };
    return choices.find(key => mapping[key]?.test(text)) || choices[0];
}
function decorate(item, source, date) {
    let url, fetchUrl;
    try { fetchUrl = new URL(item.url, source.url).href; url = publicUrl(fetchUrl); } catch { return null; }
    if (!url || new URL(url).hostname !== new URL(source.url).hostname || !new RegExp(source.articlePattern).test(new URL(url).pathname)) return null;
    return { ...item, url, _fetchUrl: fetchUrl, sourceName: source.name, quality: source.quality, category: categoryFor(source, item.title + ' ' + item.evidenceText),
        teamId: source.teamId || null, collectedAt: date };
}
function feedItems(xml, source, date) {
    const declarations = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
    if (/<!DOCTYPE|<!ENTITY/i.test(declarations)) throw Object.assign(new Error('Entidades externas não permitidas'), { code: 'UNSAFE_FEED' });
    const result = [];
    for (const match of xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
        if (result.length >= config.maxDiscovered) break;
        const body = match[2];
        const tag = name => plain(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'i').exec(body)?.[1]);
        const link = tag('link') || attribute(body.match(/<link\b[^>]*\brel=["']alternate["'][^>]*>/i)?.[0] || body.match(/<link\b[^>]*>/i)?.[0] || '', 'href');
        const value = decorate({ title: tag('title'), url: link,
            publishedAt: dateValue(tag('pubDate') || tag('published') || tag('updated')),
            dateSource: tag('pubDate') ? 'RSS_PUBDATE' : tag('published') ? 'ATOM_PUBLISHED' : tag('updated') ? 'ATOM_UPDATED' : 'DATE_UNKNOWN',
            pageType: 'ARTICLE_PAGE',
            evidenceText: evidenceUnits(tag('content:encoded') || tag('content') || tag('description') || tag('summary')).map(item => item.text).join(' '),
            imageUrl: attribute(body.match(/<(?:media:content|enclosure)\b[^>]*>/i)?.[0] || '', 'url'), imageSource: link }, source, date);
        if (value) { value.evidenceQuality = extraction.evidenceQuality(evidenceUnits(value.evidenceText), tag('content:encoded') || tag('content') ? evidenceUnits(value.evidenceText) : []); result.push(value); }
    }
    return result;
}
function linkedData(html) {
    const result = [];
    for (const block of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            const queue = [JSON.parse(block[1])];
            for (let i = 0; i < queue.length && i < 200; i++) {
                const item = queue[i];
                if (Array.isArray(item)) queue.push(...item);
                else if (item && typeof item === 'object') {
                    result.push(item);
                    // Explicit metadata containers, never arbitrary recursive page traversal.
                    for (const key of ['@graph', 'itemListElement', 'item']) if (item[key]) queue.push(item[key]);
                }
            }
        } catch { /* Broken metadata does not authorize invented content. */ }
    }
    return result;
}
function articleMetadata(html, url) {
    const data = linkedData(html).find(item => [].concat(item['@type'] || []).some(type => /^(?:NewsArticle|Article|BlogPosting)$/.test(type))) || {};
    const body = extraction.bodyText(html, plain);
    const bodyUnits = evidenceUnits([plain(data.articleBody || ''), ...body.paragraphs].filter(Boolean).join(' '));
    const description = plain(data.description || metadata(html, 'og:description') || metadata(html, 'description'));
    const evidence = evidenceUnits([...new Set([...bodyUnits.map(x=>x.text), ...evidenceUnits(description).map(x=>x.text)])].join(' '));
    const pageType = extraction.pageType(html, data, url);
    return { url, title: plain(data.headline || /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] || metadata(html, 'og:title')),
        ...extraction.resolveDate(data, html, metadata), pageType,
        evidenceQuality: pageType === 'ARTICLE_PAGE' ? extraction.evidenceQuality(evidence, bodyUnits) : 'INSUFFICIENT_EVIDENCE',
        evidenceText: pageType === 'ARTICLE_PAGE' ? evidence.map(item => item.text).join(' ') : '',
        imageUrl: typeof data.image === 'string' ? data.image : Array.isArray(data.image) ? data.image[0]?.url || data.image[0] : data.image?.url || metadata(html, 'og:image'), imageSource: url };
}
function discover(html, source, date) {
    const items = [], seen = new Set();
    for (const item of linkedData(html)) {
        if (!item.headline || !item.url) continue;
        const value = decorate({ title: plain(item.headline), url: item.url, publishedAt: dateValue(item.datePublished),
            evidenceText: evidenceUnits(plain(item.description || '')).map(item => item.text).join(' ') }, source, date);
        if (value && !seen.has(value.url)) { items.push(value); seen.add(value.url); }
    }
    const safeHtml = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    for (const anchor of safeHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        if (items.length >= config.maxDiscovered) break;
        const title = plain(anchor[2]);
        if (title.length < 15) continue;
        const value = decorate({ title: title.slice(0, 200), url: attribute(anchor[1], 'href'), evidenceText: '', publishedAt: null }, source, date);
        if (value && !seen.has(value.url)) { items.push(value); seen.add(value.url); }
    }
    return items;
}

function createCollector({ fetchImpl = globalThis.fetch, sources, limits = config, clock = () => Date.now(), includeTeamSources = true } = {}) {
    // Bounded warm-instance cache only: no Firestore reads/writes or persistent full articles.
    const cache = new Map();
    return async ({ settings, date }) => {
        const start = clock(), plan = sourcePlan(settings, sources, limits.maxSourcePages, includeTeamSources);
        const allowedHosts = new Set(plan.map(source => new URL(source.url).hostname));
        let requests = 0, cacheHits = 0, articleFetches = 0, discoveryRequests = 0, articleVerificationRequests = 0;
        let stoppedBecausePoolReady = false, stoppedBecauseBudgetReached = false, sourceVerificationLimitReached = false;
        const warnings = [], candidates = [], visited = new Set(), blocked = new Set();
        const sourceHealth = plan.map(s=>({sourceId:s.id,status:'DISCOVERY_ONLY',found:0,verified:0,valid:0}));
        async function read(url, phase = 'discovery') {
            const safe = publicUrl(url);
            if (!safe || !allowedHosts.has(new URL(safe).hostname)) throw Object.assign(new Error('Fonte fora da lista permitida'), { code: 'SOURCE_NOT_ALLOWED' });
            if (blocked.has(new URL(safe).hostname)) throw Object.assign(new Error('Fonte bloqueada nesta execução'), {code:'SOURCE_BLOCKED'});
            const cached = cache.get(safe);
            if (cached && cached.expires > clock()) { cacheHits++; return cached.text; }
            if (requests >= limits.maxExternalRequests || clock() - start >= limits.collectionTimeoutMs) throw Object.assign(new Error('Orçamento de coleta esgotado'), { code: 'COLLECTION_BUDGET' });
            requests++;
            if (phase === 'article') articleVerificationRequests++; else discoveryRequests++;
            // Canonicalize for dedup/cache, preserve the verified HTTP path (including slash) for fetching.
            const response = await fetchImpl(new URL(url).href, { headers: { Accept: 'application/rss+xml, application/atom+xml, text/html', 'User-Agent': 'RadarACS/2 editorial' },
                redirect: 'error', signal: AbortSignal.timeout(Math.min(limits.requestTimeoutMs, Math.max(1, limits.collectionTimeoutMs - (clock() - start)))) });
            if (!response.ok) { if(response.status===403) blocked.add(new URL(safe).hostname); throw Object.assign(new Error('Fonte indisponível'), { code: response.status === 403 ? 'SOURCE_BLOCKED' : 'SOURCE_HTTP_ERROR', status: response.status }); }
            if (Number(response.headers?.get('content-length')) > limits.maxResponseBytes) throw Object.assign(new Error('Fonte excede limite'), { code: 'SOURCE_TOO_LARGE' });
            let text = '';
            if (response.body?.getReader) {
                const reader = response.body.getReader(); let size = 0;
                const decoder = new TextDecoder();
                while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
                    if (size > limits.maxResponseBytes) { await reader.cancel(); throw Object.assign(new Error('Fonte excede limite'), { code: 'SOURCE_TOO_LARGE' }); }
                    text += decoder.decode(part.value, { stream: true }); }
                text += decoder.decode();
            } else { text = await response.text(); if (Buffer.byteLength(text) > limits.maxResponseBytes) throw Object.assign(new Error('Fonte excede limite'), { code: 'SOURCE_TOO_LARGE' }); }
            // Cache discovery documents/feeds only; never keep entire article bodies.
            if (plan.some(source => publicUrl(source.url) === safe) && cache.size < limits.maxSourcePages) cache.set(safe, { text, expires: clock() + 3600000 });
            return text;
        }
        for (const source of plan) {
            const health = sourceHealth.find(h=>h.sourceId===source.id);
            try {
                const text = await read(source.url);
                let items;
                if (/<(?:rss|feed)\b/i.test(text)) items = feedItems(text, source, date);
                else {
                    // Prefer feeds actually advertised by this source. Never guess RSS URLs.
                    const feed = (text.match(/<link\b[^>]*>/gi) || []).find(tag => /application\/(?:rss|atom)\+xml/i.test(attribute(tag, 'type')));
                    let rss = null;
                    if (feed) try { const feedUrl = new URL(attribute(feed, 'href'), source.url).href; rss = feedItems(await read(feedUrl), source, date); } catch (error) { warnings.push({ sourceId: source.id, code: 'FEED_UNAVAILABLE', cause: error.code || error.name }); }
                    items = rss?.length ? rss : discover(text, source, date);
                }
                for (const item of items.filter(item=>classifyArticleUrl(item.url).classification==='ARTICLE_URL').slice(0,Math.ceil(limits.maxDiscovered / plan.length))) {
                    if (visited.has(item.url) || candidates.length >= limits.maxDiscovered) continue;
                    visited.add(item.url); candidates.push({ ...item, _source: source,
                        dateStatus: item.publishedAt ? 'DATE_RESOLVED' : 'DATE_PENDING_VERIFICATION',
                        evidenceStatus: item.evidenceQuality || 'EVIDENCE_PENDING_VERIFICATION', verified: Boolean(item.publishedAt && item.evidenceText) }); health.found++;
                }
                health.status = 'AVAILABLE';
            } catch (error) { warnings.push({ sourceId: source.id, code: error.code || 'SOURCE_TRANSPORT_ERROR' }); health.status=error.code==='SOURCE_BLOCKED'?'BLOCKED':'BROKEN'; }
        }
        // Round-robin source order avoids spending the page budget entirely on one category.
        const queues = plan.map(source => candidates.filter(item => item._source.id === source.id));
        const ordered = [];
        while (queues.some(queue => queue.length)) for (const queue of queues) if (queue.length) ordered.push(queue.shift());
        const pending = ordered.filter(item=>!normalizeCandidate(item,date,limits).candidate);
        const outside = item=>item.publishedAt && (item.publishedAt > date || Date.parse(item.publishedAt)<Date.parse(date)-limits.maxAgeDays*86400000);
        const covered = ()=> { const counts={}; for(const item of ordered) if(normalizeCandidate(item,date,limits).candidate) counts[item.category]=(counts[item.category]||0)+1; return counts; };
        while (pending.length) {
            const validCount=rankPool(ordered,settings,[],date,limits).diagnostics.poolValid;
            if(validCount>=limits.targetPoolMin) {stoppedBecausePoolReady=true; break;}
            if (articleFetches >= limits.maxArticleFetches || requests >= limits.maxExternalRequests || clock() - start >= limits.collectionTimeoutMs) {stoppedBecauseBudgetReached=true; break;}
            const coverage=covered();
            const priority=item=> settings.editorial[item.category]==='high'?0:item.teamId?1:settings.editorial[item.category]==='medium'?2:3;
            const promise=item=>(item.publishedAt?8:0)+(item.evidenceText?2:0)+(item.quality||0);
            pending.sort((a,b)=>priority(a)-priority(b)||(coverage[a.category]||0)-(coverage[b.category]||0)||promise(b)-promise(a)||String(b.publishedAt||'').localeCompare(String(a.publishedAt||'')));
            const item=pending.shift();
            if(outside(item)) {item.dateStatus='DATE_OUTSIDE_WINDOW'; item.verified=true; continue;}
            const health=sourceHealth.find(h=>h.sourceId===item._source.id); health.verified++;
            if(health.verified>(limits.maxArticleVerificationsPerSource || limits.maxArticleFetches)) {health.verified--; sourceVerificationLimitReached=true; continue;}
            articleFetches++;
            try { const page = articleMetadata(await read(item._fetchUrl || item.url, 'article'), item.url);
                Object.assign(item, { ...page, title: page.title || item.title, category: categoryFor(item._source, page.title + ' ' + page.evidenceText), verified:true,
                    dateStatus:page.publishedAt?'DATE_RESOLVED':'DATE_UNKNOWN', evidenceStatus:page.evidenceQuality });
                if(outside(item)) item.dateStatus='DATE_OUTSIDE_WINDOW';
            } catch (error) { warnings.push({ sourceId: item._source.id, code: error.code || 'ARTICLE_UNAVAILABLE' }); }
        }
        for(const health of sourceHealth) {
            const own=ordered.filter(item=>item._source.id===health.sourceId);
            health.valid=rankPool(own,settings,[],date,limits).diagnostics.poolValid;
            if(health.status==='AVAILABLE' && !health.valid) health.status=own.length && own.every(outside)?'NO_RECENT_CONTENT':'DISCOVERY_ONLY';
        }
        return { candidates: ordered.map(({ _source, _fetchUrl, ...item }) => ({ ...item, dateSource: item.dateSource || (item.publishedAt ? 'JSON_LD_DATE_PUBLISHED' : 'DATE_UNKNOWN'),
            evidenceQuality: item.evidenceQuality || extraction.evidenceQuality(evidenceUnits(item.evidenceText), []), pageType: item.pageType || 'UNVERIFIED_CANDIDATE' })), metrics: { externalRequests: requests, cacheHits, articleFetches,
            discoveryRequests, articleVerificationRequests, totalRequests:requests, stoppedBecausePoolReady, stoppedBecauseBudgetReached,
            sourceVerificationLimitReached,
            stopReason:stoppedBecausePoolReady?'POOL_READY':stoppedBecauseBudgetReached?'BUDGET_REACHED':sourceVerificationLimitReached?'SOURCE_VERIFICATION_LIMIT':'CANDIDATES_EXHAUSTED', sourceHealth,
            sourcePages: plan.length, sourcesConsulted: plan.map(source => ({ id: source.id, url: source.url })), collectionWarnings: warnings } };
    };
}

module.exports = { plain, feedItems, articleMetadata, discover, createCollector };
