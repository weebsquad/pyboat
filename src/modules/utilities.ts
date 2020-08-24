// TODO: reminders
// TODO: persistency module (nick, roles, server mute/deaf)
// TODO: translation reply command
// TODO: jumbo, urban, kittyapi
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks } from '../config';
import { logCustom } from './logging/events/custom';
import { getMemberTag } from './logging/utils';

/* ROLE PERSIST */
const persistkv = new pylon.KVNamespace('persists');

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
  await persistkv.put(member.user.id, {
    roles: member.roles,
    nick: member.nick,
    level: utils.getUserAuth(member),
  }, { ttl: config.modules.utilities.persist.duration });
  await logCustom('PERSIST', 'SAVED', new Map([['_USERTAG_', getMemberTag(member)]]));
}

async function restorePersistData(member: discord.GuildMember) {
  if (!config.modules.utilities.persist || config.modules.utilities.persist.enabled !== true) {
    return false;
  }

  const dt: any = await persistkv.get(member.user.id);
  if (!dt || dt === null) {
    return false;
  }
  const thisconf = getPersistConf(member, dt.level);
  if (thisconf === null) {
    return false;
  }
  // console.log(thisconf);
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
  await persistkv.delete(member.user.id);
  await logCustom('PERSIST', 'RESTORED', new Map([['_USERTAG_', getMemberTag(member)]]));
  return true;
}

export async function OnGuildBanAdd(
  id: string,
  guildId: string,
  ban: discord.GuildBan,
) {
  try {
    if (config.modules.utilities.persist.saveOnBan !== true) {
      await persistkv.delete(ban.user.id);
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
    cmdGroup.raw({ name: 'snipe', filters: c2.getFilters('utilities.snipe', Ranks.Authorized) }, async (msg) => {
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
    });
  }

  // BACKUP
  if (config.modules.utilities.persist.enabled === true) {
    cmdGroup.subcommand('backup', (subCommandGroup) => {
      subCommandGroup.on({ name: 'restore', filters: c2.getFilters('utilities.backup.restore', Ranks.Moderator) },
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
                         });
      subCommandGroup.on({ name: 'save', filters: c2.getFilters('utilities.backup.save', Ranks.Moderator) },
                         (ctx) => ({ member: ctx.guildMember() }),
                         async (msg, { member }) => {
                           const ret = await savePersistData(member);
                           await msg.reply({
                             allowedMentions: {},
                             content: `${discord.decor.Emojis.WHITE_CHECK_MARK} Successfully saved ${member.toMention()}`,
                           });
                         });
      subCommandGroup.raw({ name: 'show', filters: c2.getFilters('utilities.backup.show', Ranks.Moderator) },
                          async (msg) => {
                            const items = await persistkv.items();
                            const txt = `**Users with backups: ${items.length}**\n${items.map((e: any) => `\n<@!${e.key}> : ${e.value.roles.length} roles${e.value.nick !== null ? ` , nick: \`${utils.escapeString(e.value.nick)}\`` : ''}`)}`;
                            await msg.reply({
                              allowedMentions: {},
                              content: txt,
                            });
                          });
    });
  }

  // snowflake
  cmdGroup.on('snowflake',
              (ctx) => ({ snowflakee: ctx.string() }),
              async (msg, { snowflakee }) => {
                const now = new Date();
                const baseId = snowflakee;
                const normalTs = utils.getSnowflakeDate(baseId);
                await msg.reply(
                  `\`\`\`\nID: ${baseId}\nTimestamp: ${new Date(normalTs)}\n\`\`\``,
                );
              });
  return cmdGroup;
}
