/**
 * Platform Adapters
 * Generates RSS bridge URLs for each social media platform
 * 
 * Uses multiple RSS bridge sources for redundancy:
 * 1. RSSHub (rsshub.app) - Primary, most comprehensive
 * 2. RSS-Bridge instances - Fallback
 * 3. Direct RSS where available
 */

// RSSHub instances (public, free)
const RSSHUB_INSTANCES = [
  'https://rsshub.app',
  'https://rsshub.rssforever.com',
  'https://rsshub-instance.zeabur.app',
  'https://rss.fatpandac.com',
];

// RSS-Bridge instances
const RSSBRIDGE_INSTANCES = [
  'https://rss-bridge.org/bridge01/',
];

const PLATFORMS = {
  // ─── Instagram ───────────────────────────────────────────────────────────
  instagram: {
    name: 'Instagram',
    patterns: [
      /instagram\.com\/([a-zA-Z0-9._]+)\/?$/,
      /^@?([a-zA-Z0-9._]+)$/,
    ],
    extractUsername(url) {
      for (const p of this.patterns) {
        const m = url.match(p);
        if (m) return m[1];
      }
      return null;
    },
    getFeedUrls(username) {
      return [
        // RSSHub - Instagram user timeline
        `${RSSHUB_INSTANCES[0]}/instagram/user/${username}`,
        `${RSSHUB_INSTANCES[1]}/instagram/user/${username}`,
        // RSS-Bridge
        `${RSSBRIDGE_INSTANCES[0]}?action=display&bridge=Instagram&context=User&u=${username}&media_type=both&format=Atom`,
      ];
    },
  },

  // ─── Facebook ────────────────────────────────────────────────────────────
  facebook: {
    name: 'Facebook',
    patterns: [
      /facebook\.com\/([a-zA-Z0-9.]+)\/?$/,
      /fb\.com\/([a-zA-Z0-9.]+)\/?$/,
      /^@?([a-zA-Z0-9.]+)$/,
    ],
    extractUsername(url) {
      for (const p of this.patterns) {
        const m = url.match(p);
        if (m) return m[1];
      }
      return null;
    },
    getFeedUrls(username) {
      return [
        // RSSHub - Facebook page
        `${RSSHUB_INSTANCES[0]}/facebook/page/${username}`,
        `${RSSHUB_INSTANCES[1]}/facebook/page/${username}`,
        // RSS-Bridge
        `${RSSBRIDGE_INSTANCES[0]}?action=display&bridge=Facebook&context=Page+-+id&u=${username}&media_type=3&format=Atom`,
      ];
    },
  },

  // ─── Twitter / X ─────────────────────────────────────────────────────────
  twitter: {
    name: 'Twitter/X',
    patterns: [
      /(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/?$/,
      /^@?([a-zA-Z0-9_]+)$/,
    ],
    extractUsername(url) {
      for (const p of this.patterns) {
        const m = url.match(p);
        if (m) return m[1];
      }
      return null;
    },
    getFeedUrls(username) {
      return [
        // RSSHub - Twitter timeline
        `${RSSHUB_INSTANCES[0]}/twitter/user/${username}`,
        `${RSSHUB_INSTANCES[1]}/twitter/user/${username}`,
        // Nitter instances as RSS source
        `https://nitter.privacydev.net/${username}/rss`,
        `https://nitter.poast.org/${username}/rss`,
      ];
    },
  },

  // ─── YouTube ─────────────────────────────────────────────────────────────
  youtube: {
    name: 'YouTube',
    patterns: [
      /youtube\.com\/@([a-zA-Z0-9_-]+)\/?$/,
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)\/?$/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)\/?$/,
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)\/?$/,
      /^@?([a-zA-Z0-9_-]+)$/,
    ],
    extractUsername(url) {
      for (const p of this.patterns) {
        const m = url.match(p);
        if (m) return m[1];
      }
      return null;
    },
    getFeedUrls(username) {
      // YouTube has native RSS feeds
      return [
        // Native YouTube RSS (if channel ID)
        `https://www.youtube.com/feeds/videos.xml?channel_id=${username}`,
        // RSSHub
        `${RSSHUB_INSTANCES[0]}/youtube/user/${username}`,
        `${RSSHUB_INSTANCES[1]}/youtube/user/${username}`,
      ];
    },
    isChannelId() {
      return true; // May need channel ID resolution
    },
  },

  // ─── TikTok ──────────────────────────────────────────────────────────────
  tiktok: {
    name: 'TikTok',
    patterns: [
      /tiktok\.com\/@([a-zA-Z0-9._]+)\/?$/,
      /^@?([a-zA-Z0-9._]+)$/,
    ],
    extractUsername(url) {
      for (const p of this.patterns) {
        const m = url.match(p);
        if (m) return m[1];
      }
      return null;
    },
    getFeedUrls(username) {
      return [
        `${RSSHUB_INSTANCES[0]}/tiktok/user/${username}`,
        `${RSSHUB_INSTANCES[1]}/tiktok/user/${username}`,
      ];
    },
  },

  // ─── Reddit ──────────────────────────────────────────────────────────────
  reddit: {
    name: 'Reddit',
    patterns: [
      /reddit\.com\/r\/([a-zA-Z0-9_]+)\/?$/,
      /reddit\.com\/u(?:ser)?\/([a-zA-Z0-9_-]+)\/?$/,
      /^r\/([a-zA-Z0-9_]+)$/,
      /^u\/([a-zA-Z0-9_-]+)$/,
    ],
    extractUsername(url) {
      for (const p of this.patterns) {
        const m = url.match(p);
        if (m) return m[1];
      }
      return null;
    },
    getFeedUrls(username) {
      // Reddit has native RSS
      if (username.startsWith('r/')) {
        const sub = username.slice(2);
        return [
          `https://www.reddit.com/r/${sub}/.rss`,
          `${RSSHUB_INSTANCES[0]}/reddit/subreddit/${sub}`,
        ];
      }
      return [
        `https://www.reddit.com/user/${username}/.rss`,
        `${RSSHUB_INSTANCES[0]}/reddit/user/${username}`,
      ];
    },
  },

  // ─── Threads ─────────────────────────────────────────────────────────────
  threads: {
    name: 'Threads',
    patterns: [
      /threads\.net\/@?([a-zA-Z0-9._]+)\/?$/,
    ],
    extractUsername(url) {
      for (const p of this.patterns) {
        const m = url.match(p);
        if (m) return m[1];
      }
      return null;
    },
    getFeedUrls(username) {
      return [
        `${RSSHUB_INSTANCES[0]}/threads/${username}`,
        `${RSSHUB_INSTANCES[1]}/threads/${username}`,
      ];
    },
  },

  // ─── RSS (Generic) ──────────────────────────────────────────────────────
  rss: {
    name: 'RSS Feed',
    patterns: [/^https?:\/\//],
    extractUsername(url) {
      return url;
    },
    getFeedUrls(url) {
      return [url];
    },
  },
};

/**
 * Detect platform from URL or input
 */
function detectPlatform(input) {
  const lower = input.toLowerCase().trim();

  if (lower.includes('instagram.com') || lower.match(/^[a-z0-9._]+$/i) && !lower.includes('.')) {
    return 'instagram';
  }
  if (lower.includes('facebook.com') || lower.includes('fb.com')) return 'facebook';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('reddit.com') || lower.match(/^r\/|^u\//)) return 'reddit';
  if (lower.includes('threads.net')) return 'threads';
  if (lower.match(/^https?:\/\//)) return 'rss';

  return null;
}

module.exports = { PLATFORMS, detectPlatform, RSSHUB_INSTANCES, RSSBRIDGE_INSTANCES };
