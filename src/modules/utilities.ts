/* eslint-disable no-irregular-whitespace */
// TODO: reminders
// TODO: translation reply command
// TODO: jumbo, urban, kittyapi
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks, guildId } from '../config';
import { logCustom } from './logging/events/custom';
import { getMemberTag, getUserTag } from './logging/utils';
import { StoragePool, BetterUser } from '../lib/utils';
import { infsPool } from './infractions';
import { saveMessage, getRoleIdByText } from './admin';
import { registerSlash, registerSlashGroup, registerSlashSub, interactionChannelRespond, registerChatOn, registerChatRaw, executeChatCommand, registerChatSubCallback } from './commands';
import { language as i18n, setPlaceholders } from '../localization/interface';

class UserRole {
  memberId: string;
  roleId: string;
  constructor(member: string, role: string) {
    this.memberId = member;
    this.roleId = role;
    return this;
  }
}
const customUserRoles = new StoragePool('customUserRoles', 0, 'memberId');
class Reminder {
  id: string;
  expires: number;
  authorId: string;
  channelId: string;
  content: string;
  constructor(id: string, exp: number, author: string, channelId: string, content: string) {
    this.expires = exp;
    this.id = id;
    this.authorId = author;
    this.channelId = channelId;
    this.content = content;
    return this;
  }
}

const reminders = new StoragePool('reminders', 0, 'id');

export async function checkReminders() {
  const rem = await reminders.getAll<Reminder>();
  if (rem.length === 0) {
    return;
  }
  await Promise.all(rem.map(async (remi) => {
    const diff = Date.now() - remi.expires;
    if (diff >= 0) {
      // expired
      const guild = await discord.getGuild();
      if (guild === null) {
        return;
      }
      const member = await guild.getMember(remi.authorId);
      if (member === null) {
        return;
      }
      const chan = await discord.getChannel(remi.channelId);
      if (!chan || chan === null || (!(chan instanceof discord.GuildTextChannel) && !(chan instanceof discord.GuildNewsChannel))) {
        // TODO: dm the user instead
        return;
      }
      const ts = utils.decomposeSnowflake(remi.id).timestamp;
      const dt = new Date(ts);
      const monthNames = [i18n.time_units.months.mo_short.january, i18n.time_units.months.mo_short.february, i18n.time_units.months.mo_short.march, i18n.time_units.months.mo_short.april, i18n.time_units.months.mo_short.may, i18n.time_units.months.mo_short.june, i18n.time_units.months.mo_short.july, i18n.time_units.months.mo_short.august, i18n.time_units.months.mo_short.september, i18n.time_units.months.mo_short.october, i18n.time_units.months.mo_short.november, i18n.time_units.months.mo_short.december,
      ];
      const timestamptext = `${(`0${dt.getDate()}`).substr(-2)}-${monthNames[dt.getMonth()]}-${dt.getFullYear().toString().substr(-2)} @ ${(`0${dt.getHours()}`).substr(-2)}:${(`0${dt.getMinutes()}`).substr(-2)}:${(`0${dt.getSeconds()}`).substr(-2)}`;
      let msgExists = false;
      try {
        const msgcheck = await chan.getMessage(remi.id);
        if (msgcheck && msgcheck instanceof discord.Message) {
          msgExists = true;
        }
      } catch (_) {}
      const newContent = await utils.parseMentionables(remi.content);
      await chan.sendMessage({ reply: msgExists === true ? remi.id : null, allowedMentions: { users: [remi.authorId] }, content: setPlaceholders(i18n.modules.utilities.reminders.remind_message, ['user_mention', member.toMention(), 'time_utc', timestamptext, 'time_ago', utils.getLongAgoFormat(ts, 1, true), 'reminder_text', newContent]) });
      await reminders.editPool(remi.id, null);
    }
  }));
}

export async function addReminderSlash(inter: discord.interactions.commands.SlashCommandInteraction, when: string, text: string) {
  const dur = utils.timeArgumentToMs(when);
  if (dur === 0) {
    await inter.respondEphemeral(i18n.modules.utilities.time_improper);
    return;
  }
  if (dur < 2000 * 60 || dur > 32 * 24 * 60 * 60 * 1000) {
    await inter.respondEphemeral(i18n.modules.utilities.reminders.reminder_time_limit);
    return;
  }
  const durationText = utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second);
  const bythem = await reminders.getByQuery<Reminder>({ authorId: inter.member.user.id });
  if (bythem.length >= 10) {
    await inter.respondEphemeral(i18n.modules.utilities.reminders.reminder_count_limit);
    return;
  }
  text = utils.escapeString(text);
  text = text.split('\n').join(' ').split('\t').join(' ');
  if (text.length > 1000) {
    await inter.respondEphemeral(i18n.modules.utilities.reminders.reminder_content_limit);
    return;
  }
  await reminders.saveToPool(new Reminder(utils.composeSnowflake(), Date.now() + dur, inter.member.user.id, inter.channelId, text));
  await inter.respondEphemeral(setPlaceholders(i18n.modules.utilities.reminders.will_remind_in, ['duration', durationText]));
}

export async function addReminder(msg: discord.GuildMemberMessage, when: string, text: string) {
  const res: any = await msg.inlineReply(async () => {
    const dur = utils.timeArgumentToMs(when);
    if (dur === 0) {
      return i18n.modules.utilities.time_improper;
    }
    if (dur < 2000 * 60 || dur > 32 * 24 * 60 * 60 * 1000) {
      return i18n.modules.utilities.reminders.reminder_time_limit;
    }
    const durationText = utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second);
    const bythem = await reminders.getByQuery<Reminder>({ authorId: msg.author.id });
    if (bythem.length >= 10) {
      return i18n.modules.utilities.reminders.reminder_count_limit;
    }
    text = utils.escapeString(text);
    text = text.split('\n').join(' ').split('\t').join(' ');
    if (text.length > 1000) {
      return i18n.modules.utilities.reminders.reminder_content_limit;
    }
    await reminders.saveToPool(new Reminder(msg.id, Date.now() + dur, msg.author.id, msg.channelId, text));
    return setPlaceholders(i18n.modules.utilities.reminders.will_remind_in, ['duration', durationText]);
  });
  saveMessage(res);
}

export async function clearRemindersSlash(inter: discord.interactions.commands.SlashCommandInteraction) {
  const bythem = await reminders.getByQuery<Reminder>({ authorId: inter.member.user.id });
  if (bythem.length === 0) {
    await inter.respondEphemeral(i18n.modules.utilities.reminders.no_reminders);
    return;
  }
  const ids = bythem.map((val) => val.id);
  await reminders.editPools<Reminder>(ids, () => null);
  await inter.respondEphemeral(setPlaceholders(i18n.modules.utilities.reminders.cleared_reminders, ['count', ids.length.toString()]));
}

export async function clearReminders(msg: discord.GuildMemberMessage) {
  const res: any = await msg.inlineReply(async () => {
    const bythem = await reminders.getByQuery<Reminder>({ authorId: msg.author.id });
    if (bythem.length === 0) {
      return i18n.modules.utilities.reminders.no_reminders;
    }
    const ids = bythem.map((val) => val.id);
    await reminders.editPools<Reminder>(ids, () => null);
    return setPlaceholders(i18n.modules.utilities.reminders.cleared_reminders, ['count', ids.length.toString()]);
  });
  saveMessage(res);
}
/* SNIPE */
const snipekvs = new pylon.KVNamespace('snipe');
export async function AL_OnMessageDelete(
  id: string,
  gid: string,
  log: discord.AuditLogEntry | unknown,
  ev: discord.Event.IMessageDelete,
  msg: discord.Message.AnyMessage | null,
) {
  if (!config.modules.utilities || typeof config.modules.utilities !== 'object' || config.modules.utilities.enabled !== true) {
    return;
  }
  if (
    !msg
    || log instanceof discord.AuditLogEntry
    || !msg.author
    || msg.webhookId !== null
    || msg.author.bot === true
    || !msg.member
  ) {
    return;
  }
  if (!config.modules.utilities || !config.modules.utilities.snipe || config.modules.utilities.snipe.enabled !== true || typeof config.modules.utilities.snipe.delay !== 'number') {
    return;
  }
  if (utils.isBlacklisted(msg.member)) {
    return;
  }
  const dt = utils.decomposeSnowflake(msg.id).timestamp;
  const diff = new Date().getTime() - dt;
  if (diff >= config.modules.utilities.snipe.delay * 1000) {
    return;
  }
  await snipekvs.put(msg.channelId, JSON.stringify(msg), {
    ttl: config.modules.utilities.snipe.delay * 1000,
  });
}

function isCurEnabled() {
  return typeof config.modules.utilities.customUserRoles === 'object' && config.modules.utilities.customUserRoles.enabled === true;
}

async function checkCustomRoleProperties() {
  if (typeof config.modules.utilities.customUserRoles !== 'object' || typeof config.modules.utilities.customUserRoles.enabled !== 'boolean' || config.modules.utilities.customUserRoles.enabled !== true) {
    return;
  }
  const roles = await customUserRoles.getAll<UserRole>();
  const guild = await discord.getGuild();
  const guildRoles = await guild.getRoles();
  const matchedRoles = guildRoles.filter((role) => roles.find((v) => v.roleId === role.id) !== undefined);
  if (matchedRoles.length > 0) {
    await Promise.all(matchedRoles.map(async (role) => {
      if (role.mentionable === true || role.hoist === true || role.permissions !== 0) {
        await role.edit({ mentionable: false, hoist: false, permissions: 0 });
      }
    }));
  }
}

async function deleteCustomRoleOf(memberId: string) {
  if (typeof config.modules.utilities.customUserRoles !== 'object' || typeof config.modules.utilities.customUserRoles.enabled !== 'boolean' || config.modules.utilities.customUserRoles.enabled !== true) {
    return;
  }
  const roles = await customUserRoles.getById<UserRole>(memberId);
  if (roles) {
    const guild = await discord.getGuild();
    const role = await guild.getRole(roles.roleId);
    if (role !== null) {
      await role.delete();
    }
  }
}
export async function checkAllCustomRoles() {
  if (typeof config.modules.utilities.customUserRoles !== 'object' || typeof config.modules.utilities.customUserRoles.enabled !== 'boolean' || config.modules.utilities.customUserRoles.enabled !== true) {
    return;
  }
  const roles = await customUserRoles.getAll<UserRole>();
  const guild = await discord.getGuild();
  const guildRoles = await guild.getRoles();
  const missing = roles.filter((role) => guildRoles.find((v) => v.id === role.roleId) === undefined);
  if (missing.length > 0) {
    await customUserRoles.editPools<UserRole>(missing.map((v) => v.memberId), () => null);
  }
}
async function setUserRole(memberId: string, roleId: string) {
  if (typeof config.modules.utilities.customUserRoles !== 'object' || typeof config.modules.utilities.customUserRoles.enabled !== 'boolean' || config.modules.utilities.customUserRoles.enabled !== true) {
    return;
  }
  const ur = new UserRole(memberId, roleId);
  await customUserRoles.saveToPool(ur);
}
async function checkUserRoles(member: discord.GuildMember) {
  if (typeof config.modules.utilities.customUserRoles !== 'object' || typeof config.modules.utilities.customUserRoles.enabled !== 'boolean' || config.modules.utilities.customUserRoles.enabled !== true) {
    return;
  }
  const roles = await customUserRoles.getById<UserRole>(member.user.id);
  if (roles === undefined) {
    return;
  }
  const guild = await discord.getGuild();
  const gr = await guild.getRole(roles.roleId);
  if (gr !== null && !member.roles.includes(gr.id)) {
    await checkCustomRoleProperties();
    try {
      await member.addRole(gr.id);
    } catch (e) {}
  }
}
export async function OnGuildMemberAdd(
  id: string,
  gid: string,
  member: discord.GuildMember,
) {
  await checkUserRoles(member);
}

export async function AL_OnGuildMemberRemove(
  id: string,
  gid: string,
  log: any,
  memberRemove: discord.Event.IGuildMemberRemove,
) {
  if (typeof config.modules.utilities.customUserRoles !== 'object' || typeof config.modules.utilities.customUserRoles.enabled !== 'boolean' || config.modules.utilities.customUserRoles.enabled !== true) {
    return;
  }
  if (log instanceof discord.AuditLogEntry) {
    if (log.actionType === discord.AuditLogEntry.ActionType.MEMBER_KICK && config.modules.utilities.customUserRoles.clearOnKick === true) {
      await deleteCustomRoleOf(memberRemove.user.id);
    } else if (log.actionType === discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD && config.modules.utilities.customUserRoles.clearOnBan === true) {
      await deleteCustomRoleOf(memberRemove.user.id);
    }
  } else if (config.modules.utilities.customUserRoles.clearOnLeave === true) {
    await deleteCustomRoleOf(memberRemove.user.id);
  }
}

export async function OnGuildMemberUpdate(
  id: string,
  gid: string,
  member: discord.GuildMember,
  oldMember: discord.GuildMember,
) {
  await checkUserRoles(member);
}
export async function OnGuildRoleUpdate(
  id: string,
  gid: string,
  role: discord.Role,
  oldRole: discord.Role,
) {
  await checkCustomRoleProperties();
  await checkAllCustomRoles();
}
export async function OnGuildRoleDelete(
  id: string,
  gid: string,
  role: discord.Role,
) {
  const checkrole = await customUserRoles.getByQuery<UserRole>({ roleId: role.id });
  if (checkrole && checkrole.length === 1) {
    await customUserRoles.editPool(checkrole[0].memberId, null);
  }
  await checkAllCustomRoles();
}

export function InitializeCommands() {
  const _groupOptions = {
    description: 'Utility Commands',
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  if (typeof config.modules.utilities.customUserRoles === 'object' && config.modules.utilities.customUserRoles.enabled === true) {
    // CUSTOM USER ROLES
    registerChatSubCallback(cmdGroup, 'cur', (subCommandGroup) => {
      subCommandGroup.defaultRaw(
        async (msgT) => {
          await executeChatCommand(
            'cur',
            { permissions: { level: Ranks.Guest, overrideableInfo: 'utilities.cur' } },
            async (msg) => {
              const res: any = await msg.inlineReply(async () => {
                const checkrole = await customUserRoles.getById<UserRole>(msg.author.id);
                if (!checkrole) {
                  return { content: i18n.modules.utilities.curs.dont_have_role };
                }
                const prefix = typeof config.modules.commands.prefix === 'string' ? config.modules.commands.prefix : config.modules.commands.prefix[0];
                return { allowedMentions: { users: [msg.author.id] }, content: setPlaceholders(i18n.modules.utilities.curs.check_role, ['user_mention', msg.author.toMention(), 'role_mention', `<@&${checkrole.roleId}>`, 'prefix', prefix]) };
              });
              saveMessage(res);
            }, msgT,
          );
        },
      );
      registerChatOn(
        subCommandGroup,
        'name',
        (ctx) => ({ name: ctx.text() }),
        async (msg, { name }) => {
          const res: any = await msg.inlineReply(async () => {
            const checkrole = await customUserRoles.getById<UserRole>(msg.author.id);
            if (!checkrole) {
              return { allowedMentions: { users: [msg.author.id] }, content: i18n.modules.utilities.curs.dont_have_role };
            }
            if (name.length < 2 || name.length > 32) {
              return { allowedMentions: { users: [msg.author.id] }, content: i18n.modules.utilities.curs.character_limit };
            }
            const guild = await msg.getGuild();
            const role = await guild.getRole(checkrole.roleId);
            if (!role) {
              return { content: i18n.modules.utilities.curs.role_not_found };
            }
            await role.edit({ name });
            return { allowedMentions: { users: [msg.author.id] }, content: setPlaceholders(i18n.modules.utilities.curs.changed_role_name, ['role_name', utils.escapeString(name, true)]) };
          });
          saveMessage(res);
        },
        {
          permissions: {
            overrideableInfo: 'utilities.cur.name',
            level: Ranks.Guest,
          },
        },
      );
      registerChatOn(
        subCommandGroup,
        'color',
        (ctx) => ({ color: ctx.textOptional() }),
        async (msg, { color }) => {
          const res: any = await msg.inlineReply(async () => {
            const checkrole = await customUserRoles.getById<UserRole>(msg.author.id);
            if (!checkrole) {
              return { allowedMentions: { users: [msg.author.id] }, content: i18n.modules.utilities.curs.dont_have_role };
            }
            if (typeof color === 'string' && color.includes('#')) {
              color = color.split('#').join('');
            }
            if (typeof color === 'string' && color.length !== 6) {
              return { allowedMentions: { users: [msg.author.id] }, content: i18n.modules.utilities.curs.color_wrong_format };
            }
            const guild = await msg.getGuild();
            const role = await guild.getRole(checkrole.roleId);
            if (!role) {
              return { content: i18n.modules.utilities.curs.role_not_found };
            }
            await role.edit({ color: typeof color === 'string' ? parseInt(color, 16) : 0 });
            return { allowedMentions: { users: [msg.author.id] }, content: setPlaceholders(i18n.modules.utilities.curs.changed_role_color, ['color', typeof color === 'string' ? `#${color}` : 'None']) };
          });
          saveMessage(res);
        },
        {
          permissions: {
            overrideableInfo: 'utilities.cur.color',
            level: Ranks.Guest,
          },
        },
      );

      registerChatOn(
        subCommandGroup,
        'set',
        (ctx) => ({ target: ctx.guildMember(), roleText: ctx.text() }),
        async (msg, { target, roleText }) => {
          const res: any = await msg.inlineReply(async () => {
            const rlid = await getRoleIdByText(roleText);
            if (!rlid) {
              return { allowedMentions: { users: [msg.author.id] }, content: i18n.modules.utilities.curs.role_not_found };
            }
            const guild = await msg.getGuild();
            const role = await guild.getRole(rlid);
            if (!(role instanceof discord.Role)) {
              return { allowedMentions: { users: [msg.author.id] }, content: i18n.modules.utilities.curs.role_not_found };
            }
            const kvc = await customUserRoles.exists(target.user.id);
            if (kvc) {
              return { allowedMentions: { users: [msg.author.id] }, content: i18n.modules.utilities.curs.already_has_role };
            }
            const kvcrole = await customUserRoles.getByQuery<UserRole>({ roleId: role.id });
            if (Array.isArray(kvcrole) && kvcrole.length > 0) {
              return { allowedMentions: { users: [msg.author.id] }, content: setPlaceholders(i18n.modules.utilities.curs.already_assigned_to, ['user_mention', `<@!${kvcrole[0].memberId}>`]) };
            }
            await setUserRole(target.user.id, role.id);
            await checkCustomRoleProperties();
            if (!target.roles.includes(role.id)) {
              await target.addRole(role.id);
            }
            return { allowedMentions: { users: [msg.author.id] }, content: setPlaceholders(i18n.modules.utilities.curs.set_role, ['user_mention', target.toMention(), 'role_mention', role.toMention()]) };
          });
          saveMessage(res);
        },
        {
          permissions: {
            overrideableInfo: 'utilities.cur.set',
            level: Ranks.Administrator,
          },
        },
      );

      registerChatOn(
        subCommandGroup,
        'clear',
        (ctx) => ({ target: ctx.guildMember() }),
        async (msg, { target }) => {
          const res: any = await msg.inlineReply(async () => {
            const kvc = await customUserRoles.getById<UserRole>(target.user.id);
            if (!kvc) {
              return { allowedMentions: { users: [msg.author.id] }, content: i18n.modules.utilities.curs.has_no_role };
            }
            const rlid = kvc.roleId;
            const guild = await msg.getGuild();
            const role = await guild.getRole(rlid);
            await customUserRoles.editPool(target.user.id, null);
            if (role instanceof discord.Role && target.roles.includes(role.id)) {
              await target.removeRole(role.id);
            }
            return { allowedMentions: { users: [msg.author.id] }, content: setPlaceholders(i18n.modules.utilities.curs.cleared_role, ['user_mention', target.user.toMention()]) };
          });
          saveMessage(res);
        },
        {
          permissions: {
            overrideableInfo: 'utilities.cur.clear',
            level: Ranks.Administrator,
          },
        },
      );
      registerChatOn(
        subCommandGroup,
        'delete',
        (ctx) => ({ target: ctx.guildMember() }),
        async (msg, { target }) => {
          const res: any = await msg.inlineReply(async () => {
            const kvc = await customUserRoles.getById<UserRole>(target.user.id);
            if (!kvc) {
              return { allowedMentions: { users: [msg.author.id] }, content: i18n.modules.utilities.curs.has_no_role };
            }
            const rlid = kvc.roleId;
            const guild = await msg.getGuild();
            const role = await guild.getRole(rlid);
            if (!(role instanceof discord.Role)) {
              return { allowedMentions: { users: [msg.author.id] }, content: i18n.modules.utilities.curs.role_not_found };
            }

            await deleteCustomRoleOf(target.user.id);
            return { allowedMentions: { users: [msg.author.id] }, content: setPlaceholders(i18n.modules.utilities.curs.deleted_role, ['user_mention', target.user.toMention()]) };
          });
          saveMessage(res);
        },
        {
          permissions: {
            overrideableInfo: 'utilities.cur.delete',
            level: Ranks.Administrator,
          },
        },
      );
    }, false);
  }
  // SNIPE COMMAND
  if (typeof config.modules.utilities.snipe === 'object' && config.modules.utilities.snipe.enabled === true) {
    registerChatRaw(
      cmdGroup,
      'snipe', async (msg) => {
        const res: any = await msg.inlineReply(async () => {
          let _sn: any = await snipekvs.get(msg.channelId);
          if (typeof _sn === 'string') {
            _sn = JSON.parse(_sn);
          }
          if (
            _sn === undefined
      || typeof _sn.author !== 'object'
      || typeof _sn.id !== 'string'
          ) {
            return { content: i18n.modules.utilities.snipe.no_message };
          }
          if (
            _sn.author.id === msg.author.id
      && !msg.member.can(discord.Permissions.ADMINISTRATOR)
          ) {
            return { content: i18n.modules.utilities.snipe.no_message };
          }
          const emb = new discord.Embed();
          const _usr = await utils.getUser(_sn.author.id);
          if (!_usr) {
            return { content: i18n.modules.utilities.snipe.user_not_found };
          }
          emb.setAuthor({ name: _usr.getTag(), iconUrl: _usr.getAvatarUrl() });
          emb.setTimestamp(
            new Date(utils.decomposeSnowflake(_sn.id).timestamp).toISOString(),
          );
          emb.setFooter({
            iconUrl: msg.author.getAvatarUrl(),
            text: setPlaceholders(i18n.modules.utilities.snipe.requested_by, ['user_tag', msg.author.getTag()]),
          });
          emb.setDescription(_sn.content);
          emb.setColor(0x03fc52);
          await snipekvs.delete(msg.channelId);
          return {
            embed: emb,
            content: setPlaceholders(i18n.modules.utilities.snipe.said, ['user_mention', _usr.toMention()]),
            allowedMentions: {},
          };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'utilities.snipe',
          level: Ranks.Authorized,
        },
      },
    );
  }

  // random
  registerChatSubCallback(cmdGroup, 'random', (subCommandGroup) => {
    registerChatRaw(
      subCommandGroup,
      'coin',
      async (msg) => {
        await msg.inlineReply(async () => {
          const ret = utils.getRandomInt(1, 2);
          return setPlaceholders(i18n.modules.utilities.random.coin, ['result', ret === 1 ? i18n.modules.utilities.random.coin_heads : i18n.modules.utilities.random.coin_tails]);
        });
      },
      {
        permissions: {
          overrideableInfo: 'utilities.random.coin',
          level: Ranks.Guest,
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'number',
      (ctx) => ({ minimum: ctx.integer({ maxValue: 1000000000, minValue: 0 }), maximum: ctx.integer({ maxValue: 1000000000, minValue: 1 }) }),
      async (msg, { minimum, maximum }) => {
        await msg.inlineReply(async () => {
          if (minimum >= maximum) {
            return i18n.modules.utilities.random.number_minimum_wrong;
          }
          const ret = utils.getRandomInt(minimum, maximum);
          return setPlaceholders(i18n.modules.utilities.random.number, ['minimum', minimum.toString(), 'maximum', maximum.toString(), 'result', ret.toString()]);
        });
      },
      {
        permissions: {
          overrideableInfo: 'utilities.random.number',
          level: Ranks.Guest,
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      { name: 'cat', aliases: ['pussy', 'fatbitch'] },
      async (msg) => {
        const res: any = await msg.inlineReply(async () => {
          const file = await (await fetch('http://aws.random.cat/meow')).json();
          const catpic = await (await fetch(file.file)).arrayBuffer();
          const ext = file.file.split('.')[file.file.split('.').length - 1];
          return {
            content: '',
            attachments: [{
              name: `cat.${ext}`,
              data: catpic,
            }],
          };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'utilities.random.cat',
          level: Ranks.Guest,
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      { name: 'dog', aliases: ['doggo'] }, async (msg) => {
        const res: any = await msg.inlineReply(async () => {
          const file = await (await fetch('https://random.dog/woof.json')).json();
          const pic = await (await fetch(file.url)).arrayBuffer();
          const ext = file.url.split('.')[file.url.split('.').length - 1];
          return {
            content: '',
            allowedMentions: {},
            attachments: [{
              name: `dog.${ext}`,
              data: pic,
            }],
          };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'utilities.random.dog',
          level: Ranks.Guest,
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      { name: 'doge', aliases: ['shibe'] }, async (msg) => {
        const res: any = await msg.inlineReply(async () => {
          const file = await (await fetch('https://dog.ceo/api/breed/shiba/images/random')).json();
          const pic = await (await fetch(file.message)).arrayBuffer();
          const ext = file.message.split('.')[file.message.split('.').length - 1];
          return {
            content: '',
            allowedMentions: {},
            attachments: [{
              name: `dog.${ext}`,
              data: pic,
            }],
          };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'utilities.random.doge',
          level: Ranks.Guest,
        },
      },
    );

    registerChatRaw(
      subCommandGroup,
      'fox', async (msg) => {
        const res: any = await msg.inlineReply(async () => {
          const file = await (await fetch('https://randomfox.ca/floof/')).json();
          const pic = await (await fetch(file.image)).arrayBuffer();
          const ext = file.image.split('.')[file.image.split('.').length - 1];
          return {
            content: '',
            allowedMentions: {},
            attachments: [{
              name: `fox.${ext}`,
              data: pic,
            }],
          };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'utilities.random.fox',
          level: Ranks.Guest,
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      'koala',
      async (msg) => {
        const res: any = await msg.inlineReply(async () => {
          const file = await (await fetch('https://some-random-api.ml/img/koala')).json();
          const pic = await (await fetch(file.link)).arrayBuffer();
          const ext = file.link.split('.')[file.link.split('.').length - 1];
          return {
            content: '',
            allowedMentions: {},
            attachments: [{
              name: `koala.${ext}`,
              data: pic,
            }],
          };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'utilities.random.koala',
          level: Ranks.Guest,
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      { name: 'birb', aliases: ['bird'] },
      async (msg) => {
        const res: any = await msg.inlineReply(async () => {
          const file = await (await fetch('https://some-random-api.ml/img/birb')).json();
          const pic = await (await fetch(file.link)).arrayBuffer();
          const ext = file.link.split('.')[file.link.split('.').length - 1];
          return {
            content: '',
            allowedMentions: {},
            attachments: [{
              name: `birb.${ext}`,
              data: pic,
            }],
          };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'utilities.random.birb',
          level: Ranks.Guest,
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      { name: 'panda', aliases: ['ponda', 'pwnda'] },
      async (msg) => {
        const res: any = await msg.inlineReply(async () => {
          const file = await (await fetch('https://some-random-api.ml/img/panda')).json();
          const pic = await (await fetch(file.link)).arrayBuffer();
          const ext = file.link.split('.')[file.link.split('.').length - 1];
          return {
            content: '',
            allowedMentions: {},
            attachments: [{
              name: `panda.${ext}`,
              data: pic,
            }],
          };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'utilities.random.panda',
          level: Ranks.Guest,
        },
      },
    );
  });
  // snowflake
  registerChatOn(
    cmdGroup,
    'snowflake',
    (ctx) => ({ snowflake: ctx.string() }),
    async (msg, { snowflake }) => {
      const normalTs = utils.getSnowflakeDate(snowflake);
      const res: any = await msg.inlineReply(
        setPlaceholders(i18n.modules.utilities.snowflake, ['snowflake', snowflake, 'date', new Date(normalTs)]),
      );
      saveMessage(res);
    },
    {
      permissions: {
        overrideableInfo: 'utilities.snowflake',
        level: Ranks.Guest,
      },
    },
  );

  registerChatOn(
    cmdGroup,
    'avatar',
    (ctx) => ({ user: ctx.userOptional() }),
    async (msg, { user }) => {
      const res: any = await msg.inlineReply(async () => {
        if (user === null) {
          user = msg.author;
        }
        const emb = new discord.Embed();
        emb.setAuthor({ iconUrl: user.getAvatarUrl(), name: user.getTag() });
        emb.setDescription(setPlaceholders(i18n.modules.utilities.avatar.avatar_of, ['user_tag', user.getTag(), 'avatar_url', `<${user.getAvatarUrl()}>`]));
        emb.setFooter({ text: setPlaceholders(i18n.modules.utilities.avatar.requested_by, ['user_tag', user.getTag(), 'user_id', user.id]) });
        emb.setTimestamp(new Date().toISOString());
        emb.setImage({ url: user.getAvatarUrl() });
        return { embed: emb };
      });

      saveMessage(res);
    },
    {
      permissions: {
        overrideableInfo: 'utilities.avatar',
        level: Ranks.Guest,
      },
    },
  );

  // reminder
  registerChatSubCallback(cmdGroup, 'remind', (subCommandGroup) => {
    subCommandGroup.default(
      (ctx) => ({ when: ctx.string(), text: ctx.text() }),
      async (...args) => {
        await executeChatCommand(
          'remind',
          { permissions: { level: Ranks.Guest, overrideableInfo: 'utilities.remind.add' } },
          async (msg, { when, text }) => {
            await addReminder(msg, when, text);
          }, ...args,
        );
      },
    );

    registerChatOn(
      subCommandGroup,
      'add',
      (ctx) => ({ when: ctx.string(), text: ctx.text() }),
      async (msg, { when, text }) => {
        await addReminder(msg, when, text);
      },
      {
        permissions: {
          overrideableInfo: 'utilities.remind.add',
          level: Ranks.Guest,
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      'clear',
      async (msg) => {
        await clearReminders(msg);
      },
      {
        permissions: {
          overrideableInfo: 'utilities.remind.clear',
          level: Ranks.Guest,
        },
      },
    );
  }, false);

  registerChatRaw(
    cmdGroup,
    'pikachu',
    async (msg) => {
      const res: any = await msg.inlineReply(async () => {
        const file = await (await fetch('https://some-random-api.ml/img/pikachu')).json();
        const pic = await (await fetch(file.link)).arrayBuffer();
        const ext = file.link.split('.')[file.link.split('.').length - 1];
        return {
          content: '',
          allowedMentions: {},
          attachments: [{
            name: `pika.${ext}`,
            data: pic,
          }],
        };
      });
      saveMessage(res);
    },
    {
      permissions: {
        overrideableInfo: 'utilities.pikachu',
        level: Ranks.Guest,
      },
    },
  );

  registerChatRaw(
    cmdGroup,
    'pat',
    async (msg) => {
      const res: any = await msg.inlineReply(async () => {
        const file = await (await fetch('https://some-random-api.ml/animu/pat')).json();
        const pic = await (await fetch(file.link)).arrayBuffer();
        const ext = file.link.split('.')[file.link.split('.').length - 1];
        return {
          content: '',
          allowedMentions: {},
          attachments: [{
            name: `pat.${ext}`,
            data: pic,
          }],
        };
      });
      saveMessage(res);
    },
    {
      permissions: {
        overrideableInfo: 'utilities.pat',
        level: Ranks.Guest,
      },
    },
  );
  registerChatRaw(
    cmdGroup,
    'hug',
    async (msg) => {
      const res: any = await msg.inlineReply(async () => {
        const file = await (await fetch('https://some-random-api.ml/animu/hug')).json();
        const pic = await (await fetch(file.link)).arrayBuffer();
        const ext = file.link.split('.')[file.link.split('.').length - 1];
        return {
          content: '',
          allowedMentions: {},
          attachments: [{
            name: `hug.${ext}`,
            data: pic,
          }],
        };
      });
      saveMessage(res);
    },
    {
      permissions: {
        overrideableInfo: 'utilities.hug',
        level: Ranks.Guest,
      },
    },
  );

  registerChatOn(
    cmdGroup,
    'server',
    (ctx) => ({ gid: ctx.stringOptional() }),
    async (message, { gid }) => {
      const res: any = await message.inlineReply(async () => {
        const embed = new discord.Embed();
        if (gid === null) {
          gid = guildId;
        }
        const guildThis = await message.getGuild();
        const guild: any = await utils.getGuild(gid);
        const me = await guildThis.getMember(discord.getBotId());
        if (guild === null || !(guild instanceof discord.Guild)) {
          return { content: i18n.modules.utilities.server.guild_not_found };
        }
        if (me === null) {
          throw new Error(i18n.modules.utilities.server.bot_user_not_found);
        }

        let icon = guild.getIconUrl();
        if (icon === null) {
          icon = '';
        }
        embed.setAuthor({
          name: guild.name,
          iconUrl: guild.getIconUrl() ?? undefined,
        });
        const dtCreation = new Date(utils.decomposeSnowflake(guild.id).timestamp);
        const tdiff = utils.getLongAgoFormat(dtCreation.getTime(), 2, true, i18n.time_units.ti_full.singular.second);
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
          ? `\n  󠇰**${i18n.modules.utilities.server.preferred_locale}**: \`${guild.preferredLocale}\``
          : '';
        const boosts = typeof guild.premiumSubscriptionCount === 'number' && guild.premiumSubscriptionCount > 0
          ? `\n<:booster3:735780703773655102>**${i18n.modules.utilities.server.boosts}**: ${guild.premiumSubscriptionCount}`
          : '';
        const boostTier = guild.premiumTier !== null && guild.premiumTier !== undefined
          ? `\n  󠇰**${i18n.modules.utilities.server.boost_tier}**: ${guild.premiumTier}`
          : '';
        const systemChannel = typeof guild.systemChannelId === 'string'
          ? `\n  󠇰**${i18n.modules.utilities.server.system_channel}**: <#${guild.systemChannelId}>`
          : '';
        const vanityUrl = typeof guild.vanityUrlCode === 'string'
          ? `\n  󠇰**${i18n.modules.utilities.server.vanity_url}**: \`${guild.vanityUrlCode}\``
          : '';
        const description = typeof guild.description === 'string'
          ? `\n  󠇰**${i18n.modules.utilities.server.description}**: \`${guild.description}\``
          : '';
        const widgetChannel = typeof guild.widgetChannelId === 'string'
          ? `<#${guild.widgetChannelId}>`
          : i18n.modules.utilities.server.widget_no_channel;
        const widget = guild.widgetEnabled === true
          ? `\n  󠇰**${i18n.modules.utilities.server.widget}**: ${
            discord.decor.Emojis.WHITE_CHECK_MARK
          } ( ${widgetChannel} )`
          : '';
        const features = guild.features.length > 0 ? guild.features.map((feat) => feat.split('_').map((sp) => `${sp.substr(0, 1).toUpperCase()}${sp.substr(1).toLowerCase()}`).join(' ')).join(', ') : i18n.modules.utilities.server.none;

        desc += `  **❯ **${i18n.modules.utilities.server.information}
<:rich_presence:735781410509684786>**${i18n.modules.utilities.server.id}**: \`${guild.id}\`
  󠇰${setPlaceholders(i18n.modules.utilities.server.created, ['time', tdiff])} **[**\`${formattedDtCreation}\`**]**
<:owner:735780703903547443>**${i18n.modules.utilities.server.owner}**: <@!${guild.ownerId}>
<:voice:735780703928844319>**${i18n.modules.utilities.server.vc_region}**: \`${guild.region.split(' ').map((v) => `${v.substr(0, 1).toUpperCase()}${v.substr(1).toLowerCase()}`).join(' ')}\`
  󠇰**${i18n.modules.utilities.server.features}**: \`${features}\`${boosts}${boostTier}${widget}${description}${preferredLocale}${vanityUrl}${systemChannel}`;

        const chanStats = [];
        const counts: {[key: string]: number} = {
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
            emj = '<:channel:735780703983239218>';
          }
          if (k === 'voice') {
            emj = '<:voice:735780703928844319>';
          }
          if (k === 'store') {
            emj = '<:store:735780704130170880>';
          }
          if (k === 'news') {
            emj = '<:news:735780703530385470>';
          }
          if (k === 'category') {
            emj = '<:category:754241739258069043>';
          }

          /* if (obj > 0) {
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
          } */
          if (obj > 0) {
            chanStats.push(`${emj}: **${obj}**`);
          }
        }
        if (guild.id === guildThis.id) {
          desc += `\n\n**❯ **${i18n.modules.utilities.server.channels} ⎯ ${channels.length}\n${chanStats.join(' | ')}`;
        }
        const guildEx: any = guild;
        const roles = guild.id !== guildThis.id ? guildEx.roles : await guild.getRoles();
        const emojis = guild.id !== guildThis.id ? guildEx.emojis : await guild.getEmojis();
        let bans = 0;
        let invites = 0;
        if (guildThis.id === guild.id && me.can(discord.Permissions.BAN_MEMBERS)) {
          bans = (await guild.getBans()).length;
        }
        if (guildThis.id === guild.id && me.can(discord.Permissions.MANAGE_GUILD)) {
          invites = (await guild.getInvites()).length;
        }
        if (roles.length > 0 || emojis.length > 0 || bans > 0 || invites > 0) {
          desc += `


**❯ **${i18n.modules.utilities.server.other_counts}`;
          if (roles.length > 0) {
            desc += `\n <:settings:735782884836638732> **${i18n.modules.utilities.server.roles}**: ${roles.length}`;
          }
          if (emojis.length > 0) {
            desc += `\n <:emoji_ghost:735782884862066789> **${i18n.modules.utilities.server.emojis}**: ${emojis.length}`;
          }
          if (bans > 0) {
            desc += `\n ${discord.decor.Emojis.HAMMER} **${i18n.modules.utilities.server.bans}**: ${bans}`;
          }
          if (invites > 0) {
            desc += `\n <:memberjoin:754249269665333268> **${i18n.modules.utilities.server.invites}**: ${invites}`;
          }
        }
        interface presCount {
          [key: string]: number,
          streaming: number,
          game: number,
          listening: number,
          watching: number,
          online: number,
          dnd: number,
          idle: number,
          offline: number
        }
        interface memCount {
          [key: string]: number | presCount,
          human: number,
          bot: number,
          presences: presCount
        }
        // type memCount = {[key: string] : number | presCount};
        const memberCounts: memCount = {
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
          for await (const mem of guild.iterMembers()) {
            const member: discord.GuildMember = mem;
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
        if (guild.memberCount < 60 && guildThis.id === guild.id) {
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


**❯ **${i18n.modules.utilities.server.members} ⎯ ${guild.memberCount}${bottxt}${prestext}`;
        } else {
          desc += `


**❯ **${i18n.modules.utilities.server.members} ⎯ ${guild.memberCount}`;
        }
        embed.setDescription(desc);
        // const editer = await edmsg;
        // await editer.edit({ content: '', embed });
        return { content: '', embed, allowedMentions: {} };
      });
      saveMessage(res);
    },
    {
      permissions: {
        overrideableInfo: 'utilities.server',
        level: Ranks.Guest,
      },
    },
  );

  registerChatOn(
    cmdGroup,
    'info',
    (ctx) => ({ user: ctx.stringOptional({ name: 'user', description: 'user' }) }),
    async (msg, { user }) => {
      const res: any = await msg.inlineReply(async () => {
        let usr: discord.User | BetterUser;
        if (user === null) {
          usr = msg.author;
          if (utils.isGlobalAdmin(msg.author.id)) {
            usr = await utils.getUser(msg.author.id, true);
          }
        } else {
          user = user.replace(/\D/g, ''); // strip all non-number chars
          if (utils.isGlobalAdmin(msg.author.id)) {
            usr = await utils.getUser(user, true);
          } else {
            usr = await discord.getUser(user);
          }
        }
        if (!usr) {
          return { content: i18n.modules.utilities.info.user_not_found, allowedMentions: {} };
        }
        const emb = new discord.Embed();
        emb.setAuthor({ name: usr.getTag(), iconUrl: usr.getAvatarUrl() });
        if (typeof usr.avatar === 'string') {
          emb.setThumbnail({ url: usr.getAvatarUrl() });
        }
        let desc = `**❯ ${!usr.bot ? i18n.modules.utilities.info.user : i18n.modules.utilities.info.bot} ${i18n.modules.utilities.server.information}**
        <:rich_presence:735781410509684786> 󠇰**${i18n.modules.utilities.server.id}**: \`${usr.id}\`
        ${discord.decor.Emojis.LINK} **${i18n.modules.utilities.info.profile}**: ${usr.toMention()}`;
        const dtCreation = new Date(utils.decomposeSnowflake(usr.id).timestamp);
        const tdiff = utils.getLongAgoFormat(dtCreation.getTime(), 2, true, i18n.time_units.ti_full.singular.second);
        const formattedDtCreation = `${dtCreation.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`;
        desc += `\n ${discord.decor.Emojis.CALENDAR_SPIRAL} ${setPlaceholders(i18n.modules.utilities.server.created, ['time', tdiff])} **[**\`${formattedDtCreation}\`**]**`;
        const guild = await msg.getGuild();
        const member = await guild.getMember(usr.id);
        if (member !== null) {
        // presences
          const presence = await member.getPresence();
          const statuses = presence.activities.map((pres) => {
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
              return `${emjMention}${pres.state !== null ? ` \`${utils.escapeString(pres.state, true)}\`` : ''} (${i18n.modules.utilities.info.custom_status})`;
            }

            return `${emj}${pres.name.length > 0 ? ` \`${pres.name}\`` : ''}`;
          });
          let emjStatus = '';
          let embColor;
          let i18nstatustext;
          if (presence.status === 'online') {
            emjStatus = '<:status_online:735780704167919636>';
            embColor = 0x25c059;
            i18nstatustext = i18n.modules.utilities.info.online;
          }
          if (presence.status === 'dnd') {
            emjStatus = '<:status_busy:735780703983239168>';
            embColor = 0xb34754;
            i18nstatustext = i18n.modules.utilities.info.busy;
          }
          if (presence.status === 'idle') {
            emjStatus = '<:status_away:735780703710478407>';
            embColor = 0xe4bf3d;
            i18nstatustext = i18n.modules.utilities.info.idle;
          }
          if (presence.status === 'offline') {
            emjStatus = '<:status_offline:735780703802753076>';
            embColor = 0x36393f;
            i18nstatustext = i18n.modules.utilities.info.offline;
          }
          desc += `\n ${emjStatus} **${i18n.modules.utilities.info.status}**: ${i18nstatustext}`;
          if (statuses.length > 0) {
            desc += `\n  ${statuses.join('\n  ')}󠇰`;
          }
          if (embColor) {
            emb.setColor(embColor);
          }
        }
        if (emb.color === null) {
          const clr = (Math.random() * 0xFFFFFF << 0).toString(16);
          emb.setColor(parseInt(clr, 16));
        }
        try {
          if (typeof usr === 'object' && usr instanceof utils.BetterUser && typeof usr.public_flags === 'number') {
            let badges = [];
            const flags = new utils.UserFlags(usr.public_flags).serialize();
            for (const key in flags) {
              if (flags[key] === true) {
                badges.push(key);
              }
            }
            if (badges.length > 0) {
              desc += `\n\n**❯ ${i18n.modules.utilities.info.discord_badges}**`;
              badges = badges.map((val) => {
                switch (val) {
                  case 'STAFF':
                    return `<:discordstaff:751155123648069743> ${i18n.modules.utilities.info.discord_staff}`;
                  case 'PARTNER':
                    return `<:partner:735780703941165057> ${i18n.modules.utilities.info.discord_partner}`;
                  case 'HYPESQUAD_EVENTS':
                    return `<:hypesquad_events:735780703958204446> ${i18n.modules.utilities.info.hypesquad}`;
                  case 'BUG_HUNTER':
                    return `<:bughunter:735780703920324762> ${i18n.modules.utilities.info.bug_hunter}`;
                  case 'HYPESQUAD_BRAVERY':
                    return `<:bravery:735780704100679720> ${i18n.modules.utilities.info.hs_bravery}`;
                  case 'HYPESQUAD_BRILLIANCE':
                    return `<:brilliance:735780703878512711> ${i18n.modules.utilities.info.hs_brilliance}`;
                  case 'HYPESQUAD_BALANCE':
                    return `<:balance:735780704159531089> ${i18n.modules.utilities.info.hs_balance}`;
                  case 'EARLY_SUPPORTER':
                    return `<:earlysupporter:735780703631048786> ${i18n.modules.utilities.info.early_supporter}`;
                  case 'TEAM_USER':
                    return `<:members:735780703559745558> ${i18n.modules.utilities.info.team_user}`;
                  case 'SYSTEM':
                    return `<:discordstaff:751155123648069743> ${i18n.modules.utilities.info.system}`;
                  case 'BUG_HUNTER_GOLDEN':
                    return `<:goldenbughunter:751153800693284924> ${i18n.modules.utilities.info.golden_bug_hunter}`;
                  case 'VERIFIED_BOT':
                    return `<:verified:735780703874318417> ${i18n.modules.utilities.info.verified_bot}`;
                  case 'VERIFIED_BOT_DEVELOPER':
                    return `<:botdev:751154656679559259> ${i18n.modules.utilities.info.early_bot_dev}`;
                  default:
                    return val;
                }
              }).filter((val) => val !== '').map((val) => `**${val}**`);
              desc += `\n ${badges.join('\n ')}`;
            }
          }
        } catch (e) {
          utils.logError(e);
        }

        // actual server stuff
        const isAdmin = utils.isGlobalAdmin(usr.id);
        if (typeof globalConfig.badges === 'object') {
          if (isAdmin || (typeof globalConfig.userBadges === 'object' && Array.isArray(globalConfig.userBadges[usr.id]))) {
            desc += `\n\n**❯ ${i18n.modules.utilities.info.pyboat_badges}**`;
            if (isAdmin && typeof globalConfig.badges.globaladmin === 'string') {
              desc += `\n${globalConfig.badges.globaladmin}`;
            }
            if ((typeof globalConfig.userBadges === 'object' && Array.isArray(globalConfig.userBadges[usr.id]))) {
              desc += `\n${globalConfig.userBadges[usr.id].map((bd: string) => (typeof globalConfig.badges[bd] === 'string' ? globalConfig.badges[bd] : 'Unknown')).join('\n')}`;
            }
          }
        }
        if (member !== null) {
          const roles = member.roles.map((rl) => `<@&${rl}>`).join(' ');
          desc += `\n\n**❯ ${i18n.modules.utilities.info.member_info}**`;
          const dtJoin = new Date(member.joinedAt);
          const tdiffjoin = utils.getLongAgoFormat(dtJoin.getTime(), 2, true, i18n.time_units.ti_full.singular.second);
          const formattedDtJoin = `${dtJoin.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`;
          desc += `\n ${discord.decor.Emojis.INBOX_TRAY} ${setPlaceholders(i18n.modules.utilities.info.joined, ['time', tdiffjoin])} **[**\`${formattedDtJoin}\`**]**`;
          if (member.nick && member.nick !== null && member.nick.length > 0) {
            desc += `\n ${discord.decor.Emojis.NOTEPAD_SPIRAL} 󠇰**${i18n.modules.utilities.info.nickname}**: \`${utils.escapeString(member.nick, true)}\``;
          }
          if (member.premiumSince !== null) {
            const boostDt = new Date(member.premiumSince);
            const tdiffboost = utils.getLongAgoFormat(boostDt.getTime(), 2, true, i18n.time_units.ti_full.singular.second);
            const formattedDtBoost = `${boostDt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`;
            desc += `\n <:booster:735780703912067160> ${setPlaceholders(i18n.modules.utilities.info.boosting_since, ['time', tdiffboost])} **[**\`${formattedDtBoost}\`**]**`;
          }
          const irrelevantPerms = ['CREATE_INSTANT_INVITE', 'ADD_REACTIONS', 'STREAM', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'SEND_TTS_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY', 'USE_EXTERNAL_EMOJIS', 'CONNECT', 'SPEAK', 'USE_VOICE_ACTIVITY', 'CHANGE_NICKNAME', 'VIEW_GUILD_INSIGHTS', 'VIEW_AUDIT_LOG', 'PRIORITY_SPEAKER'];
          if (member.roles.length > 0) {
            if (member.roles.length < 20) {
              desc += `\n ${discord.decor.Emojis.SHIELD} **${i18n.modules.utilities.info.roles}** (${member.roles.length}): ${roles}`;
            } else {
              // only show key roles if those are less than 20

              const theseroles = (await guild.getRoles()).filter((m) => member.roles.includes(m.id));
              const keyroles: string[] = theseroles.filter((m) => {
                const perms = new utils.Permissions(m.permissions);
                const hasPerms: any = perms.serialize();

                for (const key in hasPerms) {
                  if (hasPerms[key] === false || irrelevantPerms.includes(key)) {
                    delete hasPerms[key];
                  }
                }
                return Object.keys(hasPerms).length > 0;
              }).map((v) => v.id);
              if (keyroles.length < 20) {
                desc += `\n ${discord.decor.Emojis.SHIELD} **${i18n.modules.utilities.info.roles}** (${member.roles.length})\n ${discord.decor.Emojis.SHIELD} **${i18n.modules.utilities.info.key_roles}** (${keyroles.length}): ${keyroles.map((rl) => `<@&${rl}>`).join(' ')}`;
              } else {
                desc += `\n ${discord.decor.Emojis.SHIELD} **${i18n.modules.utilities.info.roles}** (${member.roles.length})`;
              }
            }
          }
          const infsGiven = await infsPool.getByQuery({ actorId: usr.id });
          const infsReceived = await infsPool.getByQuery({ memberId: usr.id });
          if (infsGiven.length > 0 || infsReceived.length > 0) {
            desc += `\n\n**❯ ${i18n.modules.utilities.info.infractions}`;
          }
          if (infsGiven.length > 0) {
            desc += `\n ${discord.decor.Emojis.HAMMER} **${i18n.modules.utilities.info.infractions_applied}**: **${infsGiven.length}**`;
          }
          if (infsReceived.length > 0) {
            desc += `\n ${discord.decor.Emojis.NO_ENTRY} **${i18n.modules.utilities.info.infractions_received}**: **${infsReceived.length}**`;
          }
          const perms = new utils.Permissions(member.permissions);
          let hasPerms: any = perms.serialize();

          for (const key in hasPerms) {
            if (hasPerms[key] === false || irrelevantPerms.includes(key)) {
              delete hasPerms[key];
            }
          }
          if (hasPerms.ADMINISTRATOR === true) {
            hasPerms = { ADMINISTRATOR: true };
          }
          if (guild.ownerId === usr.id) {
            hasPerms = { SERVER_OWNER: true };
          }
          hasPerms = Object.keys(hasPerms).map((str) => str.split('_').map((upp) => `${upp.substr(0, 1).toUpperCase()}${upp.substr(1).toLowerCase()}`).join(' '));
          const auth = utils.getUserAuth(member);
          if ((Number(perms.bitfield) > 0 && hasPerms.length > 0) || auth > 0) {
            desc += `\n\n**❯ ${i18n.modules.utilities.info.permissions}**`;
          }
          if (Number(perms.bitfield) > 0 && hasPerms.length > 0) {
            desc += `\n <:settings:735782884836638732> **${i18n.modules.utilities.info.staff}**: \`${hasPerms.join(', ')}\``;
          }
          if (auth > 0 && !usr.bot) {
            desc += `\n ${discord.decor.Emojis.CYCLONE} **${i18n.modules.utilities.info.bot_level}**: **${auth}**`;
          }
        }

        emb.setDescription(desc);
        return { content: '', embed: emb, allowedMentions: {} };
      });
      saveMessage(res);
      // await loadingMsg.edit({ content: '', embed: emb });
    },
    {
      permissions: {
        overrideableInfo: 'utilities.info',
        level: Ranks.Guest,
      },
    },
  );
  return cmdGroup;
}

const curGroup = registerSlashGroup({ name: 'cur', description: 'Custom user roles' }, { module: 'utilities' });
if (curGroup) {
  registerSlashSub(
    curGroup,
    { name: 'check', description: 'Checks what your current custom role is' },
    async (inter) => {
      if (!isCurEnabled()) {
        await inter.respondEphemeral(i18n.modules.utilities.curs.not_enabled);
        return false;
      }
      const checkrole = await customUserRoles.getById<UserRole>(inter.member.user.id);
      if (!checkrole) {
        await inter.respondEphemeral(i18n.modules.utilities.curs.dont_have_role);
        return false;
      }
      await inter.respondEphemeral(setPlaceholders(i18n.modules.utilities.curs.check_role_slash, ['user_mention', inter.member.user.toMention(), 'role_mention', `<@&${checkrole.roleId}>`]));
    },
    {
      parent: 'cur',
      staticAck: false,
      module: 'utilities',
      permissions: { overrideableInfo: 'utilities.cur', level: Ranks.Guest },
    },
  );

  registerSlashSub(
    curGroup,
    { name: 'name', description: 'Changes the name of your custom role', options: (ctx) => ({ name: ctx.string({ required: true, description: 'New name of the role' }) }) },
    async (inter, { name }) => {
      if (!isCurEnabled()) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.not_enabled);
        return false;
      }
      const checkrole = await customUserRoles.getById<UserRole>(inter.member.user.id);
      if (!checkrole) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.dont_have_role);
        return false;
      }
      if (name.length < 2 || name.length > 32) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.character_limit);
        return false;
      }
      const guild = await inter.getGuild();
      const role = await guild.getRole(checkrole.roleId);
      if (!role) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.role_not_found);
        return false;
      }
      await role.edit({ name });
      await inter.acknowledge(true);
      await interactionChannelRespond(inter, { allowedMentions: { users: [inter.member.user.id] }, content: setPlaceholders(i18n.modules.utilities.curs.changed_role_name, ['role_name', utils.escapeString(name, true)]) });
    },
    {
      parent: 'cur',
      module: 'utilities',
      permissions: { overrideableInfo: 'utilities.cur.name', level: Ranks.Guest },
    },
  );

  registerSlashSub(
    curGroup,
    { name: 'color', description: 'Changes the color of your custom role', options: (ctx) => ({ color: ctx.string({ required: false, description: 'New color of the role (#ffffff format) -- Not passing this argument removes the color of your role' }) }) },
    async (inter, { color }) => {
      if (!isCurEnabled()) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.not_enabled);
        return false;
      }
      const checkrole = await customUserRoles.getById<UserRole>(inter.member.user.id);
      if (!checkrole) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.dont_have_role);
        return false;
      }
      if (typeof color === 'string' && color.includes('#')) {
        color = color.split('#').join('');
      }
      if (typeof color === 'string' && color.length !== 6) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.color_wrong_format);
        return false;
      }

      const guild = await inter.getGuild();
      const role = await guild.getRole(checkrole.roleId);
      if (!role) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.role_not_found);
        return false;
      }
      await inter.acknowledge(true);
      await role.edit({ color: typeof color === 'string' ? parseInt(color, 16) : 0 });
      await interactionChannelRespond(inter, { allowedMentions: { users: [inter.member.user.id] }, content: setPlaceholders(i18n.modules.utilities.curs.changed_role_color, ['color', typeof color === 'string' ? `#${color}` : 'None']) });
    },
    {
      parent: 'cur',
      module: 'utilities',
      permissions: { overrideableInfo: 'utilities.cur.color', level: Ranks.Guest },
    },
  );

  registerSlashSub(
    curGroup,
    { name: 'set',
      description: 'Sets a user\'s custom role',
      options: (ctx) => ({
        target: ctx.guildMember({ required: true, description: 'User to set the role' }),
        role: ctx.guildRole({ required: true, description: 'The role to set to this user' }),
      }) },
    async (inter, { target, role }) => {
      if (!isCurEnabled()) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.not_enabled);
        return false;
      }
      if (!role || !(role instanceof discord.Role)) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.role_not_found);
        return false;
      }
      const kvc = await customUserRoles.exists(target.user.id);
      if (kvc) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.already_has_role);
        return false;
      }
      const kvcrole = await customUserRoles.getByQuery<UserRole>({ roleId: role.id });
      if (Array.isArray(kvcrole) && kvcrole.length > 0) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(setPlaceholders(i18n.modules.utilities.curs.already_assigned_to, ['user_mention', `<@!${kvcrole[0].memberId}>`]));
        return false;
      }
      await inter.acknowledge(true);
      await setUserRole(target.user.id, role.id);
      await checkCustomRoleProperties();
      if (!target.roles.includes(role.id)) {
        await target.addRole(role.id);
      }
      await interactionChannelRespond(inter, { allowedMentions: { users: [inter.member.user.id] }, content: setPlaceholders(i18n.modules.utilities.curs.set_role, ['user_mention', target.toMention(), 'role_mention', role.toMention()]) });
    },
    {
      parent: 'cur',
      module: 'utilities',
      permissions: { overrideableInfo: 'utilities.cur.set', level: Ranks.Administrator },
    },
  );

  registerSlashSub(
    curGroup,
    { name: 'clear',
      description: 'Clear a user\'s assigned custom role',
      options: (ctx) => ({
        target: ctx.guildMember({ required: true, description: 'User to clear role from' }),
      }) },
    async (inter, { target }) => {
      if (!isCurEnabled()) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.not_enabled);
        return false;
      }
      const kvc = await customUserRoles.getById<UserRole>(target.user.id);
      if (!kvc) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.has_no_role);
        return false;
      }
      await inter.acknowledge(true);
      const rlid = kvc.roleId;
      const guild = await inter.getGuild();
      const role = await guild.getRole(rlid);
      await customUserRoles.editPool(target.user.id, null);
      if (role instanceof discord.Role && target.roles.includes(role.id)) {
        await target.removeRole(role.id);
      }
      await interactionChannelRespond(inter, { allowedMentions: { users: [inter.member.user.id] }, content: setPlaceholders(i18n.modules.utilities.curs.cleared_role, ['user_mention', target.user.toMention()]) });
    },
    {
      parent: 'cur',
      module: 'utilities',
      permissions: { overrideableInfo: 'utilities.cur.clear', level: Ranks.Administrator },
    },
  );

  registerSlashSub(
    curGroup,
    { name: 'delete',
      description: 'Delete a user\'s assigned custom role (from the server)',
      options: (ctx) => ({
        target: ctx.guildMember({ required: true, description: 'User to delete role from' }),
      }) },
    async (inter, { target }) => {
      if (!isCurEnabled()) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.not_enabled);
        return false;
      }
      const kvc = await customUserRoles.getById<UserRole>(target.user.id);
      if (!kvc) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.has_no_role);
        return false;
      }

      const rlid = kvc.roleId;
      const guild = await inter.getGuild();
      const role = await guild.getRole(rlid);
      if (!(role instanceof discord.Role)) {
        await inter.acknowledge(false);
        await inter.respondEphemeral(i18n.modules.utilities.curs.role_not_found);
        return false;
      }
      await inter.acknowledge(true);
      await deleteCustomRoleOf(target.user.id);
      await interactionChannelRespond(inter, { allowedMentions: { users: [inter.member.user.id] }, content: setPlaceholders(i18n.modules.utilities.curs.deleted_role, ['user_mention', target.user.toMention()]) });
    },
    {
      parent: 'cur',
      module: 'utilities',
      permissions: { overrideableInfo: 'utilities.cur.delete', level: Ranks.Administrator },
    },
  );
}

registerSlash(
  { name: 'snipe', description: 'Snipes the latest user-deleted message' },
  async (inter) => {
    let _sn: any = await snipekvs.get(inter.channelId);
    if (typeof _sn === 'string') {
      _sn = JSON.parse(_sn);
    }
    if (
      _sn === undefined
|| typeof _sn.author !== 'object'
|| typeof _sn.id !== 'string'
    ) {
      await inter.acknowledge(false);
      await inter.respondEphemeral(i18n.modules.utilities.snipe.no_message);
      return false;
    }
    if (
      _sn.author.id === inter.member.user.id
&& !inter.member.can(discord.Permissions.ADMINISTRATOR)
    ) {
      await inter.acknowledge(false);
      await inter.respondEphemeral(i18n.modules.utilities.snipe.no_message);
      return;
    }
    const emb = new discord.Embed();
    const _usr = await utils.getUser(_sn.author.id);
    if (!_usr) {
      await inter.acknowledge(false);
      await inter.respondEphemeral(i18n.modules.utilities.snipe.user_not_found);
      return;
    }
    await inter.acknowledge(true);
    emb.setAuthor({ name: _usr.getTag(), iconUrl: _usr.getAvatarUrl() });
    emb.setTimestamp(
      new Date(utils.decomposeSnowflake(_sn.id).timestamp).toISOString(),
    );
    emb.setFooter({
      iconUrl: inter.member.user.getAvatarUrl(),
      text: setPlaceholders(i18n.modules.utilities.snipe.requested_by, ['user_tag', inter.member.user.getTag()]),
    });
    emb.setDescription(_sn.content);
    emb.setColor(0x03fc52);
    await snipekvs.delete(inter.channelId);
    await interactionChannelRespond(inter, {
      embed: emb,
      content: setPlaceholders(i18n.modules.utilities.snipe.said, ['user_mention', _usr.toMention()]),
      allowedMentions: {},
    });
  },
  { module: 'utilities', permissions: { overrideableInfo: 'utilities.snipe', level: Ranks.Authorized } },
);
/*
registerSlash(
  { name: 'snowflake', description: 'Gets date info on a snowflake', options: (ctx) => ({ id: ctx.string({ description: 'Snowflake', required: true }) }) },
  async (inter, { id }) => {
    const normalTs = utils.getSnowflakeDate(id);
    await interactionChannelRespond(
      inter,
                                    `\`\`\`\nID: ${id}\nTimestamp: ${new Date(normalTs)}\n\`\`\``);
  },
  { module: 'utilities', permissions: { overrideableInfo: 'utilities.snowflake', level: Ranks.Guest }, staticAck: true },
);
*/

registerSlash(
  { name: 'avatar', description: 'Gets a user\'s avatar', options: (ctx) => ({ user: ctx.guildMember({ description: 'User', required: false }) }) },
  async (inter, { user }) => {
    if (!user) {
      user = inter.member.user;
    } else {
      user = user.user;
    }
    const emb = new discord.Embed();
    emb.setAuthor({ iconUrl: user.getAvatarUrl(), name: user.getTag() });
    emb.setDescription(setPlaceholders(i18n.modules.utilities.avatar.avatar_of, ['user_tag', user.getTag(), 'avatar_url', `<${user.getAvatarUrl()}>`]));
    emb.setFooter({ text: setPlaceholders(i18n.modules.utilities.avatar.requested_by, ['user_tag', user.getTag(), 'user_id', user.id]) });
    emb.setTimestamp(new Date().toISOString());
    emb.setImage({ url: user.getAvatarUrl() });
    await interactionChannelRespond(inter, { embed: emb });
  },
  { module: 'utilities', permissions: { overrideableInfo: 'utilities.avatar', level: Ranks.Guest }, staticAck: true },
);

const reminderGroup = registerSlashGroup({ name: 'remind', description: 'Reminders' }, { module: 'utilities' });

if (reminderGroup) {
  registerSlashSub(
    reminderGroup,
    { name: 'add',
      description: 'Adds a reminder',
      options: (ctx) => (
        {
          when: ctx.string({ description: 'When to remind you (1h30m format)' }),
          text: ctx.string({ description: 'The reminder' }),
        }
      ) },
    async (inter, { when, text }) => {
      await addReminderSlash(inter, when, text);
      return false;
    },
    { parent: 'remind', staticAck: false, permissions: { overrideableInfo: 'utilities.remind.add', level: Ranks.Guest }, module: 'utilities' },
  );

  registerSlashSub(
    reminderGroup,
    { name: 'clear', description: 'Clears all your reminders' },
    async (inter) => {
      await clearRemindersSlash(inter);
      return false;
    },
    { parent: 'remind', staticAck: false, permissions: { overrideableInfo: 'utilities.remind.clear', level: Ranks.Guest }, module: 'utilities' },
  );
}

const randomGroup = registerSlashGroup({ name: 'random', description: 'RNG Commands' }, { module: 'utilities' });

if (randomGroup) {
  registerSlashSub(
    randomGroup,
    { name: 'coin', description: 'Flips a coin' },
    async (inter) => {
      const ret = utils.getRandomInt(1, 2);
      await interactionChannelRespond(inter, setPlaceholders(i18n.modules.utilities.random.coin, ['result', ret === 1 ? i18n.modules.utilities.random.coin_heads : i18n.modules.utilities.random.coin_tails]));
    },
    { parent: 'random', staticAck: true, permissions: { overrideableInfo: 'utilities.random.coin', level: Ranks.Guest }, module: 'utilities' },
  );

  registerSlashSub(
    randomGroup,
    { name: 'number',
      description: 'Gets a random number between 2 values',
      options: (ctx) => ({ minimum: ctx.integer({ required: true, description: 'The minimum value' }), maximum: ctx.integer({ required: true, description: 'The maximum value' }) }),
    },
    async (inter, { minimum, maximum }) => {
      if (minimum >= maximum) {
        await inter.respondEphemeral(i18n.modules.utilities.random.number_minimum_wrong);
        return;
      }
      const ret = utils.getRandomInt(minimum, maximum);
      await interactionChannelRespond(inter, setPlaceholders(i18n.modules.utilities.random.number, ['minimum', minimum.toString(), 'maximum', maximum.toString(), 'result', ret.toString()]));
    },
    { parent: 'random', staticAck: true, permissions: { overrideableInfo: 'utilities.random.number', level: Ranks.Guest }, module: 'utilities' },
  );

  registerSlashSub(
    randomGroup,
    { name: 'cat', description: 'Gets a random cat image' },
    async (inter) => {
      await inter.acknowledge(true);
      const file = await (await fetch('http://aws.random.cat/meow')).json();
      const emb = new discord.Embed();
      emb.setImage({ url: file.file });
      await interactionChannelRespond(inter, { embed: emb });
    },
    { parent: 'random', module: 'utilities', permissions: { overrideableInfo: 'utilities.random.cat', level: Ranks.Guest } },
  );

  registerSlashSub(
    randomGroup,
    { name: 'dog', description: 'Gets a random dog image' },
    async (inter) => {
      await inter.acknowledge(true);
      const file = await (await fetch('https://random.dog/woof.json')).json();
      const emb = new discord.Embed();
      emb.setImage({ url: file.url });
      await interactionChannelRespond(inter, { embed: emb });
    },
    { parent: 'random', module: 'utilities', permissions: { overrideableInfo: 'utilities.random.dog', level: Ranks.Guest } },
  );

  registerSlashSub(
    randomGroup,
    { name: 'doge', description: 'Gets a random shiba inu image' },
    async (inter) => {
      await inter.acknowledge(true);
      const file = await (await fetch('https://dog.ceo/api/breed/shiba/images/random')).json();
      const emb = new discord.Embed();
      emb.setImage({ url: file.message });
      await interactionChannelRespond(inter, { embed: emb });
    },
    { parent: 'random', module: 'utilities', permissions: { overrideableInfo: 'utilities.random.doge', level: Ranks.Guest } },
  );

  registerSlashSub(
    randomGroup,
    { name: 'fox', description: 'Gets a random fox image' },
    async (inter) => {
      await inter.acknowledge(true);
      const file = await (await fetch('https://randomfox.ca/floof/')).json();
      const emb = new discord.Embed();
      emb.setImage({ url: file.image });
      await interactionChannelRespond(inter, { embed: emb });
    },
    { parent: 'random', module: 'utilities', permissions: { overrideableInfo: 'utilities.random.fox', level: Ranks.Guest } },
  );

  registerSlashSub(
    randomGroup,
    { name: 'pikachu', description: 'Gets a random pikachu image' },
    async (inter) => {
      await inter.acknowledge(true);
      const file = await (await fetch('https://some-random-api.ml/img/pikachu')).json();
      const emb = new discord.Embed();
      emb.setImage({ url: file.link });
      await interactionChannelRespond(inter, { embed: emb });
    },
    { parent: 'random', module: 'utilities', permissions: { overrideableInfo: 'utilities.random.pikachu', level: Ranks.Guest } },
  );

  registerSlashSub(
    randomGroup,
    { name: 'koala', description: 'Gets a random koala image' },
    async (inter) => {
      await inter.acknowledge(true);
      const file = await (await fetch('https://some-random-api.ml/img/koala')).json();
      const emb = new discord.Embed();
      emb.setImage({ url: file.link });
      await interactionChannelRespond(inter, { embed: emb });
    },
    { parent: 'random', module: 'utilities', permissions: { overrideableInfo: 'utilities.random.koala', level: Ranks.Guest } },
  );

  registerSlashSub(
    randomGroup,
    { name: 'birb', description: 'Gets a random birb image' },
    async (inter) => {
      await inter.acknowledge(true);
      const file = await (await fetch('https://some-random-api.ml/img/birb')).json();
      const emb = new discord.Embed();
      emb.setImage({ url: file.link });
      await interactionChannelRespond(inter, { embed: emb });
    },
    { parent: 'random', module: 'utilities', permissions: { overrideableInfo: 'utilities.random.birb', level: Ranks.Guest } },
  );

  registerSlashSub(
    randomGroup,
    { name: 'panda', description: 'Gets a random panda image' },
    async (inter) => {
      await inter.acknowledge(true);
      const file = await (await fetch('https://some-random-api.ml/img/panda')).json();
      const emb = new discord.Embed();
      emb.setImage({ url: file.link });
      await interactionChannelRespond(inter, { embed: emb });
    },
    { parent: 'random', module: 'utilities', permissions: { overrideableInfo: 'utilities.random.panda', level: Ranks.Guest } },
  );
}

registerSlash(
  { name: 'pat', description: 'Gets a random anime patting gif' },
  async (inter) => {
    await inter.acknowledge(true);
    const file = await (await fetch('https://some-random-api.ml/animu/pat')).json();
    const emb = new discord.Embed();
    emb.setImage({ url: file.link });
    await interactionChannelRespond(inter, { embed: emb });
  },
  { module: 'utilities', permissions: { overrideableInfo: 'utilities.pat', level: Ranks.Guest } },
);

registerSlash(
  { name: 'hug', description: 'Gets a random anime hugging gif' },
  async (inter) => {
    await inter.acknowledge(true);
    const file = await (await fetch('https://some-random-api.ml/animu/hug')).json();
    const emb = new discord.Embed();
    emb.setImage({ url: file.link });
    await interactionChannelRespond(inter, { embed: emb });
  },
  { module: 'utilities', permissions: { overrideableInfo: 'utilities.hug', level: Ranks.Guest } },
);

registerSlash(
  { name: 'server', description: 'Shows server info' },
  async (inter) => {
    const embed = new discord.Embed();
    const guild = await inter.getGuild();
    const me = await guild.getMember(discord.getBotId());

    let icon = guild.getIconUrl();
    if (icon === null) {
      icon = '';
    }
    embed.setAuthor({
      name: guild.name,
      iconUrl: guild.getIconUrl() ?? undefined,
    });
    const dtCreation = new Date(utils.decomposeSnowflake(guild.id).timestamp);
    const tdiff = utils.getLongAgoFormat(dtCreation.getTime(), 2, true, i18n.time_units.ti_full.singular.second);
    if (icon !== null) {
      embed.setThumbnail({ url: icon });
    }
    let desc = '';
    const formattedDtCreation = `${dtCreation.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;

    const preferredLocale = typeof guild.preferredLocale === 'string'
  && guild.features.includes(discord.Guild.Feature.DISCOVERABLE)
      ? `\n  󠇰**${i18n.modules.utilities.server.preferred_locale}**: \`${guild.preferredLocale}\``
      : '';
    const boosts = typeof guild.premiumSubscriptionCount === 'number' && guild.premiumSubscriptionCount > 0
      ? `\n<:booster3:735780703773655102>**${i18n.modules.utilities.server.boosts}**: ${guild.premiumSubscriptionCount}`
      : '';
    const boostTier = guild.premiumTier !== null && guild.premiumTier !== undefined
      ? `\n  󠇰**${i18n.modules.utilities.server.boost_tier}**: ${guild.premiumTier}`
      : '';
    const systemChannel = typeof guild.systemChannelId === 'string'
      ? `\n  󠇰**${i18n.modules.utilities.server.system_channel}**: <#${guild.systemChannelId}>`
      : '';
    const vanityUrl = typeof guild.vanityUrlCode === 'string'
      ? `\n  󠇰**${i18n.modules.utilities.server.vanity_url}**: \`${guild.vanityUrlCode}\``
      : '';
    const description = typeof guild.description === 'string'
      ? `\n  󠇰**${i18n.modules.utilities.server.description}**: \`${guild.description}\``
      : '';
    const widgetChannel = typeof guild.widgetChannelId === 'string'
      ? `<#${guild.widgetChannelId}>`
      : i18n.modules.utilities.server.widget_no_channel;
    const widget = guild.widgetEnabled === true
      ? `\n  󠇰**${i18n.modules.utilities.server.widget}**: ${
        discord.decor.Emojis.WHITE_CHECK_MARK
      } ( ${widgetChannel} )`
      : '';
    const features = guild.features.length > 0 ? guild.features.map((feat) => feat.split('_').map((sp) => `${sp.substr(0, 1).toUpperCase()}${sp.substr(1).toLowerCase()}`).join(' ')).join(', ') : i18n.modules.utilities.server.none;

    desc += `  **❯ **${i18n.modules.utilities.server.information}
<:rich_presence:735781410509684786>**${i18n.modules.utilities.server.id}**: \`${guild.id}\`
  󠇰󠇰${setPlaceholders(i18n.modules.utilities.server.created, ['time', tdiff])} **[**\`${formattedDtCreation}\`**]**
<:owner:735780703903547443>**${i18n.modules.utilities.server.owner}**: <@!${guild.ownerId}>
<:voice:735780703928844319>**${i18n.modules.utilities.server.vc_region}**: \`${guild.region.split(' ').map((v) => `${v.substr(0, 1).toUpperCase()}${v.substr(1).toLowerCase()}`).join(' ')}\`
  󠇰**${i18n.modules.utilities.server.features}**: \`${features}\`${boosts}${boostTier}${widget}${description}${preferredLocale}${vanityUrl}${systemChannel}`;

    const chanStats = [];
    const counts: {[key: string]: number} = {
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
        emj = '<:channel:735780703983239218>';
      }
      if (k === 'voice') {
        emj = '<:voice:735780703928844319>';
      }
      if (k === 'store') {
        emj = '<:store:735780704130170880>';
      }
      if (k === 'news') {
        emj = '<:news:735780703530385470>';
      }
      if (k === 'category') {
        emj = '<:category:754241739258069043>';
      }

      /* if (obj > 0) {
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
        } */
      if (obj > 0) {
        chanStats.push(`${emj}: **${obj}**`);
      }
    }

    desc += `\n\n**❯ **${i18n.modules.utilities.server.channels} ⎯ ${channels.length}\n${chanStats.join(' | ')}`;

    const guildEx: any = guild;
    const roles = await guild.getRoles();
    const emojis = await guild.getEmojis();
    let bans = 0;
    let invites = 0;
    if (me.can(discord.Permissions.BAN_MEMBERS)) {
      bans = (await guild.getBans()).length;
    }
    if (me.can(discord.Permissions.MANAGE_GUILD)) {
      invites = (await guild.getInvites()).length;
    }
    if (roles.length > 0 || emojis.length > 0 || bans > 0 || invites > 0) {
      desc += `


**❯ **Other Counts`;
      if (roles.length > 0) {
        desc += `\n <:settings:735782884836638732> **${i18n.modules.utilities.server.roles}**: ${roles.length}`;
      }
      if (emojis.length > 0) {
        desc += `\n <:emoji_ghost:735782884862066789> **${i18n.modules.utilities.server.emojis}**: ${emojis.length}`;
      }
      if (bans > 0) {
        desc += `\n ${discord.decor.Emojis.HAMMER} **${i18n.modules.utilities.server.bans}**: ${bans}`;
      }
      if (invites > 0) {
        desc += `\n <:memberjoin:754249269665333268> **${i18n.modules.utilities.server.invites}**: ${invites}`;
      }
    }
      interface presCount {
        [key: string]: number,
        streaming: number,
        game: number,
        listening: number,
        watching: number,
        online: number,
        dnd: number,
        idle: number,
        offline: number
      }
      interface memCount {
        [key: string]: number | presCount,
        human: number,
        bot: number,
        presences: presCount
      }
      // type memCount = {[key: string] : number | presCount};
      const memberCounts: memCount = {
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
        for await (const mem of guild.iterMembers()) {
          const member: discord.GuildMember = mem;
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


**❯ **${i18n.modules.utilities.server.members} ⎯ ${guild.memberCount}${bottxt}${prestext}`;
      } else {
        desc += `


**❯ **${i18n.modules.utilities.server.members} ⎯ ${guild.memberCount}`;
      }
      embed.setDescription(desc);
      await interactionChannelRespond(inter, { embed, allowedMentions: {}, content: '' });
  },

  { permissions: { overrideableInfo: 'commands.server', level: Ranks.Guest }, module: 'utilities', staticAck: true },
);

registerSlash(
  { name: 'info',
    description: 'Shows user info',
    options:
    (ctx) => ({
      user: ctx.guildMember({ description: 'User to get info on', required: false }) }
    ) },
  async (inter, { user }) => {
    let usr: discord.User | BetterUser = typeof user !== 'undefined' ? user.user : inter.member.user;
    if (utils.isGlobalAdmin(inter.member.user.id)) {
      usr = await utils.getUser(usr.id, true);
    }

    if (!usr) {
      await inter.acknowledge(false);
      await inter.respondEphemeral(i18n.modules.utilities.info.user_not_found);
      return false;
    }
    const emb = new discord.Embed();
    emb.setAuthor({ name: usr.getTag(), iconUrl: usr.getAvatarUrl() });
    if (typeof usr.avatar === 'string') {
      emb.setThumbnail({ url: usr.getAvatarUrl() });
    }
    let desc = `**❯ ${!usr.bot ? i18n.modules.utilities.info.user : i18n.modules.utilities.info.bot} ${i18n.modules.utilities.server.information}**
    <:rich_presence:735781410509684786> 󠇰**${i18n.modules.utilities.server.id}**: \`${usr.id}\`
    ${discord.decor.Emojis.LINK} **${i18n.modules.utilities.info.profile}**: ${usr.toMention()}`;
    const dtCreation = new Date(utils.decomposeSnowflake(usr.id).timestamp);
    const tdiff = utils.getLongAgoFormat(dtCreation.getTime(), 2, true, i18n.time_units.ti_full.singular.second);
    const formattedDtCreation = `${dtCreation.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
    desc += `\n ${discord.decor.Emojis.CALENDAR_SPIRAL} ${setPlaceholders(i18n.modules.utilities.server.created, ['time', tdiff])} **[**\`${formattedDtCreation}\`**]**`;
    const guild = await inter.getGuild();
    const member = await guild.getMember(usr.id);
    if (member !== null) {
    // presences
      const presence = await member.getPresence();
      const statuses = presence.activities.map((pres) => {
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
          return `${emjMention}${pres.state !== null ? ` \`${utils.escapeString(pres.state, true)}\`` : ''} (Custom Status)`;
        }

        return `${emj}${pres.name.length > 0 ? ` \`${pres.name}\`` : ''}`;
      });
      let emjStatus = '';
      let embColor;
      let i18nstatustext;
      if (presence.status === 'online') {
        emjStatus = '<:status_online:735780704167919636>';
        embColor = 0x25c059;
        i18nstatustext = i18n.modules.utilities.info.online;
      }
      if (presence.status === 'dnd') {
        emjStatus = '<:status_busy:735780703983239168>';
        embColor = 0xb34754;
        i18nstatustext = i18n.modules.utilities.info.busy;
      }
      if (presence.status === 'idle') {
        emjStatus = '<:status_away:735780703710478407>';
        embColor = 0xe4bf3d;
        i18nstatustext = i18n.modules.utilities.info.idle;
      }
      if (presence.status === 'offline') {
        emjStatus = '<:status_offline:735780703802753076>';
        embColor = 0x36393f;
        i18nstatustext = i18n.modules.utilities.info.offline;
      }
      desc += `\n ${emjStatus} **${i18n.modules.utilities.info.status}**: ${i18nstatustext}`;
      if (statuses.length > 0) {
        desc += `\n  ${statuses.join('\n  ')}󠇰`;
      }
      if (embColor) {
        emb.setColor(embColor);
      }
    }
    if (emb.color === null) {
      const clr = (Math.random() * 0xFFFFFF << 0).toString(16);
      emb.setColor(parseInt(clr, 16));
    }
    try {
      if (typeof usr === 'object' && usr instanceof utils.BetterUser && typeof usr.public_flags === 'number') {
        let badges = [];
        const flags = new utils.UserFlags(usr.public_flags).serialize();
        for (const key in flags) {
          if (flags[key] === true) {
            badges.push(key);
          }
        }
        if (badges.length > 0) {
          desc += `\n\n**❯ ${i18n.modules.utilities.info.discord_badges}**`;
          badges = badges.map((val) => {
            switch (val) {
              case 'STAFF':
                return `<:discordstaff:751155123648069743> ${i18n.modules.utilities.info.discord_staff}`;
              case 'PARTNER':
                return `<:partner:735780703941165057> ${i18n.modules.utilities.info.discord_partner}`;
              case 'HYPESQUAD_EVENTS':
                return `<:hypesquad_events:735780703958204446> ${i18n.modules.utilities.info.hypesquad}`;
              case 'BUG_HUNTER':
                return `<:bughunter:735780703920324762> ${i18n.modules.utilities.info.bug_hunter}`;
              case 'HYPESQUAD_BRAVERY':
                return `<:bravery:735780704100679720> ${i18n.modules.utilities.info.hs_bravery}`;
              case 'HYPESQUAD_BRILLIANCE':
                return `<:brilliance:735780703878512711> ${i18n.modules.utilities.info.hs_brilliance}`;
              case 'HYPESQUAD_BALANCE':
                return `<:balance:735780704159531089> ${i18n.modules.utilities.info.hs_balance}`;
              case 'EARLY_SUPPORTER':
                return `<:earlysupporter:735780703631048786> ${i18n.modules.utilities.info.early_supporter}`;
              case 'TEAM_USER':
                return `<:members:735780703559745558> ${i18n.modules.utilities.info.team_user}`;
              case 'SYSTEM':
                return `<:discordstaff:751155123648069743> ${i18n.modules.utilities.info.system}`;
              case 'BUG_HUNTER_GOLDEN':
                return `<:goldenbughunter:751153800693284924> ${i18n.modules.utilities.info.golden_bug_hunter}`;
              case 'VERIFIED_BOT':
                return `<:verified:735780703874318417> ${i18n.modules.utilities.info.verified_bot}`;
              case 'VERIFIED_BOT_DEVELOPER':
                return `<:botdev:751154656679559259> ${i18n.modules.utilities.info.early_bot_dev}`;
              default:
                return val;
            }
          }).filter((val) => val !== '').map((val) => `**${val}**`);
          desc += `\n ${badges.join('\n ')}`;
        }
      }
    } catch (e) {
      utils.logError(e);
    }

    // actual server stuff
    const isAdmin = utils.isGlobalAdmin(usr.id);
    if (typeof globalConfig.badges === 'object') {
      if (isAdmin || (typeof globalConfig.userBadges === 'object' && Array.isArray(globalConfig.userBadges[usr.id]))) {
        desc += `\n\n**❯ ${i18n.modules.utilities.info.pyboat_badges}**`;
        if (isAdmin && typeof globalConfig.badges.globaladmin === 'string') {
          desc += `\n${globalConfig.badges.globaladmin}`;
        }
        if ((typeof globalConfig.userBadges === 'object' && Array.isArray(globalConfig.userBadges[usr.id]))) {
          desc += `\n${globalConfig.userBadges[usr.id].map((bd: string) => (typeof globalConfig.badges[bd] === 'string' ? globalConfig.badges[bd] : 'Unknown')).join('\n')}`;
        }
      }
    }
    if (member !== null) {
      const roles = member.roles.map((rl) => `<@&${rl}>`).join(' ');
      desc += `\n\n**❯ ${i18n.modules.utilities.info.member_info}**`;
      const dtJoin = new Date(member.joinedAt);
      const tdiffjoin = utils.getLongAgoFormat(dtJoin.getTime(), 2, true, i18n.time_units.ti_full.singular.second);
      const formattedDtJoin = `${dtJoin.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`;
      desc += `\n ${discord.decor.Emojis.INBOX_TRAY}${setPlaceholders(i18n.modules.utilities.info.joined, ['time', tdiffjoin])} **[**\`${formattedDtJoin}\`**]**`;
      if (member.nick && member.nick !== null && member.nick.length > 0) {
        desc += `\n ${discord.decor.Emojis.NOTEPAD_SPIRAL} 󠇰**${i18n.modules.utilities.info.nickname}**: \`${utils.escapeString(member.nick, true)}\``;
      }
      if (member.premiumSince !== null) {
        const boostDt = new Date(member.premiumSince);
        const tdiffboost = utils.getLongAgoFormat(boostDt.getTime(), 2, true, i18n.time_units.ti_full.singular.second);
        const formattedDtBoost = `${boostDt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`;
        desc += `\n <:booster:735780703912067160> ${setPlaceholders(i18n.modules.utilities.info.boosting_since, ['time', tdiffboost])} **[**\`${formattedDtBoost}\`**]**`;
      }
      const irrelevantPerms = ['CREATE_INSTANT_INVITE', 'ADD_REACTIONS', 'STREAM', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'SEND_TTS_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY', 'USE_EXTERNAL_EMOJIS', 'CONNECT', 'SPEAK', 'USE_VOICE_ACTIVITY', 'CHANGE_NICKNAME', 'VIEW_GUILD_INSIGHTS', 'VIEW_AUDIT_LOG', 'PRIORITY_SPEAKER'];
      if (member.roles.length > 0) {
        if (member.roles.length < 20) {
          desc += `\n ${discord.decor.Emojis.SHIELD} **Roles** (${member.roles.length}): ${roles}`;
        } else {
          // only show key roles if those are less than 20

          const theseroles = (await guild.getRoles()).filter((m) => member.roles.includes(m.id));
          const keyroles: string[] = theseroles.filter((m) => {
            const perms = new utils.Permissions(m.permissions);
            const hasPerms: any = perms.serialize();

            for (const key in hasPerms) {
              if (hasPerms[key] === false || irrelevantPerms.includes(key)) {
                delete hasPerms[key];
              }
            }
            return Object.keys(hasPerms).length > 0;
          }).map((v) => v.id);
          if (keyroles.length < 20) {
            desc += `\n ${discord.decor.Emojis.SHIELD} **${i18n.modules.utilities.info.roles}** (${member.roles.length})\n ${discord.decor.Emojis.SHIELD} **${i18n.modules.utilities.info.key_roles}** (${keyroles.length}): ${keyroles.map((rl) => `<@&${rl}>`).join(' ')}`;
          } else {
            desc += `\n ${discord.decor.Emojis.SHIELD} **${i18n.modules.utilities.info.roles}** (${member.roles.length})`;
          }
        }
      }
      const infsGiven = await infsPool.getByQuery({ actorId: usr.id });
      const infsReceived = await infsPool.getByQuery({ memberId: usr.id });
      if (infsGiven.length > 0 || infsReceived.length > 0) {
        desc += `\n\n**❯ ${i18n.modules.utilities.info.infractions}`;
      }
      if (infsGiven.length > 0) {
        desc += `\n ${discord.decor.Emojis.HAMMER} **${i18n.modules.utilities.info.infractions_applied}**: **${infsGiven.length}**`;
      }
      if (infsReceived.length > 0) {
        desc += `\n ${discord.decor.Emojis.NO_ENTRY} **${i18n.modules.utilities.info.infractions_received}**: **${infsReceived.length}**`;
      }
      const perms = new utils.Permissions(member.permissions);
      let hasPerms: any = perms.serialize();

      for (const key in hasPerms) {
        if (hasPerms[key] === false || irrelevantPerms.includes(key)) {
          delete hasPerms[key];
        }
      }
      if (hasPerms.ADMINISTRATOR === true) {
        hasPerms = { ADMINISTRATOR: true };
      }
      if (guild.ownerId === usr.id) {
        hasPerms = { SERVER_OWNER: true };
      }
      hasPerms = Object.keys(hasPerms).map((str) => str.split('_').map((upp) => `${upp.substr(0, 1).toUpperCase()}${upp.substr(1).toLowerCase()}`).join(' '));
      const auth = utils.getUserAuth(member);
      if ((Number(perms.bitfield) > 0 && hasPerms.length > 0) || auth > 0) {
        desc += `\n\n**❯ ${i18n.modules.utilities.info.permissions}**`;
      }
      if (Number(perms.bitfield) > 0 && hasPerms.length > 0) {
        desc += `\n <:settings:735782884836638732> **${i18n.modules.utilities.info.staff}**: \`${hasPerms.join(', ')}\``;
      }
      if (auth > 0 && !usr.bot) {
        desc += `\n ${discord.decor.Emojis.CYCLONE} **${i18n.modules.utilities.info.bot_level}**: **${auth}**`;
      }
    }

    emb.setDescription(desc);
    await interactionChannelRespond(inter, { content: '', allowedMentions: {}, embed: emb });
  },
  { module: 'utilities', permissions: { overrideableInfo: 'utilities.info', level: Ranks.Guest } },
);
