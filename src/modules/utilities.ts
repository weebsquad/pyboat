/* eslint-disable no-irregular-whitespace */
// TODO: reminders
// TODO: translation reply command
// TODO: jumbo, urban, kittyapi
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks } from '../config';
import { logCustom } from './logging/events/custom';
import { getMemberTag } from './logging/utils';
import { KVManager } from '../lib/utils';
import { getInfractionBy } from './infractions';

/* ROLE PERSIST */
const persistPrefix = 'Persist_';
export async function getStoredUserOverwrites(userId: string) {
  const ows = await KVManager.get(`${persistPrefix}channels`);
  const res = [];
  if (ows && ows !== null && typeof ows === 'object') {
    for (const channelId in ows) {
      const overwrites = ows[channelId].filter((ow) => ow.id === userId).map((ow) => {
        ow.channelId = channelId;
        return ow;
      });
      if (overwrites.length > 0) {
        res.push(...overwrites);
      }
    }
  }
  return res;
}
export async function storeChannelData() {
  const guild = await discord.getGuild();
  const channels = await guild.getChannels();
  const userOverrides: any = {};
  await Promise.all(channels.map(async (ch) => {
    const _dt = [];
    let isSync = false;
    if (ch.parentId && ch.parentId !== null) {
      const parent = await discord.getGuildCategory(ch.parentId);
      if (parent && parent !== null) {
        let anyDiff = false;
        const parentOws = parent.permissionOverwrites;
        const childOws = ch.permissionOverwrites;
        childOws.forEach((ow) => {
          const _f = parentOws.find((e) => e.id === ow.id && e.type === ow.type && e.allow === ow.allow && e.deny === ow.deny);
          if (!_f) {
            anyDiff = true;
          }
        });
        if (!anyDiff) {
          isSync = true;
        }
      }
    }
    if (isSync) {
      return;
    }
    const usrs = ch.permissionOverwrites.filter((ov) => ov.type === discord.Channel.PermissionOverwriteType.MEMBER);
    if (usrs.length > 0) {
      usrs.forEach((ov) => {
        const newobj: any = { id: ov.id };
        if (ov.allow !== 0) {
          newobj.allow = ov.allow;
        }
        if (ov.deny !== 0) {
          newobj.deny = ov.deny;
        }
        _dt.push(newobj);
      });
    }
    if (_dt.length > 0) {
      userOverrides[ch.id] = _dt;
    }
  }));
  if (Object.keys(userOverrides).length > 0) {
    await KVManager.set(`${persistPrefix}channels`, userOverrides);
  }
}
function getPersistConf(member: discord.GuildMember, levelForce: number | undefined = undefined) {
  let lvl = utils.getUserAuth(member);
  if (typeof levelForce !== 'undefined') {
    lvl = levelForce;
  }
  let lowestConf = 1000;
  for (const key in config.modules.utilities.persist.levels) {
    const thislvl = parseInt(key, 10);
    if (thislvl >= lvl && thislvl < lowestConf) {
      lowestConf = thislvl;
    }
  }
  const toret = config.modules.utilities.persist.levels[lowestConf.toString()];
  if (typeof toret === 'undefined') {
    if (typeof config.modules.utilities.persist.levels[lowestConf] !== 'undefined') {
      return config.modules.utilities.persist.levels[lowestConf];
    }
    return null;
  }
  return toret;
}
async function savePersistData(member: discord.GuildMember) {
  if (!config.modules.utilities.persist || config.modules.utilities.persist.enabled !== true) {
    return;
  }
  if (member.roles.length === 0 && member.nick === null) {
    return;
  }
  const channels = await getStoredUserOverwrites(member.user.id);
  /*
  await persistkv.put(member.user.id, {
    roles: member.roles,
    nick: member.nick,
    level: utils.getUserAuth(member),
  }, { ttl: config.modules.utilities.persist.duration }); */

  await utils.KVManager.set(persistPrefix + member.user.id, {
    roles: member.roles,
    nick: member.nick,
    level: utils.getUserAuth(member),
    channels: channels.length > 0 ? channels : undefined,
  });
  await logCustom('PERSIST', 'SAVED', new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id], ['_USER_', member.user]]));
}

async function restorePersistData(member: discord.GuildMember) {
  if (!config.modules.utilities.persist || config.modules.utilities.persist.enabled !== true) {
    return false;
  }

  const dt: any = await utils.KVManager.get(persistPrefix + member.user.id);
  if (!dt || dt === null) {
    return false;
  }
  const thisconf = getPersistConf(member, dt.level);
  if (thisconf === null) {
    return false;
  }
  const guild = await member.getGuild();
  const me = await guild.getMember(discord.getBotId());
  const myrl = await utils.getMemberHighestRole(me);
  const theirrl = await utils.getMemberHighestRole(member);
  const rl = (await guild.getRoles()).filter((e) => dt.roles.includes(e.id) && e.position < myrl.position && !e.managed && e.id !== e.guildId).map((e) => e.id).filter((e) => {
    if (Array.isArray(thisconf.roleIncludes) && thisconf.roleIncludes.length > 0 && !thisconf.roleIncludes.includes(e)) {
      return false;
    }
    if (Array.isArray(thisconf.roleExcludes)) {
      return !thisconf.roleExcludes.includes(e);
    }
    return true;
  });
  member.roles.forEach((e) => {
    if (!rl.includes(e) && e !== guild.id) {
      rl.push(e);
    }
  });
  const objEdit: any = {};
  if (thisconf.roles === true && rl.length > 0) {
    objEdit.roles = rl;
  }
  if (thisconf.nick === true && (theirrl === null || myrl.position > theirrl.position)) {
    objEdit.nick = dt.nick;
  }
  await member.edit(objEdit);
  const chans = dt.channels;
  const allChannels = await guild.getChannels();
  if (chans && Array.isArray(chans) && thisconf.channels === true) {
    await Promise.all(chans.map(async (chan) => {
      const channel = allChannels.find((e) => e.id === chan.channelId);
      if (!channel || channel === null) {
        return;
      }
      const _f = channel.permissionOverwrites.find((e) => e.id === chan.id);
      if (_f) {
        return;
      }

      const thisOw: discord.Channel.IPermissionOverwrite = {
        id: chan.id,
        allow: chan.allow ?? 0,
        deny: chan.deny ?? 0,
        type: discord.Channel.PermissionOverwriteType.MEMBER,
      };
      const ows = [].concat(channel.permissionOverwrites).concat(thisOw);
      if (channel.type === discord.Channel.Type.GUILD_CATEGORY) {
        const childrenSynced = allChannels.filter((cht) => {
          if (cht.parentId !== channel.id) {
            return false;
          }
          let anyDiff = false;
          for (let i = 0; i < cht.permissionOverwrites.length; i++) {
            const chow = cht.permissionOverwrites[i];
            const _ex = channel.permissionOverwrites.find((e2) => e2.id === chow.id && e2.allow === chow.allow && e2.deny === chow.deny && e2.type === chow.type);
            if (!_ex) {
              anyDiff = true;
              break;
            }
          }
          return !anyDiff;
        });
        await Promise.all(childrenSynced.map(async (ch) => {
          await ch.edit({ permissionOverwrites: ows });
        }));
      }
      await channel.edit({ permissionOverwrites: ows });
    }));
  }
  // await persistkv.delete(member.user.id);
  await utils.KVManager.delete(persistPrefix + member.user.id);
  await logCustom('PERSIST', 'RESTORED', new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id], ['_USER_', member.user]]));
  return true;
}
export async function OnChannelCreate(
  id: string,
  guildId: string,
  channel: discord.GuildChannel,
) {
  if (!config.modules.utilities.persist || typeof config.modules.utilities.persist !== 'object' || config.modules.utilities.persist.enabled !== true) {
    return;
  }
  await storeChannelData();
}
export async function OnChannelDelete(
  id: string,
  guildId: string,
  channel: discord.GuildChannel,
) {
  if (!config.modules.utilities.persist || typeof config.modules.utilities.persist !== 'object' || config.modules.utilities.persist.enabled !== true) {
    return;
  }
  await storeChannelData();
}
export async function OnChannelUpdate(
  id: string,
  guildId: string,
  channel: discord.Channel,
) {
  if (!config.modules.utilities.persist || typeof config.modules.utilities.persist !== 'object' || config.modules.utilities.persist.enabled !== true) {
    return;
  }
  await storeChannelData();
}
export async function OnGuildBanAdd(
  id: string,
  guildId: string,
  ban: discord.GuildBan,
) {
  if (!config.modules.utilities.persist || typeof config.modules.utilities.persist !== 'object' || config.modules.utilities.persist.enabled !== true) {
    return;
  }
  try {
    if (config.modules.utilities.persist.saveOnBan !== true) {
      // await persistkv.delete(ban.user.id);
      await utils.KVManager.delete(persistPrefix + ban.user.id);
    }
  } catch (e) {}
}
export async function AL_OnGuildMemberRemove(
  id: string,
  guildId: string,
  log: any,
  member: discord.Event.IGuildMemberRemove,
  oldMember: discord.GuildMember,
) {
  if (!config.modules.utilities.persist || typeof config.modules.utilities.persist !== 'object' || config.modules.utilities.persist.enabled !== true) {
    return;
  }
  if (config.modules.utilities.persist.saveOnBan !== true) {
    if (log instanceof discord.AuditLogEntry) {
      if (log.actionType === discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD) {
        return;
      }
    }
  }
  await savePersistData(oldMember);
}

export async function OnGuildMemberAdd(
  id: string,
  guildId: string,
  member: discord.GuildMember,
) {
  if (!config.modules.utilities.persist || typeof config.modules.utilities.persist !== 'object' || config.modules.utilities.persist.enabled !== true) {
    return;
  }
  await restorePersistData(member);
}

/* SNIPE */
const snipekvs = new pylon.KVNamespace('snipe');
export async function AL_OnMessageDelete(
  id: string,
  guildId: string,
  log: discord.AuditLogEntry | unknown,
  ev: discord.Event.IMessageDelete,
  msg: discord.Message.AnyMessage | null,
) {
  if (!config.modules.utilities || typeof config.modules.utilities !== 'object' || config.modules.utilities.enabled !== true) {
    return;
  }
  if (
    msg === null
    || log instanceof discord.AuditLogEntry
    || msg.author === null
    || msg.webhookId !== null
    || msg.author.bot === true
  ) {
    return;
  }
  if (!config.modules.utilities || !config.modules.utilities.snipe || config.modules.utilities.snipe.enabled !== true) {
    return;
  }
  if (utils.isBlacklisted(msg.member)) {
    return;
  }
  /* if (!utils.canMemberRun(Ranks.Guest, msg.member)) {
    return;
  } */
  const dt = utils.decomposeSnowflake(msg.id).timestamp;
  const diff = new Date().getTime() - dt;
  if (diff >= config.modules.utilities.snipe.delay) {
    return;
  }
  await snipekvs.put(msg.channelId, JSON.stringify(msg), {
    ttl: config.modules.utilities.snipe.delay,
  });
}

export function InitializeCommands() {
  const F = discord.command.filters;

  const _groupOptions = {
    description: 'Utility Commands',
    filters: c2.getFilters('utilities', Ranks.Guest),
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);

  // SNIPE COMMAND
  if (config.modules.utilities.snipe.enabled === true) {
    cmdGroup.raw(
      { name: 'snipe', filters: c2.getFilters('utilities.snipe', Ranks.Authorized) }, async (msg) => {
        let _sn: any = await snipekvs.get(msg.channelId);
        if (typeof _sn === 'string') {
          _sn = JSON.parse(_sn);
        }
        if (
          _sn === undefined
      || typeof _sn.author !== 'object'
      || typeof _sn.id !== 'string'
        ) {
          await msg.reply('Nothing to snipe.');
          return;
        }
        if (
          _sn.author.id === msg.author.id
      && !msg.member.can(discord.Permissions.ADMINISTRATOR)
        ) {
          await msg.reply('Nothing to snipe.');
          return;
        }
        const emb = new discord.Embed();
        const _usr = await discord.getUser(_sn.author.id);
        if (!_usr) {
          return;
        }
        emb.setAuthor({ name: _usr.getTag(), iconUrl: _usr.getAvatarUrl() });
        emb.setTimestamp(
          new Date(utils.decomposeSnowflake(_sn.id).timestamp).toISOString(),
        );
        emb.setFooter({
          iconUrl: msg.author.getAvatarUrl(),
          text: `Requested by: ${msg.author.getTag()}`,
        });
        emb.setDescription(_sn.content);
        emb.setColor(0x03fc52);
        await snipekvs.delete(msg.channelId);
        await msg.reply({
          embed: emb,
          content: `${_usr.toMention()} said ...`,
          allowedMentions: {},
        });
      },
    );
  }

  // BACKUP
  if (config.modules.utilities.persist.enabled === true) {
    cmdGroup.subcommand('backup', (subCommandGroup) => {
      subCommandGroup.on(
        { name: 'restore', filters: c2.getFilters('utilities.backup.restore', Ranks.Moderator) },
        (ctx) => ({ member: ctx.guildMember() }),
        async (msg, { member }) => {
          const ret = await restorePersistData(member);
          if (ret === true) {
            await msg.reply({
              allowedMentions: {},
              content: `${discord.decor.Emojis.WHITE_CHECK_MARK} Successfully restored ${member.toMention()}`,
            });
          } else {
            await msg.reply({
              allowedMentions: {},
              content: `${discord.decor.Emojis.X} Failed to restore ${member.toMention()}`,
            });
          }
        },
      );
      subCommandGroup.on(
        { name: 'save', filters: c2.getFilters('utilities.backup.save', Ranks.Moderator) },
        (ctx) => ({ member: ctx.guildMember() }),
        async (msg, { member }) => {
          const ret = await savePersistData(member);
          await msg.reply({
            allowedMentions: {},
            content: `${discord.decor.Emojis.WHITE_CHECK_MARK} Successfully saved ${member.toMention()}`,
          });
        },
      );
      subCommandGroup.on(
        { name: 'show', filters: c2.getFilters('utilities.backup.show', Ranks.Moderator) },
        (ctx) => ({ usr: ctx.user() }),
        async (msg, { usr }) => {
          const thiskv: any = await utils.KVManager.get(`${persistPrefix}${usr.id}`);
          if (!thiskv) {
            await msg.reply(`${discord.decor.Emojis.X} no backup found for this member`);
            return;
          }
          let rls = 'None';
          if (thiskv.roles.length > 0) {
            const rlsfo = thiskv.roles.map((rl) => `<@&${rl}>`).join(', ');
            rls = rlsfo;
          }
          const txt = `**Member backup for **<@!${usr.id}>:\n**Roles**: ${thiskv.roles.length === 0 ? 'None' : rls}\n**Nick**: ${thiskv.nick === null ? 'None' : `\`${utils.escapeString(thiskv.nick)}\``}${Array.isArray(thiskv.channels) ? `\n**Channel Overwrites**: ${thiskv.channels.length}` : ''}`;
          await msg.reply({ content: txt, allowedMentions: {} });
        },
      );
      subCommandGroup.on(
        { name: 'delete', filters: c2.getFilters('utilities.backup.delete', Ranks.Moderator) },
        (ctx) => ({ usr: ctx.user() }),
        async (msg, { usr }) => {
          const thiskv: any = await utils.KVManager.get(`${persistPrefix}${usr.id}`);
          if (!thiskv) {
            await msg.reply(`${discord.decor.Emojis.X} no backup found for this member`);
            return;
          }
          await utils.KVManager.delete(`${persistPrefix}${usr.id}`);
          await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} successfully deleted!`);
        },
      );
    });
  }

  // snowflake
  cmdGroup.on(
    { name: 'snowflake', filters: c2.getFilters('utilities.snowflake', Ranks.Guest) },
    (ctx) => ({ snowflakee: ctx.string() }),
    async (msg, { snowflakee }) => {
      const now = new Date();
      const baseId = snowflakee;
      const normalTs = utils.getSnowflakeDate(baseId);
      await msg.reply(
        `\`\`\`\nID: ${baseId}\nTimestamp: ${new Date(normalTs)}\n\`\`\``,
      );
    },
  );

  cmdGroup.raw(
    { name: 'cat', filters: c2.getFilters('utilities.cat', Ranks.Guest) }, async (msg) => {
      const file = await (await fetch('http://aws.random.cat/meow')).json();
      const catpic = await (await fetch(file.file)).arrayBuffer();

      await msg.reply({
        content: '',
        allowedMentions: {},
        attachments: [{
          name: 'cat.jpg',
          data: catpic,
        }],
      });
    },
  );
  cmdGroup.raw(
    { name: 'server', filters: c2.getFilters('commands.server', Ranks.Guest) }, async (message) => {
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
      const tdiff = utils.getLongAgoFormat(dtCreation.getTime(), 2, true, 'second');
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
    },
  );

  cmdGroup.on(
    { name: 'info', filters: c2.getFilters('utilities.info', Ranks.Guest) },
    (ctx) => ({ user: ctx.userOptional() }),
    async (msg, { user }) => {
      const loadingMsg = await msg.reply({ allowedMentions: {}, content: '<a:loading:735794724480483409>' });
      if (user === null) {
        user = msg.author;
      }
      const emb = new discord.Embed();
      emb.setAuthor({ name: user.getTag(), iconUrl: user.getAvatarUrl() });
      let desc = `**❯ ${user.bot === false ? 'User' : 'Bot'} Information**
        <:rich_presence:735781410509684786> 󠇰**ID**: \`${user.id}\`
        ${discord.decor.Emojis.LINK} **Profile**: ${user.toMention()}`;
      const dtCreation = new Date(utils.decomposeSnowflake(user.id).timestamp);
      const tdiff = utils.getLongAgoFormat(dtCreation.getTime(), 2, true, 'second');
      const formattedDtCreation = `${dtCreation.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`;
      desc += `\n ${discord.decor.Emojis.CALENDAR_SPIRAL} **Created**: ${tdiff} ago **[**\`${formattedDtCreation}\`**]**`;
      const guild = await msg.getGuild();
      const member = await guild.getMember(user.id);
      if (member !== null) {
        // presences
        const presence = await member.getPresence();
        const statuses = presence.activities.map((pres) => {
          const key = pres.type;
          let emj = '';
          if (pres.type === discord.Presence.ActivityType.STREAMING) {
            emj = '<:streaming:735793095597228034>';
          }
          if (pres.type === discord.Presence.ActivityType.GAME) {
            emj = discord.decor.Emojis.VIDEO_GAME;
          }
          if (pres.type === discord.Presence.ActivityType.WATCHING) {
            emj = '<:watching:735793898051469354>';
          }
          if (pres.type === discord.Presence.ActivityType.LISTENING) {
            emj = '<:spotify:735788337897406535>';
          }
          if (pres.type === discord.Presence.ActivityType.CUSTOM) {
            let emjMention = '';
            if (pres.emoji !== null) {
              emjMention = pres.emoji.id === null ? pres.emoji.name : `<${pres.emoji.animated === true ? 'a' : ''}:${pres.emoji.name}:${pres.emoji.id}>`;
            } else {
              emjMention = discord.decor.Emojis.NOTEPAD_SPIRAL;
            }
            return `${emjMention}${pres.state !== null ? ` \`${utils.escapeString(pres.state)}\`` : ''} (Custom Status)`;
          }

          return `${emj}${pres.name.length > 0 ? ` \`${pres.name}\`` : ''}`;
        });
        let emjStatus = '';
        if (presence.status === 'online') {
          emjStatus = '<:status_online:735780704167919636>';
        }
        if (presence.status === 'dnd') {
          emjStatus = '<:status_busy:735780703983239168>';
        }
        if (presence.status === 'idle') {
          emjStatus = '<:status_away:735780703710478407>';
        }
        if (presence.status === 'offline') {
          emjStatus = '<:status_offline:735780703802753076>';
        }
        desc += `\n ${emjStatus} **Status**: ${presence.status.substr(0, 1).toUpperCase()}${presence.status.substr(1).toLowerCase()}`;
        if (statuses.length > 0) {
          desc += `\n  ${statuses.join('\n  ')}󠇰`;
        }
        // actual server stuff
        if (typeof globalConfig.userBadges === 'object' && Array.isArray(globalConfig.userBadges[user.id])) {
          desc += `\n\n**❯ PyBoat Badges**\n${globalConfig.userBadges[user.id].join('\n')}`;
        }
        const roles = member.roles.map((rl) => `<@&${rl}>`).join(' ');
        desc += '\n\n**❯ Member Information**';
        const dtJoin = new Date(member.joinedAt);
        const tdiffjoin = utils.getLongAgoFormat(dtJoin.getTime(), 2, true, 'second');
        const formattedDtJoin = `${dtJoin.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`;
        desc += `\n ${discord.decor.Emojis.INBOX_TRAY} **Joined**: ${tdiffjoin} ago **[**\`${formattedDtJoin}\`**]**`;
        if (member.nick && member.nick !== null && member.nick.length > 0) {
          desc += `\n ${discord.decor.Emojis.NOTEPAD_SPIRAL} 󠇰**Nickname**: \`${utils.escapeString(member.nick)}\``;
        }
        if (member.premiumSince !== null) {
          const boostDt = new Date(member.premiumSince);
          const tdiffboost = utils.getLongAgoFormat(boostDt.getTime(), 2, true, 'second');
          const formattedDtBoost = `${boostDt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`;
          desc += `\n <:booster:735780703912067160> **Boosting since**: ${tdiffboost} ago **[**\`${formattedDtBoost}\`**]**`;
        }
        if (member.roles.length > 0) {
          desc += `\n ${discord.decor.Emojis.SHIELD} **Roles** (${member.roles.length}): ${roles}`;
        }
        const infsGiven = await getInfractionBy({ actorId: user.id });
        const infsReceived = await getInfractionBy({ memberId: user.id });
        if (infsGiven.length > 0 || infsReceived.length > 0) {
          desc += '\n\n**❯ Infractions**';
        }
        if (infsGiven.length > 0) {
          desc += `\n ${discord.decor.Emojis.HAMMER} **Applied**: **${infsGiven.length}**`;
        }
        if (infsReceived.length > 0) {
          desc += `\n ${discord.decor.Emojis.NO_ENTRY} **Received**: **${infsReceived.length}**`;
        }
        const perms = new utils.Permissions(member.permissions);
        let hasPerms: any = perms.serialize();
        const irrelevant = ['CREATE_INSTANT_INVITE', 'ADD_REACTIONS', 'STREAM', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'SEND_TTS_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY', 'USE_EXTERNAL_EMOJIS', 'CONNECT', 'SPEAK', 'USE_VOICE_ACTIVITY', 'CHANGE_NICKNAME', 'VIEW_GUILD_INSIGHTS', 'VIEW_AUDIT_LOG', 'PRIORITY_SPEAKER'];
        for (const key in hasPerms) {
          if (hasPerms[key] === false || irrelevant.includes(key)) {
            delete hasPerms[key];
          }
        }
        if (hasPerms.ADMINISTRATOR === true) {
          hasPerms = { ADMINISTRATOR: true };
        }
        hasPerms = Object.keys(hasPerms).map((str) => str.split('_').map((upp) => `${upp.substr(0, 1).toUpperCase()}${upp.substr(1).toLowerCase()}`).join(' '));
        const auth = utils.getUserAuth(member);
        if ((Number(perms.bitfield) > 0 && hasPerms.length > 0) || auth > 0) {
          desc += '\n\n**❯ Permissions**';
        }
        if (Number(perms.bitfield) > 0 && hasPerms.length > 0) {
          desc += `\n <:settings:735782884836638732> **Staff**: \`${hasPerms.join(', ')}\``;
        }
        if (auth > 0) {
          desc += `\n ${discord.decor.Emojis.CYCLONE} **Bot Level**: **${auth}**`;
        }
      }

      emb.setDescription(desc);
      await loadingMsg.edit({ content: '', embed: emb });
    },
  );
  return cmdGroup;
}
