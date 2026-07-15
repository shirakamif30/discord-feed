/**
 * SQLite Database Manager (using sql.js — pure JavaScript, no native deps)
 * Stores feed subscriptions and tracks posted items to prevent duplicates
 */

const initSqlJs = require('sql.js');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const Logger = require('./utils/logger');

const DB_DIR = join(__dirname, '..', 'data');
const DB_PATH = join(DB_DIR, 'feeds.db');

class DB {
  constructor() {
    this.db = null;
    this._ready = this._init();
  }

  async _init() {
    if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

    const SQL = await initSqlJs();

    if (existsSync(DB_PATH)) {
      const buffer = readFileSync(DB_PATH);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run('PRAGMA foreign_keys = ON');

    this.db.run(`
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
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS posted_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER NOT NULL,
        item_id TEXT NOT NULL,
        posted_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE,
        UNIQUE(feed_id, item_id)
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_feeds_guild ON feeds(guild_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_feeds_channel ON feeds(channel_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_posted_feed ON posted_items(feed_id)');

    this._save();
    Logger.info('Database initialized');
  }

  async ready() {
    await this._ready;
  }

  _save() {
    const data = this.db.export();
    writeFileSync(DB_PATH, Buffer.from(data));
  }

  addFeed(guildId, channelId, url, platform, username, label = null) {
    this.db.run(
      'INSERT INTO feeds (guild_id, channel_id, url, platform, username, label) VALUES (?, ?, ?, ?, ?, ?)',
      [guildId, channelId, url, platform, username, label]
    );
    const row = this.db.exec('SELECT last_insert_rowid() as id')[0];
    const feedId = row.values[0][0];
    this._save();
    return { lastInsertRowid: feedId };
  }

  removeFeed(guildId, feedId) {
    this.db.run('DELETE FROM feeds WHERE id = ? AND guild_id = ?', [feedId, guildId]);
    this._save();
  }

  getFeedsByGuild(guildId) {
    const result = this.db.exec('SELECT * FROM feeds WHERE guild_id = ? ORDER BY created_at DESC', [guildId]);
    return this._rowsToObject(result);
  }

  getAllFeeds() {
    const result = this.db.exec('SELECT * FROM feeds');
    return this._rowsToObject(result);
  }

  getFeedById(feedId) {
    const result = this.db.exec('SELECT * FROM feeds WHERE id = ?', [feedId]);
    const rows = this._rowsToObject(result);
    return rows[0] || null;
  }

  updateLastChecked(feedId) {
    this.db.run("UPDATE feeds SET last_checked_at = datetime('now') WHERE id = ?", [feedId]);
    this._save();
  }

  isPosted(feedId, itemId) {
    const result = this.db.exec(
      'SELECT 1 FROM posted_items WHERE feed_id = ? AND item_id = ?',
      [feedId, itemId]
    );
    return result.length > 0 && result[0].values.length > 0;
  }

  markPosted(feedId, itemId) {
    this.db.run('INSERT OR IGNORE INTO posted_items (feed_id, item_id) VALUES (?, ?)', [feedId, itemId]);
    this._save();
  }

  cleanupOldPosts(daysToKeep = 30) {
    this.db.run(
      `DELETE FROM posted_items WHERE posted_at < datetime('now', '-' || ? || ' days')`,
      [daysToKeep]
    );
    this._save();
  }

  _rowsToObject(result) {
    if (!result || result.length === 0) return [];
    const { columns, values } = result[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  }

  close() {
    if (this.db) {
      this._save();
      this.db.close();
    }
  }
}

module.exports = DB;
