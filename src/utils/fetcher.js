/**
 * HTTP Fetcher with retries and HD media support
 */

const { request } = require('undici');
const Logger = require('./logger');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Fetch text content (RSS/XML/HTML)
 */
async function fetchText(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const { statusCode, body } = await request(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        headersTimeout: 15000,
        bodyTimeout: 15000,
        maxRedirections: 5,
      });

      if (statusCode >= 200 && statusCode < 300) {
        return await body.text();
      }

      Logger.debug(`Fetch ${url} returned ${statusCode}, attempt ${i + 1}/${retries}`);
    } catch (err) {
      Logger.debug(`Fetch error for ${url}: ${err.message}, attempt ${i + 1}/${retries}`);
      if (i === retries - 1) throw err;
    }

    // Wait before retry
    await new Promise(r => setTimeout(r, 1000 * (i + 1)));
  }
  return null;
}

/**
 * Fetch binary buffer (for HD media download)
 */
async function fetchBuffer(url, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const { statusCode, body, headers } = await request(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'image/*, video/*',
        },
        headersTimeout: 20000,
        bodyTimeout: 20000,
        maxRedirections: 5,
      });

      if (statusCode >= 200 && statusCode < 300) {
        const contentType = headers['content-type'] || '';
        const buffer = Buffer.from(await body.arrayBuffer());

        // Discord limit: 25MB for non-nitro
        if (buffer.length > 25 * 1024 * 1024) {
          Logger.debug('Media too large, skipping attachment');
          return null;
        }

        return buffer;
      }
    } catch (err) {
      Logger.debug(`Buffer fetch error: ${err.message}`);
      if (i === retries - 1) return null;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}

module.exports = { fetchText, fetchBuffer };
