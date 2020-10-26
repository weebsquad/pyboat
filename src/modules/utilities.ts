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
  constructor(exp: number, author: string, channelId: string, content: string) {
    this.expires = exp;
    this.id = utils.composeSnowflake();
    this.authorId = author;
    this.channelId = channelId;
    this.content = content;
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
        // todo: dm the user instead
        return;
      }
      const ts = utils.decomposeSnowflake(remi.id).timestamp;
      const dt = new Date(ts);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'De',
      ];
      const timestamptext = `${(`0${dt.getDate()}`).substr(-2)}-${monthNames[dt.getMonth()]}-${dt.getFullYear().toString().substr(-2)} @ ${(`0${dt.getHours()}`).substr(-2)}:${(`0${dt.getMinutes()}`).substr(-2)}:${(`0${dt.getSeconds()}`).substr(-2)}`;
      await chan.sendMessage({ allowedMentions: { users: [remi.authorId] }, content: `Hey ${member.toMention()}! You asked me at \`${timestamptext} UTC\` (${utils.getLongAgoFormat(ts, 1, true)} ago) to remind you about:\n\`${remi.content}\`` });
      await reminders.editPool(remi.id, null);
    }
  }));
}

export async function addReminder(msg: discord.GuildMemberMessage, when: string, text: string) {
  const res: any = await msg.reply(async () => {
    const dur = utils.timeArgumentToMs(when);
    if (dur === 0) {
      return `${discord.decor.Emojis.X} Time improperly formatted! Please use \`1h30m\` formatting`;
    }
    if (dur < 2000 || dur > 32 * 24 * 60 * 60 * 1000) {
      return `${discord.decor.Emojis.X} Time must be between 2 minutes and a month`;
    }
    const durationText = utils.getLongAgoFormat(dur, 2, false, 'second');
    const bythem = await reminders.getByQuery<Reminder>({ authorId: msg.author.id });
    if (bythem.length >= 10) {
      return `${discord.decor.Emojis.X} You already have 10 active reminders, you may not define any more!`;
    }
    text = utils.escapeString(text);
    text = text.split('\n').join(' ').split('\t').join(' ');
    if (text.length > 1000) {
      return 'Reminder is too large!';
    }
    await reminders.saveToPool(new Reminder(Date.now() + dur, msg.author.id, msg.channelId, text));
    return `${discord.decor.Emojis.WHITE_CHECK_MARK} I will remind you in ${durationText}`;
  });
  saveMessage(res);
}

export async function clearReminders(msg: discord.GuildMemberMessage) {
  const res: any = await msg.reply(async () => {
    const bythem = await reminders.getByQuery<Reminder>({ authorId: msg.author.id });
    if (bythem.length === 0) {
      return `${discord.decor.Emojis.X} You don't have any active reminders!`;
    }
    const ids = bythem.map((val) => val.id);
    await reminders.editPools<Reminder>(ids, () => null);
    return `${discord.decor.Emojis.WHITE_CHECK_MARK} cleared ${ids.length} reminders!`;
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
    msg === null
    || log instanceof discord.AuditLogEntry
    || msg.author === null
    || msg.webhookId !== null
    || msg.author.bot === true
    || msg.member === null
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
  const F = discord.command.filters;

  const _groupOptions = {
    description: 'Utility Commands',
    filters: c2.getFilters('utilities', Ranks.Guest),
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  if (typeof config.modules.utilities.customUserRoles === 'object' && config.modules.utilities.customUserRoles.enabled === true) {
    // CUSTOM USER ROLES
    cmdGroup.subcommand({ name: 'cur', filters: c2.getFilters('utilities.cur', Ranks.Guest) }, (subCommandGroup) => {
      subCommandGroup.defaultRaw(
        async (msg) => {
          const res: any = await msg.reply(async () => {
            const checkrole = await customUserRoles.getById<UserRole>(msg.author.id);
            if (!checkrole) {
              return { content: `${msg.author.toMention()} ${discord.decor.Emojis.X} You do not have a custom role!` };
            }
            const prefix = typeof config.modules.commands.prefix === 'string' ? config.modules.commands.prefix : config.modules.commands.prefix[0];
            return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} Your custom role is: <@&${checkrole.roleId}>\nTo set the name of it, type \`${prefix}cur name <name>\`\nTo set the color, type \`${prefix}cur color <color>\`` };
          });
          saveMessage(res);
        },
      );
      subCommandGroup.on(
        { name: 'name', filters: c2.getFilters('utilities.cur.name', Ranks.Guest) },
        (ctx) => ({ name: ctx.text() }),
        async (msg, { name }) => {
          const res: any = await msg.reply(async () => {
            const checkrole = await customUserRoles.getById<UserRole>(msg.author.id);
            if (!checkrole) {
              return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.X} You do not have a custom role!` };
            }
            if (name.length < 2 || name.length > 32) {
              return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.X} New name must be between 2 and 32 characters in size!` };
            }
            const guild = await msg.getGuild();
            const role = await guild.getRole(checkrole.roleId);
            if (!role) {
              return { content: `${msg.author.toMention()} ${discord.decor.Emojis.X} role not found` };
            }
            await role.edit({ name });
            return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.WHITE_CHECK_MARK} Changed your role's name to \`${utils.escapeString(name)}\`` };
          });
          saveMessage(res);
        },
      );
      subCommandGroup.on(
        { name: 'color', filters: c2.getFilters('utilities.cur.color', Ranks.Guest) },
        (ctx) => ({ color: ctx.textOptional() }),
        async (msg, { color }) => {
          const res: any = await msg.reply(async () => {
            const checkrole = await customUserRoles.getById<UserRole>(msg.author.id);
            if (!checkrole) {
              return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.X} You do not have a custom role!` };
            }
            if (typeof color === 'string' && color.includes('#')) {
              color = color.split('#').join('');
            }
            if (typeof color === 'string' && color.length !== 6) {
              return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.X} Color must be formatted as a hex string! (for example \`#ff0000\`)` };
            }
            const guild = await msg.getGuild();
            const role = await guild.getRole(checkrole.roleId);
            if (!role) {
              return { content: `${msg.author.toMention()} ${discord.decor.Emojis.X} role not found` };
            }
            await role.edit({ color: typeof color === 'string' ? parseInt(color, 16) : 0 });
            return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.WHITE_CHECK_MARK} Changed your role's color to \`${typeof color === 'string' ? `#${color}` : 'None'}\`` };
          });
          saveMessage(res);
        },
      );

      subCommandGroup.on(
        { name: 'set', filters: c2.getFilters('utilities.cur.set', Ranks.Administrator) },
        (ctx) => ({ target: ctx.guildMember(), roleText: ctx.text() }),
        async (msg, { target, roleText }) => {
          const res: any = await msg.reply(async () => {
            const rlid = await getRoleIdByText(roleText);
            if (!rlid) {
              return { content: `${msg.author.toMention()} ${discord.decor.Emojis.X} role not found` };
            }
            const guild = await msg.getGuild();
            const role = await guild.getRole(rlid);
            if (!(role instanceof discord.Role)) {
              return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.X} Role not found` };
            }
            const kvc = await customUserRoles.exists(target.user.id);
            if (kvc) {
              return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.X} This member already has a custom role!` };
            }
            const kvcrole = await customUserRoles.getByQuery<UserRole>({ roleId: role.id });
            if (Array.isArray(kvcrole) && kvcrole.length > 0) {
              return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.X} This role is already assigned to <@!${kvcrole[0].memberId}>` };
            }
            await setUserRole(target.user.id, role.id);
            await checkCustomRoleProperties();
            if (!target.roles.includes(role.id)) {
              await target.addRole(role.id);
            }
            return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.WHITE_CHECK_MARK} Set ${target.toMention()}'s role to ${role.toMention()}` };
          });
          saveMessage(res);
        },
      );

      subCommandGroup.on(
        { name: 'clear', filters: c2.getFilters('utilities.cur.clear', Ranks.Administrator) },
        (ctx) => ({ target: ctx.guildMember() }),
        async (msg, { target }) => {
          const res: any = await msg.reply(async () => {
            const kvc = await customUserRoles.getById<UserRole>(target.user.id);
            if (!kvc) {
              return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.X} This member has no custom role!` };
            }
            const rlid = kvc.roleId;
            const guild = await msg.getGuild();
            const role = await guild.getRole(rlid);
            await customUserRoles.editPool(target.user.id, null);
            if (role instanceof discord.Role && target.roles.includes(role.id)) {
              await target.removeRole(role.id);
            }
            return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.WHITE_CHECK_MARK} Cleared ${target.toMention()}'s custom role!` };
          });
          saveMessage(res);
        },
      );
      subCommandGroup.on(
        { name: 'delete', filters: c2.getFilters('utilities.cur.delete', Ranks.Administrator) },
        (ctx) => ({ target: ctx.guildMember() }),
        async (msg, { target }) => {
          const res: any = await msg.reply(async () => {
            const kvc = await customUserRoles.getById<UserRole>(target.user.id);
            if (!kvc) {
              return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.X} This member has no custom role!` };
            }
            const rlid = kvc.roleId;
            const guild = await msg.getGuild();
            const role = await guild.getRole(rlid);
            if (!(role instanceof discord.Role)) {
              return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.X} Role not found` };
            }

            await deleteCustomRoleOf(target.user.id);
            return { allowedMentions: { users: [msg.author.id] }, content: `${msg.author.toMention()} ${discord.decor.Emojis.WHITE_CHECK_MARK} Deleted ${target.toMention()}'s custom role!` };
          });
          saveMessage(res);
        },
      );
    });
  }
  // SNIPE COMMAND
  if (typeof config.modules.utilities.snipe === 'object' && config.modules.utilities.snipe.enabled === true) {
    cmdGroup.raw(
      { name: 'snipe', filters: c2.getFilters('utilities.snipe', Ranks.Authorized) }, async (msg) => {
        const res: any = await msg.reply(async () => {
          let _sn: any = await snipekvs.get(msg.channelId);
          if (typeof _sn === 'string') {
            _sn = JSON.parse(_sn);
          }
          if (
            _sn === undefined
      || typeof _sn.author !== 'object'
      || typeof _sn.id !== 'string'
          ) {
            return { content: 'Nothing to snipe.' };
          }
          if (
            _sn.author.id === msg.author.id
      && !msg.member.can(discord.Permissions.ADMINISTRATOR)
          ) {
            return { content: 'Nothing to snipe.' };
          }
          const emb = new discord.Embed();
          const _usr = await utils.getUser(_sn.author.id);
          if (!_usr) {
            return { content: 'User not found (?)' };
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
          return {
            embed: emb,
            content: `${_usr.toMention()} said ...`,
            allowedMentions: {},
          };
        });
        saveMessage(res);
      },
    );
  }

  // random
  cmdGroup.subcommand({ name: 'random', filters: c2.getFilters('utilities.random', Ranks.Guest) }, (subCommandGroup) => {
    subCommandGroup.raw(
      { name: 'coin', filters: c2.getFilters('utilities.random.coin', Ranks.Guest) },
      async (msg) => {
        await msg.reply(async () => {
          const ret = utils.getRandomInt(1, 2);
          return `The coin comes up as .... **${ret === 1 ? 'Heads' : 'Tails'}** !`;
        });
      },
    );
    subCommandGroup.on(
      { name: 'number', filters: c2.getFilters('utilities.random.number', Ranks.Guest) },
      (ctx) => ({ minimum: ctx.integer({ maxValue: 1000000000, minValue: 0 }), maximum: ctx.integer({ maxValue: 1000000000, minValue: 1 }) }),
      async (msg, { minimum, maximum }) => {
        await msg.reply(async () => {
          if (minimum >= maximum) {
            return 'Error: Minimum value must be lower than the maximum value!';
          }
          const ret = utils.getRandomInt(minimum, maximum);
          return `Result (\`${minimum}-${maximum}\`) - **${ret}** !`;
        });
      },
    );
  });
  // snowflake
  cmdGroup.on(
    { name: 'snowflake', filters: c2.getFilters('utilities.snowflake', Ranks.Guest) },
    (ctx) => ({ snowflakee: ctx.string() }),
    async (msg, { snowflakee }) => {
      const now = new Date();
      const baseId = snowflakee;
      const normalTs = utils.getSnowflakeDate(baseId);
      const res: any = await msg.reply(
        `\`\`\`\nID: ${baseId}\nTimestamp: ${new Date(normalTs)}\n\`\`\``,
      );
      saveMessage(res);
    },
  );

  cmdGroup.on(
    { name: 'avatar', filters: c2.getFilters('utilities.avatar', Ranks.Guest) },
    (ctx) => ({ user: ctx.userOptional() }),
    async (msg, { user }) => {
      const res: any = await msg.reply(async () => {
        if (user === null) {
          user = msg.author;
        }
        const emb = new discord.Embed();
        emb.setAuthor({ iconUrl: user.getAvatarUrl(), name: user.getTag() });
        emb.setDescription(`Avatar of ${user.getTag()}: \n<${user.getAvatarUrl()}>`);
        emb.setFooter({ text: `Requested by ${msg.author.getTag()} (${msg.author.id})` });
        emb.setTimestamp(new Date().toISOString());
        emb.setImage({ url: user.getAvatarUrl() });
        return { embed: emb };
      });

      saveMessage(res);
    },
  );

  // reminder
  cmdGroup.subcommand('remind', (subCommandGroup) => {
    subCommandGroup.default(
      (ctx) => ({ when: ctx.string(), text: ctx.text() }),
      async (msg, { when, text }) => {
        await addReminder(msg, when, text);
      }, { filters: c2.getFilters('utilities.remind', Ranks.Guest) },
    );

    subCommandGroup.on(
      { name: 'add', filters: c2.getFilters('utilities.remind', Ranks.Guest) },
      (ctx) => ({ when: ctx.string(), text: ctx.text() }),
      async (msg, { when, text }) => {
        await addReminder(msg, when, text);
      },
    );
    subCommandGroup.raw(
      { name: 'clear', filters: c2.getFilters('utilities.remind', Ranks.Guest) },
      async (msg) => {
        await clearReminders(msg);
      },
    );
  });
  cmdGroup.subcommand('r', (subCommandGroup) => {
    subCommandGroup.default(
      (ctx) => ({ when: ctx.string(), text: ctx.text() }),
      async (msg, { when, text }) => {
        await addReminder(msg, when, text);
      }, { filters: c2.getFilters('utilities.remind', Ranks.Guest) },
    );

    subCommandGroup.on(
      { name: 'add', filters: c2.getFilters('utilities.remind', Ranks.Guest) },
      (ctx) => ({ when: ctx.string(), text: ctx.text() }),
      async (msg, { when, text }) => {
        await addReminder(msg, when, text);
      },
    );
    subCommandGroup.raw(
      { name: 'clear', filters: c2.getFilters('utilities.remind', Ranks.Guest) },
      async (msg) => {
        await clearReminders(msg);
      },
    );
  });

  cmdGroup.raw(
    { name: 'cat', aliases: ['pussy', 'fatbitch'], filters: c2.getFilters('utilities.cat', Ranks.Guest) },
    async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );
  cmdGroup.raw(
    { name: 'dog', aliases: ['doggo'], filters: c2.getFilters('utilities.dog', Ranks.Guest) }, async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );
  cmdGroup.raw(
    { name: 'doge', aliases: ['shibe'], filters: c2.getFilters('utilities.doge', Ranks.Guest) }, async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );

  cmdGroup.raw(
    { name: 'fox', filters: c2.getFilters('utilities.fox', Ranks.Guest) }, async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );
  cmdGroup.raw(
    { name: 'pikachu', filters: c2.getFilters('utilities.pikachu', Ranks.Guest) }, async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );
  cmdGroup.raw(
    { name: 'koala', filters: c2.getFilters('utilities.koala', Ranks.Guest) }, async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );
  cmdGroup.raw(
    { name: 'pat', filters: c2.getFilters('utilities.pat', Ranks.Guest) }, async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );
  cmdGroup.raw(
    { name: 'hug', filters: c2.getFilters('utilities.hug', Ranks.Guest) }, async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );
  cmdGroup.raw(
    { name: 'birb', aliases: ['bird'], filters: c2.getFilters('utilities.birb', Ranks.Guest) }, async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );
  cmdGroup.raw(
    { name: 'panda', aliases: ['ponda', 'pwnda'], filters: c2.getFilters('utilities.panda', Ranks.Guest) }, async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );
  cmdGroup.on(
    { name: 'server', filters: c2.getFilters('commands.server', Ranks.Guest) },
    (ctx) => ({ gid: ctx.stringOptional() }),
    async (message, { gid }) => {
      const res: any = await message.reply(async () => {
        const embed = new discord.Embed();
        if (gid === null) {
          gid = guildId;
        }
        const guildThis = await message.getGuild();
        const guild: any = await utils.getGuild(gid);
        const me = await guildThis.getMember(discord.getBotId());
        if (guild === null || !(guild instanceof discord.Guild)) {
          return { content: 'Guild not found' };
        }
        if (me === null) {
          throw new Error('bot user not found');
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
          ? `\n  󠇰**Preferred Locale**: \`${guild.preferredLocale}\``
          : '';
        const boosts = typeof guild.premiumSubscriptionCount === 'number' && guild.premiumSubscriptionCount > 0
          ? `\n<:booster3:735780703773655102>**Boosts**: ${guild.premiumSubscriptionCount}`
          : '';
        const boostTier = guild.premiumTier !== null && guild.premiumTier !== undefined
          ? `\n  󠇰**Boost Tier**: ${guild.premiumTier}`
          : '';
        const systemChannel = typeof guild.systemChannelId === 'string'
          ? `\n  󠇰**System Channel**: <#${guild.systemChannelId}>`
          : '';
        const vanityUrl = typeof guild.vanityUrlCode === 'string'
          ? `\n  󠇰**Vanity Url**: \`${guild.vanityUrlCode}\``
          : '';
        const description = typeof guild.description === 'string'
          ? `\n  󠇰**Description**: \`${guild.description}\``
          : '';
        const widgetChannel = typeof guild.widgetChannelId === 'string'
          ? `<#${guild.widgetChannelId}>`
          : 'No channel';
        const widget = guild.widgetEnabled === true
          ? `\n  󠇰**Widget**: ${
            discord.decor.Emojis.WHITE_CHECK_MARK
          } ( ${widgetChannel} )`
          : '';
        const features = guild.features.length > 0 ? guild.features.map((feat) => feat.split('_').map((sp) => `${sp.substr(0, 1).toUpperCase()}${sp.substr(1).toLowerCase()}`).join(' ')).join(', ') : 'None';

        desc += `  **❯ **Information
<:rich_presence:735781410509684786>**ID**: \`${guild.id}\`
  󠇰**Created**: ${tdiff} ago **[**\`${formattedDtCreation}\`**]**
<:owner:735780703903547443>**Owner**: <@!${guild.ownerId}>
<:voice:735780703928844319>**Voice Region**: \`${guild.region.split(' ').map((v) => `${v.substr(0, 1).toUpperCase()}${v.substr(1).toLowerCase()}`).join(' ')}\`
  󠇰**Features**: \`${features}\`${boosts}${boostTier}${widget}${description}${preferredLocale}${vanityUrl}${systemChannel}`;

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
          desc += `\n\n**❯ **Channels ⎯ ${channels.length}\n${chanStats.join(' | ')}`;
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


**❯ **Other Counts`;
          if (roles.length > 0) {
            desc += `\n <:settings:735782884836638732> **Roles**: ${roles.length}`;
          }
          if (emojis.length > 0) {
            desc += `\n <:emoji_ghost:735782884862066789> **Emojis**: ${emojis.length}`;
          }
          if (bans > 0) {
            desc += `\n ${discord.decor.Emojis.HAMMER} **Bans**: ${bans}`;
          }
          if (invites > 0) {
            desc += `\n <:memberjoin:754249269665333268> **Invites**: ${invites}`;
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


**❯ **Members ⎯ ${guild.memberCount}${bottxt}${prestext}`;
        } else {
          desc += `


**❯ **Members ⎯ ${guild.memberCount}`;
        }
        embed.setDescription(desc);
        // const editer = await edmsg;
        // await editer.edit({ content: '', embed });
        return { content: '', embed, allowedMentions: {} };
      });
      saveMessage(res);
    },
  );

  cmdGroup.on(
    { name: 'info', filters: c2.getFilters('utilities.info', Ranks.Guest) },
    (ctx) => ({ usrtxt: ctx.stringOptional() }),
    async (msg, { usrtxt }) => {
      const res: any = await msg.reply(async () => {
        let user: discord.User | BetterUser;
        if (usrtxt === null) {
          user = msg.author;
          if (utils.isGlobalAdmin(msg.author.id)) {
            const tempusr = await utils.getUser(user.id, true);
            if (tempusr) {
              user = tempusr;
            }
          }
        } else {
          usrtxt = usrtxt.replace(/\D/g, ''); // strip all non-number chars
          let tempusr;
          if (utils.isGlobalAdmin(msg.author.id)) {
            tempusr = await utils.getUser(usrtxt, true);
          } else {
            tempusr = await discord.getUser(usrtxt);
          }
          if (!tempusr) {
            return { content: `${discord.decor.Emojis.X} User not found!`, allowedMentions: {} };
          }
          user = tempusr;
        }
        const emb = new discord.Embed();
        emb.setAuthor({ name: user.getTag(), iconUrl: user.getAvatarUrl() });
        if (typeof user.avatar === 'string') {
          emb.setThumbnail({ url: user.getAvatarUrl() });
        }
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
          let embColor;
          if (presence.status === 'online') {
            emjStatus = '<:status_online:735780704167919636>';
            embColor = 0x25c059;
          }
          if (presence.status === 'dnd') {
            emjStatus = '<:status_busy:735780703983239168>';
            embColor = 0xb34754;
          }
          if (presence.status === 'idle') {
            emjStatus = '<:status_away:735780703710478407>';
            embColor = 0xe4bf3d;
          }
          if (presence.status === 'offline') {
            emjStatus = '<:status_offline:735780703802753076>';
            embColor = 0x36393f;
          }
          desc += `\n ${emjStatus} **Status**: ${presence.status.substr(0, 1).toUpperCase()}${presence.status.substr(1).toLowerCase()}`;
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
          if (typeof user === 'object' && user instanceof utils.BetterUser && typeof user.public_flags === 'number') {
            let badges = [];
            const flags = new utils.UserFlags(user.public_flags).serialize();
            for (const key in flags) {
              if (flags[key] === true) {
                badges.push(key);
              }
            }
            if (badges.length > 0) {
              desc += '\n\n**❯ Discord Badges**';
              badges = badges.map((val) => {
                switch (val) {
                  case 'STAFF':
                    return '<:discordstaff:751155123648069743> Discord Staff';
                  case 'PARTNER':
                    return '<:partner:735780703941165057> Discord Partner';
                  case 'HYPESQUAD_EVENTS':
                    return '<:hypesquad_events:735780703958204446> Hypesquad';
                  case 'BUG_HUNTER':
                    return '<:bughunter:735780703920324762> Bug Hunter';
                  case 'HYPESQUAD_BRAVERY':
                    return '<:bravery:735780704159531089> Bravery';
                  case 'HYPESQUAD_BRILLIANCE':
                    return '<:brilliance:735780703878512711> Brilliance';
                  case 'HYPESQUAD_BALANCE':
                    return '<:balance:735780704100679720> Balance';
                  case 'EARLY_SUPPORTER':
                    return '<:earlysupporter:735780703631048786> Early Supporter';
                  case 'TEAM_USER':
                    return '<:members:735780703559745558> Team User';
                  case 'SYSTEM':
                    return '<:discordstaff:751155123648069743> System';
                  case 'BUG_HUNTER_GOLDEN':
                    return '<:goldenbughunter:751153800693284924> Golden Bug Hunter';
                  case 'VERIFIED_BOT':
                    return '<:verified:735780703874318417> Verified Bot';
                  case 'VERIFIED_BOT_DEVELOPER':
                    return '<:botdev:751154656679559259> Early Bot Developer';
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
        const isAdmin = utils.isGlobalAdmin(user.id);
        if (typeof globalConfig.badges === 'object') {
          if (isAdmin || (typeof globalConfig.userBadges === 'object' && Array.isArray(globalConfig.userBadges[user.id]))) {
            desc += '\n\n**❯ PyBoat Badges**';
            if (isAdmin && typeof globalConfig.badges.globaladmin === 'string') {
              desc += `\n${globalConfig.badges.globaladmin}`;
            }
            if ((typeof globalConfig.userBadges === 'object' && Array.isArray(globalConfig.userBadges[user.id]))) {
              desc += `\n${globalConfig.userBadges[user.id].map((bd: string) => (typeof globalConfig.badges[bd] === 'string' ? globalConfig.badges[bd] : 'Unknown')).join('\n')}`;
            }
          }
        }
        if (member !== null) {
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
          const infsGiven = await infsPool.getByQuery({ actorId: user.id });
          const infsReceived = await infsPool.getByQuery({ memberId: user.id });
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
          if (guild.ownerId === user.id) {
            hasPerms = { SERVER_OWNER: true };
          }
          hasPerms = Object.keys(hasPerms).map((str) => str.split('_').map((upp) => `${upp.substr(0, 1).toUpperCase()}${upp.substr(1).toLowerCase()}`).join(' '));
          const auth = utils.getUserAuth(member);
          if ((Number(perms.bitfield) > 0 && hasPerms.length > 0) || auth > 0) {
            desc += '\n\n**❯ Permissions**';
          }
          if (Number(perms.bitfield) > 0 && hasPerms.length > 0) {
            desc += `\n <:settings:735782884836638732> **Staff**: \`${hasPerms.join(', ')}\``;
          }
          if (auth > 0 && !user.bot) {
            desc += `\n ${discord.decor.Emojis.CYCLONE} **Bot Level**: **${auth}**`;
          }
        }

        emb.setDescription(desc);
        return { content: '', embed: emb, allowedMentions: {} };
      });
      saveMessage(res);
      // await loadingMsg.edit({ content: '', embed: emb });
    },
  );
  return cmdGroup;
}
