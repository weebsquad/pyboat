/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-async-promise-executor */
import { config, globalConfig, guildId, Ranks } from '../config';
import * as utils from '../lib/utils';
import * as constants from '../constants/constants';
import * as c2 from '../lib/commands2';
import * as infractions from './infractions';
import { logCustom } from './logging/events/custom';
import { getActorTag, getUserTag, getMemberTag, isDebug } from './logging/main';
import { StoragePool } from '../lib/storagePools';

const MAX_POOL_SIZE = constants.MAX_KV_SIZE;
const BOT_DELETE_DAYS = 14 * 24 * 60 * 60 * 1000;
// const BOT_DELETE_DAYS = 60 * 60 * 1000;
const MAX_COMMAND_CLEAN = 1000;
const DEFAULT_COMMAND_CLEAN = 50;
const TRACKING_KEYS_LIMIT = 150;
const ENTRIES_PER_POOL = 73; // approximate maximum

// persist

const PERSIST_DURATION = 30 * 24 * 60 * 60 * 1000;
const persistPrefix = 'Persist_';
const persistPool = new utils.StoragePool('persist', PERSIST_DURATION, 'memberId', 'ts', undefined, 30);

export const adminPool = new StoragePool('admin', BOT_DELETE_DAYS, 'id', undefined, ENTRIES_PER_POOL, TRACKING_KEYS_LIMIT);

const ACTION_DURATION = 30 * 24 * 60 * 60 * 1000;
const actionPool = new StoragePool('actions', ACTION_DURATION, 'id', 'id', undefined, 30);
enum ActionType {
    'CLEAN' = 'CLEAN',
    'LOCK_GUILD'= 'LOCK_GUILD',
    'LOCK_CHANNEL'= 'LOCK_CHANNEL',
    'SLOWMODE' = 'SLOWMODE',
    'TEMPROLE' = 'TEMPROLE',
    'ROLE' = 'ROLE',
    'NICKNAME' = 'NICKNAME'
}

export class Action { // class action lawsuit lmao
  active: boolean;
  expiresAt: string;
  id: string;
  // ts: number;
  previous: number | undefined;
  actorId: string | null;
  targetId: string | undefined;
  targetValue: string | number | undefined;
  type: ActionType;
  reason = '';
  constructor(type: ActionType, actor: string | null, target: string | undefined, expires: string | undefined = '', reason = '') {
    const id = utils.composeSnowflake();
    this.id = id;
    // this.ts = utils.decomposeSnowflake(this.id).timestamp;
    this.type = type;
    this.actorId = actor;
    this.targetId = target;
    if (type === ActionType.LOCK_GUILD) {
      this.targetId = undefined;
    }
    this.reason = reason;
    if (typeof this.reason !== 'string') {
      this.reason = '';
    }
    if (typeof expires === 'undefined' || expires === '') {
      expires = id;
    }
    this.expiresAt = expires;
    this.active = this.expiresAt !== this.id;
    return this;
  }
  async updateStorage() {
    await actionPool.editPool(this.id, this);
  }
  async checkActive() {
    if (!this.active) {
      return false;
    }
    const guild = await discord.getGuild(guildId);
    if (this.type === ActionType.SLOWMODE) {
      const channel = await guild.getChannel(this.targetId);
      if (channel !== null && channel instanceof discord.GuildTextChannel) {
        if (channel.rateLimitPerUser === this.previous) {
          this.active = false;
        }
      } else {
        this.active = false;
      }
    } else if (this.type === ActionType.LOCK_CHANNEL) {
      const channel = await guild.getChannel(this.targetId);
      if (channel !== null && channel instanceof discord.GuildTextChannel) {
        const defaultOw = channel.permissionOverwrites.find((ow) => ow.id === guild.id);
        if (!defaultOw) {
          this.active = false;
        } else {
          const perms = new utils.Permissions(defaultOw.deny);
          if (!perms.has('SEND_MESSAGES', false)) {
            this.active = false;
          }
        }
      } else {
        this.active = false;
      }
    } else if (this.type === ActionType.LOCK_GUILD) {
      const roleId = typeof config.modules.admin.defaultRole === 'string' && config.modules.admin.defaultRole.length > 6 ? config.modules.admin.defaultRole : guild.id;
      const role = await guild.getRole(roleId);
      if (!(role instanceof discord.Role)) {
        this.active = false;
      } else {
        const perms = new utils.Permissions(role.permissions);
        if (perms.has('SEND_MESSAGES', false)) {
          this.active = false;
        }
      }
    } else if (this.type === ActionType.TEMPROLE) {
      const gm = await guild.getMember(this.targetId);
      if (gm === null) {
        this.active = false;
      } else if (typeof this.targetValue !== 'string' || !gm.roles.includes(this.targetValue)) {
        this.active = false;
      }
    }
    if (!this.active) {
      await this.updateStorage();
    }
    // check states of things
    return this.active;
  }
  async checkExpired() {
    if (!this.active || !this.isExpired()) {
      return;
    }
    const checkActive = await this.checkActive();
    if (!checkActive) {
      return;
    }
    const guild = await discord.getGuild(guildId);
    if (this.type === ActionType.SLOWMODE) {
      const channel = await guild.getChannel(this.targetId);
      if (channel !== null && channel instanceof discord.GuildTextChannel) {
        await SlowmodeChannel(null, channel, this.previous, undefined, 'Slowmode expired');
        this.active = false;
      }
    } else if (this.type === ActionType.LOCK_CHANNEL) {
      const channel = await guild.getChannel(this.targetId);
      if (channel !== null && channel instanceof discord.GuildTextChannel) {
        this.active = false;
        await LockChannel(null, channel, false, 0, 'Channel lock expired');
      } else {
        this.active = false;
      }
    } else if (this.type === ActionType.LOCK_GUILD) {
      this.active = false;
      await LockGuild(null, false, 0, 'Guild lock expired');
    } else if (this.type === ActionType.TEMPROLE) {
      const gm = await guild.getMember(this.targetId);
      if (gm === null) {
        this.active = false;
      } else if (typeof this.targetValue !== 'string' || !gm.roles.includes(this.targetValue)) {
        this.active = false;
      } else {
        await gm.removeRole(this.targetValue);
        logCustom('ADMIN', 'TEMPROLE_EXPIRED', new Map([['_USERTAG_', getMemberTag(gm)], ['_ROLE_MENTION_', `<@&${this.targetValue}>`]]));
      }
    }
    // remove states of things
    if (!this.active) {
      await this.updateStorage();
    }
  }
  isExpired() {
    if (this.id === this.expiresAt) {
      return false;
    }
    const exp = utils.decomposeSnowflake(this.expiresAt).timestamp;
    const diff = Date.now() - exp;
    return diff > 0;
  }
}
class TrackedMessage {
    authorId: string;
    id: string;
    channelId: string;
    bot: boolean;
    // ts: number;
    // type: discord.Message.Type;
    // flags: discord.Message.Flags;
    constructor(message: discord.Message.AnyMessage) {
      this.authorId = message.author.id;
      this.channelId = message.channelId;
      this.id = message.id;
      // this.ts = utils.decomposeSnowflake(this.id).timestamp;
      this.bot = message.author.bot;
      if (message.webhookId !== null) {
        this.bot = true;
      }
      // this.type = message.type;
      // this.flags = message.flags;
      return this;
    }
}
const roleAllKv = new pylon.KVNamespace('roleAll');
const roleNukeKv = new pylon.KVNamespace('roleNuke');
let lastCheckedRoleAll: number | undefined;
let tm = true;
const timer = 7 * 1000;
export async function checkRoleAll() {
  if (typeof lastCheckedRoleAll === 'number') {
    const diff = Date.now() - lastCheckedRoleAll;
    if (diff < timer) {
      if (tm === false) {
        tm = true;
        const toDiff = ((timer) - diff) + 100;
        setTimeout(checkRoleAll, toDiff);
      }
      return;
    }
  }
  lastCheckedRoleAll = Date.now();
  const guild = await discord.getGuild();
  const roles = await guild.getRoles();
  const roleAll = await roleAllKv.items();
  const roleNuke = await roleNukeKv.items();
  const toAdd: Array<string> = [];
  const toRemove: Array<string> = [];
  const me = await guild.getMember(discord.getBotId());
  if (!me.can(discord.Permissions.MANAGE_ROLES)) {
    return;
  }
  const myHighest = await utils.getMemberHighestRole(me);
  await Promise.all(roleAll.map(async (item) => {
    if (typeof item.value === 'string') {
      const _f = roles.find((role) => role.id === item.value && role.position < myHighest.position);
      if (!_f) {
        await roleAllKv.delete(item.key);
      } else {
        toAdd.push(item.value);
      }
    }
  }));
  await Promise.all(roleNuke.map(async (item) => {
    if (typeof item.value === 'string') {
      const _f = roles.find((role) => role.id === item.value && role.position < myHighest.position);
      if (!_f) {
        await roleNukeKv.delete(item.key);
      } else {
        toRemove.push(item.value);
      }
    }
  }));
  if (toAdd.length === 0 && toRemove.length === 0) {
    return;
  }

  let did = 0;
  const LIMIT = 5;
  for await (const member of guild.iterMembers()) {
    lastCheckedRoleAll = Date.now();
    if (member.user.id === me.user.id) {
      continue;
    } // ignore the bot, lol
    if (did >= LIMIT) {
      break;
    }
    let changes = false;
    let theirRoles = member.roles.filter((val) => {
      const inc = toRemove.includes(val);
      if (inc) {
        changes = true;
      }
      return !inc;
    });
    if (toAdd.length > 0) {
      const before = theirRoles.length;
      toAdd.forEach((rlAdd) => {
        if (!theirRoles.includes(rlAdd)) {
          theirRoles.push(rlAdd);
        }
      });
      if (before !== theirRoles.length) {
        changes = true;
      }
    }
    if (changes === true) {
      theirRoles = [...new Set(theirRoles)];
      if (did === (LIMIT - 2)) {
        tm = false;
      }
      await member.edit({ roles: theirRoles });
      did++;
    }
  }
  tm = false;
  if (did < LIMIT) {
    // we did all of the members!
    const allRoles: Array<string> = toAdd.filter((val) => true);
    allRoles.push(...toRemove);
    await Promise.all(roleAll.map(async (item) => {
      if (typeof item.value === 'string') {
        const _f = allRoles.find((role) => role === item.value);
        if (_f) {
          await roleAllKv.delete(item.key);
        }
      }
    }));
    await Promise.all(roleNuke.map(async (item) => {
      if (typeof item.value === 'string') {
        const _f = allRoles.find((role) => role === item.value);
        if (_f) {
          await roleNukeKv.delete(item.key);
        }
      }
    }));
  }
}

export async function every5Min() {
  checkRoleAll();
  try {
    const acts = (await actionPool.getByQuery<Action>({
      active: true,
    }));
    const actives1: Array<any> = acts.map((act) => utils.makeFake(act, Action)).filter((act: Action) => act.active === true && act.isExpired());
    const actives: Array<Action> = actives1;
    if (actives.length > 0) {
      const promises2 = [];
      for (let i = 0; i < actives.length; i += 1) {
        const act = actives[i];
        if (act.isExpired()) {
          await sleep(200);
          promises2.push(act.checkExpired());
        }
      }

      await Promise.all(promises2);
    }
    const actsClear = (await actionPool.getByQuery<Action>({
      active: false,
    }));
    if (actsClear.length > 0) {
      await actionPool.editPools(actsClear.map((val) => val.id), (val) => null);
    }
  } catch (e) {
    await utils.logError(e);
  }
}

export async function addAction(target: discord.Guild | discord.GuildChannel | discord.GuildMember, actor: discord.GuildMember | discord.User | string | null, type: ActionType, expires: string | undefined = '', previousValue: any = undefined, targetValue: any = undefined, reason = '') {
  if (expires === '' || expires === undefined) {
    return;
  }
  if (actor === null) {
    actor = 'SYSTEM';
  }
  let targetId;
  if (target instanceof discord.GuildMember) {
    targetId = target.user.id;
  } else {
    targetId = target.id;
  }

  if (typeof targetId === 'undefined') {
    return false;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  let actorId;
  if (typeof actor === 'string') {
    actorId = actor;
  }
  if (actor instanceof discord.User) {
    actorId = actor.id;
  }
  if (actor instanceof discord.GuildMember) {
    actorId = actor.user.id;
  }
  const newAct = new Action(type, actorId, targetId, expires, reason);
  newAct.previous = previousValue;
  newAct.targetValue = targetValue;
  await actionPool.saveToPool(newAct);

  return newAct;
}

function isThisEnabled() {
  if (typeof config.modules !== 'object' || typeof config.modules.admin !== 'object' || typeof config.modules.admin.enabled !== 'boolean') {
    return false;
  }
  return config.modules.admin.enabled;
}
export async function saveMessage(msg: discord.GuildMemberMessage) {
  if (!isThisEnabled()) {
    return false;
  }
  const _res = await adminPool.saveToPool(new TrackedMessage(msg));
  return _res;
}
export async function getRoleIdByText(txt: string): Promise<string | null> {
  txt = txt.toLowerCase();
  // check full matches first in config
  for (const key in config.modules.admin.roleAliases) {
    const obj = config.modules.admin.roleAliases[key];
    if (key === txt || obj.toLowerCase() === txt) {
      return key;
    }
  }
  // check partial matches now
  for (const key in config.modules.admin.roleAliases) {
    const obj = config.modules.admin.roleAliases[key];
    if (obj.toLowerCase().includes(txt)) {
      return key;
    }
  }
  // check guild matches
  const roles = await (await discord.getGuild(guildId)).getRoles();
  // full match
  for (const key in roles) {
    if (roles[key].id === txt || roles[key].name.toLowerCase() === txt) {
      return roles[key].id;
    }
  }
  // partial
  for (const key in roles) {
    if (roles[key].name.toLowerCase().includes(txt)) {
      return roles[key].id;
    }
  }
  return null;
}
export async function canTarget(actor: discord.GuildMember | null, target: discord.GuildMember | discord.User | null, channel: discord.GuildChannel | undefined, extraTarget: any = undefined, actionType: ActionType): Promise<boolean | string> {
  let targetId;
  if (target !== null) {
    targetId = target instanceof discord.GuildMember ? target.user.id : target.id;
  }
  if (targetId === discord.getBotId()) {
    return false;
  }

  if (actor === null) {
    if (typeof targetId !== 'string') {
      return true;
    }
    return !utils.isGlobalAdmin(targetId);
  }
  const isGA = utils.isGlobalAdmin(actor.user.id);
  let isOverride = false;
  if (isGA) {
    isOverride = await utils.isGAOverride(actor.user.id);
  }

  const isTargetAdmin = typeof targetId === 'string' && utils.isGlobalAdmin(targetId);

  const guild = await actor.getGuild();
  const me = await guild.getMember(discord.getBotId());
  // check bot can actually do it
  if (actionType === ActionType.CLEAN && !channel.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
    return 'I can\'t manage messages';
  }
  if ((actionType === ActionType.ROLE || actionType === ActionType.TEMPROLE) && !me.can(discord.Permissions.MANAGE_ROLES)) {
    return 'I can\'t manage roles';
  }
  if (actionType === ActionType.NICKNAME && !me.can(discord.Permissions.MANAGE_NICKNAMES)) {
    return 'I can\'t manage nicknames';
  }

  const highestRoleMe = await utils.getMemberHighestRole(me);
  const isGuildOwner = guild.ownerId === actor.user.id;

  const highestRoleTarget = target instanceof discord.GuildMember ? await utils.getMemberHighestRole(target) : null;

  if (target instanceof discord.GuildMember && highestRoleTarget instanceof discord.Role && actionType === ActionType.NICKNAME) {
    if (highestRoleTarget.position >= highestRoleMe.position) {
      return 'I can\'t manage that target';
    }
  }

  if (extraTarget instanceof discord.Role && (actionType === ActionType.TEMPROLE || actionType === ActionType.ROLE)) {
    if (extraTarget.position >= highestRoleMe.position) {
      return 'I can\'t assign that role';
    }
    if (actor !== null && !isOverride && !isGuildOwner) {
      const highestRoleActor = await utils.getMemberHighestRole(actor);
      if (extraTarget.position >= highestRoleActor.position) {
        return 'You can\'t assign that role because it is at or above your highest role';
      }
    }
  }
  // check levels and discord perms
  if (config.modules.infractions && config.modules.infractions.targetting && !isOverride && !isGuildOwner) {
    const checkLevels = typeof config.modules.infractions.targetting.checkLevels === 'boolean' ? config.modules.infractions.targetting.checkLevels : true;
    const checkRoles = typeof config.modules.infractions.targetting.checkRoles === 'boolean' ? config.modules.infractions.targetting.checkRoles : true;
    const requireExtraPerms = typeof config.modules.infractions.targetting.reqDiscordPermissions === 'boolean' ? config.modules.infractions.targetting.reqDiscordPermissions : true;
    const allowSelf = typeof config.modules.infractions.targetting.allowSelf === 'boolean' ? config.modules.infractions.targetting.allowSelf : true;

    if (requireExtraPerms === true) {
      if ((actionType === ActionType.ROLE || actionType === ActionType.TEMPROLE) && !actor.can(discord.Permissions.MANAGE_ROLES)) {
        return 'You can\'t manage roles';
      } if (actionType === ActionType.NICKNAME && !actor.can(discord.Permissions.MANAGE_NICKNAMES)) {
        return 'You can\'t manage nicknames';
      } if (actionType === ActionType.CLEAN && (!channel.canMember(actor, discord.Permissions.READ_MESSAGES) || !channel.canMember(actor, discord.Permissions.SEND_MESSAGES))) {
        return 'You don\'t have access to that channel';
      } if (actionType === ActionType.CLEAN && !channel.canMember(actor, discord.Permissions.MANAGE_MESSAGES)) {
        return 'You can\'t manage messages in that channel';
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
  if (isTargetAdmin === true && !isOverride && actor.user.id !== targetId) {
    if (!isGuildOwner) {
      return 'You can\'t target this user as they are a global admin.\nIf you really believe this action is applicable to this user, please have the server owner perform it.';
    }
  }
  return true;
}

export async function SlowmodeChannel(actor: discord.GuildMember | null, channel: discord.GuildChannel, seconds: number, duration: number, reason = ''): Promise<string | boolean> {
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
  if (actor !== null) {
    reason = utils.escapeString(reason);
  }
  if (!(channel instanceof discord.GuildTextChannel)) {
    return 'Invalid channel';
  }
  if (channel.rateLimitPerUser === seconds) {
    return 'Channel is already at this slowmode';
  }
  const oldValue = channel.rateLimitPerUser;
  await channel.edit({ rateLimitPerUser: seconds });
  const exp = duration > 0 ? utils.composeSnowflake(Date.now() + duration) : undefined;
  if (seconds > 0 && duration > 0) {
    await addAction(channel, actor, ActionType.SLOWMODE, exp, oldValue, undefined, reason);
  }
  const placeholders = new Map([['_ACTORTAG_', 'SYSTEM'], ['_SECONDS_', seconds.toString()], ['_CHANNEL_ID_', channel.id], ['_DURATION_', duration > 0 ? ` for ${utils.getLongAgoFormat(duration, 2, false, 'second')}` : ''], ['_REASON_', '']]);
  if (actor !== null) {
    placeholders.set('_ACTORTAG_', getActorTag(actor));
    placeholders.set('_ACTOR_ID_', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('_REASON_', ` with reason \`${reason}\``);
  }
  logCustom('ADMIN', 'SLOWMODE', placeholders);
  if (channel.canMember(me, discord.Permissions.SEND_MESSAGES)) {
    const txt = `**${seconds > 0 ? `This channel has been set to ${seconds}s slowmode` : ' This channel has had slowmode disabled'}** by ${placeholders.get('_ACTORTAG_')}${duration > 0 ? ` for ${utils.getLongAgoFormat(duration, 2, false, 'second')}` : ''}${reason.length > 0 ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`;
    const res: any = await channel.sendMessage({ allowedMentions: {}, content: txt });
    saveMessage(res);
  }
  return true;
}

export async function LockChannel(actor: discord.GuildMember | null, channel: discord.GuildChannel, state: boolean, duration: number, reason = ''): Promise<string | boolean> {
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
  if (perms.has('SEND_MESSAGES', false) && state === true) {
    return 'Channel already locked';
  } if (!perms.has('SEND_MESSAGES', false) && !state) {
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
  const exp = duration > 0 ? utils.composeSnowflake(Date.now() + duration) : undefined;
  if (state === true && duration > 0) {
    await addAction(channel, actor, ActionType.LOCK_CHANNEL, exp, undefined, undefined, reason);
  }
  await channel.edit({ permissionOverwrites: newOws });
  const placeholders = new Map([['_ACTORTAG_', 'SYSTEM'], ['_DURATION_', duration > 0 ? ` for ${utils.getLongAgoFormat(duration, 2, false, 'second')}` : ''], ['_CHANNEL_ID_', channel.id], ['_REASON_', '']]);
  let type = 'LOCKED_CHANNEL';
  if (state === false) {
    type = 'UNLOCKED_CHANNEL';
  }

  if (actor !== null) {
    placeholders.set('_ACTORTAG_', getActorTag(actor));
    placeholders.set('_ACTOR_ID_', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('_REASON_', ` with reason \`${reason}\``);
  }
  logCustom('ADMIN', type, placeholders);
  if (channel.canMember(me, discord.Permissions.SEND_MESSAGES)) {
    const txt = `**This channel has been ${state === true ? 'locked' : 'unlocked'} by **${placeholders.get('_ACTORTAG_')}${duration > 0 ? ` for ${utils.getLongAgoFormat(duration, 2, false, 'second')}` : ''}${reason.length > 0 ? ` **with reason** \`${utils.escapeString(reason)}\`` : ''}`;
    const res:any = await channel.sendMessage({ allowedMentions: {}, content: txt });
    saveMessage(res);
  }
  return true;
}

export async function LockGuild(actor: discord.GuildMember | null, state: boolean, duration: number, reason = ''): Promise<string | boolean> {
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
  const roleId = typeof config.modules.admin.defaultRole === 'string' && config.modules.admin.defaultRole.length > 6 ? config.modules.admin.defaultRole : guild.id;
  const defaultRole = await guild.getRole(roleId);
  if (!defaultRole) {
    return false;
  }
  if (defaultRole.id !== guild.id) {
    const myHighest = await utils.getMemberHighestRole(me);
    if (myHighest.position <= defaultRole.position) {
      return `I can\'t edit the role ${defaultRole.toMention()} !`;
    }
  }
  const perms = new utils.Permissions(defaultRole.permissions);
  if (!perms.has('SEND_MESSAGES', false) && state === true) {
    return 'Guild already locked';
  } if (perms.has('SEND_MESSAGES', false) && !state) {
    return 'Guild not locked';
  }
  if (state === true) {
    perms.remove('SEND_MESSAGES');
  } else {
    perms.add('SEND_MESSAGES');
  }
  const exp = duration > 0 ? utils.composeSnowflake(Date.now() + duration) : undefined;
  if (state === true && duration > 0) {
    await addAction(guild, actor, ActionType.LOCK_GUILD, exp, undefined, undefined, reason);
  }
  await defaultRole.edit({ permissions: Number(perms.bitfield) });
  const placeholders = new Map([['_ACTORTAG_', 'SYSTEM'], ['_DURATION_', duration > 0 ? ` for ${utils.getLongAgoFormat(duration, 2, false, 'second')}` : ''], ['_REASON_', '']]);
  let type = 'LOCKED_GUILD';
  if (state === false) {
    type = 'UNLOCKED_GUILD';
  }
  if (actor !== null) {
    placeholders.set('_ACTORTAG_', getActorTag(actor));
    placeholders.set('_ACTOR_ID_', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('_REASON_', ` with reason \`${reason}\``);
  }
  logCustom('ADMIN', type, placeholders);
  return true;
}

export async function TempRole(actor: discord.GuildMember | null, target: discord.GuildMember, roleTxt: string, duration: number, reason = ''): Promise<string | boolean> {
  const guild = await discord.getGuild(guildId);
  if (guild === null) {
    return false;
  }
  if (duration === 0) {
    return 'Invalid duration';
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }
  const rlId = await getRoleIdByText(roleTxt);
  if (rlId === null) {
    return 'Role ID/Name not found';
  }
  const role = await guild.getRole(rlId);
  if (!(role instanceof discord.Role)) {
    return `Role ID#(${rlId}) not found in the guild`;
  }
  const canT = await canTarget(actor, target, undefined, role, ActionType.TEMPROLE);
  if (canT !== true) {
    return canT;
  }
  if (target.roles.includes(role.id)) {
    return 'Target already has this role';
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }

  const exp = duration > 0 ? utils.composeSnowflake(Date.now() + duration) : undefined;
  await addAction(target, actor, ActionType.TEMPROLE, exp, undefined, role.id, reason);
  await target.addRole(role.id);
  const placeholders = new Map([['_ROLE_MENTION_', role.toMention()], ['_USERTAG_', getMemberTag(target)], ['_ACTORTAG_', 'SYSTEM'], ['_DURATION_', duration > 0 ? `${utils.getLongAgoFormat(duration, 2, false, 'second')}` : ''], ['_REASON_', '']]);
  if (actor !== null) {
    placeholders.set('_ACTORTAG_', getActorTag(actor));
    placeholders.set('_ACTOR_ID_', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('_REASON_', ` with reason \`${reason}\``);
  }
  logCustom('ADMIN', 'TEMPROLE', placeholders);
  return true;
}

export async function Role(actor: discord.GuildMember | null, target: discord.GuildMember, roleTxt: string, state: boolean, reason = ''): Promise<string | boolean> {
  const guild = await discord.getGuild(guildId);
  if (guild === null) {
    return false;
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }
  const rlId = await getRoleIdByText(roleTxt);
  if (rlId === null) {
    return 'Role ID/Name not found';
  }
  const role = await guild.getRole(rlId);
  if (!(role instanceof discord.Role)) {
    return `Role ID#(${rlId}) not found in the guild`;
  }
  const canT = await canTarget(actor, target, undefined, role, ActionType.ROLE);
  if (canT !== true) {
    return canT;
  }
  if (target.roles.includes(role.id) && state === true) {
    return 'Target already has this role';
  } if (!target.roles.includes(role.id) && !state) {
    return 'Target does not have this role';
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }

  if (state === true) {
    await target.addRole(role.id);
  } else {
    await target.removeRole(role.id);
  }
  const placeholders = new Map([['_ROLE_MENTION_', role.toMention()], ['_USERTAG_', getMemberTag(target)], ['_ACTORTAG_', 'SYSTEM'], ['_REASON_', '']]);
  if (actor !== null) {
    placeholders.set('_ACTORTAG_', getActorTag(actor));
    placeholders.set('_ACTOR_ID_', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('_REASON_', ` with reason \`${reason}\``);
  }
  const type = state === true ? 'ROLE_ADDED' : 'ROLE_REMOVED';
  logCustom('ADMIN', type, placeholders);
  return true;
}

export async function Nick(actor: discord.GuildMember | null, target: discord.GuildMember, newNick: string | null, reason = ''): Promise<string | boolean> {
  const guild = await discord.getGuild(guildId);
  if (guild === null) {
    return false;
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }
  const canT = await canTarget(actor, target, undefined, undefined, ActionType.NICKNAME);
  if (canT !== true) {
    return canT;
  }
  if (target.nick === newNick) {
    return 'The target already has this nickname!';
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  await target.edit({ nick: newNick });

  const placeholders = new Map([['_NEW_NICK_', newNick === null ? 'None' : utils.escapeString(newNick)], ['_USERTAG_', getMemberTag(target)], ['_ACTORTAG_', 'SYSTEM'], ['_REASON_', '']]);
  if (actor !== null) {
    placeholders.set('_ACTORTAG_', getActorTag(actor));
    placeholders.set('_ACTOR_ID_', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('_REASON_', ` with reason \`${reason}\``);
  }

  logCustom('ADMIN', 'NICKNAME', placeholders);
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
  const canT = await canTarget(actor, target, channel, undefined, ActionType.CLEAN);
  if (canT !== true) {
    return canT;
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
  let msgs = (await adminPool.getByQuery<TrackedMessage>(query)).filter((item) => {
    /* eslint-disable-next-line */
    const ts = typeof item['ts'] === 'number' ? item['ts'] : utils.decomposeSnowflake(item.id).timestamp;
    return ts < diff;
  });
  if (msgs.length === 0) {
    return 0;
  }
  msgs = msgs.slice(0, Math.min(msgs.length, count));
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

/* ROLE PERSIST */

interface ChannelPersist extends discord.Channel.IPermissionOverwrite {
  channelId: string;
}
class MemberPersist {
  ts: number;
  memberId: string;
  roles: Array<string> | undefined;
  nick: string | undefined;
  level: number | undefined;
  channels: Array<ChannelPersist> | undefined;
  constructor(member: string, roles: Array<string> | undefined, nick: string | undefined | null, level: number | undefined, channels: Array<ChannelPersist> | undefined) {
    this.ts = Date.now();
    this.memberId = member;
    this.roles = roles;
    if (typeof nick === 'string' && nick.length > 0) {
      this.nick = nick;
    }
    if (typeof level === 'number' && level > 0) {
      this.level = level;
    }
    if (channels.length > 0) {
      this.channels = channels;
    }
    return this;
  }
}

export async function getStoredUserOverwrites(userId: string) {
  const ows = await utils.KVManager.get(`${persistPrefix}channels`);
  const res: Array<ChannelPersist> = [];
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
    await utils.KVManager.set(`${persistPrefix}channels`, userOverrides);
  }
}
function getPersistConf(member: discord.GuildMember, levelForce: number | undefined = undefined) {
  let lvl = utils.getUserAuth(member);
  if (typeof levelForce !== 'undefined') {
    lvl = levelForce;
  }
  let lowestConf = 1000;
  for (const key in config.modules.admin.persist.levels) {
    const thislvl = parseInt(key, 10);
    if (thislvl >= lvl && thislvl < lowestConf) {
      lowestConf = thislvl;
    }
  }
  const toret = config.modules.admin.persist.levels[lowestConf.toString()];
  if (typeof toret === 'undefined') {
    if (typeof config.modules.admin.persist.levels[lowestConf] !== 'undefined') {
      return config.modules.admin.persist.levels[lowestConf];
    }
    return null;
  }
  return toret;
}
async function savePersistData(member: discord.GuildMember): Promise<boolean> {
  if (!config.modules.admin.persist || config.modules.admin.persist.enabled !== true) {
    return false;
  }
  let rls = member.roles.filter((a) => true);
  if (typeof config.modules.admin.autoroles === 'object') {
    if (member.user.bot === true && Array.isArray(config.modules.admin.autoroles.bot)) {
      rls = rls.filter((rl) => !config.modules.admin.autoroles.bot.includes(rl));
    } else if (member.user.bot === false && Array.isArray(config.modules.admin.autoroles.human)) {
      rls = rls.filter((rl) => !config.modules.admin.autoroles.human.includes(rl));
    }
  }

  const channels = await getStoredUserOverwrites(member.user.id);
  if (rls.length === 0 && member.nick === null && channels.length === 0) {
    return false;
  }
  const newObj = new MemberPersist(member.user.id, member.roles, member.nick, utils.getUserAuth(member), channels);
  await persistPool.saveToPool(newObj);
  logCustom('PERSIST', 'SAVED', new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id], ['_USER_', member.user]]));
  return true;
}

async function restorePersistData(member: discord.GuildMember) {
  if (!config.modules.admin.persist || config.modules.admin.persist.enabled !== true) {
    return false;
  }
  const dt = await persistPool.getById<MemberPersist>(member.user.id);
  if (!dt) {
    return false;
  }

  const lvl = typeof dt.level === 'number' ? dt.level : 0;
  const thisconf = getPersistConf(member, lvl);
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

  await persistPool.editPool(member.user.id, undefined);
  logCustom('PERSIST', 'RESTORED', new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id], ['_USER_', member.user]]));
  return true;
}
export async function OnChannelCreate(
  id: string,
  gid: string,
  channel: discord.GuildChannel,
) {
  if (!config.modules.admin.persist || typeof config.modules.admin.persist !== 'object' || config.modules.admin.persist.enabled !== true) {
    return;
  }
  await storeChannelData();
}
export async function OnChannelDelete(
  id: string,
  gid: string,
  channel: discord.GuildChannel,
) {
  if (!config.modules.admin.persist || typeof config.modules.admin.persist !== 'object' || config.modules.admin.persist.enabled !== true) {
    return;
  }
  await storeChannelData();
}
export async function OnChannelUpdate(
  id: string,
  gid: string,
  channel: discord.GuildChannel,
  oldChannel: discord.GuildChannel,
) {
  if (!config.modules.admin.persist || typeof config.modules.admin.persist !== 'object' || config.modules.admin.persist.enabled !== true) {
    return;
  }
  const permschange = false;
  let hasChange = channel.permissionOverwrites.every((ow) => {
    const _f = oldChannel.permissionOverwrites.find((ow2) => ow2.id === ow.id);
    if (!_f) {
      return false;
    }
    if (_f.allow !== ow.allow || _f.deny !== ow.deny) {
      return false;
    }
    return true;
  });
  if (!hasChange) {
    await storeChannelData();
    return;
  }
  hasChange = oldChannel.permissionOverwrites.every((ow) => {
    const _f = channel.permissionOverwrites.find((ow2) => ow2.id === ow.id);
    if (!_f) {
      return false;
    }
    if (_f.allow !== ow.allow || _f.deny !== ow.deny) {
      return false;
    }
    return true;
  });
  if (!hasChange) {
    await storeChannelData();
  }
}

export async function OnGuildBanAdd(
  id: string,
  gid: string,
  ban: discord.GuildBan,
) {
  if (!config.modules.admin.persist || typeof config.modules.admin.persist !== 'object' || config.modules.admin.persist.enabled !== true) {
    return;
  }
  try {
    if (config.modules.admin.persist.saveOnBan !== true) {
      persistPool.editPool(ban.user.id, undefined);
    }
  } catch (e) {}
}

export async function AL_OnGuildMemberRemove(
  id: string,
  gid: string,
  log: any,
  member: discord.Event.IGuildMemberRemove,
  oldMember: discord.GuildMember,
) {
  if (utils.isBlacklisted(member.user)) {
    return;
  }
  if (!config.modules.admin.persist || typeof config.modules.admin.persist !== 'object' || config.modules.admin.persist.enabled !== true) {
    return;
  }
  if (config.modules.admin.persist.saveOnBan !== true) {
    if (log instanceof discord.AuditLogEntry) {
      if (log.actionType === discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD) {
        return;
      }
    }
  }
  savePersistData(oldMember);
}

export async function OnGuildMemberAdd(
  id: string,
  gid: string,
  member: discord.GuildMember,
) {
  if (utils.isBlacklisted(member)) {
    return;
  }

  if (config.modules.admin.persist && typeof config.modules.admin.persist === 'object' && config.modules.admin.persist.enabled === true) {
    await restorePersistData(member);
  }
  if (config.modules.admin.autoroles && typeof config.modules.admin.autoroles === 'object' && config.modules.admin.autoroles.enabled === true) {
    const guild = await member.getGuild();
    const mem = await guild.getMember(member.user.id);
    if (mem !== null) {
      if (Array.isArray(config.modules.admin.autoroles.human) && member.user.bot === false) {
        const newr = [...new Set(mem.roles.concat(config.modules.admin.autoroles.human))];
        if (newr.length !== mem.roles.length) {
          await mem.edit({ roles: newr });
        }
      } else if (Array.isArray(config.modules.admin.autoroles.bot) && member.user.bot === true) {
        const newr = [...new Set(mem.roles.concat(config.modules.admin.autoroles.bot))];
        if (newr.length !== mem.roles.length) {
          await mem.edit({ roles: newr });
        }
      }
    }
  }
}

/* REACT ROLES */
const cooldowns = {};
export async function handleReactRoles(idts: string, reaction: discord.Event.IMessageReactionAdd | discord.Event.IMessageReactionRemove, add:boolean) {
  if (!reaction.guildId || !reaction.member || typeof config.modules !== 'object' || typeof config.modules.admin !== 'object' || typeof config.modules.admin.reactroles !== 'object' || config.modules.admin.reactroles.enabled !== true || !Array.isArray(config.modules.admin.reactroles.definitions)) {
    return;
  }
  const defs = config.modules.admin.reactroles.definitions;
  const { member } = reaction;
  if (member.user.bot === true) {
    return;
  }
  const message = reaction.messageId;
  const { emoji } = reaction;
  const found = defs.find((def) => {
    if (typeof def.message !== 'string' || typeof def.role !== 'string' || typeof def.emoji !== 'string' || typeof def.type !== 'string') {
      return false;
    }
    const type = def.type.toLowerCase();
    if (type !== 'once' && type !== 'toggle' && type !== 'remove') {
      return false;
    }
    if (def.message !== message) {
      return false;
    }
    if (utils.isNumber(def.emoji)) {
      return typeof emoji.id === 'string' && def.emoji === emoji.id;
    }
    return typeof emoji.name === 'string' && emoji.name === def.emoji;
  });
  if (!found) {
    return;
  }

  const type = found.type.toLowerCase();
  if (type === 'remove' && add === false) {
    return;
  } if (type === 'once' && add === false) {
    return;
  }

  const channel = await discord.getChannel(reaction.channelId);
  if (!(channel instanceof discord.GuildTextChannel) && !(channel instanceof discord.GuildNewsChannel)) {
    return;
  }

  let msg: discord.Message;
  try {
    msg = await channel.getMessage(reaction.messageId);
  } catch (e) {
    return;
  }
  if (msg === null) {
    return;
  }

  const hasMyEmoji = msg.reactions.find((react) => {
    if (react.me === false) {
      return false;
    }
    if (emoji.type === discord.Emoji.Type.GUILD) {
      return emoji.id === react.emoji.id;
    }
    return emoji.name === react.emoji.name;
  });
  if (typeof hasMyEmoji !== 'undefined' && add === true && (type === 'once' || type === 'remove')) {
    try {
      msg.deleteReaction(emoji.type === discord.Emoji.Type.GUILD ? `${emoji.name}:${emoji.id}` : `${emoji.name}`, reaction.userId);
    } catch (e) {}
  }
  if (typeof cooldowns[reaction.userId] === 'number') {
    const diff = Date.now() - cooldowns[reaction.userId];
    if (diff < 500) {
      return;
    }
  }
  cooldowns[reaction.userId] = Date.now();

  if (!hasMyEmoji) {
    // await msg.deleteAllReactionsForEmoji(emoji.type === discord.Emoji.Type.GUILD ? `${emoji.name}:${emoji.id}` : `${emoji.name}`);
    await msg.addReaction(emoji.type === discord.Emoji.Type.GUILD ? `${emoji.name}:${emoji.id}` : `${emoji.name}`);
    return;
  }
  const guild = await discord.getGuild();
  const memNew = await guild.getMember(reaction.userId);
  if (memNew === null) {
    return;
  }
  let typeRole: undefined | boolean;
  if (type === 'once' && !memNew.roles.includes(found.role)) {
    await memNew.addRole(found.role);
    typeRole = true;
  } else if (type === 'remove' && memNew.roles.includes(found.role)) {
    await memNew.removeRole(found.role);
    typeRole = false;
  } else if (type === 'toggle') {
    if (memNew.roles.includes(found.role) && add === false) {
      await memNew.removeRole(found.role);
      typeRole = false;
    } else if (!memNew.roles.includes(found.role) && add === true) {
      await memNew.addRole(found.role);
      typeRole = true;
    }
  }
  if (typeof typeRole === 'boolean') {
    let logType = 'ROLE_ADDED';
    if (typeRole === false) {
      logType = 'ROLE_REMOVED';
    }
    const placeholders = new Map([['_USERTAG_', getMemberTag(memNew)], ['_USER_ID_', reaction.userId], ['_CHANNEL_ID_', reaction.channelId], ['_MESSAGE_ID_', reaction.messageId], ['_EMOJI_', reaction.emoji.toMention()], ['_ROLE_ID_', found.role]]);
    logCustom('REACTROLES', logType, placeholders, idts);
  }
}

export async function OnGuildMemberUpdate(
  id: string,
  gid: string,
  member: discord.GuildMember,
  oldMember: discord.GuildMember,
) {
  checkRoleAll();
}

export async function OnMessageReactionAdd(
  id: string,
  gid: string,
  reaction: discord.Event.IMessageReactionAdd,
) {
  await handleReactRoles(id, reaction, true);
}

export async function OnMessageReactionRemove(id: string, gid: string, reaction: discord.Event.IMessageReactionRemove) {
  await handleReactRoles(id, reaction, false);
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
  cmdGroup.subcommand({ name: 'clean', filters: c2.getFilters('admin.clean', Ranks.Moderator) }, (subCommandGroup) => {
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
      { name: 'all', filters: c2.getFilters('admin.clean.all', Ranks.Administrator) },
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
  cmdGroup.subcommand({ name: 'invites', filters: c2.getFilters('admin.invites', Ranks.Administrator) }, (subCommandGroup) => {
    subCommandGroup.on(
      { name: 'prune', filters: c2.getFilters('admin.invites.prune', Ranks.Administrator) },
      (ctx) => ({ uses: ctx.integerOptional({ minValue: 0 }) }),
      async (msg, { uses }) => {
        if (uses === null) {
          uses = 0;
        }
        const guild = await msg.getGuild();
        const invites = await guild.getInvites();
        let cleared = 0;
        await Promise.all(invites.map(async (invite) => {
          if (invite.uses <= uses) {
            await invite.delete();
            cleared += 1;
          }
        }));
        if (cleared === 0) {
          await infractions.confirmResult(undefined, msg, false, 'No invites were pruned!');
        } else {
          await infractions.confirmResult(undefined, msg, true, `${cleared} total invites pruned!`);
        }
      },
    );
  });
  cmdGroup.subcommand({ name: 'role', filters: c2.getFilters('admin.role', Ranks.Administrator) }, (subCommandGroup) => {
    subCommandGroup.on(
      { name: 'add', aliases: ['give', 'grant'], filters: c2.getFilters('admin.role.add', Ranks.Administrator) },
      (ctx) => ({ member: ctx.guildMember(), roleText: ctx.text() }),
      async (msg, { member, roleText }) => {
        const res = await Role(msg.member, member, roleText, true);
        if (typeof res === 'string') {
          await infractions.confirmResult(undefined, msg, false, res);
          return;
        }
        if (res === true) {
          const rlid = await getRoleIdByText(roleText);
          await infractions.confirmResult(undefined, msg, true, `Added role <@&${rlid}> to ${member.toMention()}`);
        } else {
          await infractions.confirmResult(undefined, msg, false, 'Failed to add role');
        }
      },
    );

    subCommandGroup.on(
      { name: 'remove', aliases: ['rm', 'take'], filters: c2.getFilters('admin.role.add', Ranks.Administrator) },
      (ctx) => ({ member: ctx.guildMember(), roleText: ctx.text() }),
      async (msg, { member, roleText }) => {
        const res = await Role(msg.member, member, roleText, false);
        if (typeof res === 'string') {
          await infractions.confirmResult(undefined, msg, false, res);
          return;
        }
        if (res === true) {
          const rlid = await getRoleIdByText(roleText);
          await infractions.confirmResult(undefined, msg, true, `Removed role <@&${rlid}> from ${member.toMention()}`);
        } else {
          await infractions.confirmResult(undefined, msg, false, 'Failed to remove role');
        }
      },
    );
    subCommandGroup.on(
      { name: 'all', aliases: ['spray'], filters: c2.getFilters('admin.role.all', Ranks.Administrator) },
      (ctx) => ({ role: ctx.text() }),
      async (msg, { role }) => {
        const rlid = await getRoleIdByText(role);
        if (rlid === null) {
          const res: any = await msg.reply('Role not found!');
          saveMessage(res);
          return;
        }
        const guild = await msg.getGuild();
        const roles = await guild.getRoles();
        const me = await guild.getMember(discord.getBotId());
        if (me === null) {
          const res: any = await msg.reply('Bot member not found!');
          saveMessage(res);
          return;
        }
        const thisRole = roles.find((val) => val.id === rlid);
        if (!thisRole) {
          const res: any = await msg.reply('Role not found!');
          saveMessage(res);
          return;
        }
        const myHighest = await utils.getMemberHighestRole(me);
        if (myHighest.position <= thisRole.position || !me.can(discord.Permissions.MANAGE_ROLES)) {
          const res: any = await msg.reply('I can\'t manage that role!');
          saveMessage(res);
          return;
        }
        const itemsAll = await roleAllKv.items();
        const itemsNuke = await roleNukeKv.items();
        if (itemsAll.length > 0 || itemsNuke.length > 0) {
          const res: any = await msg.reply('A role all or role nuke is already in progress! Please wait for those to finish, thanks');
          saveMessage(res);
          return;
        }
        await roleAllKv.put(utils.composeSnowflake(), thisRole.id);

        checkRoleAll();
        const res: any = await msg.reply({ content: `OK! I will slowly apply ${thisRole.toMention()} to every member of the server that doesn\'t already have it.\n\nThis process will be very slow due to Pylon restrictions, and there will not be any confirmation of when this is completed!\nThanks for your understanding.`, allowedMentions: {} });
        saveMessage(res);
      },
    );

    subCommandGroup.on(
      { name: 'nuke', aliases: ['removeall'], filters: c2.getFilters('admin.role.nuke', Ranks.Administrator) },
      (ctx) => ({ role: ctx.text() }),
      async (msg, { role }) => {
        const rlid = await getRoleIdByText(role);
        if (rlid === null) {
          const res: any = await msg.reply('Role not found!');
          saveMessage(res);
          return;
        }
        const guild = await msg.getGuild();
        const roles = await guild.getRoles();
        const me = await guild.getMember(discord.getBotId());
        if (me === null) {
          const res: any = await msg.reply('Bot member not found!');
          saveMessage(res);
          return;
        }
        const thisRole = roles.find((val) => val.id === rlid);
        if (!thisRole) {
          const res: any = await msg.reply('Role not found!');
          saveMessage(res);
          return;
        }
        const myHighest = await utils.getMemberHighestRole(me);
        if (myHighest.position <= thisRole.position || !me.can(discord.Permissions.MANAGE_ROLES)) {
          const res: any = await msg.reply('I can\'t manage that role!');
          saveMessage(res);
          return;
        }
        const itemsAll = await roleAllKv.items();
        const itemsNuke = await roleNukeKv.items();
        if (itemsAll.length > 0 || itemsNuke.length > 0) {
          const res: any = await msg.reply('A role all or role nuke is already in progress! Please wait for those to finish, thanks');
          saveMessage(res);
          return;
        }
        await roleNukeKv.put(utils.composeSnowflake(), thisRole.id);

        checkRoleAll();
        const res: any = await msg.reply({ content: `OK! I will slowly remove ${thisRole.toMention()} from every member of the server that has it.\n\nThis process will be very slow due to Pylon restrictions, and there will not be any confirmation of when this is completed!\nThanks for your understanding.`, allowedMentions: {} });
        saveMessage(res);
      },
    );
  });

  cmdGroup.on(
    { name: 'nickname', aliases: ['nick'], filters: c2.getFilters('admin.nickname', Ranks.Moderator) },
    (ctx) => ({ member: ctx.guildMember(), nickname: ctx.textOptional() }),
    async (msg, { member, nickname }) => {
      const res = await Nick(msg.member, member, nickname);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, `Set ${member.user.getTag()}'s nickname to \`${nickname === null ? 'None' : utils.escapeString(nickname)}\``);
      } else {
        await infractions.confirmResult(undefined, msg, false, 'Failed to set nickname');
      }
    },
  );

  cmdGroup.on(
    { name: 'temprole', filters: c2.getFilters('admin.temprole', Ranks.Administrator) },
    (ctx) => ({ member: ctx.guildMember(), duration: ctx.string(), roleText: ctx.text() }),
    async (msg, { member, duration, roleText }) => {
      const dur = utils.timeArgumentToMs(duration);
      if (dur === 0) {
        const res: any = await msg.reply('duration malformed (try 1h30m format)');
        saveMessage(res);
        return;
      }
      if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
        const res: any = await msg.reply('duration must be between a minute and a month');
        saveMessage(res);
      }

      const res = await TempRole(msg.member, member, roleText, dur);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        const rlid = await getRoleIdByText(roleText);
        await infractions.confirmResult(undefined, msg, true, `Added role <@&${rlid}> to ${member.toMention()}${dur > 0 ? ` for ${utils.getLongAgoFormat(dur, 2, false, 'second')}` : ''}`);
      } else {
        await infractions.confirmResult(undefined, msg, false, 'Failed to add role');
      }
    },
  );

  cmdGroup.on(
    { name: 'cease', filters: c2.getFilters('admin.cease', Ranks.Moderator) },
    (ctx) => ({ duration: ctx.stringOptional(), channel: ctx.guildChannelOptional() }),
    async (msg, { channel, duration }) => {
      if (channel === null) {
        channel = await msg.getChannel();
      }
      let dur = 0;
      if (duration !== null) {
        dur = utils.timeArgumentToMs(duration);
        if (dur === 0) {
          const res: any = await msg.reply('duration malformed (try 1h30m format)');
          saveMessage(res);
        }
        if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
          const res: any = await msg.reply('duration must be between a minute and a month');
          saveMessage(res);
        }
      }
      const res = await LockChannel(msg.member, channel, true, dur);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, `Locked channel${dur > 0 ? ` for ${utils.getLongAgoFormat(dur, 2, false, 'second')}` : ''}`);
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
      const res = await LockChannel(msg.member, channel, false, 0);
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
    (ctx) => ({ seconds: ctx.integerOptional({ default: 0, minValue: 0, maxValue: 21600 }), duration: ctx.stringOptional(), channel: ctx.guildChannelOptional() }),
    async (msg, { seconds, duration, channel }) => {
      let dur = 0;
      if (duration !== null) {
        dur = utils.timeArgumentToMs(duration);
        if (dur === 0) {
          const res: any = await msg.reply('duration malformed (try 1h30m format)');
          saveMessage(res);
        }
        if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
          const res: any = await msg.reply('duration must be between a minute and a month');
          saveMessage(res);
        }
      }
      if (channel === null) {
        channel = await msg.getChannel();
      }
      const res = await SlowmodeChannel(msg.member, channel, seconds, dur);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        const txtDur = dur > 0 ? utils.getLongAgoFormat(dur, 2, false, 'second') : '';
        await infractions.confirmResult(undefined, msg, true, `Set slowmode on ${channel.toMention()} to **${seconds}s**${txtDur !== '' ? ` for ${txtDur}` : ''}`);
      } else {
        await infractions.confirmResult(undefined, msg, false, 'Failed to set slowmode');
      }
    },
  );
  cmdGroup.on(
    { name: 'lockdown', filters: c2.getFilters('admin.lockdown', Ranks.Moderator) },
    (ctx) => ({ duration: ctx.stringOptional() }),
    async (msg, { duration }) => {
      let dur = 0;
      if (duration !== null) {
        dur = utils.timeArgumentToMs(duration);
        if (dur === 0) {
          const res: any = await msg.reply('duration malformed (try 1h30m format)');
          saveMessage(res);
        }
        if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
          const res: any = await msg.reply('duration must be between a minute and a month');
          saveMessage(res);
        }
      }
      const res = await LockGuild(msg.member, true, dur);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, `Locked Guild${dur > 0 ? ` for ${utils.getLongAgoFormat(dur, 2, false, 'second')}` : ''}`);
      } else {
        await infractions.confirmResult(undefined, msg, false, 'Failed to lock guild');
      }
    },
  );
  cmdGroup.raw(
    { name: 'unlockdown', filters: c2.getFilters('admin.unlockdown', Ranks.Moderator) },
    async (msg) => {
      const res = await LockGuild(msg.member, false, 0);
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

  cmdGroup.on(
    { name: 'roles', filters: c2.getFilters('admin.roles', Ranks.Moderator) },
    (ctx) => ({ query: ctx.textOptional() }),
    async (msg, { query }) => {
      if (query === null) {
        query = '';
      }
      query = query.toLowerCase();
      const guild = await msg.getGuild();
      let roles = (await guild.getRoles()).reverse();
      if (query.length > 0) {
        roles = roles.filter((rl) => rl.name.toLowerCase().includes(query) || rl.id.includes(query) || rl.name.toLowerCase() === query);
      }
      roles = roles.filter((role) => role.id !== guild.id);
      if (roles.length === 0) {
        const res: any = await msg.reply({ content: 'No roles found' });
        saveMessage(res);
        return;
      }
      const dt = [];
      let currKey = 0;
      roles.forEach((role) => {
        /* if(passedRls >= 20) {
            currKey +=1;
            passedRls = 0;
          } */
        let len = Array.isArray(dt[currKey]) ? dt[currKey].reduce((a, b) => a + b.length, 0) : 0;
        if (Array.isArray(dt[currKey])) {
          len += 10 + (dt[currKey].length * 2);
        }
        const props = [];
        if (typeof config.levels === 'object' && typeof config.levels.roles === 'object' && typeof config.levels.roles[role.id] === 'number' && config.levels.roles[role.id] > 0) {
          props.push(`Lvl ${config.levels.roles[role.id]}`);
        }
        if (role.mentionable === true) {
          props.push('[M]');
        }
        if (role.hoist === true) {
          props.push('[H]');
        }
        // dt[currKey].push([props.join(', '), role.id, role.name]);
        const prp = props.length > 0 ? props.join(', ') : '';
        const thisTxt = `[${role.id}]${prp !== '' ? ` | <${prp}>` : ''} | ${utils.escapeString(role.name)}`;

        if ((len + thisTxt.length) > 1950) {
          currKey += 1;
        }
        if (!Array.isArray(dt[currKey])) {
          dt[currKey] = ['ID | <Properties> | Name', ''];
        }
        dt[currKey].push(thisTxt);
      });
      for (let i = 0; i < dt.length; i += 1) {
        const it = dt[i];
        const res: any = await msg.reply({ allowedMentions: {}, content: `\`\`\`\n${it.join('\n')}\n\`\`\`` });
        saveMessage(res);
      }
    },
  );

  cmdGroup.on(
    { name: 'actions', filters: c2.getFilters('infractions.actions', Ranks.Moderator) },
    (ctx) => ({ id: ctx.stringOptional() }),
    async (msg, { id }) => {
      const res: any = await msg.reply(async () => {
        if (id === null) {
          const infs = (await actionPool.getByQuery<Action>({ active: true }));
          if (infs.length === 0) {
            return { content: 'There are no active actions!' };
          }
          const last10 = infs.slice(0, Math.max(infs.length, 10));
          let txt = `**Displaying latest ${Math.min(last10.length, 10)} active actions**\n\n**ID** | **Actor** | **Target** | **Type** | **Reason**\n`;
          last10.map((inf) => {
            let targMention;
            // todo properly format this
            txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' ? 'SYSTEM' : `<@!${inf.actorId}>`} **>** ${inf.targetId} - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason)}\`` : ''}`;
          });
          const remaining = infs.length - last10.length;
          if (remaining > 0) {
            txt += `\n\n**...** and ${remaining} more actions`;
          }
          const emb = new discord.Embed();
          emb.setDescription(txt);
          emb.setTimestamp(new Date().toISOString());
          return { embed: emb, allowedMentions: {}, content: '' };
        }
      });
      saveMessage(res);
    },
  );

  // BACKUP
  if (config.modules.admin.persist.enabled === true) {
    cmdGroup.subcommand({ name: 'backup', filters: c2.getFilters('admin.backup', Ranks.Moderator) }, (subCommandGroup) => {
      subCommandGroup.on(
        { name: 'restore', filters: c2.getFilters('utilities.backup.restore', Ranks.Moderator) },
        (ctx) => ({ member: ctx.guildMember() }),
        async (msg, { member }) => {
          const res: any = await msg.reply(async () => {
            const ret = await restorePersistData(member);
            if (ret === true) {
              return {
                allowedMentions: {},
                content: `${discord.decor.Emojis.WHITE_CHECK_MARK} Successfully restored ${member.toMention()}`,
              };
            }
            return {
              allowedMentions: {},
              content: `${discord.decor.Emojis.X} Failed to restore ${member.toMention()}`,
            };
          });
          saveMessage(res);
        },
      );
      subCommandGroup.on(
        { name: 'save', filters: c2.getFilters('utilities.backup.save', Ranks.Moderator) },
        (ctx) => ({ member: ctx.guildMember() }),
        async (msg, { member }) => {
          const res: any = await msg.reply(async () => {
            const ret = await savePersistData(member);
            if (ret === true) {
              return {
                allowedMentions: {},
                content: `${discord.decor.Emojis.WHITE_CHECK_MARK} Successfully saved ${member.toMention()}`,
              };
            }
            return {
              allowedMentions: {},
              content: `${discord.decor.Emojis.X} Failed to save data for ${member.toMention()} , (do they have any data to save?)`,
            };
          });
          saveMessage(res);
        },
      );
      subCommandGroup.on(
        { name: 'show', filters: c2.getFilters('utilities.backup.show', Ranks.Moderator) },
        (ctx) => ({ usr: ctx.user() }),
        async (msg, { usr }) => {
          const res: any = await msg.reply(async () => {
            const thisObj = await persistPool.getById<MemberPersist>(usr.id);
            if (!thisObj) {
              return { content: `${discord.decor.Emojis.X} no backup found for this member` };
            }
            let rls = 'None';
            if (thisObj.roles.length > 0) {
              const rlsfo = thisObj.roles.map((rl) => `<@&${rl}>`).join(', ');
              rls = rlsfo;
            }
            const txt = `**Member backup for **<@!${usr.id}>:\n**Roles**: ${thisObj.roles.length === 0 ? 'None' : rls}\n**Nick**: ${thisObj.nick === null || typeof thisObj.nick !== 'string' ? 'None' : `\`${utils.escapeString(thisObj.nick)}\``}${Array.isArray(thisObj.channels) ? `\n**Channel Overwrites**: ${thisObj.channels.length}` : ''}`;
            return { content: txt, allowedMentions: {} };
          });
          saveMessage(res);
        },
      );
      subCommandGroup.on(
        { name: 'delete', filters: c2.getFilters('utilities.backup.delete', Ranks.Moderator) },
        (ctx) => ({ usr: ctx.user() }),
        async (msg, { usr }) => {
          const res: any = await msg.reply(async () => {
            const thiskv = await persistPool.getById<MemberPersist>(usr.id);
            if (!thiskv) {
              return `${discord.decor.Emojis.X} no backup found for this member`;
            }
            await persistPool.editPool(usr.id, undefined);
            return `${discord.decor.Emojis.WHITE_CHECK_MARK} successfully deleted!`;
          });
          saveMessage(res);
        },
      );
    });
  }

  return cmdGroup;
}
