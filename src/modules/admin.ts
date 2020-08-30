/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-async-promise-executor */
import { config, globalConfig, guildId, Ranks } from '../config';
import * as utils from '../lib/utils';
import * as constants from '../constants/constants';
import * as c2 from '../lib/commands2';
import * as infractions from './infractions';
import { logCustom } from './logging/events/custom';
import { getActorTag, getUserTag } from './logging/main';
import {StoragePool} from '../lib/storagePools'

const MAX_POOL_SIZE = constants.MAX_KV_SIZE;
const BOT_DELETE_DAYS = 14 * 24 * 60 * 60 * 1000;
// const BOT_DELETE_DAYS = 60 * 60 * 1000;
const MAX_COMMAND_CLEAN = 1000;
const DEFAULT_COMMAND_CLEAN = 50;
const TRACKING_KEYS_LIMIT = 150;
const ENTRIES_PER_POOL = 37; // approximate maximum

export const adminPool = new StoragePool('admin', BOT_DELETE_DAYS, 'id', 'ts', ENTRIES_PER_POOL, TRACKING_KEYS_LIMIT);

enum ActionType {
    'CLEAN'
}
class TrackedMessage {
    authorId: string;
    id: string;
    channelId: string;
    bot: boolean;
    ts: number;
    // type: discord.Message.Type;
    // flags: discord.Message.Flags;
    constructor(message: discord.Message.AnyMessage) {
      this.authorId = message.author.id;
      this.channelId = message.channelId;
      this.id = message.id;
      this.ts = utils.decomposeSnowflake(this.id).timestamp;
      this.bot = message.author.bot;
      if (message.webhookId !== null) {
        this.bot = true;
      }
      // this.type = message.type;
      // this.flags = message.flags;
      return this;
    }
}





export async function canTarget(actor: discord.GuildMember | null, target: discord.GuildMember | discord.User, channel: discord.GuildChannel, actionType: ActionType): Promise<boolean | string> {
  const targetId = target instanceof discord.GuildMember ? target.user.id : target.id;
  if (targetId === discord.getBotId()) {
    return false;
  }
  if (actor === null) {
    if (target instanceof discord.User) {
      return true;
    }
    let isTargetOverride = false;
    if (utils.isGlobalAdmin(target.user.id)) {
      isTargetOverride = await utils.isGAOverride(target.user.id);
      return !isTargetOverride;
    }
    return true;
  }
  const isGA = utils.isGlobalAdmin(actor.user.id);
  let isOverride = false;
  if (isGA) {
    isOverride = await utils.isGAOverride(actor.user.id);
  }
  let isTargetOverride = false;
  if (utils.isGlobalAdmin(targetId)) {
    isTargetOverride = await utils.isGAOverride(targetId);
  }

  const guild = await actor.getGuild();
  const me = await guild.getMember(discord.getBotId());
  // check bot can actually do it
  if (actionType === ActionType.CLEAN && !channel.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
    return 'I can\'t manage messages';
  }

  const highestRoleMe = await utils.getMemberHighestRole(me);
  const isGuildOwner = guild.ownerId === actor.user.id;

  const highestRoleTarget = target instanceof discord.GuildMember ? await utils.getMemberHighestRole(target) : null;

  // check levels and discord perms
  if (config.modules.infractions && config.modules.infractions.targetting && !isOverride && !isGuildOwner) {
    const checkLevels = typeof config.modules.infractions.targetting.checkLevels === 'boolean' ? config.modules.infractions.targetting.checkLevels : true;
    const checkRoles = typeof config.modules.infractions.targetting.checkRoles === 'boolean' ? config.modules.infractions.targetting.checkRoles : true;
    const requireExtraPerms = typeof config.modules.infractions.targetting.reqDiscordPermissions === 'boolean' ? config.modules.infractions.targetting.reqDiscordPermissions : true;
    const allowSelf = typeof config.modules.infractions.targetting.allowSelf === 'boolean' ? config.modules.infractions.targetting.allowSelf : true;

    if (requireExtraPerms === true) {
      if (actionType === ActionType.CLEAN && !channel.canMember(actor, discord.Permissions.MANAGE_MESSAGES)) {
        return 'You can\'t manage messages';
      }
    }
    if (actor.user.id === targetId) {
      if (!allowSelf) {
        return 'You can\'t target yourself';
      }
      return true;
    }
    if (checkLevels === true && target instanceof discord.GuildMember) {
      const actorLevel = utils.getUserAuth(actor);
      const targetLevel = utils.getUserAuth(target);
      if (actorLevel <= targetLevel) {
        return `You can't target this user (due to their level of ${targetLevel})`;
      }
    }
    if (checkRoles === true) {
      const highestActor = await utils.getMemberHighestRole(actor);
      if (highestRoleTarget instanceof discord.Role && highestActor.position <= highestRoleTarget.position) {
        return 'You can\'t target this user (due to their role hierarchy)';
      }
    }
  }
  if (isTargetOverride === true && !isOverride && actor.user.id !== targetId) {
    if (!isGuildOwner) {
      return 'You can\'t target this user as they are a global admin.\nIf you really believe this action is applicable, please have the server owner perform it.';
    }
  }
  return true;
}

export async function SlowmodeChannel(actor: discord.GuildMember | null, channel: discord.GuildChannel, seconds: number, reason = ''): Promise<string | boolean> {
  const guild = await channel.getGuild();
  if (guild === null) {
    return false;
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }
  if (!channel.canMember(me, discord.Permissions.MANAGE_CHANNELS)) {
    return 'I can\'t manage this channel';
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (!(channel instanceof discord.GuildTextChannel)) {
    return 'Invalid channel';
  }
  if (channel.rateLimitPerUser === seconds) {
    return 'Channel is already at this slowmode';
  }

  await channel.edit({ rateLimitPerUser: seconds });
  const placeholders = new Map([['_ACTORTAG_', 'SYSTEM'], ['_SECONDS_', seconds.toString()], ['_CHANNEL_ID_', channel.id], ['_REASON_', '']]);
  if (actor !== null) {
    placeholders.set('_ACTORTAG_', getActorTag(actor));
    placeholders.set('_ACTOR_ID_', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('_REASON_', ` with reason ${reason}`);
  }
  logCustom('ADMIN', 'SLOWMODE', placeholders);
  if (channel.canMember(me, discord.Permissions.SEND_MESSAGES) && seconds > 0) {
    const txt = `**This channel has been set to ${seconds}s slowmode** by ${placeholders.get('_ACTORTAG_')}${reason.length > 0 ? ` with reason** \`${utils.escapeString(reason)}\`` : ''}`;
    channel.sendMessage({ allowedMentions: {}, content: txt });
  }
  return true;
}

export async function LockChannel(actor: discord.GuildMember | null, channel: discord.GuildChannel, state: boolean, reason = ''): Promise<string | boolean> {
  const guild = await channel.getGuild();
  if (guild === null) {
    return false;
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }
  if (!channel.canMember(me, discord.Permissions.MANAGE_ROLES) || !channel.canMember(me, discord.Permissions.MANAGE_CHANNELS)) {
    return 'I can\'t manage this channel';
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (!(channel instanceof discord.GuildTextChannel) && !(channel instanceof discord.GuildNewsChannel)) {
    return 'Invalid channel';
  }
  const defaultOw = channel.permissionOverwrites.find((ow) => ow.id === guild.id);
  if (!defaultOw) {
    return false;
  }
  const perms = new utils.Permissions(defaultOw.deny);
  if (perms.has('SEND_MESSAGES') && state === true) {
    return 'Channel already locked';
  } if (!perms.has('SEND_MESSAGES') && !state) {
    return 'Channel not locked';
  }
  const newOws = channel.permissionOverwrites.map((ow) => {
    if (ow.id === guild.id) {
      if (state === true) {
        ow.deny = Number(new utils.Permissions(ow.deny).add('SEND_MESSAGES').bitfield);
      } else {
        ow.deny = Number(new utils.Permissions(ow.deny).remove('SEND_MESSAGES').bitfield);
      }
    }
    return ow;
  });
  await channel.edit({ permissionOverwrites: newOws });
  const placeholders = new Map([['_ACTORTAG_', 'SYSTEM'], ['_CHANNEL_ID_', channel.id], ['_REASON_', '']]);
  let type = 'LOCKED_CHANNEL';
  if (state === false) {
    type = 'UNLOCKED_CHANNEL';
  }
  if (actor !== null) {
    placeholders.set('_ACTORTAG_', getActorTag(actor));
    placeholders.set('_ACTOR_ID_', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('_REASON_', ` with reason ${reason}`);
  }
  logCustom('ADMIN', type, placeholders);
  if (channel.canMember(me, discord.Permissions.SEND_MESSAGES)) {
    const txt = `**This channel has been ${state === true ? 'locked' : 'unlocked'} by **${placeholders.get('_ACTORTAG_')}${reason.length > 0 ? ` **with reason** \`${utils.escapeString(reason)}\`` : ''}`;
    channel.sendMessage({ allowedMentions: {}, content: txt });
  }
  return true;
}

export async function LockGuild(actor: discord.GuildMember | null, state: boolean, reason = ''): Promise<string | boolean> {
  const guild = await discord.getGuild(guildId);
  if (guild === null) {
    return false;
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }
  if (!me.can(discord.Permissions.MANAGE_ROLES)) {
    return 'I can\'t manage roles';
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const defaultRole = await guild.getRole(guild.id);
  if (!defaultRole) {
    return false;
  }
  const perms = new utils.Permissions(defaultRole.permissions);
  if (!perms.has('SEND_MESSAGES') && state === true) {
    return 'Guild already locked';
  } if (perms.has('SEND_MESSAGES') && !state) {
    return 'Guild not locked';
  }
  if (state === true) {
    perms.remove('SEND_MESSAGES');
  } else {
    perms.add('SEND_MESSAGES');
  }
  await defaultRole.edit({ permissions: Number(perms.bitfield) });
  const placeholders = new Map([['_ACTORTAG_', 'SYSTEM'], ['_REASON_', '']]);
  let type = 'LOCKED_GUILD';
  if (state === false) {
    type = 'UNLOCKED_GUILD';
  }
  if (actor !== null) {
    placeholders.set('_ACTORTAG_', getActorTag(actor));
    placeholders.set('_ACTOR_ID_', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('_REASON_', ` with reason ${reason}`);
  }
  logCustom('ADMIN', type, placeholders);
  return true;
}

let cleaning = false;
export async function Clean(dtBegin: number, target: any, actor: discord.GuildMember | null, channel: discord.GuildChannel, count: number, channelTarget: string | undefined = undefined, reason = '', bypassCleaning = false): Promise<string | boolean | number> {
  let memberId;
  if (target instanceof discord.User) {
    memberId = target.id;
  } else if (target instanceof discord.GuildMember) {
    memberId = target.user.id;
  }
  const guild = await channel.getGuild();
  if (guild === null) {
    return false;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (count === 0) {
    return false;
  }
  if (typeof memberId === 'string') {
    const canT = await canTarget(actor, target, channel, ActionType.CLEAN);
    if (canT !== true) {
      return canT;
    }
  }
  if (cleaning === true && !bypassCleaning) {
    return 'Already running a clean operation, please try again later';
  }
  const diff = dtBegin - 500;
  let query = { authorId: memberId, channelId: channelTarget };
  if (typeof memberId !== 'string') {
    query = { ...target, channelId: channelTarget };
  }
  for (const k in query) {
    if (typeof query[k] === 'undefined') {
      delete query[k];
    }
  }
  let msgs = (await adminPool.getByQuery<TrackedMessage>(query)).filter((item) => item.ts < diff);
  if (msgs.length === 0) {
    return 0;
  }
  msgs = msgs.slice(Math.max(msgs.length - count, 0));
  if (msgs.length === 0) {
    return 0;
  }
  cleaning = true;
  const deleted = [];
  const channelMapping: {[key: string]: Array<string>} = {};
  if (typeof channelTarget === 'string') {
    channelMapping[channelTarget] = [].concat(msgs).map((item) => item.id);
  } else {
    msgs.forEach((item) => {
      if (!Array.isArray(channelMapping[item.channelId])) {
        channelMapping[item.channelId] = [];
      }
      channelMapping[item.channelId].push(item.id);
    });
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }
  const promises = [];
  for (const channelId in channelMapping) {
    promises.push(new Promise(async (resolve, reject) => {
      const msgIds = channelMapping[channelId];
      let channeltest: discord.GuildChannel;
      if (channel.id === channelId) {
        channeltest = channel;
      } else {
        const _chan = await discord.getChannel(channelId);
        if (_chan instanceof discord.GuildChannel) {
          channeltest = _chan;
        }
      }
      if (!channeltest || (!(channeltest instanceof discord.GuildTextChannel) && !(channeltest instanceof discord.GuildNewsChannel))) {
        resolve();
        return;
      }
      const channelThis: discord.GuildTextChannel | discord.GuildNewsChannel = channeltest;
      if (!channelThis.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
        resolve();
        return;
      }
      if (msgIds.length === 1) {
        try {
          const msg = await channelThis.getMessage(msgIds[0]);
          await msg.delete();
          deleted.push(msgIds[0]);
        } catch (e) {}
      } else if (msgIds.length > 100) {
        const splits = utils.chunkArrayInGroups(msgIds, 99);
        await Promise.all(splits.map(async (newmids) => {
          await channelThis.bulkDeleteMessages(newmids);
          deleted.push(...newmids);
        }));
      } else {
        await channelThis.bulkDeleteMessages(msgIds);
        deleted.push(...msgIds);
      }
      resolve();
    }));
  }
  await Promise.all(promises);
  cleaning = false;
  if (deleted.length > 0) {
    const _placeholders = new Map([['_MESSAGES_', deleted.length.toString()], ['_ACTORTAG_', 'SYSTEM'], ['_CHANNEL_', ''], ['_USERTAG_', '']]);
    if (actor !== null) {
      _placeholders.set('_ACTORTAG_', getActorTag(actor));
      _placeholders.set('_ACTOR_ID_', actor.user.id);
    }
    if (typeof channelTarget === 'string') {
      _placeholders.set('_CHANNEL_', ` in <#${channelTarget}>`);
    }
    if (typeof memberId === 'string') {
      _placeholders.set('_USERTAG_', ` from ${getUserTag(target)}`);
      _placeholders.set('_USER_ID_', memberId);
    }
    logCustom('ADMIN', 'CLEAN', _placeholders);
  }
  return deleted.length;
}


export async function OnMessageCreate(
  id: string,
  gid: string,
  message: discord.Message,
) {
  if (!(message instanceof discord.GuildMemberMessage) || !(message.member instanceof discord.GuildMember)) {
    return;
  }
  adminPool.saveToPool(new TrackedMessage(message));
}
export async function OnMessageDelete(
  id: string,
  gid: string,
  messageDelete: discord.Event.IMessageDelete,
) {
  adminPool.editPool(messageDelete.id, null);
}

export async function OnMessageDeleteBulk(
  id: string,
  gid: string,
  messages: discord.Event.IMessageDeleteBulk,
) {
  adminPool.editPools(messages.ids, (val: TrackedMessage) => {
    if (val === null) {
      return null;
    }
    if (messages.ids.includes(val.id)) {
      return null;
    }
    return val;
  });
}

export function InitializeCommands() {
  const _groupOptions = {
    description: 'Admin Commands',
    filters: c2.getFilters('admin', Ranks.Guest),
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  cmdGroup.subcommand('clean', (subCommandGroup) => {
    subCommandGroup.on(
      { name: 'user', filters: c2.getFilters('admin.clean.user', Ranks.Moderator) },
      (ctx) => ({ user: ctx.user(), count: ctx.integerOptional({ maxValue: MAX_COMMAND_CLEAN, minValue: 1, default: DEFAULT_COMMAND_CLEAN }) }),
      async (msg, { user, count }) => {
        // const msgs = await getMessagesBy({authorId: user.id});
        const chan = await msg.getChannel();
        const guild = await msg.getGuild();
        let member: discord.User | discord.GuildMember = user;
        const _tryf = await guild.getMember(user.id);
        if (_tryf !== null) {
          member = _tryf;
        }
        const res = await Clean(utils.decomposeSnowflake(msg.id).timestamp, member, msg.member, chan, count, msg.channelId);
        if (typeof res !== 'number') {
          if (res === false) {
            await infractions.confirmResult(undefined, msg, false, 'Failed to clean user');
          } else if (typeof res === 'string') {
            await infractions.confirmResult(undefined, msg, false, res);
          }
        } else if (res > 0) {
          await infractions.confirmResult(undefined, msg, true, `Cleared ${res} messages from ${user.getTag()}`);
        } else {
          await infractions.confirmResult(undefined, msg, false, 'No messages were cleared.');
        }
      },
    );
    subCommandGroup.on(
      { name: 'channel', filters: c2.getFilters('admin.clean.channel', Ranks.Moderator) },
      (ctx) => ({ channel: ctx.guildTextChannel(), count: ctx.integerOptional({ maxValue: MAX_COMMAND_CLEAN, minValue: 1, default: DEFAULT_COMMAND_CLEAN }) }),
      async (msg, { channel, count }) => {
        // const msgs = await getMessagesBy({authorId: user.id});
        const res = await Clean(utils.decomposeSnowflake(msg.id).timestamp, {}, msg.member, channel, count, channel.id);
        if (typeof res !== 'number') {
          if (res === false) {
            await infractions.confirmResult(undefined, msg, false, 'Failed to clean');
          } else if (typeof res === 'string') {
            await infractions.confirmResult(undefined, msg, false, res);
          }
        } else if (res > 0) {
          await infractions.confirmResult(undefined, msg, true, `Cleared ${res} messages from <#${channel.id}>`);
        } else {
          await infractions.confirmResult(undefined, msg, false, 'No messages were cleared.');
        }
      },
    );
    subCommandGroup.on(
      { name: 'here', filters: c2.getFilters('admin.clean.here', Ranks.Moderator) },
      (ctx) => ({ count: ctx.integerOptional({ maxValue: MAX_COMMAND_CLEAN, minValue: 1, default: DEFAULT_COMMAND_CLEAN }) }),
      async (msg, { count }) => {
        // const msgs = await getMessagesBy({authorId: user.id});
        const chan = await msg.getChannel();
        const res = await Clean(utils.decomposeSnowflake(msg.id).timestamp, {}, msg.member, chan, count, msg.channelId);
        if (typeof res !== 'number') {
          if (res === false) {
            await infractions.confirmResult(undefined, msg, false, 'Failed to clean');
          } else if (typeof res === 'string') {
            await infractions.confirmResult(undefined, msg, false, res);
          }
        } else if (res > 0) {
          await infractions.confirmResult(undefined, msg, true, `Cleared ${res} messages from <#${msg.channelId}>`);
        } else {
          await infractions.confirmResult(undefined, msg, false, 'No messages were cleared.');
        }
      },
    );
    subCommandGroup.on(
      { name: 'all', filters: c2.getFilters('admin.clean.all', Ranks.Moderator) },
      (ctx) => ({ count: ctx.integerOptional({ maxValue: MAX_COMMAND_CLEAN, minValue: 1, default: DEFAULT_COMMAND_CLEAN }) }),
      async (msg, { count }) => {
        // const msgs = await getMessagesBy({authorId: user.id});
        const chan = await msg.getChannel();
        const res = await Clean(utils.decomposeSnowflake(msg.id).timestamp, {}, msg.member, chan, count);
        if (typeof res !== 'number') {
          if (res === false) {
            await infractions.confirmResult(undefined, msg, false, 'Failed to clean');
          } else if (typeof res === 'string') {
            await infractions.confirmResult(undefined, msg, false, res);
          }
        } else if (res > 0) {
          await infractions.confirmResult(undefined, msg, true, `Cleared ${res} messages`);
        } else {
          await infractions.confirmResult(undefined, msg, false, 'No messages were cleared.');
        }
      },
    );
    subCommandGroup.on(
      { name: 'bots', filters: c2.getFilters('admin.clean.bots', Ranks.Moderator) },
      (ctx) => ({ count: ctx.integerOptional({ maxValue: MAX_COMMAND_CLEAN, minValue: 1, default: DEFAULT_COMMAND_CLEAN }) }),
      async (msg, { count }) => {
        const chan = await msg.getChannel();
        const res = await Clean(utils.decomposeSnowflake(msg.id).timestamp, { bot: true }, msg.member, chan, count, msg.channelId);
        if (typeof res !== 'number') {
          if (res === false) {
            await infractions.confirmResult(undefined, msg, false, 'Failed to clean bots');
          } else if (typeof res === 'string') {
            await infractions.confirmResult(undefined, msg, false, res);
          }
        } else if (res > 0) {
          await infractions.confirmResult(undefined, msg, true, `Cleared ${res} messages from bots`);
        } else {
          await infractions.confirmResult(undefined, msg, false, 'No messages were cleared.');
        }
      },
    );
  });

  cmdGroup.on(
    { name: 'cease', filters: c2.getFilters('admin.cease', Ranks.Moderator) },
    (ctx) => ({ channel: ctx.guildChannelOptional() }),
    async (msg, { channel }) => {
      if (channel === null) {
        channel = await msg.getChannel();
      }
      const res = await LockChannel(msg.member, channel, true);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, 'Locked channel');
      } else {
        await infractions.confirmResult(undefined, msg, false, 'Failed to lock channel');
      }
    },
  );
  cmdGroup.on(
    { name: 'uncease', filters: c2.getFilters('admin.uncase', Ranks.Moderator) },
    (ctx) => ({ channel: ctx.guildChannelOptional() }),
    async (msg, { channel }) => {
      if (channel === null) {
        channel = await msg.getChannel();
      }
      const res = await LockChannel(msg.member, channel, false);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, 'Unlocked channel');
      } else {
        await infractions.confirmResult(undefined, msg, false, 'Failed to unlock channel');
      }
    },
  );
  cmdGroup.on(
    { name: 'slowmode', filters: c2.getFilters('admin.slowmode', Ranks.Moderator) },
    (ctx) => ({ seconds: ctx.integerOptional({ default: 0, minValue: 0, maxValue: 21600 }), channel: ctx.guildChannelOptional() }),
    async (msg, { seconds, channel }) => {
      if (channel === null) {
        channel = await msg.getChannel();
      }
      const res = await SlowmodeChannel(msg.member, channel, seconds);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, `Set slowmode on ${channel.toMention()} to **${seconds}s**`);
      } else {
        await infractions.confirmResult(undefined, msg, false, 'Failed to set slowmode');
      }
    },
  );
  cmdGroup.raw(
    { name: 'lockdown', filters: c2.getFilters('admin.lockdown', Ranks.Moderator) },
    async (msg) => {
      const res = await LockGuild(msg.member, true);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, 'Locked Guild');
      } else {
        await infractions.confirmResult(undefined, msg, false, 'Failed to lock guild');
      }
    },
  );
  cmdGroup.raw(
    { name: 'unlockdown', filters: c2.getFilters('admin.unlockdown', Ranks.Moderator) },
    async (msg) => {
      const res = await LockGuild(msg.member, false);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, 'Unlocked Guild');
      } else {
        await infractions.confirmResult(undefined, msg, false, 'Failed to unlock guild');
      }
    },
  );

  return cmdGroup;
}
