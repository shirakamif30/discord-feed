/**
 * RSS/Atom Feed Parser
 * Parses XML feeds into normalized items
 */

const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

/**
 * Parse RSS/Atom XML into normalized feed items
 * @param {string} xml - Raw XML string
 * @returns {Array} Normalized items
 */
function parseFeed(xml) {
  if (!xml) return [];

  try {
    const parsed = parser.parse(xml);

    // RSS 2.0
    if (parsed.rss && parsed.rss.channel) {
      return parseRSS2(parsed.rss.channel);
    }

    // Atom
    if (parsed.feed && parsed.feed.entry) {
      return parseAtom(parsed.feed);
    }

    // RDF/RSS 1.0
    if (parsed['rdf:RDF'] && parsed['rdf:RDF'].item) {
      return parseRDF(parsed['rdf:RDF']);
    }

    return [];
  } catch (err) {
    return [];
  }
}

function parseRSS2(channel) {
  const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
  return items.map(item => ({
    id: item.guid?.['#text'] || item.guid || item.link || item.title,
    title: item.title || '',
    description: item.description || item['content:encoded'] || '',
    url: item.link || '',
    pubDate: item.pubDate || item['dc:date'] || new Date().toISOString(),
    media: extractMedia(item),
    author: item['dc:creator'] || item.author || '',
  }));
}

function parseAtom(feed) {
  const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
  return entries.map(entry => {
    const links = Array.isArray(entry.link) ? entry.link : entry.link ? [entry.link] : [];
    const alternate = links.find(l => l['@_rel'] === 'alternate') || links[0];
    const enclosure = links.find(l => l['@_rel'] === 'enclosure');

    return {
      id: entry.id || entry.title,
      title: entry.title?.['#text'] || entry.title || '',
      description: entry.content?.['#text'] || entry.content || entry.summary?.['#text'] || entry.summary || '',
      url: alternate?.['@_href'] || '',
      pubDate: entry.published || entry.updated || new Date().toISOString(),
      media: extractAtomMedia(entry, links),
      author: entry.author?.name || '',
    };
  });
}

function parseRDF(rdf) {
  const items = Array.isArray(rdf.item) ? rdf.item : [rdf.item];
  return items.map(item => ({
    id: item['@_about'] || item.link || item.title,
    title: item.title || '',
    description: item.description || '',
    url: item.link || '',
    pubDate: item['dc:date'] || new Date().toISOString(),
    media: extractMedia(item),
    author: item['dc:creator'] || '',
  }));
}

/**
 * Extract media from RSS item (media:content, media:thumbnail, enclosure, og:image)
 */
function extractMedia(item) {
  const media = [];

  // media:content / media:group
  const mc = item['media:content'] || item['media:group']?.['media:content'];
  if (mc) {
    const arr = Array.isArray(mc) ? mc : [mc];
    for (const m of arr) {
      if (m['@_url']) {
        media.push({
          url: upgradeHD(m['@_url']),
          type: m['@_medium'] === 'video' ? 'video' : 'image',
          thumbnail: m['media:thumbnail']?.['@_url'] || null,
        });
      }
    }
  }

  // media:thumbnail
  const mt = item['media:thumbnail'];
  if (mt?.['@_url'] && media.length === 0) {
    media.push({ url: upgradeHD(mt['@_url']), type: 'image' });
  }

  // enclosure
  const enc = item.enclosure;
  if (enc?.['@_url']) {
    const type = enc['@_type'] || '';
    media.push({
      url: upgradeHD(enc['@_url']),
      type: type.startsWith('video') ? 'video' : 'image',
    });
  }

  // Extract images from HTML description
  if (media.length === 0 && item.description) {
    const imgMatches = item.description.match(/<img[^>]+src=["']([^"']+)["']/gi);
    if (imgMatches) {
      for (const match of imgMatches.slice(0, 5)) {
        const src = match.match(/src=["']([^"']+)["']/i);
        if (src && !src[1].includes('emoji') && !src[1].includes('icon')) {
          media.push({ url: upgradeHD(src[1]), type: 'image' });
        }
      }
    }
  }

  return media.length > 0 ? media : null;
}

function extractAtomMedia(entry, links) {
  const media = [];

  // Enclosure links
  const enclosures = links.filter(l => l['@_rel'] === 'enclosure');
  for (const enc of enclosures) {
    const type = enc['@_type'] || '';
    media.push({
      url: upgradeHD(enc['@_href']),
      type: type.startsWith('video') ? 'video' : 'image',
    });
  }

  // Content images
  const content = entry.content?.['#text'] || entry.content || '';
  if (media.length === 0 && typeof content === 'string') {
    const imgMatches = content.match(/<img[^>]+src=["']([^"']+)["']/gi);
    if (imgMatches) {
      for (const match of imgMatches.slice(0, 5)) {
        const src = match.match(/src=["']([^"']+)["']/i);
        if (src && !src[1].includes('emoji') && !src[1].includes('icon')) {
          media.push({ url: upgradeHD(src[1]), type: 'image' });
        }
      }
    }
  }

  return media.length > 0 ? media : null;
}

/**
 * Upgrade image URL to HD quality
 * Handles common CDN patterns (Instagram CDN, Facebook CDN, etc.)
 */
function upgradeHD(url) {
  if (!url) return url;

  // Instagram CDN - request full resolution
  url = url.replace(/\/s\d+x\d+\//g, '/');
  url = url.replace(/\/e\d+\//g, '/');
  url = url.replace(/\/c\d+\.\d+\.\d+\.\d+\//g, '/');

  // Facebook - request larger image
  url = url.replace(/\/s\d+x\d+\//g, '/');

  // Twitter/X - request large variant
  url = url.replace(/[?&]name=\w+/, function(m) { return m[0] === '?' ? '?name=large' : '&name=large'; });
  if (url.includes('pbs.twimg.com') && !url.includes('name=')) {
    url += (url.includes('?') ? '&' : '?') + 'name=large';
  }

  // YouTube - maxresdefault
  url = url.replace(/\/hqdefault\.jpg/, '/maxresdefault.jpg');
  url = url.replace(/\/mqdefault\.jpg/, '/maxresdefault.jpg');

  // Generic - remove resize params
  url = url.replace(/[?&]resize=\d+,\d+/g, '');
  url = url.replace(/[?&]w=\d+/g, '');

  return url;
}

module.exports = { parseFeed, upgradeHD };
