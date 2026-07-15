/**
 * Feed Manager
 * Polls RSS feeds and posts new items to Discord channels
 * Handles HD media extraction and embed building
 */

const { parseFeed } = require('./feeds/rssParser');
const { PLATFORMS, detectPlatform, RSSHUB_INSTANCES } = require('./feeds/platforms');
const { buildFeedEmbed } = require('./utils/embedBuilder');
const { fetchText } = require('./utils/fetcher');
const Logger = require('./utils/logger');

class FeedManager {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    this.pollTimer = null;
    this.polling = false;
    this.instanceIndex = 0; // Round-robin RSSHub instances
  }

  /**
   * Start periodic polling
   */
  startPolling() {
    const interval = (parseInt(process.env.POLL_INTERVAL) || 5) * 60 * 1000;
    Logger.info(`Feed polling every ${interval / 1000}s`);

    // Initial poll after 30 seconds (let bot fully start)
    setTimeout(() => this.pollAll(), 30_000);

    // Regular interval
    this.pollTimer = setInterval(() => this.pollAll(), interval);
    this.polling = true;
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.polling = false;
    Logger.info('Feed polling stopped');
  }

  /**
   * Poll all registered feeds
   */
  async pollAll() {
    const feeds = this.db.getAllFeeds();
    if (feeds.length === 0) return;

    Logger.debug(`Polling ${feeds.length} feeds...`);

    // Process feeds sequentially to avoid rate limits
    for (const feed of feeds) {
      try {
        await this.pollFeed(feed);
        this.db.updateLastChecked(feed.id);
      } catch (err) {
        Logger.error(`Error polling feed #${feed.id} (${feed.platform}/${feed.username}):`, err.message);
      }

      // Small delay between feeds
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  /**
   * Poll a single feed and post new items
   */
  async pollFeed(feed) {
    const { id: feedId, guild_id, channel_id, url, platform, username } = feed;

    // Get channel
    const channel = this.client.channels.cache.get(channel_id);
    if (!channel) {
      Logger.warn(`Channel ${channel_id} not found for feed #${feedId}, skipping`);
      return;
    }

    // Get RSS bridge URLs
    const platformConfig = PLATFORMS[platform];
    if (!platformConfig) {
      Logger.warn(`Unknown platform: ${platform}`);
      return;
    }

    let feedUrls;
    if (platform === 'rss') {
      feedUrls = [url];
    } else {
      feedUrls = platformConfig.getFeedUrls(username);
    }

    // Try each feed URL until one works
    let items = [];
    for (const feedUrl of feedUrls) {
      try {
        // Rotate RSSHub instances for rate limit distribution
        let finalUrl = feedUrl;
        if (feedUrl.includes('rsshub.app') && !feedUrl.includes('rsshub.rssforever')) {
          const instance = RSSHUB_INSTANCES[this.instanceIndex % RSSHUB_INSTANCES.length];
          finalUrl = feedUrl.replace(/https:\/\/rsshub\.app/, instance);
        }

        const xml = await fetchText(finalUrl);
        if (xml) {
          items = parseFeed(xml);
          if (items.length > 0) {
            Logger.debug(`Got ${items.length} items from ${finalUrl}`);
            break;
          }
        }
      } catch (err) {
        Logger.debug(`Feed URL failed: ${feedUrl} - ${err.message}`);
        continue;
      }
    }

    // Rotate instance for next feed
    this.instanceIndex++;

    if (items.length === 0) {
      Logger.debug(`No items found for feed #${feedId} (${platform}/${username})`);
      return;
    }

    // Filter new items (not already posted)
    const newItems = items.filter(item => !this.db.isPosted(feedId, item.id));

    if (newItems.length === 0) {
      Logger.debug(`No new items for feed #${feedId}`);
      return;
    }

    Logger.info(`Found ${newItems.length} new items for ${platform}/${username}`);

    // Post items (newest last, so reverse for chronological order in channel)
    const toPost = newItems.slice(-10).reverse(); // Max 10 items per poll

    for (const item of toPost) {
      try {
        // Enrich item with platform info
        item.platform = platform;
        item.username = username;

        const { embeds, files } = await buildFeedEmbed(item);

        await channel.send({ embeds, files });
        this.db.markPosted(feedId, item.id);

        // Rate limit protection
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        Logger.error(`Failed to post item to ${channel_id}:`, err.message);

        // If rate limited, wait longer
        if (err.code === 50013 || err.code === 429) {
          Logger.warn('Rate limited, waiting 10s...');
          await new Promise(r => setTimeout(r, 10_000));
        }
      }
    }
  }

  /**
   * Add a new feed subscription
   */
  async addFeed(guildId, channelId, input, platformOverride = null) {
    const platform = platformOverride || detectPlatform(input);

    if (!platform) {
      return { success: false, error: 'Could not detect platform. Please specify: instagram, facebook, twitter, youtube, tiktok, reddit, threads, or provide a direct RSS URL.' };
    }

    const platformConfig = PLATFORMS[platform];
    let username, url;

    if (platform === 'rss') {
      username = input;
      url = input;
    } else {
      username = platformConfig.extractUsername(input);
      if (!username) {
        return { success: false, error: `Could not extract username for ${platformConfig.name}. Please provide a valid URL or username.` };
      }
      url = `https://${platform}.com/${username}`;
    }

    // Test the feed
    Logger.info(`Testing feed: ${platform}/${username}`);
    const feedUrls = platform === 'rss' ? [url] : platformConfig.getFeedUrls(username);
    let testPassed = false;

    for (const feedUrl of feedUrls) {
      try {
        const xml = await fetchText(feedUrl, 1);
        if (xml) {
          const items = parseFeed(xml);
          if (items.length > 0) {
            testPassed = true;
            break;
          }
        }
      } catch { continue; }
    }

    if (!testPassed) {
      Logger.warn(`Feed test failed for ${platform}/${username}, adding anyway (may work later)`);
    }

    // Add to database
    try {
      const result = this.db.addFeed(guildId, channelId, url, platform, username, `${platformConfig.name}: ${username}`);
      return {
        success: true,
        feedId: result.lastInsertRowid,
        platform: platformConfig.name,
        username,
        testPassed,
      };
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return { success: false, error: `This feed (${platform}/${username}) is already added in this server.` };
      }
      return { success: false, error: err.message };
    }
  }

  /**
   * Remove a feed subscription
   */
  removeFeed(guildId, feedId) {
    const feed = this.db.getFeedById(feedId);
    if (!feed || feed.guild_id !== guildId) {
      return { success: false, error: 'Feed not found in this server.' };
    }
    this.db.removeFeed(guildId, feedId);
    return { success: true, feed };
  }

  /**
   * Test a feed URL without adding it
   */
  async testFeed(input, platformOverride = null) {
    const platform = platformOverride || detectPlatform(input);
    if (!platform) return { success: false, error: 'Could not detect platform.' };

    const platformConfig = PLATFORMS[platform];
    let username, feedUrls;

    if (platform === 'rss') {
      username = input;
      feedUrls = [input];
    } else {
      username = platformConfig.extractUsername(input);
      if (!username) return { success: false, error: 'Could not extract username.' };
      feedUrls = platformConfig.getFeedUrls(username);
    }

    for (const url of feedUrls) {
      try {
        const xml = await fetchText(url, 1);
        if (xml) {
          const items = parseFeed(xml);
          if (items.length > 0) {
            return {
              success: true,
              platform: platformConfig.name,
              username,
              itemCount: items.length,
              sampleTitle: items[0].title,
              hasMedia: !!items[0].media,
              sourceUrl: url,
            };
          }
        }
      } catch { continue; }
    }

    return { success: false, error: `Could not fetch feed for ${platformConfig.name}/${username}. The feed may be temporarily unavailable.` };
  }
}

module.exports = FeedManager;
