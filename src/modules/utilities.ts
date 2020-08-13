// TODO: reminders
// TODO: persistency module (nick, roles, server mute/deaf)
// TODO: translation reply command
// TODO: jumbo, urban, kittyapi
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks } from '../config';

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
  if (!utils.canMemberRun(snipeConf.collectLevel ?? Ranks.Guest, msg.member)) {
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
  cmdGroup.raw({ name: 'snipe', filters: c2.getFilters(snipeConf.commandLevel ?? Ranks.Authorized) }, async (msg) => {
    let _sn: any = await snipekvs.get(msg.channelId);
    if (typeof _sn === 'string') {
      _sn = JSON.parse(_sn);
    }
    if (
      _sn === undefined
    || typeof _sn.author !== 'object'
    || typeof _sn.id !== 'string' || !(_sn instanceof discord.Message)
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

/* ROLE PERSIST */
const persistConf = utilsConf.persist;
const persistkv = new pylon.KVNamespace('persists');
async function savePersistData(member: discord.GuildMember) {
  if (!persistConf || persistConf.enabled !== true) {
    return;
  }
  await persistkv.put(member.user.id, {
    roles: member.roles,
    nick: member.nick,
  }, { ttl: persistConf.duration });
}

async function restorePersistData(member: discord.GuildMember) {
  if (!persistConf || persistConf.enabled !== true) {
    return false;
  }
  const dt: any = await persistkv.get(member.user.id);
  if (!dt || dt === null) {
    return false;
  }
  const guild = await member.getGuild();
  const me = await guild.getMember(discord.getBotId());
  const myrl = await utils.getMemberHighestRole(me);
  const rl = (await guild.getRoles()).filter((e) => dt.roles.includes(e.id) && e.position < myrl.position && !e.managed && e.id !== e.guildId).map((e) => e.id).filter((e) => {
    if (persistConf.roleIncludes.length > 0 && !persistConf.roleIncludes.includes(e)) {
      return false;
    }
    return !persistConf.roleExcludes.includes(e);
  });
  member.roles.forEach((e) => {
    if (!rl.includes(e) && e !== guild.id) {
      rl.push(e);
    }
  });
  const objEdit: any = {};
  if (persistConf.restore.roles === true) {
    objEdit.roles = rl;
  }
  if (persistConf.restore.nick === true) {
    objEdit.nick = dt.nick;
  }
  await member.edit(objEdit);
  await persistkv.delete(member.user.id);
  return true;
}

export async function AL_OnGuildMemberRemove(
  id: string,
  guildId: string,
  log: any,
  member: discord.Event.IGuildMemberRemove,
  oldMember: discord.GuildMember,
) {
  console.log('onremove', log, oldMember);
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
    subCommandGroup.on({ name: 'restore', filters: c2.getFilters(persistConf.commandLevel ?? Ranks.Moderator) },
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
    subCommandGroup.on({ name: 'save', filters: c2.getFilters(persistConf.commandLevel ?? Ranks.Moderator) },
                       (ctx) => ({ member: ctx.guildMember() }),
                       async (msg, { member }) => {
                         const ret = await savePersistData(member);
                         await msg.reply({
                           allowedMentions: {},
                           content: `${discord.decor.Emojis.WHITE_CHECK_MARK} Successfully saved ${member.toMention()}`,
                         });
                       });
  });
}
