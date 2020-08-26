// TODO: reminders
// TODO: translation reply command
// TODO: jumbo, urban, kittyapi
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks } from '../config';
import { logCustom } from './logging/events/custom';
import { getMemberTag } from './logging/utils';

/* ROLE PERSIST */
const persistPrefix = 'Persist_';

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
  });
  await logCustom('PERSIST', 'SAVED', new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id]]));
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
  // await persistkv.delete(member.user.id);
  await utils.KVManager.delete(persistPrefix + member.user.id);
  await logCustom('PERSIST', 'RESTORED', new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id]]));
  return true;
}

export async function OnGuildBanAdd(
  id: string,
  guildId: string,
  ban: discord.GuildBan,
) {
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
      subCommandGroup.on({ name: 'show', filters: c2.getFilters('utilities.backup.show', Ranks.Moderator) },
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
                           const txt = `**Member backup for **<@!${usr.id}>:\n**Roles**: ${thiskv.roles.length === 0 ? 'None' : rls}\n**Nick**: ${thiskv.nick === null ? 'None' : `\`${utils.escapeString(thiskv.nick)}\``}`;
                           await msg.reply({ content: txt, allowedMentions: {} });
                         });
      subCommandGroup.on({ name: 'delete', filters: c2.getFilters('utilities.backup.delete', Ranks.Moderator) },
                         (ctx) => ({ usr: ctx.user() }),
                         async (msg, { usr }) => {
                           const thiskv: any = await utils.KVManager.get(`${persistPrefix}${usr.id}`);
                           if (!thiskv) {
                             await msg.reply(`${discord.decor.Emojis.X} no backup found for this member`);
                             return;
                           }
                           await utils.KVManager.delete(`${persistPrefix}${usr.id}`);
                           await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} successfully deleted!`);
                         });
    });
  }

  // snowflake
  cmdGroup.on({ name: 'snowflake', filters: c2.getFilters('utilities.snowflake', Ranks.Guest) },
              (ctx) => ({ snowflakee: ctx.string() }),
              async (msg, { snowflakee }) => {
                const now = new Date();
                const baseId = snowflakee;
                const normalTs = utils.getSnowflakeDate(baseId);
                await msg.reply(
                  `\`\`\`\nID: ${baseId}\nTimestamp: ${new Date(normalTs)}\n\`\`\``,
                );
              });

  cmdGroup.raw({ name: 'cat', filters: c2.getFilters('utilities.cat', Ranks.Guest) }, async (msg) => {
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
  });
  return cmdGroup;
}
