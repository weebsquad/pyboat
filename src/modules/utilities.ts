// TODO: reminders
// TODO: persistency module (nick, roles, server mute/deaf)
// TODO: translation reply command
// TODO: jumbo, urban, kittyapi
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks } from '../config';
import { logCustom } from './logging/events/custom';
import { getMemberTag } from './logging/utils';

const utilsConf = config.modules.utilities;
const snipeConf = utilsConf.snipe;
const F = discord.command.filters;

const _groupOptions = {
  description: 'Utility Commands',
};

const optsGroup = c2.getOpts(
  _groupOptions,
);
export const cmdGroup = new discord.command.CommandGroup(optsGroup);

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
  if (!utilsConf || !snipeConf || snipeConf.enabled !== true) {
    return;
  }
  if (utils.isBlacklisted(msg.member)) {
    return;
  }
  if (!utils.canMemberRun(Ranks.Guest, msg.member)) {
    return;
  }
  const dt = utils.decomposeSnowflake(msg.id).timestamp;
  const diff = new Date().getTime() - dt;
  if (diff >= snipeConf.delay) {
    return;
  }
  await snipekvs.put(msg.channelId, JSON.stringify(msg), {
    ttl: snipeConf.delay,
  });
}
if (snipeConf.enabled === true) {
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
      await msg.reply('Nothing to snipe1.');
      return;
    }
    if (
      _sn.author.id === msg.author.id
    && !msg.member.can(discord.Permissions.ADMINISTRATOR)
    ) {
      await msg.reply('Nothing to snipe2.');
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

/* ROLE PERSIST */
const persistConf = utilsConf.persist;
const persistkv = new pylon.KVNamespace('persists');

function getPersistConf(member: discord.GuildMember, levelForce: number | undefined = undefined) {
  let lvl = utils.getUserAuth(member);
  if (typeof levelForce !== 'undefined') {
    lvl = levelForce;
  }
  let lowestConf = 1000;
  for (const key in persistConf.levels) {
    const thislvl = parseInt(key, 10);
    if (thislvl >= lvl && thislvl < lowestConf) {
      lowestConf = thislvl;
    }
  }
  const toret = persistConf.levels[lowestConf.toString()];
  if (typeof toret === 'undefined') {
    return null;
  }
  return toret;
}
async function savePersistData(member: discord.GuildMember) {
  if (!persistConf || persistConf.enabled !== true) {
    return;
  }
  await persistkv.put(member.user.id, {
    roles: member.roles,
    nick: member.nick,
    level: utils.getUserAuth(member),
  }, { ttl: persistConf.duration });
  await logCustom('PERSIST', 'SAVED', new Map([['_USERTAG_', getMemberTag(member)]]));
}

async function restorePersistData(member: discord.GuildMember) {
  if (!persistConf || persistConf.enabled !== true) {
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
  const guild = await member.getGuild();
  const me = await guild.getMember(discord.getBotId());
  const myrl = await utils.getMemberHighestRole(me);
  const theirrl = await utils.getMemberHighestRole(member);
  const rl = (await guild.getRoles()).filter((e) => dt.roles.includes(e.id) && e.position < myrl.position && !e.managed && e.id !== e.guildId).map((e) => e.id).filter((e) => {
    if (thisconf.roleIncludes.length > 0 && !thisconf.roleIncludes.includes(e)) {
      return false;
    }
    return !thisconf.roleExcludes.includes(e);
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
    if (persistConf.saveOnBan !== true) {
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
  if (persistConf.saveOnBan !== true) {
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

if (persistConf.enabled === true) {
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

cmdGroup.raw({ name: 'ping', filters: c2.getFilters('utilities.ping', Ranks.Guest) }, async (msg) => {
  const msgdiff = new Date().getTime() - utils.decomposeSnowflake(msg.id).timestamp;
  const msgd = new Date();
  const edmsg = await msg.reply('<a:loading:735794724480483409>');
  const td = new Date().getTime() - msgd.getTime();
  await edmsg.edit(`Pong @${msgdiff}ms, sent message in ${td}ms`);
});
