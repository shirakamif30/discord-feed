const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEmoji } = require('../utils/formatters');

const data = new SlashCommandBuilder()
  .setName('list')
  .setDescription('List all feed subscriptions in this server');

module.exports = {
  data,

  async execute(interaction) {
    const feeds = global._botDb.getFeedsByGuild(interaction.guildId);

    if (feeds.length === 0) {
      return interaction.reply({
        content: '📭 **No feeds subscribed in this server.**\nUse `/add` to subscribe to a social media feed!',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📡 Feed Subscriptions')
      .setColor(0x5865F2)
      .setDescription('This server has **' + feeds.length + '** active feed' + (feeds.length > 1 ? 's' : ''))
      .setTimestamp();

    for (const feed of feeds) {
      const emoji = getEmoji(feed.platform);
      embed.addFields({
        name: emoji + ' ' + feed.platform.toUpperCase() + ' — ' + feed.username,
        value: [
          '> **ID:** ' + feed.id,
          '> **Channel:** <#' + feed.channel_id + '>',
          '> **Last checked:** ' + (feed.last_checked_at || 'Never'),
        ].join('\n'),
        inline: false,
      });
    }

    embed.setFooter({ text: 'Use /remove <id> to unsubscribe' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
