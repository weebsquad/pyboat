import * as conf from '../config';
import * as utils from '../lib/utils';
import * as commands2 from '../lib/commands2';
import * as gTranslate from '../lib/gTranslate';
import * as constants from '../constants/translation';
const config = conf.config;
const F = discord.command.filters;
const kv = new pylon.KVNamespace('commands_general');

export const _groupOptions = {
  additionalPrefixes: [],
  description: 'General commands',
  filters: []
};

const optsGroup = commands2.getOpts(
  _groupOptions
) as discord.command.ICommandGroupOptions;
export const cmdGroup = new discord.command.CommandGroup(optsGroup);

export const mylevel = discord.command.rawHandler(
    async (msg) => await msg.reply(`${msg.author.toMention()} you are bot level **${utils.getUserAuth(msg.member)}**${conf.isGlobalAdmin(msg.author.id) ? ' and a global admin!' : ''}`)
  );

export const ping = discord.command.rawHandler(async (msg) => {
  let msgdiff =
    new Date().getTime() - utils.decomposeSnowflake(msg.id).timestamp;
  let msgd = new Date();
  let edmsg = await msg.reply('<a:loading:735794724480483409>');
  let td = new Date().getTime() - msgd.getTime();
  await edmsg.edit(`Pong @${msgdiff}ms, sent message in ${td}ms`);
});

const snipekvs = new pylon.KVNamespace('snipe');
export const snipe = discord.command.rawHandler(async (msg) => {
  let _sn = await snipekvs.get(msg.channelId);
  if (typeof _sn === 'string') _sn = JSON.parse(_sn);
  if (
    _sn === undefined ||
    typeof _sn['author'] !== 'object' ||
    typeof _sn['id'] !== 'string' || !(_sn instanceof discord.Message)
  ) {
    await msg.reply('Nothing to snipe.');
    return;
  }
  if (
    _sn.author.id === msg.author.id &&
    !msg.member.can(discord.Permissions.ADMINISTRATOR)
  ) {
    await msg.reply('Nothing to snipe.');
    return;
  }
  let emb = new discord.Embed();
  let _usr = await discord.getUser(_sn.author.id);
  if (!_usr) return;
  emb.setAuthor({ name: _usr.getTag(), iconUrl: _usr.getAvatarUrl() });
  emb.setTimestamp(
    new Date(utils.decomposeSnowflake(_sn.id).timestamp).toISOString()
  );
  emb.setFooter({
    iconUrl: msg.author.getAvatarUrl(),
    text: 'Requested by: ' + msg.author.getTag()
  });
  emb.setDescription(_sn.content);
  emb.setColor(0x03fc52);
  await snipekvs.delete(msg.channelId);
  await msg.reply({
    embed: emb,
    content: `${_usr.toMention()} said ...`,
    allowedMentions: {}
  });
});
export const snowflake = discord.command.handler(
  (ctx) => ({ snowflake: ctx.string() }),
  async (msg, { snowflake }) => {
    let now = new Date();
    let baseId = snowflake;
    let normalTs = utils.getSnowflakeDate(baseId);
    await msg.reply(
      `\`\`\`\nID: ${baseId}\nTimestamp: ${new Date(normalTs)}\n\`\`\``
    );
  }
);

export const rolelb = discord.command.handler(
  () => ({}),
  async (message, {}) => {
    await message.reply(async () => {
      let ms = new Date();
      let guild = await message.getGuild();
      let board = '**ROLE COUNT LEADERBOARD FOR ' + guild.name + '**\n```';
      let top10homos = new Array<discord.GuildMember>();
      let sortit = function(arr: Array<discord.GuildMember>) {
        arr.sort((el1, el2) => {
          return el2.roles.length - el1.roles.length;
        });
        return arr;
      };

      for await (const member of guild.iterMembers()) {
        if (top10homos.length === 0) {
          top10homos.push(member);
          continue;
        }

        let lowest = top10homos[top10homos.length - 1];
        if (member.roles.length > lowest.roles.length) {
          if (top10homos.length < 10) {
            top10homos.push(member);
          } else {
            top10homos[top10homos.length - 1] = member;
          }
        }
        top10homos = sortit(top10homos);
      }
      for (var i = 0; i < top10homos.length; i++) {
        board += `\n#${i + 1} - ${top10homos[i].user.getTag()} - ${
          top10homos[i].roles.length
        } roles`;
      }
      board += '\n```';
      console.log(
        `Took ${new Date(Date.now()).getTime() - new Date(ms).getTime()}ms`
      );
      return board;
    });
  }
);

export const translate = discord.command.handler(
  (ctx) => ({ lang: ctx.string(), text: ctx.text() }),
  async (message, { lang, text }) => {
    let translation = await gTranslate.translate(text, lang);
    let sourceLang = constants.languages.find(
      (e) => e.shortcode === translation.detectedSourceLanguage
    );
    let targetLang = constants.languages.find((e) => e.shortcode === lang);
    let ll = sourceLang!.name ?? translation.detectedSourceLanguage;
    let targ = targetLang!.name ?? lang;
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
);

const timeMap = new Map([
  ['decade', 1000 * 60 * 60 * 24 * 365 * 10],
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 31],
  ['week', 1000 * 60 * 60 * 24 * 7],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60],
  ['second', 1000],
  ['milisecond', 1]
]);
function getLongAgoFormat(ts: number, limiter: number) {
  let runcheck = ts + 0;
  let txt = new Map();
  for (var [k, v] of timeMap) {
    if (runcheck < v || txt.entries.length >= limiter) continue;
    let runs = Math.ceil(runcheck / v) + 1;
    for (var i = 0; i <= runs; i++) {
      if (runcheck < v) break;
      if (txt.has(k)) {
        txt.set(k, txt.get(k) + 1);
      } else {
        txt.set(k, 1);
      }
      runcheck -= v;
    }
  }
  let txtret = new Array();
  let runsc = 0;
  for (var [key, value] of txt) {
    if (runsc >= limiter) break;
    let cc = value > 1 ? key + 's' : key;
    txtret.push(value + ' ' + cc);
    runsc++;
  }
  return txtret.join(', ');
}
export const server = discord.command.rawHandler(async (message) => {
  let edmsg = message.reply('<a:loading:735794724480483409>');
  let embed = new discord.Embed();
  const guild = await message.getGuild();
  if (guild === null) throw new Error('guild not found');
  let icon = guild.getIconUrl();
  if (icon === null) icon = '';
  embed.setAuthor({
    name: guild.name,
    iconUrl: 'https://cdn.discordapp.com/emojis/735781410509684786.png?v=1'
  });
  let dtCreation = new Date(utils.decomposeSnowflake(guild.id).timestamp);
  let diff = new Date(new Date().getTime() - dtCreation.getTime()).getTime();
  let tdiff = getLongAgoFormat(diff, 2);
  if (icon !== null) embed.setThumbnail({ url: icon });
  let desc = '';
  const formattedDtCreation = `${dtCreation.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`; /* @ ${dtCreation.toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: 'UTC',
    timeZoneName: 'short'
  })}`;*/

  let preferredLocale =
    typeof guild.preferredLocale === 'string' &&
    guild.features.includes(discord.Guild.Feature.DISCOVERABLE)
      ? `\n  󠇰**Preferred Locale**: \`${guild.preferredLocale}\`\n`
      : '';
  let boosts =
    guild.premiumSubscriptionCount > 0
      ? `\n<:booster3:735780703773655102>**Boosts**: ${guild.premiumSubscriptionCount}\n`
      : '';
  let boostTier =
    guild.premiumTier !== null
      ? `\n  󠇰**Boost Tier**: ${guild.premiumTier}\n`
      : '';
  let systemChannel =
    guild.systemChannelId !== null
      ? `\n  󠇰**System Channel**: <#${guild.systemChannelId}>\n`
      : '';
  let vanityUrl =
    guild.vanityUrlCode !== null
      ? `\n  󠇰**Vanity Url**: \`${guild.vanityUrlCode}\``
      : '';
  let description =
    guild.description !== null
      ? `\n  󠇰**Description**: \`${guild.description}\``
      : '';
  let widgetChannel =
    guild.widgetChannelId !== null
      ? `<#${guild.widgetChannelId}>`
      : 'No channel';
  let widget =
    guild.widgetEnabled === true
      ? '\n  󠇰**Widget**: ' +
        discord.decor.Emojis.WHITE_CHECK_MARK +
        ` ( ${widgetChannel} )`
      : '';
  let features = guild.features.length > 0 ? guild.features.join(', ') : 'None';

  desc += `  **❯ **Information
<:rich_presence:735781410509684786>**ID**: \`${guild.id}\`
  󠇰**Created**: ${tdiff} ago **[**\`${formattedDtCreation}\`**]**
<:owner:735780703903547443>**Owner**: <@!${guild.ownerId}>
<:voice:735780703928844319>**Voice Region**: \`${guild.region}\`
  󠇰**Features**: \`${features}\`
  󠇰**Max Presences**: ${guild.maxPresences}${boosts}${boostTier}${widget}${description}${preferredLocale}${vanityUrl}${systemChannel}`;

  let chanStats = new Array();
  let counts = {
    text: 0,
    category: 0,
    voice: 0,
    news: 0,
    store: 0
  };
  let channels = await guild.getChannels();
  channels.forEach(function(ch) {
    if (ch.type === discord.GuildChannel.Type.GUILD_TEXT) counts.text++;
    if (ch.type === discord.GuildChannel.Type.GUILD_VOICE) counts.voice++;
    if (ch.type === discord.GuildChannel.Type.GUILD_STORE) counts.store++;
    if (ch.type === discord.GuildChannel.Type.GUILD_CATEGORY) counts.category++;
    if (ch.type === discord.GuildChannel.Type.GUILD_NEWS) counts.news++;
  });
  for (var k in counts) {
    let obj = counts[k];
    let emj = '';
    if (k === 'text') emj = '<:channel:735780703983239218> ';
    if (k === 'voice') emj = '<:voice:735780703928844319> ';
    if (k === 'store') emj = '<:store:735780704130170880> ';
    if (k === 'news') emj = '<:news:735780703530385470> ';
    if (k === 'category') emj = '<:rich_presence:735781410509684786> ';

    if (obj > 0)
      chanStats.push(
        '\n ' +
          emj +
          '**' +
          k.substr(0, 1).toUpperCase() +
          k.substr(1) +
          '**: **' +
          obj +
          '**'
      );
  }
  desc += '\n\n**❯ **Channels ⎯ ' + channels.length + chanStats.join('');
  const roles = await guild.getRoles();
  const emojis = await guild.getEmojis();

  desc += `


**❯ **Other Counts
 <:settings:735782884836638732> **Roles**: ${roles.length}
 <:emoji_ghost:735782884862066789> **Emojis**: ${emojis.length}`;
  let memberCounts = {
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
      offline: 0
    }
  };
  for await (const member of guild.iterMembers()) {
    let usr = member.user;
    if (!usr.bot) {
      memberCounts.human++;
    } else {
      memberCounts.bot++;
      continue;
    }
    let pres = await member.getPresence();
    if (
      pres.activities.find((e) => {
        return e.type === discord.Presence.ActivityType.STREAMING;
      })
    )
      memberCounts.presences.streaming++;

    if (
      pres.activities.find((e) => {
        return e.type === discord.Presence.ActivityType.LISTENING;
      })
    )
      memberCounts.presences.listening++;

    if (
      pres.activities.find((e) => {
        return e.type === discord.Presence.ActivityType.GAME;
      })
    )
      memberCounts.presences.game++;
    if (
      pres.activities.find((e) => {
        return e.type === discord.Presence.ActivityType.WATCHING;
      })
    )
      memberCounts.presences.watching++;

    memberCounts.presences[pres.status]++;
  }
  let prestext = ``;
  let nolb = false;
  for (let key in memberCounts.presences) {
    let obj = memberCounts.presences[key];
    let emj = '';
    if (key === 'streaming') emj = '<:streaming:735793095597228034>';
    if (key === 'game') emj = discord.decor.Emojis.VIDEO_GAME;
    if (key === 'watching') emj = '<:watching:735793898051469354>';
    if (key === 'listening') emj = '<:spotify:735788337897406535>';
    if (key === 'online') emj = '<:status_online:735780704167919636>';
    if (key === 'dnd') emj = '<:status_busy:735780703983239168>';
    if (key === 'idle') emj = '<:status_away:735780703710478407>';
    if (key === 'offline') emj = '<:status_offline:735780703802753076>';

    if (obj > 0) {
      if (
        key !== 'streaming' &&
        key !== 'listening' &&
        key !== 'watching' &&
        key !== 'game' &&
        !prestext.includes('****') &&
        !nolb
      ) {
        if (prestext.length === 0) {
          nolb = true;
        } else {
          prestext += '\n****'; // add linebreak
        }
      }
      prestext += `\n ${emj} **-** ${obj}`;
    }
  }
  let bottxt = `\n <:bot:735780703945490542> **-** ${memberCounts.bot}
****`;
  if (memberCounts.bot <= 0) bottxt = '';
  desc += `


**❯ **Members ⎯ ${guild.memberCount}${bottxt}${prestext}`;
  embed.setDescription(desc);
  let editer = await edmsg;
  await editer.edit({ content: '', embed: embed });
});
