/**
 * Discord Embed Builder for Feed Posts
 * Creates rich embeds with HD media support
 */

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { truncate, timeAgo, getColor, getEmoji } = require('./formatters');
const { fetchBuffer } = require('./fetcher');
const Logger = require('./logger');

/**
 * Build a Discord embed from a parsed feed item
 * @param {Object} item - Parsed feed item
 * @returns {Object} { embeds, files }
 */
async function buildFeedEmbed(item) {
  const { platform, username, title, description, url, media, pubDate } = item;
  const emoji = getEmoji(platform);
  const color = getColor(platform);
  const embed = new EmbedBuilder().setColor(color);

  // Author line
  embed.setAuthor({
    name: `${emoji} ${username}`,
    url: url,
  });

  // Title
  if (title) {
    embed.setTitle(truncate(title, 256));
  }

  // Description
  if (description) {
    embed.setDescription(truncate(description, parseInt(process.env.MAX_DESCRIPTION_LENGTH) || 300));
  }

  // Timestamp
  if (pubDate) {
    embed.setTimestamp(new Date(pubDate));
  }

  // Footer
  embed.setFooter({
    text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} • ${timeAgo(pubDate)}`,
  });

  // ─── HD Media ───────────────────────────────────────────────────────────
  const files = [];

  if (media && media.length > 0) {
    const primaryMedia = media[0];

    if (primaryMedia.type === 'image') {
      // Set image in embed
      embed.setImage(primaryMedia.url);

      // Try to download as HD attachment for better quality
      try {
        const buffer = await fetchBuffer(primaryMedia.url);
        if (buffer) {
          const ext = guessExtension(primaryMedia.url);
          const attachment = new AttachmentBuilder(buffer, { name: `media_${Date.now()}${ext}` });
          files.push(attachment);
          embed.setImage(`attachment://${attachment.name}`);
        }
      } catch (err) {
        Logger.debug(`Failed to download media: ${err.message}`);
        // Fallback: just use the URL in embed
      }

      // Additional images as gallery
      if (media.length > 1) {
        embed.addFields({
          name: '📷 Gallery',
          value: `+${media.length - 1} more image${media.length > 2 ? 's' : ''}`,
          inline: true,
        });
      }
    } else if (primaryMedia.type === 'video') {
      embed.addFields({
        name: '🎬 Video',
        value: `[Watch Video](${primaryMedia.url})`,
        inline: true,
      });
      // Try thumbnail
      if (primaryMedia.thumbnail) {
        embed.setThumbnail(primaryMedia.thumbnail);
      }
    }
  }

  // Link
  embed.setURL(url);

  return { embeds: [embed], files };
}

function guessExtension(url) {
  const match = url.match(/\.(jpg|jpeg|png|gif|webp|mp4)(?:\?|$)/i);
  return match ? `.${match[1].toLowerCase()}` : '.jpg';
}

module.exports = { buildFeedEmbed };
