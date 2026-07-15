/**
 * Text & Embed Formatters
 */

function truncate(str, max = 300) {
  if (!str) return '';
  str = str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PLATFORM_COLORS = {
  instagram: 0xE1306C,
  facebook: 0x1877F2,
  twitter: 0x000000,
  youtube: 0xFF0000,
  tiktok: 0x00F2EA,
  reddit: 0xFF4500,
  threads: 0x000000,
  default: 0x5865F2,
};

const PLATFORM_EMOJIS = {
  instagram: '📸',
  facebook: '📘',
  twitter: '🐦',
  youtube: '▶️',
  tiktok: '🎵',
  reddit: '🟠',
  threads: '🧵',
  default: '🔗',
};

function getColor(platform) {
  return PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.default;
}

function getEmoji(platform) {
  return PLATFORM_EMOJIS[platform] ?? PLATFORM_EMOJIS.default;
}

module.exports = { truncate, timeAgo, getColor, getEmoji };
