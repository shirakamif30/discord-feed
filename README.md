# 📡 Discord Feed Bot

Universal Social Media Feed Discord bot with HD media support. Posts updates from Instagram, Facebook, Twitter/X, YouTube, TikTok, Reddit, Threads, and any RSS feed directly to your Discord channels.

## ✨ Features

- **Universal Feed Support** — Instagram, Facebook, Twitter/X, YouTube, TikTok, Reddit, Threads, and any RSS/Atom feed
- **HD Media** — Automatically upgrades images to highest available resolution (Instagram CDN, Twitter large, YouTube maxres, etc.)
- **No Meta API Sessions** — Uses RSS bridges (RSSHub) to bypass Meta's strict API session requirements
- **Rich Embeds** — Beautiful Discord embeds with platform colors, emojis, and timestamps
- **SQLite Storage** — Persistent feed tracking with duplicate prevention
- **Slash Commands** — Easy-to-use Discord slash commands
- **Multi-Instance RSSHub** — Rotates between multiple RSSHub instances for reliability

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/shirakamif30/discord-feed.git
cd discord-feed
npm install
```

### 2. Configure Token

Edit `config.json` and replace with your bot token:

```json
{
  "token": "YOUR_BOT_TOKEN_HERE"
}
```

> Get your bot token from [Discord Developer Portal](https://discord.com/developers/applications)

### 3. Run

```bash
npm start
```

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `/add <url> [channel] [platform]` | Subscribe to a social media feed |
| `/remove <id>` | Unsubscribe from a feed |
| `/list` | Show all feed subscriptions |
| `/test <url> [platform]` | Test a feed without subscribing |
| `/help` | Show help message |

## 📱 Supported Platforms

| Platform | Input Format |
|----------|-------------|
| 📸 Instagram | `@username` or `https://instagram.com/username` |
| 📘 Facebook | `https://facebook.com/pagename` |
| 🐦 Twitter/X | `@username` or `https://x.com/username` |
| ▶️ YouTube | `https://youtube.com/@handle` or channel URL |
| 🎵 TikTok | `@username` or `https://tiktok.com/@username` |
| 🟠 Reddit | `r/subreddit` or `u/user` |
| 🧵 Threads | `@username` or `https://threads.net/@username` |
| 🔗 RSS | Any RSS/Atom feed URL |

## 🖼️ HD Media

The bot automatically upgrades media quality:
- **Instagram** — Removes size restrictions from CDN URLs
- **Twitter/X** — Requests `name=large` variant
- **YouTube** — Uses `maxresdefault` thumbnails
- **Generic** — Strips resize parameters

## 🏠 Hosting on anjas.id (Pterodactyl)

1. Upload all files to your server
2. Set startup command: `node index.js`
3. Set egg to Node.js 24
4. Edit `config.json` with your bot token
5. Start the server

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POLL_INTERVAL` | `5` | Feed check interval in minutes |
| `MAX_DESCRIPTION_LENGTH` | `300` | Max embed description length |
| `LOG_LEVEL` | `info` | Log level: debug/info/warn/error |
| `HD_MEDIA` | `true` | Enable HD media downloads |

## 📁 Project Structure

```
discord-feed/
├── index.js                 # Entry point
├── config.json              # Bot token (edit this)
├── package.json
├── .gitignore
├── README.md
├── src/
│   ├── database.js          # SQLite database manager
│   ├── feedManager.js       # Feed polling & posting logic
│   ├── commands/
│   │   ├── loader.js        # Command loader
│   │   ├── add.js           # /add command
│   │   ├── remove.js        # /remove command
│   │   ├── list.js          # /list command
│   │   ├── test.js          # /test command
│   │   └── help.js          # /help command
│   ├── feeds/
│   │   ├── rssParser.js     # RSS/Atom XML parser
│   │   └── platforms.js     # Platform adapters & RSS bridge URLs
│   └── utils/
│       ├── embedBuilder.js  # Discord embed builder
│       ├── fetcher.js       # HTTP fetcher with retries
│       ├── formatters.js    # Text & color formatters
│       └── logger.js        # Logger utility
└── data/                    # SQLite database (auto-created)
```

## 🔧 How It Works

1. **RSS Bridges** — The bot uses [RSSHub](https://docs.rsshub.app/) to convert social media posts into standard RSS/Atom feeds
2. **Polling** — Every 5 minutes, the bot checks all registered feeds for new posts
3. **Parsing** — RSS/Atom XML is parsed and normalized into a standard format
4. **HD Media** — Image URLs are upgraded to highest available resolution
5. **Posting** — New posts are sent as rich Discord embeds with HD media attachments
6. **Deduplication** — SQLite tracks posted items to prevent duplicates

## 📄 License

MIT — Made with ❤️ by shirakamif30
