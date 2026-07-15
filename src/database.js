/**
 * SQLite Database Manager
 * Stores feed subscriptions and tracks posted items to prevent duplicates
 */

const Database = require('better-sqlite3');
const { join } = require('path');
const Logger = require('./utils/logger');

class DB {
  constructor() {
    const dbPath = join(__dirname, '..', 'data', 'feeds.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this._init();
    Logger.info('Database initialized');
  }

  _init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        url TEXT NOT NULL,
        platform TEXT NOT NULL,
        username TEXT NOT NULL,
        label TEXT,
        last_checked_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(guild_id, url)
      );

      CREATE TABLE IF NOT EXISTS posted_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER NOT NULL,
        item_id TEXT NOT NULL,
        posted_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE,
        UNIQUE(feed_id, item_id)
      );

      CREATE INDEX IF NOT EXISTS idx_feeds_guild ON feeds(guild_id);
      CREATE INDEX IF NOT EXISTS idx_feeds_channel ON feeds(channel_id);
      CREATE INDEX IF NOT EXISTS idx_posted_feed ON posted_items(feed_id);
    `);
  }

  // ─── Feed CRUD ───────────────────────────────────────────────────────────
  addFeed(guildId, channelId, url, platform, username, label = null) {
    const stmt = this.db.prepare(`
      INSERT INTO feeds (guild_id, channel_id, url, platform, username, label)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(guildId, channelId, url, platform, username, label);
  }

  removeFeed(guildId, feedId) {
    const stmt = this.db.prepare('DELETE FROM feeds WHERE id = ? AND guild_id = ?');
    return stmt.run(feedId, guildId);
  }

  getFeedsByGuild(guildId) {
    return this.db.prepare('SELECT * FROM feeds WHERE guild_id = ? ORDER BY created_at DESC').all(guildId);
  }

  getAllFeeds() {
    return this.db.prepare('SELECT * FROM feeds').all();
  }

  getFeedById(feedId) {
    return this.db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId);
  }

  updateLastChecked(feedId) {
    this.db.prepare("UPDATE feeds SET last_checked_at = datetime('now') WHERE id = ?").run(feedId);
  }

  // ─── Posted Items ────────────────────────────────────────────────────────
  isPosted(feedId, itemId) {
    const row = this.db.prepare('SELECT 1 FROM posted_items WHERE feed_id = ? AND item_id = ?').get(feedId, itemId);
    return !!row;
  }

  markPosted(feedId, itemId) {
    this.db.prepare('INSERT OR IGNORE INTO posted_items (feed_id, item_id) VALUES (?, ?)').run(feedId, itemId);
  }

  cleanupOldPosts(daysToKeep = 30) {
    const stmt = this.db.prepare(`DELETE FROM posted_items WHERE posted_at < datetime('now', ?)`);
    return stmt.run(`-${daysToKeep} days`);
  }

  close() {
    this.db.close();
  }
}

module.exports = DB;
