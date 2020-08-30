/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-async-promise-executor */
import { config, globalConfig, guildId, Ranks } from '../config';
import * as utils from '../lib/utils';
import * as constants from '../constants/constants';
import * as c2 from '../lib/commands2';
import * as infractions from './infractions';
import { logCustom } from './logging/events/custom';
import {getActorTag, getUserTag} from './logging/main'

const poolsKv = new pylon.KVNamespace('admin');
const MAX_POOL_SIZE = constants.MAX_KV_SIZE;
const BOT_DELETE_DAYS = 14 * 24 * 60 * 60 * 1000;
// const BOT_DELETE_DAYS = 60 * 60 * 1000;
const MAX_COMMAND_CLEAN = 1000;
const DEFAULT_COMMAND_CLEAN = 50;

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

export async function cleanPool() {
  const diff = Date.now();
  const items = await poolsKv.items();
  await Promise.all(items.map(async (item: any) => {
    const vl: Array<TrackedMessage> = item.value;
    const { key } = item;
    const toRemove = vl.filter((e) => e === null || diff > (BOT_DELETE_DAYS + e.ts)).map((e) => (e === null ? null : e.id));
    if (toRemove.length > 0) {
      await poolsKv.transact(key, (prev: any) => prev.filter((e: TrackedMessage) => e !== null && !toRemove.includes(e.id)));
    }
  }));
}
export async function saveToPool(msg: discord.GuildMemberMessage) {
  const newObj = JSON.parse(JSON.stringify(new TrackedMessage(msg)));
  const thisLen = new TextEncoder().encode(JSON.stringify(newObj)).byteLength;
  const items = await poolsKv.items();
  let saveTo;
  const res = items.every((item: any) => {
    if (!Array.isArray(item.value)) {
      return true;
    }
    const _entries: Array<TrackedMessage> = item.value;
    const len = (new TextEncoder().encode(JSON.stringify(_entries)).byteLength) + thisLen;
    if (len < MAX_POOL_SIZE) {
      saveTo = item.key;
      return false;
    }
    return true;
  });
  if (res === true) {
    await poolsKv.put(utils.composeSnowflake(), [newObj]);
    return true;
  }
  if (res === false && typeof saveTo === 'string') {
    for (let i = 0; i < 2; i += 1) {
      try {
        await poolsKv.transact(saveTo, (prev: any) => prev.concat(newObj));
        return true;
      } catch (e) {
      }
    }
    return false;
  }

  return false;
}
export async function editPool(msg: discord.GuildMemberMessage | null, msgId: string | undefined = undefined) {
  let newObj;
  if (msg !== null) {
    newObj = new TrackedMessage(msg);
    msgId = msg.id;
  }
  const items = await poolsKv.items();
  const res = items.find((item: any) => item.value.find((e: TrackedMessage) => e !== null && e.id === msgId) !== undefined);
  if (res) {
    for (let i = 0; i < 2; i += 1) {
      try {
        await poolsKv.transact(res.key, (prev: any) => {
          const newData = JSON.parse(JSON.stringify(prev));
          const _ind = newData.findIndex((e: TrackedMessage) => e !== null && e.id === msgId);
          if (_ind !== -1 && msg !== null) {
            newData[_ind] = newObj;
          } else if (_ind !== -1 && msg === null) {
            delete newData[_ind];
          }
          return newData;
        });
        return true;
      } catch (e) {
      }
    }
    return false;
  }

  return false;
}
export async function getAllPools(): Promise<Array<TrackedMessage>> {
  const now = Date.now();
  const diff = now - BOT_DELETE_DAYS;
  const items = await poolsKv.items();
  let _ret: Array<TrackedMessage> = [];
  items.map((e: any) => {
    if (Array.isArray(e.value)) {
      _ret.push(...e.value);
    }
  });
  _ret = _ret.filter((item) => item !== null && item.ts >= diff).sort((a, b) => a.ts - b.ts);
  return _ret;
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
  let msgs = (await getMessagesBy(query)).filter((item) => item.ts < diff);
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
  if(deleted.length > 0) 
  {
      let _placeholders = new Map([['_MESSAGES_', deleted.length.toString()]]);
      if(typeof memberId === 'string') {
          _placeholders.set('_ACTORTAG_', getActorTag(target));
          _placeholders.set('_ACTOR_ID_', memberId);
      } else {
          _placeholders.set('_ACTORTAG_', 'SYSTEM');
      }
      await logCustom('ADMIN', 'CLEAN', _placeholders);
  }
  return deleted.length;
}

export async function getMessagesBy(query: any) {
  const ps = (await getAllPools());
  if (query === null) {
    return ps;
  }
  const newPs = ps.filter((inf) => {
    for (const key in query) {
      if (typeof query[key] === 'undefined') {
        continue;
      }
      if (inf[key] !== query[key]) {
        return false;
      }
    }
    return true;
  });
  return newPs;
}
export async function editPools(ids: Array<string>, callback: Function) {
  const items = await poolsKv.items();
  const transactPools = items.filter((item: any) => {
    if (Array.isArray(item.value)) {
      const _val: Array<TrackedMessage> = item.value;
      const hasAny = _val.find((entry) => entry !== null && ids.includes(entry.id));
      if (!hasAny) {
        return false;
      }
      return true;
    }
    return false;
  });
  if (transactPools.length > 0) {
    await Promise.all(transactPools.map(async (item) => {
      await poolsKv.transact(item.key, (prev: any) => {
        let dt: Array<TrackedMessage> = JSON.parse(JSON.stringify(prev));
        dt = dt.map((val) => callback(val)).filter((val) => val !== null && typeof val !== 'undefined');
        return dt;
      });
    }));
    return true;
  }
  return false;
}
export async function OnMessageCreate(
  id: string,
  gid: string,
  message: discord.Message,
) {
  if (!(message instanceof discord.GuildMemberMessage) || !(message.member instanceof discord.GuildMember)) {
    return;
  }
  saveToPool(message);
}
export async function OnMessageDelete(
  id: string,
  gid: string,
  messageDelete: discord.Event.IMessageDelete,
) {
  editPool(null, messageDelete.id);
}

export async function OnMessageDeleteBulk(
  id: string,
  gid: string,
  messages: discord.Event.IMessageDeleteBulk,
) {
  editPools(messages.ids, (val: TrackedMessage) => {
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

  return cmdGroup;
}
