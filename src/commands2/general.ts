/* eslint-disable no-irregular-whitespace */
import * as conf from '../config';
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import * as gTranslate from '../lib/gTranslate';
import * as constants from '../constants/translation';

const { config, Ranks } = conf;
const F = discord.command.filters;
const kv = new pylon.KVNamespace('commands_general');
export function InitializeCommands() {
  const _groupOptions = {
    description: 'General commands',
    filters: c2.getFilters('commands', Ranks.Guest),
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);

  cmdGroup.raw({ name: 'help', filters: c2.getFilters('commands.help', Ranks.Guest) }, async (msg) => {
    const newemb = new discord.Embed();
    newemb.setAuthor({ name: 'PyBoat' });
    newemb.setDescription('PyBoat is a rowboat clone built on top of [Pylon](https://pylon.bot)\n\nIt features several utility, moderation and general automation features.\n\n[Documentation](https://docs.pyboat.i0.tf/)\n[Homepage](https://pyboat.i0.tf)');
    newemb.setColor(0xFF0000);
    const myavatar = await discord.getBotUser();
    newemb.setThumbnail({ url: myavatar.getAvatarUrl() });
    await msg.reply({ allowedMentions: {}, content: '', embed: newemb });
  });
  cmdGroup.raw({ name: 'docs', filters: c2.getFilters('commands.docs', Ranks.Guest) }, async (msg) => {
    await msg.reply({ allowedMentions: {}, content: '<https://docs.pyboat.i0.tf/>' });
  });

  cmdGroup.raw({ name: 'mylevel', filters: c2.getFilters('commands.mylevel', Ranks.Guest) },
               async (msg) => {
                 await msg.reply(`${msg.author.toMention()} you are bot level **${utils.getUserAuth(msg.member)}**${utils.isGlobalAdmin(msg.author.id) ? ' and a global admin!' : ''}`);
               });

  cmdGroup.raw({ name: 'ping', filters: c2.getFilters('commands.ping', Ranks.Guest) }, async (msg) => {
    const msgdiff = new Date().getTime() - utils.decomposeSnowflake(msg.id).timestamp;
    const msgd = new Date();
    const edmsg = await msg.reply('<a:loading:735794724480483409>');
    const td = new Date().getTime() - msgd.getTime();
    await edmsg.edit(`Pong @${msgdiff}ms, sent message in ${td}ms`);
  });

  /* export const rolelb = discord.command.rawHandler(
  async (message) => {
    await message.reply(async () => {
      const ms = new Date();
      const guild = await message.getGuild();
      let board = `**ROLE COUNT LEADERBOARD FOR ${guild.name}**\n\`\`\``;
      let top10homos = new Array<discord.GuildMember>();
      const sortit = function (arr: Array<discord.GuildMember>) {
        arr.sort((el1, el2) => el2.roles.length - el1.roles.length);
        return arr;
      };

      for await (const member of guild.iterMembers()) {
        if (top10homos.length === 0) {
          top10homos.push(member);
          continue;
        }

        const lowest = top10homos[top10homos.length - 1];
        if (member.roles.length > lowest.roles.length) {
          if (top10homos.length < 10) {
            top10homos.push(member);
          } else {
            top10homos[top10homos.length - 1] = member;
          }
        }
        top10homos = sortit(top10homos);
      }
      for (let i = 0; i < top10homos.length; i += 1) {
        board += `\n#${i + 1} - ${top10homos[i].user.getTag()} - ${
          top10homos[i].roles.length
        } roles`;
      }
      board += '\n```';
      return board;
    });
  },
); */

  /* export const translate = discord.command.handler(
  (ctx) => ({ lang: ctx.string(), text: ctx.text() }),
  async (message, { lang, text }) => {
    let translation = await gTranslate.translate(text, lang);
    let sourceLang = constants.languages.find(
      (e) => e.shortcode === translation.detectedSourceLanguage
    );
    let targetLang = constants.languages.find((e) => e.shortcode === lang);
    let ll = sourceLang.name ?? translation.detectedSourceLanguage;
    let targ = targetLang.name ?? lang;
    const richEmbed = new discord.Embed();
    richEmbed.setThumbnail({
      url:
        'https://icons-for-free.com/iconfiles/png/512/language+text+translate+translation+icon-1320183416086707155.png',
      height: 128,
      width: 128
    });
    richEmbed
      .setTitle(`${ll} ${discord.decor.Emojis.ARROW_RIGHT} ${targ}`)
      .setColor(0x00ff00);
    richEmbed.setDescription(translation.translatedText);
    richEmbed.setFooter({
      iconUrl: message.member.user.getAvatarUrl(),
      text: `Requested by ${message.member.user.getTag()} (${
        message.member.user.id
      })`
    });
    richEmbed.setTimestamp(new Date().toISOString());
    await message.reply(async () => {
      return { embed: richEmbed };
    });
  }
); */

  cmdGroup.raw({ name: 'server', filters: c2.getFilters('commands.server', Ranks.Guest) }, async (message) => {
    const edmsg = message.reply('<a:loading:735794724480483409>');
    const embed = new discord.Embed();
    const guild = await message.getGuild();
    if (guild === null) {
      throw new Error('guild not found');
    }

    let icon = guild.getIconUrl();
    if (icon === null) {
      icon = '';
    }
    embed.setAuthor({
      name: guild.name,
      iconUrl: 'https://cdn.discordapp.com/emojis/735781410509684786.png?v=1',
    });
    const dtCreation = new Date(utils.decomposeSnowflake(guild.id).timestamp);
    const tdiff = utils.getLongAgoFormat(dtCreation.getTime(), 2);
    if (icon !== null) {
      embed.setThumbnail({ url: icon });
    }
    let desc = '';
    const formattedDtCreation = `${dtCreation.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`; /* @ ${dtCreation.toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: 'UTC',
    timeZoneName: 'short'
  })}`; */

    const preferredLocale = typeof guild.preferredLocale === 'string'
    && guild.features.includes(discord.Guild.Feature.DISCOVERABLE)
      ? `\n  󠇰**Preferred Locale**: \`${guild.preferredLocale}\`\n`
      : '';
    const boosts = guild.premiumSubscriptionCount > 0
      ? `\n<:booster3:735780703773655102>**Boosts**: ${guild.premiumSubscriptionCount}\n`
      : '';
    const boostTier = guild.premiumTier !== null
      ? `\n  󠇰**Boost Tier**: ${guild.premiumTier}\n`
      : '';
    const systemChannel = guild.systemChannelId !== null
      ? `\n  󠇰**System Channel**: <#${guild.systemChannelId}>\n`
      : '';
    const vanityUrl = guild.vanityUrlCode !== null
      ? `\n  󠇰**Vanity Url**: \`${guild.vanityUrlCode}\``
      : '';
    const description = guild.description !== null
      ? `\n  󠇰**Description**: \`${guild.description}\``
      : '';
    const widgetChannel = guild.widgetChannelId !== null
      ? `<#${guild.widgetChannelId}>`
      : 'No channel';
    const widget = guild.widgetEnabled === true
      ? `\n  󠇰**Widget**: ${
        discord.decor.Emojis.WHITE_CHECK_MARK
      } ( ${widgetChannel} )`
      : '';
    const features = guild.features.length > 0 ? guild.features.join(', ') : 'None';

    desc += `  **❯ **Information
<:rich_presence:735781410509684786>**ID**: \`${guild.id}\`
  󠇰**Created**: ${tdiff} ago **[**\`${formattedDtCreation}\`**]**
<:owner:735780703903547443>**Owner**: <@!${guild.ownerId}>
<:voice:735780703928844319>**Voice Region**: \`${guild.region}\`
  󠇰**Features**: \`${features}\`
  󠇰**Max Presences**: ${guild.maxPresences}${boosts}${boostTier}${widget}${description}${preferredLocale}${vanityUrl}${systemChannel}`;

    const chanStats = [];
    const counts = {
      text: 0,
      category: 0,
      voice: 0,
      news: 0,
      store: 0,
    };
    const channels = await guild.getChannels();
    channels.forEach((ch) => {
      if (ch.type === discord.GuildChannel.Type.GUILD_TEXT) {
        counts.text += 1;
      }
      if (ch.type === discord.GuildChannel.Type.GUILD_VOICE) {
        counts.voice += 1;
      }
      if (ch.type === discord.GuildChannel.Type.GUILD_STORE) {
        counts.store += 1;
      }
      if (ch.type === discord.GuildChannel.Type.GUILD_CATEGORY) {
        counts.category += 1;
      }
      if (ch.type === discord.GuildChannel.Type.GUILD_NEWS) {
        counts.news += 1;
      }
    });
    for (const k in counts) {
      const obj = counts[k];
      let emj = '';
      if (k === 'text') {
        emj = '<:channel:735780703983239218> ';
      }
      if (k === 'voice') {
        emj = '<:voice:735780703928844319> ';
      }
      if (k === 'store') {
        emj = '<:store:735780704130170880> ';
      }
      if (k === 'news') {
        emj = '<:news:735780703530385470> ';
      }
      if (k === 'category') {
        emj = '<:rich_presence:735781410509684786> ';
      }

      if (obj > 0) {
        chanStats.push(
          `\n ${
            emj
          }**${
            k.substr(0, 1).toUpperCase()
          }${k.substr(1)
          }**: **${
            obj
          }**`,
        );
      }
    }
    desc += `\n\n**❯ **Channels ⎯ ${channels.length}${chanStats.join('')}`;
    const roles = await guild.getRoles();
    const emojis = await guild.getEmojis();

    desc += `


**❯ **Other Counts
 <:settings:735782884836638732> **Roles**: ${roles.length}
 <:emoji_ghost:735782884862066789> **Emojis**: ${emojis.length}`;
    const memberCounts = {
      human: 0,
      bot: 0,
      presences: {
        streaming: 0,
        game: 0,
        listening: 0,
        watching: 0,
        online: 0,
        dnd: 0,
        idle: 0,
        offline: 0,
      },
    };

    async function calcMembers() {
      for await (const member of guild.iterMembers()) {
        const usr = member.user;
        if (!usr.bot) {
          memberCounts.human += 1;
        } else {
          memberCounts.bot += 1;
          continue;
        }
        const pres = await member.getPresence();
        if (
          pres.activities.find((e) => e.type === discord.Presence.ActivityType.STREAMING)
        ) {
          memberCounts.presences.streaming += 1;
        }

        if (
          pres.activities.find((e) => e.type === discord.Presence.ActivityType.LISTENING)
        ) {
          memberCounts.presences.listening += 1;
        }

        if (
          pres.activities.find((e) => e.type === discord.Presence.ActivityType.GAME)
        ) {
          memberCounts.presences.game += 1;
        }
        if (
          pres.activities.find((e) => e.type === discord.Presence.ActivityType.WATCHING)
        ) {
          memberCounts.presences.watching += 1;
        }

        memberCounts.presences[pres.status] += 1;
      }
    }
    if (guild.memberCount < 60) {
      await calcMembers();
      let prestext = '';
      let nolb = false;
      for (const key in memberCounts.presences) {
        const obj = memberCounts.presences[key];
        let emj = '';
        if (key === 'streaming') {
          emj = '<:streaming:735793095597228034>';
        }
        if (key === 'game') {
          emj = discord.decor.Emojis.VIDEO_GAME;
        }
        if (key === 'watching') {
          emj = '<:watching:735793898051469354>';
        }
        if (key === 'listening') {
          emj = '<:spotify:735788337897406535>';
        }
        if (key === 'online') {
          emj = '<:status_online:735780704167919636>';
        }
        if (key === 'dnd') {
          emj = '<:status_busy:735780703983239168>';
        }
        if (key === 'idle') {
          emj = '<:status_away:735780703710478407>';
        }
        if (key === 'offline') {
          emj = '<:status_offline:735780703802753076>';
        }

        if (obj > 0) {
          if (
            key !== 'streaming'
        && key !== 'listening'
        && key !== 'watching'
        && key !== 'game'
        && !prestext.includes('  󠇰')
        && !nolb
          ) {
            if (prestext.length === 0) {
              nolb = true;
            } else {
              prestext += '\n  󠇰'; // add linebreak
            }
          }
          prestext += `\n ${emj} **-** ${obj}`;
        }
      }

      let bottxt = `\n <:bot:735780703945490542> **-** ${memberCounts.bot}
    󠇰`;
      if (memberCounts.bot <= 0) {
        bottxt = '';
      }
      desc += `


**❯ **Members ⎯ ${guild.memberCount}${bottxt}${prestext}`;
    } else {
      desc += `


**❯ **Members ⎯ ${guild.memberCount}`;
    }
    embed.setDescription(desc);
    const editer = await edmsg;
    await editer.edit({ content: '', embed });
  });
  return cmdGroup;
}
