/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-async-promise-executor */
/* eslint-disable eqeqeq */
import { config, globalConfig, guildId, Ranks } from '../config';
import * as utils from '../lib/utils';
import * as constants from '../constants/constants';
import * as c2 from '../lib/commands2';
import * as infractions from './infractions';
import { logCustom } from './logging/events/custom';
import { getActorTag, getUserTag, getMemberTag, isDebug } from './logging/main';
import { StoragePool } from '../lib/storagePools';
import { registerSlash, registerSlashGroup, registerSlashSub, interactionChannelRespond, registerChatRaw, registerChatOn, registerChatSubCallback } from './commands';
import { language as i18n, setPlaceholders } from '../localization/interface';

const BOT_DELETE_DAYS = 14 * 24 * 60 * 60 * 1000;
// const BOT_DELETE_DAYS = 60 * 60 * 1000;
const MAX_COMMAND_CLEAN = 1000;
const DEFAULT_COMMAND_CLEAN = 50;
const TRACKING_KEYS_LIMIT = 40;
const ENTRIES_PER_POOL = 62; // approximate maximum

// persist

const PERSIST_DURATION = 32 * 24 * 60 * 60 * 1000;
const persistPool = new utils.StoragePool('persist', PERSIST_DURATION, 'memberId', 'ts', undefined, 30);

export const adminPool = new StoragePool('admin', BOT_DELETE_DAYS, 'id', 'ts', ENTRIES_PER_POOL, TRACKING_KEYS_LIMIT);

const kvOverrides = new pylon.KVNamespace('channelPersists');
const ACTION_DURATION = 32 * 24 * 60 * 60 * 1000;
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
  ts: number;
  previous: number | undefined;
  actorId: string | null;
  targetId: string | undefined;
  targetValue: string | number | undefined;
  type: ActionType;
  reason = '';
  constructor(type: ActionType, actor: string | null, target: string | undefined, expires: string | undefined = '', reason = '') {
    const id = utils.composeSnowflake();
    this.id = id;
    this.ts = utils.decomposeSnowflake(this.id).timestamp;
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
        await SlowmodeChannel(null, channel, this.previous, undefined, i18n.modules.admin.slowmode_expired);
        this.active = false;
      }
    } else if (this.type === ActionType.LOCK_CHANNEL) {
      const channel = await guild.getChannel(this.targetId);
      if (channel !== null && channel instanceof discord.GuildTextChannel) {
        this.active = false;
        await LockChannel(null, channel, false, 0, i18n.modules.admin.channel_lock_expired);
      } else {
        this.active = false;
      }
    } else if (this.type === ActionType.LOCK_GUILD) {
      this.active = false;
      await LockGuild(null, false, 0, i18n.modules.admin.guild_lock_expired);
    } else if (this.type === ActionType.TEMPROLE) {
      const gm = await guild.getMember(this.targetId);
      if (gm === null) {
        this.active = false;
      } else if (typeof this.targetValue !== 'string' || !gm.roles.includes(this.targetValue)) {
        this.active = false;
      } else {
        await gm.removeRole(this.targetValue);
        logCustom('ADMIN', 'TEMPROLE_EXPIRED', new Map([['USERTAG', getMemberTag(gm)], ['ROLE_MENTION', `<@&${this.targetValue}>`]]));
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
export class TrackedMessage {
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
      // TODO: make this const type === 20 a const enum lol
      if (message.webhookId !== null || (message.application && message.type === 20)) {
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
  await checkPrunes();
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
      await actionPool.editPools<Action>(actsClear.map((val) => val.id), () => null);
    }
  } catch (e) {
    utils.logError(e);
  }
}

export async function addAction(target: discord.Guild | discord.GuildChannel | discord.GuildMember, actor: discord.GuildMember | discord.User | string | null, type: ActionType, expires: string | undefined = '', previousValue: any = undefined, targetValue: any = undefined, reason = '') {
  if (expires === '' || expires === undefined) {
    return;
  }
  if (actor === null) {
    actor = discord.getBotId();
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
export async function saveMessage(msg: discord.GuildMemberMessage, forceBot = false) {
  if (!isThisEnabled()) {
    return false;
  }
  const checkExists = await adminPool.exists(msg.id);
  if (checkExists) {
    return false;
  }
  const newobj = new TrackedMessage(msg);
  if (forceBot) {
    newobj.bot = true;
  }
  const _res = await adminPool.saveToPool(newobj);
  return _res;
}
export async function getRoleIdByText(txt: string): Promise<string | null> {
  txt = txt.toLowerCase();
  // check full matches first in config
  for (const key in config.modules.admin.roleAliases) {
    const obj = config.modules.admin.roleAliases[key];
    if (typeof obj !== 'string') {
      continue;
    }
    if (key === txt || obj.toLowerCase() === txt) {
      return key;
    }
  }
  // check partial matches now
  for (const key in config.modules.admin.roleAliases) {
    const obj = config.modules.admin.roleAliases[key];
    if (typeof obj !== 'string') {
      continue;
    }
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
    const toRemove = ['<', '>', '&', '@'];
    const _testMention = txt.split('').filter((v) => !toRemove.includes(v)).join('');
    if (roles[key].id === _testMention) {
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
  if (actor === null && targetId === discord.getBotId()) {
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
  const isGuildOwner = guild.ownerId === actor.user.id;
  if (!isOverride && !isGuildOwner && targetId === discord.getBotId()) {
    return i18n.modules.admin.no_target_bot;
  }
  const me = await guild.getMember(discord.getBotId());
  const amIOwner = guild.ownerId === me.user.id;
  // check bot can actually do it
  if (!amIOwner && actionType === ActionType.CLEAN && !channel.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
    return i18n.modules.admin.bot_cant_manage_messages;
  }
  if (!amIOwner && (actionType === ActionType.ROLE || actionType === ActionType.TEMPROLE) && !me.can(discord.Permissions.MANAGE_ROLES)) {
    return i18n.modules.admin.bot_cant_manage_roles;
  }
  if (!amIOwner && actionType === ActionType.NICKNAME && !me.can(discord.Permissions.MANAGE_NICKNAMES)) {
    return i18n.modules.admin.bot_cant_manage_nicknames;
  }

  const highestRoleMe = await utils.getMemberHighestRole(me);

  const highestRoleTarget = target instanceof discord.GuildMember ? await utils.getMemberHighestRole(target) : null;

  if (!amIOwner && target instanceof discord.GuildMember && highestRoleTarget instanceof discord.Role && actionType === ActionType.NICKNAME) {
    if (target.user.id !== discord.getBotId() && highestRoleTarget.position >= highestRoleMe.position) {
      return i18n.modules.admin.bot_cant_manage_target;
    }
  }

  if (extraTarget instanceof discord.Role && (actionType === ActionType.TEMPROLE || actionType === ActionType.ROLE)) {
    if (!amIOwner && extraTarget.position >= highestRoleMe.position) {
      return i18n.modules.admin.bot_cant_manage_role;
    }
    if (actor !== null && !isOverride && !isGuildOwner) {
      const highestRoleActor = await utils.getMemberHighestRole(actor);
      if (extraTarget.position >= highestRoleActor.position) {
        return i18n.modules.admin.actor_cant_assign_role_hierarchy;
      }
    }
  }
  // check levels and discord perms
  if (config.modules.infractions && config.modules.infractions.targeting && !isOverride && !isGuildOwner) {
    const checkLevels = typeof config.modules.infractions.targeting.checkLevels === 'boolean' ? config.modules.infractions.targeting.checkLevels : true;
    const checkRoles = typeof config.modules.infractions.targeting.checkRoles === 'boolean' ? config.modules.infractions.targeting.checkRoles : true;
    const requireExtraPerms: infractions.reqDiscordPerms = typeof config.modules.infractions.targeting.reqDiscordPermissions === 'boolean' || typeof config.modules.infractions.targeting.reqDiscordPermissions === 'object' ? config.modules.infractions.targeting.reqDiscordPermissions : true;
    const allowSelf = typeof config.modules.infractions.targeting.allowSelf === 'boolean' ? config.modules.infractions.targeting.allowSelf : true;
    if (actionType === ActionType.CLEAN && (!channel.canMember(actor, discord.Permissions.READ_MESSAGES) || !channel.canMember(actor, discord.Permissions.SEND_MESSAGES))) {
      return i18n.modules.admin.actor_cant_view_channel;
    }
    if (requireExtraPerms === true) {
      if ((actionType === ActionType.ROLE || actionType === ActionType.TEMPROLE) && !actor.can(discord.Permissions.MANAGE_ROLES)) {
        return i18n.modules.admin.actor_cant_manage_roles;
      } if (actionType === ActionType.NICKNAME && !actor.can(discord.Permissions.MANAGE_NICKNAMES)) {
        return i18n.modules.admin.actor_cant_manage_nicknames;
      }
      if (actionType === ActionType.CLEAN && !channel.canMember(actor, discord.Permissions.MANAGE_MESSAGES)) {
        return i18n.modules.admin.actor_cant_manage_messages;
      }
    } else if (typeof requireExtraPerms === 'object') {
      if (requireExtraPerms.MANAGE_ROLES && (actionType === ActionType.ROLE || actionType === ActionType.TEMPROLE) && !actor.can(discord.Permissions.MANAGE_ROLES)) {
        return i18n.modules.admin.actor_cant_manage_roles;
      }
      if (requireExtraPerms.MANAGE_NICKNAMES && actionType === ActionType.NICKNAME && !actor.can(discord.Permissions.MANAGE_NICKNAMES)) {
        return i18n.modules.admin.actor_cant_manage_nicknames;
      }
      if (requireExtraPerms.MANAGE_MESSAGES && actionType === ActionType.CLEAN && !channel.canMember(actor, discord.Permissions.MANAGE_MESSAGES)) {
        return i18n.modules.admin.actor_cant_manage_messages;
      }
    }
    if (actor.user.id === targetId) {
      if (!allowSelf) {
        return i18n.modules.admin.actor_cant_target_self;
      }
      return true;
    }
    if (checkLevels === true && target instanceof discord.GuildMember) {
      const actorLevel = utils.getUserAuth(actor);
      const targetLevel = utils.getUserAuth(target);
      if (actorLevel <= targetLevel) {
        return setPlaceholders(i18n.modules.admin.actor_cant_target_level, ['level', targetLevel.toString()]);
      }
    }
    if (checkRoles === true) {
      const highestActor = await utils.getMemberHighestRole(actor);
      if (highestRoleTarget instanceof discord.Role && highestActor.position <= highestRoleTarget.position) {
        return i18n.modules.admin.actor_cant_target_roles;
      }
    }
  }
  if (isTargetAdmin === true && !isOverride && actor.user.id !== targetId) {
    if (!isGuildOwner) {
      return i18n.modules.admin.actor_cant_target_globaladmin;
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
    return i18n.modules.admin.cant_manage_channel;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (!(channel instanceof discord.GuildTextChannel)) {
    return i18n.modules.admin.invalid_channel;
  }
  if (channel.rateLimitPerUser === seconds) {
    return i18n.modules.admin.adm_slowmode.channel_already_slowmode;
  }
  const oldValue = channel.rateLimitPerUser;
  await channel.edit({ rateLimitPerUser: seconds });
  const exp = duration > 0 ? utils.composeSnowflake(Date.now() + duration) : undefined;
  if (seconds > 0 && duration > 0) {
    await addAction(channel, actor, ActionType.SLOWMODE, exp, oldValue, undefined, reason);
  }
  const placeholders = new Map([['ACTORTAG', i18n.ranks.system], ['SECONDS', seconds.toString()], ['CHANNEL_ID', channel.id], ['DURATION', duration > 0 ? ` for ${utils.getLongAgoFormat(duration, 2, false, i18n.time_units.ti_full.singular.second)}` : ''], ['REASON', '']]);
  if (actor !== null) {
    placeholders.set('ACTORTAG', getActorTag(actor));
    placeholders.set('ACTOR_ID', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('REASON', setPlaceholders(i18n.modules.admin.reason, ['reason', utils.escapeString(reason, true)]));
  }
  logCustom('ADMIN', 'SLOWMODE', placeholders);
  if (channel.canMember(me, discord.Permissions.SEND_MESSAGES)) {
    const txt = `${setPlaceholders(seconds > 0 ? i18n.modules.admin.adm_slowmode.slowmode_enabled : i18n.modules.admin.adm_slowmode.slowmode_disabled, ['seconds', seconds.toString(), 'actor_tag', placeholders.get('ACTORTAG')])}${duration > 0 ? setPlaceholders(i18n.modules.admin.for_time, ['time', utils.getLongAgoFormat(duration, 2, false, i18n.time_units.ti_full.singular.second)]) : ''}${reason.length > 0 ? setPlaceholders(i18n.modules.admin.reason, ['reason', utils.escapeString(reason, true)]) : ''}`;
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
    return i18n.modules.admin.cant_manage_channel;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (!(channel instanceof discord.GuildTextChannel) && !(channel instanceof discord.GuildNewsChannel)) {
    return i18n.modules.admin.invalid_channel;
  }
  const defaultOw = channel.permissionOverwrites.find((ow) => ow.id === guild.id);
  if (!defaultOw) {
    return false;
  }
  const perms = new utils.Permissions(defaultOw.deny);
  if (perms.has('SEND_MESSAGES', false) && state === true) {
    return i18n.modules.admin.adm_lock_channel.already_locked;
  } if (!perms.has('SEND_MESSAGES', false) && !state) {
    return i18n.modules.admin.adm_lock_channel.not_locked;
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
  const placeholders = new Map([['ACTORTAG', i18n.ranks.system], ['DURATION', duration > 0 ? ` for ${utils.getLongAgoFormat(duration, 2, false, i18n.time_units.ti_full.singular.second)}` : ''], ['CHANNEL_ID', channel.id], ['REASON', '']]);
  let type = 'LOCKED_CHANNEL';
  if (state === false) {
    type = 'UNLOCKED_CHANNEL';
  }

  if (actor !== null) {
    placeholders.set('ACTORTAG', getActorTag(actor));
    placeholders.set('ACTOR_ID', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('REASON', setPlaceholders(i18n.modules.admin.reason, ['reason', utils.escapeString(reason, true)]));
  }
  logCustom('ADMIN', type, placeholders);
  if (channel.canMember(me, discord.Permissions.SEND_MESSAGES)) {
    const txt = `${setPlaceholders(state === true ? i18n.modules.admin.adm_lock_channel.locked : i18n.modules.admin.adm_lock_channel.unlocked, ['actor_tag', placeholders.get('ACTORTAG')])}${duration > 0 ? setPlaceholders(i18n.modules.admin.for_time, ['time', utils.getLongAgoFormat(duration, 2, false, i18n.time_units.ti_full.singular.second)]) : ''}${reason.length > 0 ? setPlaceholders(i18n.modules.admin.reason, ['reason', utils.escapeString(reason, true)]) : ''}`;
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
    return i18n.modules.admin.bot_cant_manage_roles;
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
      return setPlaceholders(i18n.modules.admin.adm_lock_guild.cant_edit_role, ['role_mention', defaultRole.toMention()]);
    }
  }
  const perms = new utils.Permissions(defaultRole.permissions);
  if (!perms.has('SEND_MESSAGES', false) && state === true) {
    return i18n.modules.admin.adm_lock_guild.already_locked;
  } if (perms.has('SEND_MESSAGES', false) && !state) {
    return i18n.modules.admin.adm_lock_guild.not_locked;
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
  const placeholders = new Map([['ACTORTAG', i18n.ranks.system], ['DURATION', duration > 0 ? ` for ${utils.getLongAgoFormat(duration, 2, false, i18n.time_units.ti_full.singular.second)}` : ''], ['REASON', '']]);
  let type = 'LOCKED_GUILD';
  if (state === false) {
    type = 'UNLOCKED_GUILD';
  }
  if (actor !== null) {
    placeholders.set('ACTORTAG', getActorTag(actor));
    placeholders.set('ACTOR_ID', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('REASON', setPlaceholders(i18n.modules.admin.reason, ['reason', utils.escapeString(reason, true)]));
  }
  logCustom('ADMIN', type, placeholders);
  return true;
}

export async function TempRole(actor: discord.GuildMember | null, target: discord.GuildMember, role: string | discord.Role, duration: number, reason = ''): Promise<string | boolean> {
  const guild = await discord.getGuild(guildId);
  if (guild === null) {
    return false;
  }
  if (duration === 0) {
    return i18n.modules.admin.invalid_duration;
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }

  if (!(role instanceof discord.Role)) {
    const rlId = await getRoleIdByText(role);
    if (rlId === null) {
      return i18n.modules.admin.unknown_role;
    }
    role = await guild.getRole(rlId);
    if (!(role instanceof discord.Role)) {
      return setPlaceholders(i18n.modules.admin.role_inexistent, ['role_id', rlId]);
    }
  }
  const canT = await canTarget(actor, target, undefined, role, ActionType.TEMPROLE);
  if (canT !== true) {
    return canT;
  }
  if (target.roles.includes(role.id)) {
    return i18n.modules.admin.already_has_role;
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
  const placeholders = new Map([['ROLE_MENTION', role.toMention()], ['USERTAG', getMemberTag(target)], ['ACTORTAG', i18n.ranks.system], ['DURATION', duration > 0 ? `${utils.getLongAgoFormat(duration, 2, false, i18n.time_units.ti_full.singular.second)}` : ''], ['REASON', '']]);
  if (actor !== null) {
    placeholders.set('ACTORTAG', getActorTag(actor));
    placeholders.set('ACTOR_ID', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('REASON', setPlaceholders(i18n.modules.admin.reason, ['reason', utils.escapeString(reason, true)]));
  }
  logCustom('ADMIN', 'TEMPROLE', placeholders);
  return true;
}

export async function Role(actor: discord.GuildMember | null, target: discord.GuildMember, roleTxt: string | discord.Role, state: boolean, reason = ''): Promise<string | boolean> {
  const guild = await discord.getGuild(guildId);
  if (guild === null) {
    return false;
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }
  if (!(roleTxt instanceof discord.Role)) {
    const rlId = await getRoleIdByText(roleTxt);
    if (rlId === null) {
      return i18n.modules.admin.unknown_role;
    }
    roleTxt = await guild.getRole(rlId);
    if (!(roleTxt instanceof discord.Role)) {
      return setPlaceholders(i18n.modules.admin.role_inexistent, ['role_id', rlId]);
    }
  }
  const canT = await canTarget(actor, target, undefined, roleTxt, ActionType.ROLE);
  if (canT !== true) {
    return canT;
  }
  if (target.roles.includes(roleTxt.id) && state === true) {
    return i18n.modules.admin.already_has_role;
  } if (!target.roles.includes(roleTxt.id) && !state) {
    return i18n.modules.admin.already_doesnt_have_role;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }

  if (state === true) {
    await target.addRole(roleTxt.id);
  } else {
    await target.removeRole(roleTxt.id);
  }
  const placeholders = new Map([['ROLE_MENTION', roleTxt.toMention()], ['USERTAG', getMemberTag(target)], ['ACTORTAG', i18n.ranks.system], ['REASON', '']]);
  if (actor !== null) {
    placeholders.set('ACTORTAG', getActorTag(actor));
    placeholders.set('ACTOR_ID', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('REASON', setPlaceholders(i18n.modules.admin.reason, ['reason', utils.escapeString(reason, true)]));
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
    return i18n.modules.admin.adm_nick.already_has_nick;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  await target.edit({ nick: newNick });

  const placeholders = new Map([['NEW_NICK', newNick === null ? 'None' : utils.escapeString(newNick)], ['USERTAG', getMemberTag(target)], ['ACTORTAG', i18n.ranks.system], ['REASON', '']]);
  if (actor !== null) {
    placeholders.set('ACTORTAG', getActorTag(actor));
    placeholders.set('ACTOR_ID', actor.user.id);
  }
  if (reason.length > 0) {
    placeholders.set('REASON', setPlaceholders(i18n.modules.admin.reason, ['reason', utils.escapeString(reason, true)]));
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
  if (count > MAX_COMMAND_CLEAN) {
    return i18n.modules.admin.adm_clean.too_many_msgs;
  }
  const canT = await canTarget(actor, target, channel, undefined, ActionType.CLEAN);
  if (canT !== true) {
    return canT;
  }

  if (cleaning === true && !bypassCleaning) {
    return i18n.modules.admin.adm_clean.already_cleaning;
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
    promises.push(new Promise(async (resolve?, reject?): Promise<void> => {
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
        resolve(null);
        return;
      }
      const channelThis: discord.GuildTextChannel | discord.GuildNewsChannel = channeltest;
      if (!channelThis.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
        resolve(null);
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
      resolve(null);
    }));
  }
  await Promise.all(promises);
  cleaning = false;
  if (deleted.length > 0) {
    const _placeholders = new Map([['MESSAGES', deleted.length.toString()], ['ACTORTAG', i18n.ranks.system], ['CHANNEL', ''], ['USERTAG', '']]);
    if (actor !== null) {
      _placeholders.set('ACTORTAG', getActorTag(actor));
      _placeholders.set('ACTOR_ID', actor.user.id);
    }
    if (typeof channelTarget === 'string') {
      _placeholders.set('CHANNEL', setPlaceholders(i18n.modules.admin.adm_clean.in_channel, ['channel_mention', `<#${channelTarget}>`]));
    }
    if (typeof memberId === 'string') {
      _placeholders.set('USERTAG', setPlaceholders(i18n.modules.admin.adm_clean.from_user, ['user_tag', getUserTag(target)]));
      _placeholders.set('USER_ID', memberId);
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
  if (!(message.member instanceof discord.GuildMember)) {
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
  adminPool.editPools<TrackedMessage>(messages.ids, (val) => {
    if (val === null) {
      return null;
    }
    if (messages.ids.includes(val.id)) {
      return null;
    }
    return val;
  });
}

const roleLockKv = new pylon.KVNamespace('roleLock');
export async function AL_OnGuildRoleUpdate(
  id: string,
  gid: string,
  log: discord.AuditLogEntry.AnyAction,
  role: discord.Role,
  oldRole: discord.Role,
) {
  if (oldRole === null || !Array.isArray(config.modules.admin.lockedRoles)) {
    return;
  }
  if (!config.modules.admin.lockedRoles.includes(role.id)) {
    return;
  }
  if (log instanceof discord.AuditLogEntry && log.userId === discord.getBotId()) {
    return;
  }
  if (!(log instanceof discord.AuditLogEntry)) {
    return;
  } // yikes
  if (role.guildId === undefined) {
    const nr = JSON.parse(JSON.stringify(role));
    nr.guildId = guildId;
    role = utils.makeFake(nr, discord.Role);
  }
  if (role.name !== oldRole.name || role.permissions !== oldRole.permissions || role.hoist !== oldRole.hoist || role.color !== oldRole.color || role.mentionable !== oldRole.mentionable) {
    const kvc = await roleLockKv.get(role.id);
    if (typeof kvc !== 'boolean') {
      await role.edit({
        permissions: role.permissions !== oldRole.permissions ? oldRole.permissions : undefined,
        hoist: role.hoist !== oldRole.hoist ? oldRole.hoist : undefined,
        color: role.color !== oldRole.color ? oldRole.color : undefined,
        name: role.name !== oldRole.name ? oldRole.name : undefined,
        mentionable: role.mentionable !== oldRole.mentionable ? oldRole.mentionable : undefined,
      });
    }
  }
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
  const ows = await kvOverrides.get('channels');
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
let storeDataTm;
let lastStoreDate = Date.now();
function startStoreChannelData() {
  if (!storeDataTm || (Date.now() - lastStoreDate) > 1000 * 60) {
    storeDataTm = setTimeout(async () => {
      await storeChannelData();
    }, 3000);
    lastStoreDate = Date.now();
  }
}
export async function storeChannelData() {
  lastStoreDate = Date.now();
  const guild = await discord.getGuild();
  const channels = await guild.getChannels();
  const userOverrides: any = {};
  await Promise.all(channels.map(async (ch) => {
    const _dt = [];
    let isSync = false;
    if (ch.parentId && ch.parentId !== null) {
      let parent;
      try {
        parent = await discord.getGuildCategory(ch.parentId);
      } catch (_) {
      }
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
    // @ts-ignore
    const usrs = ch.permissionOverwrites.filter((ov) => ov.type == 1);
    if (usrs.length > 0) {
      usrs.forEach((ov) => {
        const newobj: any = { id: ov.id };

        if (ov.allow != 0) {
          newobj.allow = ov.allow;
        }
        if (ov.deny != 0) {
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
    await kvOverrides.put('channels', userOverrides);
  }
  storeDataTm = null;
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
  logCustom('PERSIST', 'SAVED', new Map([['USERTAG', getMemberTag(member)], ['USER_ID', member.user.id], ['USER', member.user]]));
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
  logCustom('PERSIST', 'RESTORED', new Map([['USERTAG', getMemberTag(member)], ['USER_ID', member.user.id], ['USER', member.user]]));
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
  startStoreChannelData();
}
export async function OnChannelDelete(
  id: string,
  gid: string,
  channel: discord.GuildChannel,
) {
  if (!config.modules.admin.persist || typeof config.modules.admin.persist !== 'object' || config.modules.admin.persist.enabled !== true) {
    return;
  }
  startStoreChannelData();
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
    startStoreChannelData();
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
    startStoreChannelData();
  }
}

async function checkPrunes() {
  if (!config) {
    return;
  }
  if (!config.modules.admin.autoPrune || typeof config.modules.admin.autoPrune !== 'object' || !config.modules.admin.autoPrune.enabled || !config.modules.admin.autoPrune.channels) {
    return;
  }
  const now = Date.now();
  for (const chId in config.modules.admin.autoPrune.channels) {
    const duration = utils.timeArgumentToMs(config.modules.admin.autoPrune.channels[chId]);
    if (duration < 1000 * 10 || duration > 1000 * 60 * 60 * 24 * 7) {
      continue;
    }
    const channel = await discord.getChannel(chId);
    if (!(channel instanceof discord.GuildTextChannel) && !(channel instanceof discord.GuildTextChannel)) {
      continue;
    }
    const tsDiff = now - duration;
    const messages = await adminPool.getByQuery<TrackedMessage>({ channelId: chId });
    const toDel = messages.filter((v) => v.ts < tsDiff);
    const ids = toDel.map((v) => v.id);
    if (toDel.length === 0) {
      continue;
    }
    if (toDel.length === 1) {
      const msg = await channel.getMessage(toDel[0].id);
      await msg.delete();
    } else if (toDel.length <= 100) {
      await channel.bulkDeleteMessages(ids);
    } else {
      const splits = utils.chunkArrayInGroups(ids, 99);
      await Promise.all(splits.map(async (newmids) => {
        await channel.bulkDeleteMessages(newmids);
      }));
    }
    await adminPool.editPools(ids, () => null);
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
    const placeholders = new Map([['USERTAG', getMemberTag(memNew)], ['USER_ID', reaction.userId], ['CHANNEL_ID', reaction.channelId], ['MESSAGE_ID', reaction.messageId], ['EMOJI', reaction.emoji.toMention()], ['ROLE_ID', found.role]]);
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

export function cleanCommands(subCommandGroup: discord.command.CommandGroup) {
  registerChatOn(
    subCommandGroup,
    'user',
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
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_clean.failed_clean);
        } else if (typeof res === 'string') {
          await infractions.confirmResult(undefined, msg, false, res);
        }
      } else if (res > 0) {
        await infractions.confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.admin.adm_clean.cleaned_messages_user, ['count', res.toString(), 'user_mention', user.getTag()]));
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_clean.no_messages_cleaned);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.clean.user',
        level: Ranks.Moderator,
      },
    },
  );
  registerChatOn(
    subCommandGroup,
    'channel',
    (ctx) => ({ channel: ctx.guildTextChannel(), count: ctx.integerOptional({ maxValue: MAX_COMMAND_CLEAN, minValue: 1, default: DEFAULT_COMMAND_CLEAN }) }),
    async (msg, { channel, count }) => {
      // const msgs = await getMessagesBy({authorId: user.id});
      const res = await Clean(utils.decomposeSnowflake(msg.id).timestamp, {}, msg.member, channel, count, channel.id);
      if (typeof res !== 'number') {
        if (res === false) {
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_clean.failed_clean);
        } else if (typeof res === 'string') {
          await infractions.confirmResult(undefined, msg, false, res);
        }
      } else if (res > 0) {
        await infractions.confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.admin.adm_clean.cleaned_messages_channel, ['count', res.toString(), 'channel_mention', channel.toMention()]));
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_clean.no_messages_cleaned);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.clean.channel',
        level: Ranks.Moderator,
      },
    },
  );
  registerChatOn(
    subCommandGroup,
    'here',
    (ctx) => ({ count: ctx.integerOptional({ maxValue: MAX_COMMAND_CLEAN, minValue: 1, default: DEFAULT_COMMAND_CLEAN }) }),
    async (msg, { count }) => {
      // const msgs = await getMessagesBy({authorId: user.id});
      const chan = await msg.getChannel();
      const res = await Clean(utils.decomposeSnowflake(msg.id).timestamp, {}, msg.member, chan, count, msg.channelId);
      if (typeof res !== 'number') {
        if (res === false) {
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_clean.failed_clean);
        } else if (typeof res === 'string') {
          await infractions.confirmResult(undefined, msg, false, res);
        }
      } else if (res > 0) {
        await infractions.confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.admin.adm_clean.cleaned_messages_channel, ['count', res.toString(), 'channel_mention', `<#${msg.channelId}>`]));
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_clean.no_messages_cleaned);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.clean.here',
        level: Ranks.Moderator,
      },
    },
  );
  registerChatOn(
    subCommandGroup,
    'all',
    (ctx) => ({ count: ctx.integerOptional({ maxValue: MAX_COMMAND_CLEAN, minValue: 1, default: DEFAULT_COMMAND_CLEAN }) }),
    async (msg, { count }) => {
      // const msgs = await getMessagesBy({authorId: user.id});
      const chan = await msg.getChannel();
      const res = await Clean(utils.decomposeSnowflake(msg.id).timestamp, {}, msg.member, chan, count);
      if (typeof res !== 'number') {
        if (res === false) {
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_clean.failed_clean);
        } else if (typeof res === 'string') {
          await infractions.confirmResult(undefined, msg, false, res);
        }
      } else if (res > 0) {
        await infractions.confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.admin.adm_clean.cleaned_messages_all, ['count', res.toString()]));
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_clean.no_messages_cleaned);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.clean.all',
        level: Ranks.Administrator,
      },
    },
  );
  registerChatOn(
    subCommandGroup,
    'bots',
    (ctx) => ({ count: ctx.integerOptional({ maxValue: MAX_COMMAND_CLEAN, minValue: 1, default: DEFAULT_COMMAND_CLEAN }) }),
    async (msg, { count }) => {
      const chan = await msg.getChannel();
      const res = await Clean(utils.decomposeSnowflake(msg.id).timestamp, { bot: true }, msg.member, chan, count, msg.channelId);
      if (typeof res !== 'number') {
        if (res === false) {
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_clean.failed_clean);
        } else if (typeof res === 'string') {
          await infractions.confirmResult(undefined, msg, false, res);
        }
      } else if (res > 0) {
        await infractions.confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.admin.adm_clean.cleaned_messages_bots, ['count', res.toString()]));
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_clean.no_messages_cleaned);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.clean.bots',
        level: Ranks.Moderator,
      },
    },
  );
}

export function InitializeCommands() {
  const _groupOptions = {
    description: 'Admin Commands',
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  registerChatSubCallback(cmdGroup, 'clean', cleanCommands);
  registerChatSubCallback(cmdGroup, 'clear', cleanCommands);
  registerChatSubCallback(cmdGroup, 'invites', (subCommandGroup) => {
    registerChatOn(
      subCommandGroup,
      'prune',
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
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_inv_prune.no_invites);
        } else {
          await infractions.confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.admin.adm_inv_prune.pruned, ['count', cleared.toString()]));
        }
      },
      {
        permissions: {
          overrideableInfo: 'admin.invites.prune',
          level: Ranks.Administrator,
        },
      },
    );
  });
  registerChatSubCallback(cmdGroup, 'role', (subCommandGroup) => {
    registerChatOn(
      subCommandGroup,
      'unlock',
      (ctx) => ({ roleText: ctx.text() }),
      async (msg, { roleText }) => {
        if (!Array.isArray(config.modules.admin.lockedRoles) || config.modules.admin.lockedRoles.length === 0) {
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.no_locked_roles);
          return;
        }
        const roleId = await getRoleIdByText(roleText);
        const guildRole = await (await msg.getGuild()).getRole(roleId);
        if (guildRole === null) {
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.could_not_find_role);
          return;
        }
        if (!config.modules.admin.lockedRoles.includes(guildRole.id)) {
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_role_unlock.not_locked);
          return;
        }
        const kvc = await roleLockKv.get(guildRole.id);
        if (typeof kvc === 'boolean') {
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_role_unlock.already_unlocked);
          return;
        }
        await roleLockKv.put(guildRole.id, true, { ttl: 1000 * 60 * 5 });
        await infractions.confirmResult(undefined, msg, true, i18n.modules.admin.adm_role_unlock.unlocked);
      },
      {
        permissions: {
          overrideableInfo: 'admin.role.unlock',
          level: Ranks.Administrator,
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      { name: 'add', aliases: ['give', 'grant'] },
      (ctx) => ({ member: ctx.guildMember(), roleText: ctx.text() }),
      async (msg, { member, roleText }) => {
        const res = await Role(msg.member, member, roleText, true);
        if (typeof res === 'string') {
          await infractions.confirmResult(undefined, msg, false, res);
          return;
        }
        if (res === true) {
          const rlid = await getRoleIdByText(roleText);
          await infractions.confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.admin.adm_role_add.added_role, ['role_mention', `<@&${rlid}>`, 'user_mention', member.user.toMention()]));
        } else {
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_role_add.failed_add);
        }
      },
      {
        permissions: {
          overrideableInfo: 'admin.role.add',
          level: Ranks.Administrator,
        },
      },
    );

    registerChatOn(
      subCommandGroup,
      { name: 'remove', aliases: ['rm', 'take'] },
      (ctx) => ({ member: ctx.guildMember(), roleText: ctx.text() }),
      async (msg, { member, roleText }) => {
        const res = await Role(msg.member, member, roleText, false);
        if (typeof res === 'string') {
          await infractions.confirmResult(undefined, msg, false, res);
          return;
        }
        if (res === true) {
          const rlid = await getRoleIdByText(roleText);
          await infractions.confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.admin.adm_role_remove.removed_role, ['role_mention', `<@&${rlid}>`, 'user_mention', member.user.toMention()]));
        } else {
          await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_role_remove.failed_remove);
        }
      },
      {
        permissions: {
          overrideableInfo: 'admin.role.remove',
          level: Ranks.Administrator,
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      { name: 'all', aliases: ['spray'] },
      (ctx) => ({ role: ctx.text() }),
      async (msg, { role }) => {
        const rlid = await getRoleIdByText(role);
        if (rlid === null) {
          const res: any = await msg.inlineReply(i18n.modules.admin.role_inexistent);
          saveMessage(res);
          return;
        }
        const guild = await msg.getGuild();
        const roles = await guild.getRoles();
        const me = await guild.getMember(discord.getBotId());
        if (me === null) {
          return;
        }
        const thisRole = roles.find((val) => val.id === rlid);
        if (!thisRole) {
          const res: any = await msg.inlineReply(i18n.modules.admin.role_inexistent);
          saveMessage(res);
          return;
        }
        const myHighest = await utils.getMemberHighestRole(me);
        if (myHighest.position <= thisRole.position || !me.can(discord.Permissions.MANAGE_ROLES)) {
          const res: any = await msg.inlineReply(i18n.modules.admin.bot_cant_manage_role);
          saveMessage(res);
          return;
        }
        const itemsAll = await roleAllKv.items();
        const itemsNuke = await roleNukeKv.items();
        if (itemsAll.length > 0 || itemsNuke.length > 0) {
          const res: any = await msg.inlineReply(i18n.modules.admin.role_spread_in_progress);
          saveMessage(res);
          return;
        }
        await roleAllKv.put(utils.composeSnowflake(), thisRole.id);

        checkRoleAll();
        const res: any = await msg.inlineReply({ content: setPlaceholders(i18n.modules.admin.adm_nuke_all, ['role_mention', thisRole.toMention()]), allowedMentions: {} });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'admin.role.all',
          level: Ranks.Administrator,
        },
      },
    );

    registerChatOn(
      subCommandGroup,
      { name: 'nuke', aliases: ['removeall'] },
      (ctx) => ({ role: ctx.text() }),
      async (msg, { role }) => {
        const rlid = await getRoleIdByText(role);
        if (rlid === null) {
          const res: any = await msg.inlineReply(i18n.modules.admin.role_inexistent);
          saveMessage(res);
          return;
        }
        const guild = await msg.getGuild();
        const roles = await guild.getRoles();
        const me = await guild.getMember(discord.getBotId());
        if (me === null) {
          return;
        }
        const thisRole = roles.find((val) => val.id === rlid);
        if (!thisRole) {
          const res: any = await msg.inlineReply(i18n.modules.admin.role_inexistent);
          saveMessage(res);
          return;
        }
        const myHighest = await utils.getMemberHighestRole(me);
        if (myHighest.position <= thisRole.position || !me.can(discord.Permissions.MANAGE_ROLES)) {
          const res: any = await msg.inlineReply(i18n.modules.admin.bot_cant_manage_role);
          saveMessage(res);
          return;
        }
        const itemsAll = await roleAllKv.items();
        const itemsNuke = await roleNukeKv.items();
        if (itemsAll.length > 0 || itemsNuke.length > 0) {
          const res: any = await msg.inlineReply(i18n.modules.admin.role_spread_in_progress);
          saveMessage(res);
          return;
        }
        await roleNukeKv.put(utils.composeSnowflake(), thisRole.id);

        checkRoleAll();
        const res: any = await msg.inlineReply({ content: setPlaceholders(i18n.modules.admin.adm_role_all, ['role_mention', thisRole.toMention()]), allowedMentions: {} });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'admin.role.nuke',
          level: Ranks.Administrator,
        },
      },
    );

    registerChatOn(
      subCommandGroup,
      'join',
      (ctx) => ({ roleName: ctx.text() }),
      async (msg, { roleName }) => {
        const res: any = await msg.inlineReply(async () => {
          if (typeof config.modules.admin.groupRoles !== 'object' || Object.keys(config.modules.admin.groupRoles).length === 0) {
            return { content: i18n.modules.admin.group_roles_disabled };
          }
          const thisRole = utils.objectFlip(config.modules.admin.groupRoles)[roleName.toLowerCase()];
          if (!thisRole) {
            return { content: i18n.modules.admin.role_inexistent };
          }
          if (typeof thisRole !== 'string' || thisRole.length < 5) {
            return { content: i18n.modules.admin.role_incorrectly_configured };
          }
          const guildRole = await (await msg.getGuild()).getRole(thisRole);
          if (guildRole === null) {
            return { content: i18n.modules.admin.role_inexistent };
          }
          if (msg.member.roles.includes(guildRole.id)) {
            return { content: i18n.modules.admin.group_already_has_role };
          }
          let perms = new utils.Permissions(guildRole.permissions).serialize(true);
          for (const key in perms) {
            if (perms[key] === false) {
              delete perms[key];
            }
          }
          perms = Object.keys(perms);
          const staffPerms = ['ADMINISTRATOR', 'KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_CHANNELS', 'MANAGE_GUILD', 'MANAGE_MESSAGES', 'MENTION_EVERYONE', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MANAGE_NICKNAMES', 'MANAGE_ROLES', 'MANAGE_EMOJIS', 'MANAGE_WEBHOOKS', 'MOVE_MEMBERS'];
          const noStaff = perms.every((p) => !staffPerms.includes(p));
          if (!noStaff) {
            return { content: i18n.modules.admin.group_has_staff_perms };
          }
          await msg.member.addRole(guildRole.id);
          return { allowedMentions: {}, content: setPlaceholders(i18n.modules.admin.group_joined, ['role_mention', guildRole.toMention()]) };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'admin.role.join',
          level: Ranks.Guest,
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'leave',
      (ctx) => ({ roleName: ctx.text() }),
      async (msg, { roleName }) => {
        const res: any = await msg.inlineReply(async () => {
          if (typeof config.modules.admin.groupRoles !== 'object' || Object.keys(config.modules.admin.groupRoles).length === 0) {
            return { content: i18n.modules.admin.group_roles_disabled };
          }
          const thisRole = utils.objectFlip(config.modules.admin.groupRoles)[roleName.toLowerCase()];
          if (!thisRole) {
            return { content: i18n.modules.admin.role_inexistent };
          }
          if (typeof thisRole !== 'string' || thisRole.length < 5) {
            return { content: i18n.modules.admin.role_incorrectly_configured };
          }
          const guildRole = await (await msg.getGuild()).getRole(thisRole);
          if (guildRole === null) {
            return { content: i18n.modules.admin.role_inexistent };
          }
          if (!msg.member.roles.includes(guildRole.id)) {
            return { content: i18n.modules.admin.group_doesnt_have_role };
          }
          await msg.member.removeRole(guildRole.id);
          return { allowedMentions: {}, content: setPlaceholders(i18n.modules.admin.group_left, ['role_mention', guildRole.toMention()]) };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'admin.role.leave',
          level: Ranks.Guest,
        },
      },
    );
  });
  registerChatOn(
    cmdGroup,
    { name: 'nickname', aliases: ['nick'] },
    (ctx) => ({ member: ctx.guildMember(), nickname: ctx.textOptional() }),
    async (msg, { member, nickname }) => {
      const res = await Nick(msg.member, member, nickname);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.admin.set_nickname, ['user_mention', member.user.getTag(), 'new_nick', nickname === null ? i18n.modules.admin.adm_backup.none : utils.escapeString(nickname, true)]));
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.failed_nickname);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.nickname',
        level: Ranks.Moderator,
      },
    },
  );

  registerChatOn(
    cmdGroup,
    'temprole',
    (ctx) => ({ member: ctx.guildMember(), duration: ctx.string(), roleText: ctx.text() }),
    async (msg, { member, duration, roleText }) => {
      const dur = utils.timeArgumentToMs(duration);
      if (dur === 0) {
        const res: any = await msg.inlineReply(i18n.modules.admin.duration_malformed);
        saveMessage(res);
        return;
      }
      if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
        const res: any = await msg.inlineReply(i18n.modules.admin.exceeds_duration);
        saveMessage(res);
        return;
      }

      const res = await TempRole(msg.member, member, roleText, dur);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        const rlid = await getRoleIdByText(roleText);
        await infractions.confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.admin.temprole_added, ['role_mention', `<@&${rlid}>`, 'user_mention', member.toMention(), 'duration', utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second)]));
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_role_add.failed_add);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.temprole',
        level: Ranks.Administrator,
      },
    },
  );

  registerChatOn(
    cmdGroup,
    'cease',
    (ctx) => ({ duration: ctx.stringOptional(), channel: ctx.guildChannelOptional() }),
    async (msg, { channel, duration }) => {
      if (!channel) {
        channel = await msg.getChannel();
      }
      let dur = 0;
      if (duration !== null) {
        dur = utils.timeArgumentToMs(duration);
        if (dur === 0) {
          const res: any = await msg.inlineReply(i18n.modules.admin.duration_malformed);
          saveMessage(res);
          return;
        }
        if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
          const res: any = await msg.inlineReply(i18n.modules.admin.exceeds_duration);
          saveMessage(res);
          return;
        }
      }
      const res = await LockChannel(msg.member, channel, true, dur);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, `${i18n.modules.admin.adm_lock_channel.locked_cmd}${dur > 0 ? setPlaceholders(i18n.modules.admin.for_time, ['time', utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second)]) : ''}`);
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_lock_channel.locked_fail);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.cease',
        level: Ranks.Moderator,
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'uncease',
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
        await infractions.confirmResult(undefined, msg, true, i18n.modules.admin.adm_lock_channel.unlocked_cmd);
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_lock_channel.unlocked_fail);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.uncease',
        level: Ranks.Moderator,
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'slowmode',
    (ctx) => ({ seconds: ctx.integerOptional({ default: 0, minValue: 0, maxValue: 21600 }), duration: ctx.stringOptional(), channel: ctx.guildChannelOptional() }),
    async (msg, { seconds, duration, channel }) => {
      let dur = 0;
      if (duration !== null) {
        dur = utils.timeArgumentToMs(duration);
        if (dur === 0) {
          const res: any = await msg.inlineReply(i18n.modules.admin.duration_malformed);
          saveMessage(res);
          return;
        }
        if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
          const res: any = await msg.inlineReply(i18n.modules.admin.exceeds_duration);
          saveMessage(res);
          return;
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
        const txtDur = dur > 0 ? utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second) : '';
        await infractions.confirmResult(undefined, msg, true, `${setPlaceholders(i18n.modules.admin.adm_slowmode.slowmode_cmd, ['channel_mention', channel.toMention(), 'seconds', seconds.toString()])}${txtDur !== '' ? setPlaceholders(i18n.modules.admin.for_time, ['time', txtDur]) : ''}`);
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_slowmode.slowmode_failed);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.slowmode',
        level: Ranks.Moderator,
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'lockdown',
    (ctx) => ({ duration: ctx.stringOptional() }),
    async (msg, { duration }) => {
      let dur = 0;
      if (duration !== null) {
        dur = utils.timeArgumentToMs(duration);
        if (dur === 0) {
          const res: any = await msg.inlineReply(i18n.modules.admin.duration_malformed);
          saveMessage(res);
          return;
        }
        if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
          const res: any = await msg.inlineReply(i18n.modules.admin.exceeds_duration);
          saveMessage(res);
          return;
        }
      }
      const res = await LockGuild(msg.member, true, dur);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, `${i18n.modules.admin.adm_lock_guild.locked_cmd}${dur > 0 ? setPlaceholders(i18n.modules.admin.for_time, ['time', utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second)]) : ''}`);
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_lock_guild.failed_lock);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.lockdown',
        level: Ranks.Moderator,
      },
    },
  );
  registerChatRaw(
    cmdGroup,
    'unlockdown',
    async (msg) => {
      const res = await LockGuild(msg.member, false, 0);
      if (typeof res === 'string') {
        await infractions.confirmResult(undefined, msg, false, res);
        return;
      }
      if (res === true) {
        await infractions.confirmResult(undefined, msg, true, i18n.modules.admin.adm_lock_guild.unlocked_cmd);
      } else {
        await infractions.confirmResult(undefined, msg, false, i18n.modules.admin.adm_lock_guild.failed_unlock);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.unlockdown',
        level: Ranks.Moderator,
      },
    },
  );

  registerChatOn(
    cmdGroup,
    'roles',
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
        const res: any = await msg.inlineReply({ content: i18n.modules.admin.adm_roles_list.no_roles });
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
          props.push(`${i18n.modules.admin.adm_roles_list.level_short} ${config.levels.roles[role.id]}`);
        }
        if (role.mentionable === true) {
          props.push(i18n.modules.admin.adm_roles_list.mentionable_short);
        }
        if (role.hoist === true) {
          props.push(i18n.modules.admin.adm_roles_list.hoisted_short);
        }
        // dt[currKey].push([props.join(', '), role.id, role.name]);
        const prp = props.length > 0 ? props.join(', ') : '';
        const thisTxt = `[${role.id}]${prp !== '' ? ` | <${prp}>` : ''} | ${utils.escapeString(role.name)}`;

        if ((len + thisTxt.length) > 1950) {
          currKey += 1;
        }
        if (!Array.isArray(dt[currKey])) {
          dt[currKey] = [i18n.modules.admin.adm_roles_list.properties, ''];
        }
        dt[currKey].push(thisTxt);
      });
      for (let i = 0; i < dt.length; i += 1) {
        const it = dt[i];
        const res: any = await msg.inlineReply({ allowedMentions: {}, content: `\`\`\`\n${it.join('\n')}\n\`\`\`` });
        saveMessage(res);
      }
    },
    {
      permissions: {
        overrideableInfo: 'admin.roles',
        level: Ranks.Moderator,
      },
    },
  );

  registerChatOn(
    cmdGroup,
    'actions',
    (ctx) => ({ id: ctx.stringOptional() }),
    async (msg, { id }) => {
      const res: any = await msg.inlineReply(async () => {
        if (id === null) {
          const infs = (await actionPool.getByQuery<Action>({ active: true }));
          if (infs.length === 0) {
            return { content: i18n.modules.admin.adm_actions.no_active };
          }
          const last10 = infs.slice(0, Math.max(infs.length, 10));
          let txt = setPlaceholders(i18n.modules.admin.adm_actions.title, ['count', Math.min(last10.length, 10).toString()]);
          last10.map((inf) => {
            let targMention;
            // todo properly format this
            txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`} **>** ${inf.targetId} - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
          });
          const remaining = infs.length - last10.length;
          if (remaining > 0) {
            txt += setPlaceholders(i18n.modules.admin.adm_actions.more_actions, ['remaining', remaining.toString()]);
          }
          const emb = new discord.Embed();
          emb.setDescription(txt);
          emb.setTimestamp(new Date().toISOString());
          return { embed: emb, allowedMentions: {}, content: '' };
        }
      });
      saveMessage(res);
    },
    {
      permissions: {
        overrideableInfo: 'admin.actions',
        level: Ranks.Moderator,
      },
    },
  );

  // BACKUP
  if (config.modules.admin.persist.enabled === true) {
    registerChatSubCallback(cmdGroup, 'backup', (subCommandGroup) => {
      registerChatOn(
        subCommandGroup,
        'restore',
        (ctx) => ({ member: ctx.guildMember() }),
        async (msg, { member }) => {
          const res: any = await msg.inlineReply(async () => {
            const ret = await restorePersistData(member);
            if (ret === true) {
              return {
                allowedMentions: {},
                content: setPlaceholders(i18n.modules.admin.adm_backup.restored, ['user_mention', member.toMention()]),
              };
            }
            return {
              allowedMentions: {},
              content: setPlaceholders(i18n.modules.admin.adm_backup.failed_restore, ['user_mention', member.toMention()]),
            };
          });
          saveMessage(res);
        },
        {
          permissions: {
            overrideableInfo: 'admin.backup.restore',
            level: Ranks.Moderator,
          },
        },
      );
      registerChatOn(
        subCommandGroup,
        'save',
        (ctx) => ({ member: ctx.guildMember() }),
        async (msg, { member }) => {
          const res: any = await msg.inlineReply(async () => {
            const ret = await savePersistData(member);
            if (ret === true) {
              return {
                allowedMentions: {},
                content: setPlaceholders(i18n.modules.admin.adm_backup.saved, ['user_mention', member.toMention()]),
              };
            }
            return {
              allowedMentions: {},
              content: setPlaceholders(i18n.modules.admin.adm_backup.failed_save, ['user_mention', member.toMention()]),
            };
          });
          saveMessage(res);
        },
        {
          permissions: {
            overrideableInfo: 'admin.backup.save',
            level: Ranks.Administrator,
          },
        },
      );
      registerChatOn(
        subCommandGroup,
        'show',
        (ctx) => ({ user: ctx.string({ name: 'user', description: 'user' }) }),
        async (msg, { user }) => {
          const res: any = await msg.inlineReply(async () => {
            const usr = await utils.getUser(user.replace(/\D/g, ''));
            if (!usr) {
              return { content: i18n.modules.admin.adm_backup.user_not_found, allowedMentions: {} };
            }
            const thisObj = await persistPool.getById<MemberPersist>(usr.id);
            if (!thisObj) {
              return { content: i18n.modules.admin.adm_backup.no_data };
            }
            let rls = i18n.modules.admin.adm_backup.none;
            if (thisObj.roles.length > 0) {
              const rlsfo = thisObj.roles.map((rl) => `<@&${rl}>`).join(', ');
              rls = rlsfo;
            }
            const txt = setPlaceholders(i18n.modules.admin.adm_backup.data_display, ['user_mention', usr.toMention(), 'roles', thisObj.roles.length === 0 ? i18n.modules.admin.adm_backup.none : rls, 'nickname', thisObj.nick === null || typeof thisObj.nick !== 'string' ? i18n.modules.admin.adm_backup.none : `\`${utils.escapeString(thisObj.nick)}\``, 'channel_overwrite_count', Array.isArray(thisObj.channels) ? thisObj.channels.length.toString() : '0']);
            return { content: txt, allowedMentions: {} };
          });
          saveMessage(res);
        },
        {
          permissions: {
            overrideableInfo: 'admin.backup.show',
            level: Ranks.Moderator,
          },
        },
      );
      registerChatOn(
        subCommandGroup,
        'delete',
        (ctx) => ({ user: ctx.string({ name: 'user', description: 'user' }) }),
        async (msg, { user }) => {
          const usr = await utils.getUser(user.replace(/\D/g, ''));
          if (!usr) {
            return { content: i18n.modules.admin.adm_backup.user_not_found, allowedMentions: {} };
          }
          const res: any = await msg.inlineReply(async () => {
            const thiskv = await persistPool.getById<MemberPersist>(usr.id);
            if (!thiskv) {
              return i18n.modules.admin.adm_backup.no_data;
            }
            await persistPool.editPool(usr.id, undefined);
            return setPlaceholders(i18n.modules.admin.adm_backup.deleted, ['user_mention', user.toMention()]);
          });
          saveMessage(res);
        },
        {
          permissions: {
            overrideableInfo: 'admin.backup.delete',
            level: Ranks.Administrator,
          },
        },
      );
    });
  }

  return cmdGroup;
}

const cleanGroup = registerSlashGroup(
  { name: 'clean', description: 'Commands to clear messages in the server' },
  {
    module: 'admin',
  },
);

if (cleanGroup) {
  registerSlashSub(
    cleanGroup,
    {
      name: 'user',
      description: 'Clear messages by a specific user',
      options: (ctx) => (
        {
          user: ctx.guildMember({ required: true, description: 'The user to clear messages from' }),
          count: ctx.integer({ required: false, description: `How many messages to clear (most recent to older). If not defined, clears ${DEFAULT_COMMAND_CLEAN} messages` }),
        }),
    },
    async (inter, { user, count }) => {
      if (!count) {
        count = DEFAULT_COMMAND_CLEAN;
      }
      const chan = await inter.getChannel();
      let acked = false;
      const tmAck = setTimeout(async () => {
        await inter.acknowledge({ ephemeral: false });
        acked = true;
      }, 1500);
      const res = await Clean(utils.decomposeSnowflake(inter.id).timestamp, user, inter.member, chan, count, inter.channelId);
      if (!acked) {
        clearTimeout(tmAck);
      }

      if (typeof res !== 'number') {
        if (!acked) {
          await inter.acknowledge({ ephemeral: true });
        }
        if (res === false) {
          await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_clean.failed_clean);
        } else if (typeof res === 'string') {
          await infractions.confirmResultInteraction(undefined, inter, false, res);
        }
        return false;
      } if (res > 0) {
        if (!acked) {
          await inter.acknowledge({ ephemeral: false });
        }
        await infractions.confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.admin.adm_clean.cleaned_messages_user, ['count', res.toString(), 'user_mention', user.user.toMention()]));
      } else {
        if (!acked) {
          await inter.acknowledge({ ephemeral: true });
        }
        await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_clean.no_messages_cleaned);
        return false;
      }
    },
    {
      module: 'admin',
      parent: 'clean',
      permissions: {
        overrideableInfo: 'admin.clean.user',
        level: Ranks.Moderator,
      },
    },
  );

  registerSlashSub(
    cleanGroup,
    {
      name: 'channel',
      description: 'Clear any kind of messages in a specific channel',
      options: (ctx) => (
        {
          channel: ctx.guildChannel({ required: true, description: 'The channel to clear messages from' }),
          count: ctx.integer({ required: false, description: `How many messages to clear (most recent to older). If not defined, clears ${DEFAULT_COMMAND_CLEAN} messages` }),
        }),
    },
    async (inter, { channel, count }) => {
      if (!count) {
        count = DEFAULT_COMMAND_CLEAN;
      }
      let acked = false;
      const tmAck = setTimeout(async () => {
        await inter.acknowledge({ ephemeral: false });
        acked = true;
      }, 1500);
      const res = await Clean(utils.decomposeSnowflake(inter.id).timestamp, {}, inter.member, channel, count, channel.id);
      if (!acked) {
        clearTimeout(tmAck);
      }

      if (typeof res !== 'number') {
        if (!acked) {
          await inter.acknowledge({ ephemeral: true });
        }
        if (res === false) {
          await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_clean.failed_clean);
        } else if (typeof res === 'string') {
          await infractions.confirmResultInteraction(undefined, inter, false, res);
        }
        return false;
      } if (res > 0) {
        if (!acked) {
          await inter.acknowledge({ ephemeral: false });
        }
        await infractions.confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.admin.adm_clean.cleaned_messages_channel, ['count', res.toString(), 'channel_mention', channel.toMention()]));
      } else {
        if (!acked) {
          await inter.acknowledge({ ephemeral: true });
        }
        await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_clean.no_messages_cleaned);
        return false;
      }
    },
    {
      module: 'admin',
      parent: 'clean',
      permissions: {
        overrideableInfo: 'admin.clean.channel',
        level: Ranks.Moderator,
      },
    },
  );

  registerSlashSub(
    cleanGroup,
    {
      name: 'here',
      description: 'Clear any kind of messages in the current channel',
      options: (ctx) => (
        {
          count: ctx.integer({ required: false, description: `How many messages to clear (most recent to older). If not defined, clears ${DEFAULT_COMMAND_CLEAN} messages` }),
        }),
    },
    async (inter, { count }) => {
      if (!count) {
        count = DEFAULT_COMMAND_CLEAN;
      }
      const channel = await inter.getChannel();
      let acked = false;
      const tmAck = setTimeout(async () => {
        await inter.acknowledge({ ephemeral: false });
        acked = true;
      }, 1500);
      const res = await Clean(utils.decomposeSnowflake(inter.id).timestamp, {}, inter.member, channel, count, channel.id);
      if (!acked) {
        clearTimeout(tmAck);
      }

      if (typeof res !== 'number') {
        if (!acked) {
          await inter.acknowledge({ ephemeral: true });
        }
        if (res === false) {
          await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_clean.failed_clean);
        } else if (typeof res === 'string') {
          await infractions.confirmResultInteraction(undefined, inter, false, res);
        }
        return false;
      } if (res > 0) {
        if (!acked) {
          await inter.acknowledge({ ephemeral: false });
        }
        await infractions.confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.admin.adm_clean.cleaned_messages_channel, ['count', res.toString(), 'channel_mention', channel.toMention()]));
      } else {
        if (!acked) {
          await inter.acknowledge({ ephemeral: true });
        }
        await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_clean.no_messages_cleaned);
        return false;
      }
    },
    {
      module: 'admin',
      parent: 'clean',
      permissions: {
        overrideableInfo: 'admin.clean.here',
        level: Ranks.Moderator,
      },
    },
  );

  registerSlashSub(
    cleanGroup,
    {
      name: 'all',
      description: 'Clear latest X messages in the entire server',
      options: (ctx) => (
        {
          count: ctx.integer({ required: false, description: `How many messages to clear (most recent to older). If not defined, clears ${DEFAULT_COMMAND_CLEAN} messages` }),
        }),
    },
    async (inter, { count }) => {
      if (!count) {
        count = DEFAULT_COMMAND_CLEAN;
      }
      const chan = await inter.getChannel();
      let acked = false;
      const tmAck = setTimeout(async () => {
        await inter.acknowledge({ ephemeral: false });
        acked = true;
      }, 1500);
      const res = await Clean(utils.decomposeSnowflake(inter.id).timestamp, {}, inter.member, chan, count);
      if (!acked) {
        clearTimeout(tmAck);
      }

      if (typeof res !== 'number') {
        if (!acked) {
          await inter.acknowledge({ ephemeral: true });
        }
        if (res === false) {
          await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_clean.failed_clean);
        } else if (typeof res === 'string') {
          await infractions.confirmResultInteraction(undefined, inter, false, res);
        }
        return false;
      } if (res > 0) {
        if (!acked) {
          await inter.acknowledge({ ephemeral: false });
        }
        await infractions.confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.admin.adm_clean.cleaned_messages_all, ['count', res.toString()]));
      } else {
        if (!acked) {
          await inter.acknowledge({ ephemeral: true });
        }
        await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_clean.no_messages_cleaned);
        return false;
      }
    },
    {
      module: 'admin',
      parent: 'clean',
      permissions: {
        overrideableInfo: 'admin.clean.all',
        level: Ranks.Administrator,
      },
    },
  );

  registerSlashSub(
    cleanGroup,
    {
      name: 'bots',
      description: 'Clear latest X messages in the current channel by bots',
      options: (ctx) => (
        {
          count: ctx.integer({ required: false, description: `How many messages to clear (most recent to older). If not defined, clears ${DEFAULT_COMMAND_CLEAN} messages` }),
        }),
    },
    async (inter, { count }) => {
      if (!count) {
        count = DEFAULT_COMMAND_CLEAN;
      }
      const chan = await inter.getChannel();
      let acked = false;
      const tmAck = setTimeout(async () => {
        await inter.acknowledge({ ephemeral: false });
        acked = true;
      }, 1500);
      const res = await Clean(utils.decomposeSnowflake(inter.id).timestamp, { bot: true }, inter.member, chan, count, inter.channelId);
      if (!acked) {
        clearTimeout(tmAck);
      }

      if (typeof res !== 'number') {
        if (!acked) {
          await inter.acknowledge({ ephemeral: true });
        }
        if (res === false) {
          await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_clean.failed_clean);
        } else if (typeof res === 'string') {
          await infractions.confirmResultInteraction(undefined, inter, false, res);
        }
        return false;
      } if (res > 0) {
        if (!acked) {
          await inter.acknowledge({ ephemeral: false });
        }
        await infractions.confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.admin.adm_clean.cleaned_messages_bots, ['count', res.toString()]));
      } else {
        if (!acked) {
          await inter.acknowledge({ ephemeral: true });
        }
        await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_clean.no_messages_cleaned);
        return false;
      }
    },
    {
      module: 'admin',
      parent: 'clean',
      permissions: {
        overrideableInfo: 'admin.clean.bots',
        level: Ranks.Moderator,
      },
    },
  );
}

const invitesGroup = registerSlashGroup(
  { name: 'invites', description: 'Invite-related commands' },
  {
    module: 'admin',
  },
);
if (invitesGroup) {
  registerSlashSub(
    invitesGroup,
    {
      name: 'prune',
      description: 'Prune invites with X or less uses on the server',
      options: (ctx) => ({
        uses: ctx.integer({ required: false, description: 'The uses or less that an invite has to have to be cleared',
        }) }),
    },
    async (inter, { uses }) => {
      if (!uses) {
        uses = 0;
      }
      const guild = await inter.getGuild();
      const invites = await guild.getInvites();
      let cleared = 0;
      await Promise.all(invites.map(async (invite) => {
        if (invite.uses <= uses) {
          await invite.delete();
          cleared += 1;
        }
      }));
      if (cleared === 0) {
        await inter.acknowledge({ ephemeral: true });
        await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_inv_prune.no_invites);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      await infractions.confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.admin.adm_inv_prune.pruned, ['count', cleared.toString()]));
      return true;
    },
    {
      module: 'admin',
      parent: 'invites',
      permissions: {
        overrideableInfo: 'admin.invites.prune',
        level: Ranks.Administrator,
      },
    },
  );
}
const groupRole = registerSlashGroup(
  {
    name: 'role',
    description: 'Role management commands',
  },
  {
    module: 'admin',
  },
);

if (groupRole) {
  registerSlashSub(
    groupRole,
    {
      name: 'unlock',
      description: 'Unlocks a locked role',
      options: (ctx) => ({
        role: ctx.guildRole({ required: true, description: 'The role to unlock' }),
      }),
    },
    async (inter, { role }) => {
      if (!Array.isArray(config.modules.admin.lockedRoles) || config.modules.admin.lockedRoles.length === 0) {
        await inter.acknowledge({ ephemeral: true });
        await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.no_locked_roles);
        return false;
      }
      if (!config.modules.admin.lockedRoles.includes(role.id)) {
        await inter.acknowledge({ ephemeral: true });
        await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_role_unlock.not_locked);
        return false;
      }
      const kvc = await roleLockKv.get(role.id);
      if (typeof kvc === 'boolean') {
        await inter.acknowledge({ ephemeral: true });
        await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_role_unlock.already_unlocked);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      await roleLockKv.put(role.id, true, { ttl: 1000 * 60 * 5 });
      await infractions.confirmResultInteraction(undefined, inter, true, i18n.modules.admin.adm_role_unlock.unlocked);
    },
    {
      module: 'admin',
      parent: 'role',
      permissions: {
        overrideableInfo: 'admin.role.unlock',
        level: Ranks.Administrator,
      },
    },
  );

  registerSlashSub(
    groupRole,
    {
      name: 'add',
      description: 'Add a role to a member',
      options: (ctx) => ({
        member: ctx.guildMember({ required: true, description: 'The member to give the role to' }),
        role: ctx.guildRole({ required: true, description: 'The role to add' }),
      }),
    },
    async (inter, { member, role }) => {
      const res = await Role(inter.member, member, role, true);
      if (typeof res === 'string') {
        await inter.acknowledge({ ephemeral: true });
        await infractions.confirmResultInteraction(undefined, inter, false, res);
        return false;
      }
      if (res === true) {
        await inter.acknowledge({ ephemeral: false });
        await infractions.confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.admin.adm_role_add.added_role, ['role_mention', role.toMention(), 'user_mention', member.user.toMention()]));
        return true;
      }
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_role_add.failed_add);
      return false;
    },
    {
      module: 'admin',
      parent: 'role',
      permissions: {
        overrideableInfo: 'admin.role.add',
        level: Ranks.Administrator,
      },
    },
  );

  registerSlashSub(
    groupRole,
    {
      name: 'remove',
      description: 'Remove a role from a member',
      options: (ctx) => ({
        member: ctx.guildMember({ required: true, description: 'The member to remove the role from' }),
        role: ctx.guildRole({ required: true, description: 'The role to remove' }),
      }),
    },
    async (inter, { member, role }) => {
      const res = await Role(inter.member, member, role, false);
      if (typeof res === 'string') {
        await inter.acknowledge({ ephemeral: true });
        await infractions.confirmResultInteraction(undefined, inter, false, res);
        return false;
      }
      if (res === true) {
        await inter.acknowledge({ ephemeral: false });
        await infractions.confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.admin.adm_role_remove.removed_role, ['role_mention', role.toMention(), 'user_mention', member.user.toMention()]));
        return true;
      }
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_role_remove.failed_remove);
      return false;
    },
    {
      module: 'admin',
      parent: 'role',
      permissions: {
        overrideableInfo: 'admin.role.remove',
        level: Ranks.Administrator,
      },
    },
  );

  registerSlashSub(
    groupRole,
    {
      name: 'join',
      description: 'Join a user-joinable role',
      options: (ctx) => ({
        role: ctx.guildRole({ required: true, description: 'The role to join' }),
      }),
    },
    async (inter, { role }) => {
      if (typeof config.modules.admin.groupRoles !== 'object' || Object.keys(config.modules.admin.groupRoles).length === 0) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.group_roles_disabled);
        return false;
      }
      const thisRole = config.modules.admin.groupRoles[role.id];
      if (typeof thisRole !== 'string' || thisRole.length < 5) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.role_incorrectly_configured);
        return false;
      }
      if (inter.member.roles.includes(role.id)) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.group_already_has_role);
        return false;
      }
      let perms = new utils.Permissions(role.permissions).serialize(true);
      for (const key in perms) {
        if (perms[key] === false) {
          delete perms[key];
        }
      }
      perms = Object.keys(perms);
      const staffPerms = ['ADMINISTRATOR', 'KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_CHANNELS', 'MANAGE_GUILD', 'MANAGE_MESSAGES', 'MENTION_EVERYONE', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MANAGE_NICKNAMES', 'MANAGE_ROLES', 'MANAGE_EMOJIS', 'MANAGE_WEBHOOKS', 'MOVE_MEMBERS'];
      const noStaff = perms.every((p) => !staffPerms.includes(p));
      if (!noStaff) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.group_has_staff_perms);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      await inter.member.addRole(role.id);

      await interactionChannelRespond(inter, { content: setPlaceholders(i18n.modules.admin.group_joined, ['role_mention', role.toMention()]), allowedMentions: {} });
    },
    {
      module: 'admin',
      parent: 'role',
      permissions: {
        overrideableInfo: 'admin.role.join',
        level: Ranks.Guest,
      },
    },
  );

  registerSlashSub(
    groupRole,
    {
      name: 'leave',
      description: 'Leave a user-joinable role',
      options: (ctx) => ({
        role: ctx.guildRole({ required: true, description: 'The role to leave' }),
      }),
    },
    async (inter, { role }) => {
      if (typeof config.modules.admin.groupRoles !== 'object' || Object.keys(config.modules.admin.groupRoles).length === 0) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.group_roles_disabled);
        return false;
      }
      const thisRole = config.modules.admin.groupRoles[role.id];
      if (typeof thisRole !== 'string' || thisRole.length < 5) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.role_incorrectly_configured);
        return false;
      }
      if (!inter.member.roles.includes(role.id)) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.group_doesnt_have_role);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      await inter.member.removeRole(role.id);

      await interactionChannelRespond(inter, { content: setPlaceholders(i18n.modules.admin.group_left, ['role_mention', role.toMention()]), allowedMentions: {} });
    },
    {
      module: 'admin',
      parent: 'role',
      permissions: {
        overrideableInfo: 'admin.role.leave',
        level: Ranks.Guest,
      },
    },
  );
}

registerSlash(
  {
    name: 'nickname',
    description: 'Changes another user\'s nickname',
    options: (ctx) => ({
      member: ctx.guildMember({ required: true, description: 'The member to target' }),
      nickname: ctx.string({ required: false, description: 'The new nickname. Keep this blank to clear their nickname' }),
    }),
  },
  async (inter, { member, nickname }) => {
    if (!nickname) {
      nickname = null;
    }
    const res = await Nick(inter.member, member, nickname);
    if (typeof res === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, res);
      return false;
    }
    if (res === true) {
      await inter.acknowledge({ ephemeral: false });
      await infractions.confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.admin.set_nickname, ['user_mention', member.user.getTag(), 'new_nick', nickname === null ? i18n.modules.admin.adm_backup.none : utils.escapeString(nickname, true)]));
      return true;
    }
    await inter.acknowledge({ ephemeral: true });
    await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.failed_nickname);
    return false;
  },
  {
    module: 'admin',
    permissions: {
      level: Ranks.Moderator,
      overrideableInfo: 'admin.nickname',
    },
  },
);

registerSlash(
  {
    name: 'temprole',
    description: 'Give a role to a member temporarily',
    options: (ctx) => ({
      member: ctx.guildMember({ required: true, description: 'The member to give the role to' }),
      role: ctx.guildRole({ required: true, description: 'The role to give' }),
      duration: ctx.string({ required: true, description: 'The duration for the role to be given for (in 1h30m format)' }),
    }),
  },
  async (inter, { member, role, duration }) => {
    const dur = utils.timeArgumentToMs(duration);
    if (dur === 0) {
      await inter.acknowledge({ ephemeral: true });
      await inter.respondEphemeral(i18n.modules.admin.duration_malformed);
      return false;
    }
    if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
      await inter.acknowledge({ ephemeral: true });
      await inter.respondEphemeral(i18n.modules.admin.exceeds_duration);
      return false;
    }

    const res = await TempRole(inter.member, member, role, dur);
    if (typeof res === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, res);
      return false;
    }
    if (res === true) {
      await inter.acknowledge({ ephemeral: false });
      await infractions.confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.admin.temprole_added, ['role_mention', role.toMention(), 'user_mention', member.toMention(), 'duration', utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second)]));
    } else {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_role_add.failed_add);
      return false;
    }
  },
  {
    module: 'admin',
    permissions: {
      level: Ranks.Administrator,
      overrideableInfo: 'admin.temprole',
    },
  },
);

registerSlash(
  {
    name: 'cease',
    description: 'Locks a channel',
    options: (ctx) => ({
      duration: ctx.string({ required: false, description: 'The duration for the lock. Blank will lock it permanently' }),
      channel: ctx.guildChannel({ required: false, description: 'The channel to target. Blank will target the channel you run the command on' }),
    }),
  },
  async (inter, { channel, duration }) => {
    if (!channel) {
      channel = await inter.getChannel();
    }
    let dur = 0;
    if (duration) {
      dur = utils.timeArgumentToMs(duration);
      if (dur === 0) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.duration_malformed);
        return false;
      }
      if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.exceeds_duration);
        return false;
      }
    }
    const res = await LockChannel(inter.member, channel, true, dur);
    if (typeof res === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, res);
      return false;
    }
    if (res === true) {
      await inter.acknowledge({ ephemeral: false });
      await infractions.confirmResultInteraction(undefined, inter, true, `${i18n.modules.admin.adm_lock_channel.locked_cmd}${dur > 0 ? setPlaceholders(i18n.modules.admin.for_time, ['time', utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second)]) : ''}`);
    } else {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_lock_channel.locked_fail);
      return false;
    }
  },
  {
    module: 'admin',
    permissions: {
      level: Ranks.Moderator,
      overrideableInfo: 'admin.cease',
    },
  },
);

registerSlash(
  {
    name: 'uncease',
    description: 'Unlocks a channel',
    options: (ctx) => ({
      channel: ctx.guildChannel({ required: false, description: 'The channel to target. Blank will target the channel you run the command on' }),
    }),
  },
  async (inter, { channel }) => {
    if (!channel) {
      channel = await inter.getChannel();
    }
    const res = await LockChannel(inter.member, channel, false, 0);
    if (typeof res === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, res);
      return false;
    }
    if (res === true) {
      await inter.acknowledge({ ephemeral: false });
      await infractions.confirmResultInteraction(undefined, inter, true, i18n.modules.admin.adm_lock_channel.unlocked_cmd);
    } else {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_lock_channel.unlocked_fail);
      return false;
    }
  },
  {
    module: 'admin',
    permissions: {
      level: Ranks.Moderator,
      overrideableInfo: 'admin.uncease',
    },
  },
);

registerSlash(
  {
    name: 'slowmode',
    description: 'Sets slowmode on a channel',
    options: (ctx) => ({
      seconds: ctx.integer({ required: false, description: 'The value for the slowmode in seconds. 0 or blank to disable slowmode' }),
      duration: ctx.string({ required: false, description: 'How long to apply this slowmode for. Blank will apply it permanently' }),
      channel: ctx.guildChannel({ required: false, description: 'The channel to target. Blank will target the channel you run the command on' }),
    }),
  },
  async (inter, { channel, seconds, duration }) => {
    if (!seconds) {
      seconds = 0;
    }
    if (!channel) {
      channel = await inter.getChannel();
    }
    let dur = 0;
    if (duration) {
      dur = utils.timeArgumentToMs(duration);
      if (dur === 0) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.duration_malformed);
        return false;
      }
      if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.exceeds_duration);
        return false;
      }
    }
    const res = await SlowmodeChannel(inter.member, channel, seconds, dur);
    if (typeof res === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, res);
      return false;
    }
    if (res === true) {
      const txtDur = dur > 0 ? utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second) : '';
      await inter.acknowledge({ ephemeral: false });
      await infractions.confirmResultInteraction(undefined, inter, true, `${setPlaceholders(i18n.modules.admin.adm_slowmode.slowmode_cmd, ['channel_mention', channel.toMention(), 'seconds', seconds.toString()])}${txtDur !== '' ? setPlaceholders(i18n.modules.admin.for_time, ['time', txtDur]) : ''}`);
    } else {
      await inter.acknowledge({ ephemeral: false });
      await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_slowmode.slowmode_failed);
      return false;
    }
  },
  {
    module: 'admin',
    permissions: {
      level: Ranks.Moderator,
      overrideableInfo: 'admin.slowmode',
    },
  },
);

registerSlash(
  {
    name: 'lockdown',
    description: 'Locks the server down, preventing members from sending messages',
    options: (ctx) => ({
      duration: ctx.string({ required: false, description: 'How long to apply this lockdown for. Blank will apply it permanently' }),
    }),
  },
  async (inter, { duration }) => {
    let dur = 0;
    if (duration) {
      dur = utils.timeArgumentToMs(duration);
      if (dur === 0) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.duration_malformed);
        return;
      }
      if (dur < 1000 || dur > 31 * 24 * 60 * 60 * 1000) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.exceeds_duration);
        return;
      }
    }
    const res = await LockGuild(inter.member, true, dur);
    if (typeof res === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, res);
      return;
    }
    if (res === true) {
      await inter.acknowledge({ ephemeral: false });
      await infractions.confirmResultInteraction(undefined, inter, true, `${i18n.modules.admin.adm_lock_guild.locked_cmd}${dur > 0 ? setPlaceholders(i18n.modules.admin.for_time, ['time', utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second)]) : ''}`);
    } else {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_lock_guild.failed_lock);
    }
  },
  {
    module: 'admin',
    permissions: {
      level: Ranks.Moderator,
      overrideableInfo: 'admin.lockdown',
    },
  },
);

registerSlash(
  {
    name: 'unlockdown',
    description: 'Removes a active lockdown',
  },
  async (inter) => {
    const res = await LockGuild(inter.member, false, 0);
    if (typeof res === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, res);
      return;
    }
    if (res === true) {
      await inter.acknowledge({ ephemeral: false });
      await infractions.confirmResultInteraction(undefined, inter, true, i18n.modules.admin.adm_lock_guild.unlocked_cmd);
    } else {
      await inter.acknowledge({ ephemeral: true });
      await infractions.confirmResultInteraction(undefined, inter, false, i18n.modules.admin.adm_lock_guild.failed_unlock);
    }
  },
  {
    module: 'admin',
    permissions: {
      level: Ranks.Moderator,
      overrideableInfo: 'admin.unlockdown',
    },
  },
);

registerSlash(
  {
    name: 'roles',
    description: 'Query roles on your server, returning a list of roles',
    options: (ctx) => ({
      query: ctx.string({ required: false, description: 'The query to search for. If this is not defined, returns a list of all roles' }),
    }),
  },
  async (inter, { query }) => {
    if (!query) {
      query = '';
    }
    query = query.toLowerCase();
    const guild = await inter.getGuild();
    let roles = (await guild.getRoles()).reverse();
    if (query.length > 0) {
      roles = roles.filter((rl) => rl.name.toLowerCase().includes(query) || rl.id.includes(query) || rl.name.toLowerCase() === query);
    }
    roles = roles.filter((role) => role.id !== guild.id);
    if (roles.length === 0) {
      await inter.acknowledge({ ephemeral: true });
      await inter.respondEphemeral(i18n.modules.admin.adm_roles_list.no_roles);
      return;
    }
    await inter.acknowledge({ ephemeral: false });
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
        props.push(`${i18n.modules.admin.adm_roles_list.level_short} ${config.levels.roles[role.id]}`);
      }
      if (role.mentionable === true) {
        props.push(i18n.modules.admin.adm_roles_list.mentionable_short);
      }
      if (role.hoist === true) {
        props.push(i18n.modules.admin.adm_roles_list.hoisted_short);
      }
      // dt[currKey].push([props.join(', '), role.id, role.name]);
      const prp = props.length > 0 ? props.join(', ') : '';
      const thisTxt = `[${role.id}]${prp !== '' ? ` | <${prp}>` : ''} | ${utils.escapeString(role.name)}`;

      if ((len + thisTxt.length) > 1950) {
        currKey += 1;
      }
      if (!Array.isArray(dt[currKey])) {
        dt[currKey] = [i18n.modules.admin.adm_roles_list.properties, ''];
      }
      dt[currKey].push(thisTxt);
    });

    for (let i = 0; i < dt.length; i += 1) {
      const it = dt[i];
      await interactionChannelRespond(inter, { allowedMentions: {}, content: `\`\`\`\n${it.join('\n')}\n\`\`\`` });
    }
  },
  {
    module: 'admin',
    permissions: {
      overrideableInfo: 'admin.roles',
      level: Ranks.Moderator,
    },
  },
);
