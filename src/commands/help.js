const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show bot commands and usage');

module.exports = {
  data,

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📡 Discord Feed Bot — Help')
      .setColor(0x5865F2)
      .setDescription('Universal Social Media Feed bot with HD media support!')
      .addFields(
        {
          name: '🔧 Commands',
          value: [
            '`/add <url> [channel] [platform]` — Subscribe to a feed',
            '`/remove <id>` — Unsubscribe from a feed',
            '`/list` — Show all subscriptions',
            '`/test <url> [platform]` — Test a feed without subscribing',
            '`/help` — Show this help message',
          ].join('\n'),
        },
        {
          name: '📱 Supported Platforms',
          value: [
            '📸 **Instagram** — @username or URL',
            '📘 **Facebook** — Page URL or username',
            '🐦 **Twitter/X** — @username or URL',
            '▶️ **YouTube** — Channel URL or @handle',
            '🎵 **TikTok** — @username or URL',
            '🟠 **Reddit** — r/subreddit or u/user',
            '🧵 **Threads** — @username or URL',
            '🔗 **RSS** — Any RSS/Atom feed URL',
          ].join('\n'),
        },
        {
          name: '💡 Examples',
          value: [
            '`/add @natgeo` — Add Instagram @natgeo',
            '`/add https://youtube.com/@MrBeast` — Add YouTube channel',
            '`/add https://reddit.com/r/programming` — Add subreddit',
            '`/add https://example.com/feed.xml` — Add custom RSS',
            '`/add @elonmusk platform:twitter` — Force Twitter',
          ].join('\n'),
        },
        {
          name: '🖼️ HD Media',
          value: 'All images are automatically upgraded to the highest available resolution. Supports Instagram CDN, Twitter large variants, YouTube thumbnails, and more.',
        },
        {
          name: '⚡ How It Works',
          value: 'The bot uses RSS bridges (RSSHub) to convert social media posts into RSS feeds — no Meta API sessions needed! Feeds are checked every 5 minutes.',
        },
      )
      .setFooter({ text: 'Made with ❤️ by shirakamif30 • v1.0.0' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
