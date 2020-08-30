/* eslint-disable @typescript-eslint/ban-types */
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks, guildId } from '../config';
import { logCustom } from './logging/events/custom';
import * as logUtils from './logging/utils';
import { check } from './disabled/onJoin';
import { chEmbed } from './logging/classes';
import { getUserAuth } from '../lib/utils';
import { isIgnoredActor, isIgnoredUser } from './logging/utils';

const keyPrefix = 'Infraction_';
const indexSep = '|';
export enum InfractionType {
  MUTE = 'MUTE',
  TEMPMUTE = 'TEMPMUTE',
  KICK = 'KICK',
  TEMPBAN = 'TEMPBAN',
  SOFTBAN = 'SOFTBAN',
  BAN = 'BAN',
}

export class Infraction {
  guild: discord.Guild | undefined;
  active: boolean;
  expiresAt: string;
  id: string;
  ts: number;
  memberId: string;
  actorId: string | null;
  type: InfractionType;
  reason = '';
  constructor(type: InfractionType, actor: string | null, target: string, expires: string | undefined = '', reason = '') {
    const id = utils.composeSnowflake();
    this.id = id;
    this.ts = utils.decomposeSnowflake(id).timestamp;
    this.type = type;
    this.actorId = actor;
    this.memberId = target;
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
  async updateStorage(keyOld: string, keyNew: string) {
    await utils.KVManager.delete(keyOld);
    await utils.KVManager.set(keyNew, true);
  }
  async checkActive() {
    if (!this.active) {
      return false;
    }
    const guild = this.guild instanceof discord.Guild ? this.guild : await discord.getGuild(guildId);
    if (!(this.guild instanceof discord.Guild)) {
      this.guild = guild;
    }

    if (this.type === InfractionType.TEMPMUTE) {
      const member = await guild.getMember(this.memberId);
      if (member === null) {
        const keyOld = this.getKey();
        this.active = false;
        await this.updateStorage(keyOld, this.getKey());
        return false;
      }
      if (config.modules.infractions && config.modules.infractions.muteRole && typeof config.modules.infractions.muteRole === 'string') {
        if (!member.roles.includes(config.modules.infractions.muteRole)) {
          const keyOld = this.getKey();
          this.active = false;
          await this.updateStorage(keyOld, this.getKey());
          return false;
        }
        return true;
      }
      const keyOld = this.getKey();
      this.active = false;
      await this.updateStorage(keyOld, this.getKey());
      return false;
    } if (this.type === InfractionType.TEMPBAN) {
      const ban = await guild.getBan(this.memberId);
      if (ban === null) {
        const keyOld = this.getKey();
        this.active = false;
        await this.updateStorage(keyOld, this.getKey());
        return false;
      }
      return true;
    }
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
    const guild = this.guild instanceof discord.Guild ? this.guild : await discord.getGuild(guildId);
    if (!(this.guild instanceof discord.Guild)) {
      this.guild = guild;
    }
    if (this.type === InfractionType.TEMPMUTE) {
      const member = await guild.getMember(this.memberId);
      if (member === null) {
        return;
      }
      await member.removeRole(config.modules.infractions.muteRole);
      await logAction('tempmute_expired', null, member);
      await this.checkActive();
    } else if (this.type === InfractionType.TEMPBAN) {
      const usr = await discord.getUser(this.memberId);
      await guild.deleteBan(this.memberId);
      await logAction('tempban_expired', null, usr);
      await this.checkActive();
    }
  }
  getKey() {
    const _data = [this.id, this.ts, this.actorId, this.memberId, this.expiresAt, this.reason.split(indexSep).join('/'), this.type, this.active];
    return `${keyPrefix}${_data.join(indexSep)}`;
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

export async function getInfractions() {
  const keys = (await utils.KVManager.listKeys());
  // enforce keys having our identifier
  const keysInf = keys.filter((inf) => inf.substr(0, keyPrefix.length) === keyPrefix);
  // transform them into fake infraction objects
  const transf = keysInf.map((e) => {
    const splitted = e.split(keyPrefix).join('').split(indexSep);
    if (splitted.length !== 8) {
      return undefined;
    }
    const newobj = {
      id: splitted[0],
      ts: parseInt(splitted[1], 10),
      actorId: splitted[2],
      memberId: splitted[3],
      expiresAt: splitted[4],
      reason: splitted[5],
      type: splitted[6],
      active: typeof splitted[7] === 'string' ? splitted[7] === 'true' : false,
    };
    return utils.makeFake<Infraction>(newobj, Infraction);
  });
  const exist: Array<Infraction> = transf.filter((e) => e instanceof Infraction).sort((a, b) => a.ts - b.ts);
  return exist;
}
export async function every5Min() {
  try {
    const infs = (await getInfractionBy({
      active: true,
    }));
    const actives = infs.filter((inf) => inf.active === true && inf.isExpired());
    if (actives.length > 0) {
      const promises2 = [];
      for (let i = 0; i < actives.length; i += 1) {
        const inf = actives[i];
        if (inf.isExpired()) {
          await sleep(200);
          promises2.push(inf.checkExpired());
        }
      }

      await Promise.all(promises2);
    }
  } catch (e) {
    console.error(e);
  }
}
export async function clearInfractions() {
  await pylon.requestCpuBurst(async () => {
    const now = Date.now();
    const keys = await utils.KVManager.listKeys();
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      await utils.KVManager.delete(key);
    }
    // console.log(`Took ${Date.now() - now}ms to clear ${keys.length} inf keys`);
  });
}
export async function addInfraction(target: discord.GuildMember | discord.User | string, actor: discord.GuildMember | discord.User | string | null, type: InfractionType, expires: string | undefined = '', reason = '') {
  if (actor === null) {
    actor = 'SYSTEM';
  }
  let targetId;
  if (target instanceof discord.GuildMember) {
    targetId = target.user.id;
  }
  if (target instanceof discord.User) {
    targetId = target.id;
  }
  if (typeof target === 'string') {
    targetId = target;
  }
  if (typeof targetId === 'undefined') {
    return false;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  reason = reason.split(indexSep).join('/');
  let actorId;
  if (typeof actor === 'string' || actor === null) {
    actorId = actor;
  }
  if (actor instanceof discord.User) {
    actorId = actor.id;
  }
  if (actor instanceof discord.GuildMember) {
    actorId = actor.user.id;
  }
  const newInf = new Infraction(type, actorId, targetId, expires, reason);
  await utils.KVManager.set(`${newInf.getKey()}`, true);
  return newInf;
}
export async function canTarget(actor: discord.GuildMember | null, target: discord.GuildMember | discord.User, actionType: InfractionType): Promise<boolean | string> {
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
  if (actionType === InfractionType.KICK && !me.can(discord.Permissions.KICK_MEMBERS)) {
    return 'I can\'t kick members';
  }
  if ((actionType === InfractionType.SOFTBAN || actionType === InfractionType.TEMPBAN || actionType === InfractionType.BAN) && !me.can(discord.Permissions.BAN_MEMBERS)) {
    return 'I can\'t ban members';
  }

  const highestRoleMe = await utils.getMemberHighestRole(me);
  const isGuildOwner = guild.ownerId === actor.user.id;
  if (actionType === InfractionType.MUTE || actionType === InfractionType.TEMPMUTE) {
    if (!me.can(discord.Permissions.MANAGE_ROLES)) {
      return 'I can\'t manage roles';
    }
    const mtRole = await guild.getRole(config.modules.infractions.muteRole);
    if (mtRole !== null && highestRoleMe.position <= mtRole.position) {
      return 'I can\'t manage the mute role';
    }
  }
  const highestRoleTarget = target instanceof discord.GuildMember ? await utils.getMemberHighestRole(target) : null;
  if (actionType === InfractionType.KICK || actionType === InfractionType.BAN || actionType === InfractionType.SOFTBAN || actionType === InfractionType.TEMPBAN) {
    if (target instanceof discord.GuildMember && target.user.id === guild.ownerId) {
      return `I can't ${actionType.toLowerCase()} this member`;
    }
    if (highestRoleTarget instanceof discord.Role && highestRoleMe.position <= highestRoleTarget.position) {
      return `I can't ${actionType.toLowerCase()} this member`;
    }
  }
  // check levels and discord perms
  if (config.modules.infractions && config.modules.infractions.targetting && !isOverride && !isGuildOwner) {
    const checkLevels = typeof config.modules.infractions.targetting.checkLevels === 'boolean' ? config.modules.infractions.targetting.checkLevels : true;
    const checkRoles = typeof config.modules.infractions.targetting.checkRoles === 'boolean' ? config.modules.infractions.targetting.checkRoles : true;
    const requireExtraPerms = typeof config.modules.infractions.targetting.reqDiscordPermissions === 'boolean' ? config.modules.infractions.targetting.reqDiscordPermissions : true;
    const allowSelf = typeof config.modules.infractions.targetting.allowSelf === 'boolean' ? config.modules.infractions.targetting.allowSelf : true;
    if (requireExtraPerms === true) {
      if (actionType === InfractionType.KICK && !actor.can(discord.Permissions.KICK_MEMBERS)) {
        return 'You can\'t kick members';
      } if ((actionType === InfractionType.BAN || actionType === InfractionType.SOFTBAN || actionType === InfractionType.TEMPBAN) && !actor.can(discord.Permissions.BAN_MEMBERS)) {
        return 'You can\'t ban members';
      } if ((actionType === InfractionType.MUTE || actionType === InfractionType.TEMPMUTE) && !actor.can(discord.Permissions.MANAGE_ROLES)) {
        return 'You can\'t manage roles';
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

export async function logAction(actionType: string, actor: discord.User | discord.GuildMember | null, member: discord.User | discord.GuildMember | null, extras: Map<string, any> | undefined = new Map(), id: string | undefined = undefined) {
  if (member instanceof discord.GuildMember) {
    member = member.user;
  }
  if ((actor !== null && isIgnoredActor(actor)) || isIgnoredUser(member)) {
    return;
  }
  if (member !== null) {
    extras.set('_USERTAG_', logUtils.getUserTag(member));
    extras.set('_USER_ID_', member.id);
    extras.set('_USER_', member);
  }
  if (actor === null) {
    extras.set('_ACTORTAG_', 'SYSTEM');
  } else {
    if (actor instanceof discord.GuildMember) {
      actor = actor.user;
    }
    extras.set('_ACTORTAG_', logUtils.getActorTag(actor));
    extras.set('_ACTOR_ID_', actor.id);
    extras.set('_ACTOR_', actor);
  }
  logCustom('INFRACTIONS', `${actionType}`, extras, id);
}
export async function confirmResult(me: discord.GuildMember | undefined, ogMsg: discord.GuildMemberMessage, result: boolean, txt: string | undefined) {
  if (!(me instanceof discord.GuildMember)) {
    me = await (await ogMsg.getGuild()).getMember(discord.getBotId());
  }
  const chan = await ogMsg.getChannel();
  if (config.modules.infractions && config.modules.infractions.confirmation) {
    const react = typeof result === 'boolean' && typeof config.modules.infractions.confirmation.reaction === 'boolean' && chan.canMember(me, discord.Permissions.ADD_REACTIONS) ? config.modules.infractions.confirmation.reaction : false;
    const msg = typeof config.modules.infractions.confirmation.message === 'boolean' && chan.canMember(me, discord.Permissions.SEND_MESSAGES) && typeof txt === 'string' && txt.length > 0 ? config.modules.infractions.confirmation.message : false;
    const expiry = typeof config.modules.infractions.confirmation.expiry === 'number' ? Math.min(10, config.modules.infractions.confirmation.expiry) : 0;
    if (react === true) {
      try {
        if (result === true) {
          await ogMsg.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
        } else if (result === false) {
          await ogMsg.addReaction(discord.decor.Emojis.X);
        }
      } catch (e) {}
    }
    let replyMsg;
    if (msg === true) {
      try {
        let emj = '';
        if (result === true) {
          emj = discord.decor.Emojis.WHITE_CHECK_MARK;
        }
        if (result === false) {
          emj = discord.decor.Emojis.X;
        }
        replyMsg = await ogMsg.reply({ content: `${emj !== '' ? `${emj} ` : ''}${txt}`,
          allowedMentions: {} });
      } catch (e) {
        replyMsg = undefined;
      }
    }
    if ((react === true || msg === true) && expiry > 0) {
      const _theMsg = replyMsg;
      setTimeout(async () => {
        try {
          if (react === true && chan.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
            if (result === true || result === false) {
              await ogMsg.deleteAllReactionsForEmoji(result === true ? discord.decor.Emojis.WHITE_CHECK_MARK : discord.decor.Emojis.X);
            }
          }
          if (msg === true && _theMsg instanceof discord.Message) {
            await _theMsg.delete();
          }
        } catch (e) {}
      }, expiry * 1000);
    }
  }
}

export async function getInfractionBy(query: any) {
  const infs = await getInfractions();
  if (query === null) {
    return infs;
  }
  const newInfs = infs.filter((inf) => {
    for (const key in query) {
      if (inf[key] !== query[key]) {
        // console.log(`mismatch in ${key}, ${query[key]} (${typeof query[key]}) !== ${inf[key]} (${typeof inf[key]})`);
        return false;
      }
    }
    return true;
  });
  return newInfs;
}
export function isMuted(member: discord.GuildMember) {
  const { muteRole } = config.modules.infractions;
  if (typeof muteRole !== 'string' || muteRole === '') {
    return false;
  }
  return member.roles.includes(muteRole);
}
/*
  TEMPMUTE
*/
export async function TempMute(member: discord.GuildMember, actor: discord.GuildMember | null, time: string, reason: string) {
  const dur = utils.timeArgumentToMs(time);
  if (dur === 0) {
    return 'Tempmute duration malformed (try 1h30m format)';
  }
  if (dur < 1000 || dur > 365 * 24 * 60 * 60 * 1000) {
    return 'Tempmute duration must be between a minute and a year';
  }
  const { muteRole } = config.modules.infractions;
  if (typeof muteRole !== 'string' || muteRole === '') {
    return 'Mute role not defined';
  }
  const guild = await member.getGuild();
  const mtRole = await guild.getRole(muteRole);
  if (mtRole === null) {
    return 'Couldn\'t find the mute role';
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (member.roles.includes(mtRole.id)) {
    return `${member.user.toMention()} is already muted`;
  }
  const canT = await canTarget(actor, member, InfractionType.TEMPMUTE);
  if (canT !== true) {
    return canT;
  }
  const expiresAt = utils.composeSnowflake(Date.now() + dur);
  const durationText = utils.getLongAgoFormat(dur, 2, false, 'second');
  await member.addRole(muteRole);

  await addInfraction(member, actor, InfractionType.TEMPMUTE, expiresAt, reason);
  await logAction('tempmute', actor, member.user, new Map([['_EXPIRES_', ''], ['_DURATION_', durationText], ['_REASON_', typeof reason === 'string' && reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]));
  return true;
}
/*
  MUTE
*/
export async function Mute(member: discord.GuildMember, actor: discord.GuildMember | null, reason: string) {
  const { muteRole } = config.modules.infractions;
  if (typeof muteRole !== 'string' || muteRole === '') {
    return 'Mute role not defined';
  }
  const guild = await member.getGuild();
  const mtRole = await guild.getRole(muteRole);
  if (mtRole === null) {
    return 'Couldn\'t find the mute role';
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (member.roles.includes(mtRole.id)) {
    return `${member.user.toMention()} is already muted`;
  }
  const canT = await canTarget(actor, member, InfractionType.MUTE);
  if (canT !== true) {
    return canT;
  }
  await member.addRole(muteRole);

  await addInfraction(member, actor, InfractionType.MUTE, undefined, reason);
  await logAction('mute', actor, member.user, new Map([['_REASON_', typeof reason === 'string' && reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]));
  return true;
}
/*
  UNMUTE
*/
export async function UnMute(member: discord.GuildMember, actor: discord.GuildMember | null, reason: string) {
  const { muteRole } = config.modules.infractions;
  if (typeof muteRole !== 'string' || muteRole === '') {
    return 'Mute role not defined';
  }
  const guild = await member.getGuild();
  const mtRole = await guild.getRole(muteRole);
  if (mtRole === null) {
    return 'Couldn\'t find the mute role';
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (!member.roles.includes(mtRole.id)) {
    return `${member.user.toMention()} is not muted`;
  }
  // we can check against mute, it's the same thing.
  const canT = await canTarget(actor, member, InfractionType.MUTE);
  if (canT !== true) {
    return canT;
  }
  await member.removeRole(muteRole);
  await logAction('unmute', actor, member.user, new Map([['_REASON_', typeof reason === 'string' && reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]));
  return true;
}
/*
  KICK
*/
export async function Kick(member: discord.GuildMember, actor: discord.GuildMember | null, reason: string) {
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const canT = await canTarget(actor, member, InfractionType.KICK);
  if (typeof canT === 'string') {
    return canT;
  }
  if (canT === false) {
    return false;
  }
  await member.kick();
  /*
  const gm = await (await member.getGuild()).getMember(member.user.id);
  if (gm !== null) {
    return 'Failed to kick the member (still in the guild?)';
  } */
  await addInfraction(member, actor, InfractionType.KICK, undefined, reason);
  await logAction('kick', actor, member.user, new Map([['_REASON_', reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]));
  return true;
}
/*
  BAN
*/
export async function Ban(member: discord.GuildMember | discord.User, actor: discord.GuildMember | null, deleteDays: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, reason: string) {
  const memberId = member instanceof discord.GuildMember ? member.user.id : member.id;
  const usr = member instanceof discord.GuildMember ? member.user : member;
  const guild = await discord.getGuild(guildId);
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const ban = await guild.getBan(memberId);
  if (ban !== null) {
    return `${usr.toMention()} is already banned`;
  }
  const canT = await canTarget(actor, member, InfractionType.BAN);
  if (canT !== true) {
    return canT;
  }
  if (typeof deleteDays !== 'number') {
    deleteDays = 0;
  }
  if (deleteDays > 7) {
    deleteDays = 7;
  }
  if (deleteDays < 0) {
    deleteDays = 0;
  }
  await guild.createBan(memberId, { deleteMessageDays: deleteDays, reason: `(${actor instanceof discord.GuildMember ? `${actor.user.getTag()}[${actor.user.id}]` : 'SYSTEM'}): ${reason}` });
  await addInfraction(member, actor, InfractionType.BAN, undefined, reason);
  await logAction('ban', actor, usr, new Map([['_DELETE_DAYS_', deleteDays.toString()], ['_REASON_', typeof reason === 'string' && reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]));
  return true;
}
/*
  MASSBAN
*/
export async function MassBan(members: Array<discord.GuildMember | discord.User>, actor: discord.GuildMember | null, deleteDays: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, reason: string) {
  const results = {
    success: [],
    fail: [],
  };
  if (typeof deleteDays !== 'number') {
    deleteDays = 0;
  }
  if (deleteDays > 7) {
    deleteDays = 7;
  }
  if (deleteDays < 0) {
    deleteDays = 0;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const guild = await discord.getGuild(guildId);
  await pylon.requestCpuBurst(async () => {
    for (const key in members) {
      const member = members[key];
      const memberId = member instanceof discord.GuildMember ? member.user.id : member.id;
      const ban = await guild.getBan(memberId);
      if (ban !== null) {
        results.fail.push(memberId);
        continue;
      }
      const canT = await canTarget(actor, member, InfractionType.BAN);
      if (canT !== true) {
        results.fail.push(memberId);
        continue;
      }

      await guild.createBan(memberId, { deleteMessageDays: deleteDays, reason: `(${actor instanceof discord.GuildMember ? `${actor.user.getTag()}[${actor.user.id}]` : 'SYSTEM'}): ${reason}` });
      await addInfraction(member, actor, InfractionType.BAN, undefined, reason);
      results.success.push(memberId);
    }
  });
  if (results.success.length > 0) {
    await logAction('massban', actor, null, new Map([['_DELETE_DAYS_', deleteDays.toString()], ['_REASON_', typeof reason === 'string' && reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''], ['_BANNED_USER_COUNT_', results.success.length.toString()], ['_BANNED_USERS_', results.success.join(', ')]]));
  }
  return results;
}
/*
  TEMPBAN
*/
export async function TempBan(member: discord.GuildMember | discord.User, actor: discord.GuildMember | null, deleteDays: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, time: string, reason: string) {
  const memberId = member instanceof discord.GuildMember ? member.user.id : member.id;
  const usr = member instanceof discord.GuildMember ? member.user : member;
  const dur = utils.timeArgumentToMs(time);
  if (dur === 0) {
    return 'Tempban duration malformed (try 1h30m format)';
  }
  if (dur < 1000 || dur > 365 * 24 * 60 * 60 * 1000) {
    return 'Tempban duration must be between a minute and a year';
  }

  const guild = await discord.getGuild(guildId);
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const ban = await guild.getBan(memberId);
  if (ban !== null) {
    return `${usr.toMention()} is already banned`;
  }
  const canT = await canTarget(actor, member, InfractionType.TEMPBAN);
  if (canT !== true) {
    return canT;
  }
  if (typeof deleteDays !== 'number') {
    deleteDays = 0;
  }
  if (deleteDays > 7) {
    deleteDays = 7;
  }
  if (deleteDays < 0) {
    deleteDays = 0;
  }
  const expiresAt = utils.composeSnowflake(Date.now() + dur);
  const durationText = utils.getLongAgoFormat(dur, 2, false, 'second');
  await guild.createBan(memberId, { deleteMessageDays: deleteDays, reason });

  await addInfraction(member, actor, InfractionType.TEMPBAN, expiresAt, reason);
  await logAction('tempban', actor, usr, new Map([['_DELETE_DAYS_', deleteDays.toString()], ['_EXPIRES_', ''], ['_DURATION_', durationText], ['_REASON_', typeof reason === 'string' && reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]));
  return true;
}
/*
  SOFTBAN
*/
export async function SoftBan(member: discord.GuildMember | discord.User, actor: discord.GuildMember | null, deleteDays: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, reason: string) {
  const memberId = member instanceof discord.GuildMember ? member.user.id : member.id;
  const usr = member instanceof discord.GuildMember ? member.user : member;
  const guild = await discord.getGuild(guildId);
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const ban = await guild.getBan(memberId);
  if (ban !== null) {
    return `${usr.toMention()} is already banned`;
  }
  const canT = await canTarget(actor, member, InfractionType.BAN);
  if (canT !== true) {
    return canT;
  }
  if (typeof deleteDays !== 'number') {
    deleteDays = 0;
  }
  if (deleteDays > 7) {
    deleteDays = 7;
  }
  if (deleteDays < 0) {
    deleteDays = 0;
  }
  await guild.createBan(memberId, { deleteMessageDays: deleteDays, reason });
  await guild.deleteBan(memberId);
  await addInfraction(member, actor, InfractionType.SOFTBAN, undefined, reason);
  await logAction('softban', actor, usr, new Map([['_DELETE_DAYS_', deleteDays.toString()], ['_REASON_', typeof reason === 'string' && reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]));
  return true;
}
/*
  UNBAN
*/
export async function UnBan(member: discord.GuildMember | discord.User, actor: discord.GuildMember | null, reason: string) {
  const memberId = member instanceof discord.GuildMember ? member.user.id : member.id;
  const usr = member instanceof discord.GuildMember ? member.user : member;
  const guild = await discord.getGuild(guildId);
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const ban = await guild.getBan(memberId);
  if (ban === null) {
    return `${usr.toMention()} is not banned`;
  }
  const canT = await canTarget(actor, member, InfractionType.BAN);
  if (canT !== true) {
    return canT;
  }
  await guild.deleteBan(memberId);

  // await addInfraction(member, actor, InfractionType.TEMPBAN, expiresAt, reason);
  await logAction('unban', actor, usr, new Map([['_REASON_', typeof reason === 'string' && reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]));
  return true;
}

export function InitializeCommands() {
  const F = discord.command.filters;

  const _groupOptions = {
    description: 'Infraction Commands',
    filters: c2.getFilters('infractions', Ranks.Moderator),
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );

  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  cmdGroup.on(
    { name: 'kick', filters: c2.getFilters('infractions.kick', Ranks.Moderator) },
    (ctx) => ({ member: ctx.guildMember(), reason: ctx.textOptional() }),
    async (msg, { member, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const result = await Kick(member, msg.member, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, 'Failed to kick member.');
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }

      await confirmResult(undefined, msg, true, `Kicked \`${utils.escapeString(member.user.getTag())}\` from the server${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
    },
  );
  cmdGroup.on(
    { name: 'mute', filters: c2.getFilters('infractions.mute', Ranks.Moderator) },
    (ctx) => ({ member: ctx.guildMember(), reason: ctx.textOptional() }),
    async (msg, { member, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      let result;
      let temp = false;
      let durationText;
      if (reason.length > 1 && reason.includes(' ')) {
        const firstspace = reason.split(' ')[0];
        if (firstspace.length > 1) {
          const dur = utils.timeArgumentToMs(firstspace);
          if (dur > 1000 && dur < 365 * 24 * 60 * 60 * 1000 && dur !== 0) {
            temp = true;
            durationText = utils.getLongAgoFormat(dur, 2, false, 'second');
            reason = reason.split(' ').slice(1).join(' ');
            result = await TempMute(member, msg.member, firstspace, reason);
          }
        }
      }
      if (typeof (result) === 'undefined') {
        result = await Mute(member, msg.member, reason);
      }
      if (result === false) {
        await confirmResult(undefined, msg, false, `Failed to ${temp === false ? 'mute' : 'tempmute'} member.`);
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      if (temp === false) {
        await confirmResult(undefined, msg, true, `Muted \`${utils.escapeString(member.user.getTag())}\`${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
      } else {
        await confirmResult(undefined, msg, true, `Temp-muted \`${utils.escapeString(member.user.getTag())}\` for ${durationText}${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
      }
    },
  );
  cmdGroup.on(
    { name: 'tempmute', filters: c2.getFilters('infractions.tempmute', Ranks.Moderator) },
    (ctx) => ({ member: ctx.guildMember(), time: ctx.string(), reason: ctx.textOptional() }),
    async (msg, { member, time, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const result = await TempMute(member, msg.member, time, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, 'Failed to tempmute member.');
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      const dur = utils.timeArgumentToMs(time);
      const durationText = utils.getLongAgoFormat(dur, 2, false, 'second');
      await confirmResult(undefined, msg, true, `Temp-muted \`${utils.escapeString(member.user.getTag())}\` for ${durationText}${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
    },
  );
  cmdGroup.on(
    { name: 'unmute', filters: c2.getFilters('infractions.unmute', Ranks.Moderator) },
    (ctx) => ({ member: ctx.guildMember(), reason: ctx.textOptional() }),
    async (msg, { member, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const result = await UnMute(member, msg.member, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, 'Failed to unmute member.');
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      await confirmResult(undefined, msg, true, `Unmuted \`${utils.escapeString(member.user.getTag())}\`${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
    },
  );
  cmdGroup.on(
    { name: 'ban', filters: c2.getFilters('infractions.ban', Ranks.Moderator) },
    (ctx) => ({ user: ctx.user(), reason: ctx.textOptional() }),
    async (msg, { user, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const _del: any = typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0; // fuck off TS
      const result = await Ban(user, msg.member, _del, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, 'Failed to ban user.');
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      await confirmResult(undefined, msg, true, `Banned \`${utils.escapeString(user.getTag())}\`${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
    },
  );
  cmdGroup.on(
    { name: 'massban', filters: c2.getFilters('infractions.massban', Ranks.Administrator) },
    (ctx) => ({ deleteDays: ctx.integer({ choices: [0, 1, 2, 3, 4, 5, 6, 7] }), args: ctx.text() }),
    async (msg, { deleteDays, args }) => {
      let ids = [];
      const reas = [];
      args.split(' ').forEach((test) => {
        const rmpossible = test.split('@').join('').split('<').join('')
          .split('>')
          .join('')
          .split('!')
          .join('');
        if (utils.isNumber(rmpossible)) {
          ids.push(rmpossible);
        } else {
          reas.push(test);
        }
      });
      ids = [...new Set(ids)]; // remove duplicates
      const reason = reas.join(' ');
      if (ids.length < 2) {
        await msg.reply('Not enough ids specified!');
        return;
      }
      const objs = [];
      const failNotFound = [];
      const guild = await msg.getGuild();
      await Promise.all(ids.map(async (id) => {
        const gm = await guild.getMember(id);
        if (gm !== null) {
          objs.push(gm);
          return;
        }
        const usr = await discord.getUser(id);
        if (usr !== null) {
          objs.push(usr);
          return;
        }
        failNotFound.push(id);
      }));
      const _del: any = deleteDays; // fuck off TS
      const result = await MassBan(objs, msg.member, _del, reason);
      await confirmResult(undefined, msg, null, `${result.success.length > 0 ? `${discord.decor.Emojis.WHITE_CHECK_MARK} banned (**${result.success.length}**) users: ${result.success.join(', ')}` : ''}${result.fail.length > 0 ? `\n${discord.decor.Emojis.X} failed to ban (**${result.fail.length}**) users: ${result.fail.join(', ')}` : ''}${failNotFound.length > 0 ? `\n${discord.decor.Emojis.QUESTION} failed to find (**${failNotFound.length}**) users: ${failNotFound.join(', ')}` : ''}`);
    },
  );
  cmdGroup.on(
    { name: 'cleanban', aliases: ['cban'], filters: c2.getFilters('infractions.cleanban', Ranks.Moderator) },
    (ctx) => ({ user: ctx.user(), deleteDays: ctx.integer({ choices: [0, 1, 2, 3, 4, 5, 6, 7] }), reason: ctx.textOptional() }),
    async (msg, { user, deleteDays, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const _del: any = deleteDays; // fuck off TS
      const result = await Ban(user, msg.member, _del, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, 'Failed to cleanban user.');
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      await confirmResult(undefined, msg, true, `Clean-banned \`${utils.escapeString(user.getTag())}\`${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
    },
  );
  cmdGroup.on(
    { name: 'softban', aliases: ['sban'], filters: c2.getFilters('infractions.softban', Ranks.Moderator) },
    (ctx) => ({ user: ctx.user(), deleteDays: ctx.integer({ choices: [0, 1, 2, 3, 4, 5, 6, 7] }), reason: ctx.textOptional() }),
    async (msg, { user, deleteDays, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const _del: any = deleteDays; // fuck off TS
      const result = await SoftBan(user, msg.member, _del, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, 'Failed to softban user.');
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      await confirmResult(undefined, msg, true, `Soft-banned \`${utils.escapeString(user.getTag())}\`${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
    },
  );
  cmdGroup.on(
    { name: 'tempban', filters: c2.getFilters('infractions.tempban', Ranks.Moderator) },
    (ctx) => ({ user: ctx.user(), time: ctx.string(), reason: ctx.textOptional() }),
    async (msg, { user, time, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const _del: any = typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0; // fuck off TS
      const result = await TempBan(user, msg.member, _del, time, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, 'Failed to tempban user.');
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      const dur = utils.timeArgumentToMs(time);
      const durationText = utils.getLongAgoFormat(dur, 2, false, 'second');
      await confirmResult(undefined, msg, true, `Temp-banned \`${utils.escapeString(user.getTag())}\` for ${durationText}${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
    },
  );
  cmdGroup.on(
    { name: 'unban', filters: c2.getFilters('infractions.unban', Ranks.Moderator) },
    (ctx) => ({ user: ctx.user(), reason: ctx.textOptional() }),
    async (msg, { user, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const result = await UnBan(user, msg.member, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, 'Failed to unban user.');
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      await confirmResult(undefined, msg, true, `Unbanned \`${utils.escapeString(user.getTag())}\`${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
    },
  );
  cmdGroup.subcommand('inf', (subCommandGroup) => {
    subCommandGroup.raw(
      { name: 'recent', filters: c2.getFilters('infractions.inf.recent', Ranks.Moderator) },
      async (msg) => {
        const infs = (await getInfractionBy(null));
        const last10 = infs.slice(Math.max(infs.length - 10, 0));
        let txt = `**Displaying latest ${Math.min(last10.length, 10)} infractions**\n\n**ID** | **Actor** | **User** | **Type** | **Reason**\n`;
        last10.map((inf) => {
          txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' ? 'SYSTEM' : `${inf.actorId === null || inf.actorId === 'SYSTEM' ? 'SYSTEM' : `<@!${inf.actorId}>`}`} **>** <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason)}\`` : ''}`;
        });
        const remaining = infs.length - last10.length;
        if (remaining > 0) {
          txt += `\n\n**...** and ${remaining} more infractions`;
        }
        const emb = new discord.Embed();
        emb.setDescription(txt);
        emb.setTimestamp(new Date().toISOString());
        await msg.reply({ embed: emb, allowedMentions: {}, content: '' });
      },
    );
    subCommandGroup.raw(
      { name: 'active', filters: c2.getFilters('infractions.inf.active', Ranks.Moderator) },
      async (msg) => {
        const infs = (await getInfractionBy({ active: true }));
        const last10 = infs.slice(Math.max(infs.length - 10, 0));
        let txt = `**Displaying latest ${Math.min(last10.length, 10)} active infractions**\n\n**ID** | **Actor** | **User** | **Type** | **Reason**\n`;
        last10.map((inf) => {
          txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' ? 'SYSTEM' : `<@!${inf.actorId}>`} **>** <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason)}\`` : ''}`;
        });
        const remaining = infs.length - last10.length;
        if (remaining > 0) {
          txt += `\n\n**...** and ${remaining} more infractions`;
        }
        const emb = new discord.Embed();
        emb.setDescription(txt);
        emb.setTimestamp(new Date().toISOString());
        await msg.reply({ embed: emb, allowedMentions: {}, content: '' });
      },
    );
    subCommandGroup.on(
      { name: 'info', filters: c2.getFilters('infractions.inf.info', Ranks.Moderator) },
      (ctx) => ({ id: ctx.string() }),
      async (msg, { id }) => {
        let infs;
        if (id.toLowerCase() === 'ml') {
          infs = (await getInfractionBy({ actorId: msg.author.id }));
          if (infs.length > 0) {
            infs = [infs[infs.length - 1]];
          }
        } else {
          infs = (await getInfractionBy({ id }));
        }
        if (infs.length !== 1) {
          await msg.reply(`${discord.decor.Emojis.X}No infraction found`);
          return;
        }
        const inf = infs[0];
        const txt = `**Displaying information for Infraction ID **#${inf.id}\n\n**Actor**: ${inf.actorId === null || inf.actorId === 'SYSTEM' ? 'SYSTEM' : `<@!${inf.actorId}>`} (\`${inf.actorId}\`)\n**Target**: <@!${inf.memberId}> (\`${inf.memberId}\`)\n**Type**: __${inf.type}__\n**Active**: ${inf.active}\n**Created**: ${new Date(inf.ts).toISOString()}${inf.expiresAt !== inf.id ? `\n**Expires**: ${new Date(utils.decomposeSnowflake(inf.expiresAt).timestamp).toISOString()}` : ''}${inf.reason !== '' ? `\n**Reason**: \`${utils.escapeString(inf.reason)}\`` : ''}`;
        const emb = new discord.Embed();
        emb.setDescription(txt);
        emb.setTimestamp(new Date().toISOString());
        await msg.reply({ embed: emb, allowedMentions: {}, content: '' });
      },
    );
    subCommandGroup.on(
      { name: 'duration', filters: c2.getFilters('infractions.inf.duration', Ranks.Moderator) },
      (ctx) => ({ id: ctx.string(), duration: ctx.string() }),
      async (msg, { id, duration }) => {
        const dur = utils.timeArgumentToMs(duration);
        if (dur === 0) {
          await msg.reply(`${discord.decor.Emojis.X}Tempban duration malformed (try 1h30m format)`);
          return;
        }
        if (dur < 1000 || dur > 365 * 24 * 60 * 60 * 1000) {
          await msg.reply(`${discord.decor.Emojis.X}Tempban duration must be between a minute and a year`);
          return;
        }
        let infs;
        if (id.toLowerCase() === 'ml') {
          infs = (await getInfractionBy({ actorId: msg.author.id }));
          if (infs.length > 0) {
            infs = [infs[infs.length - 1]];
          }
        } else {
          infs = (await getInfractionBy({ id }));
        }
        if (infs.length !== 1) {
          await msg.reply(`${discord.decor.Emojis.X}No infraction found`);
          return;
        }
        const inf: Infraction = infs[0];
        if (!inf.active) {
          await msg.reply(`${discord.decor.Emojis.X}This infraction is not active.`);
          return;
        }
        if (inf.actorId !== msg.author.id && typeof config.modules.infractions.targetting.othersEditLevel === 'number' && getUserAuth(msg.member) < config.modules.infractions.targetting.othersEditLevel) {
          await msg.reply(`${discord.decor.Emojis.X}You cannot edit other people's infractions.`);
          return;
        }
        const expiresAt = utils.composeSnowflake(inf.ts + dur);
        const oldK = inf.getKey();
        inf.expiresAt = expiresAt;
        await inf.updateStorage(oldK, inf.getKey());
        await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} infraction's duration updated !`);
        const extras = new Map<string, any>();
        extras.set('_ACTORTAG_', logUtils.getActorTag(msg.author));
        extras.set('_ACTOR_', msg.author);
        extras.set('_ACTOR_ID_', msg.author.id);
        extras.set('_INFRACTION_ID_', inf.id);
        extras.set('_TYPE_', 'duration');
        extras.set('_NEW_VALUE_', utils.escapeString(duration));
        logCustom('INFRACTIONS', 'EDITED', extras);
      },
    );
    subCommandGroup.on(
      { name: 'reason', filters: c2.getFilters('infractions.inf.reason', Ranks.Moderator) },
      (ctx) => ({ id: ctx.string(), reason: ctx.text() }),
      async (msg, { id, reason }) => {
        let infs;
        if (id.toLowerCase() === 'ml') {
          infs = (await getInfractionBy({ actorId: msg.author.id }));
          if (infs.length > 0) {
            infs = [infs[infs.length - 1]];
          }
        } else {
          infs = (await getInfractionBy({ id }));
        }
        if (infs.length !== 1) {
          await msg.reply(`${discord.decor.Emojis.X}No infraction found`);
          return;
        }
        const inf: Infraction = infs[0];

        if (inf.actorId !== msg.author.id && typeof config.modules.infractions.targetting.othersEditLevel === 'number' && getUserAuth(msg.member) < config.modules.infractions.targetting.othersEditLevel) {
          await msg.reply(`${discord.decor.Emojis.X}You cannot edit other people's infractions.`);
          return;
        }
        const oldK = inf.getKey();
        inf.reason = reason;
        await inf.updateStorage(oldK, inf.getKey());
        await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} infraction's reason updated !`);
        const extras = new Map<string, any>();
        extras.set('_ACTORTAG_', logUtils.getActorTag(msg.author));
        extras.set('_ACTOR_ID_', msg.author.id);
        extras.set('_ACTOR_', msg.author);
        extras.set('_USER_ID_', msg.author.id);
        extras.set('_INFRACTION_ID_', inf.id);
        extras.set('_TYPE_', 'reason');
        extras.set('_NEW_VALUE_', utils.escapeString(reason));
        logCustom('INFRACTIONS', 'EDITED', extras);
      },
    );
    subCommandGroup.on(
      { name: 'delete', filters: c2.getFilters('infractions.inf.delete', Ranks.Administrator) },
      (ctx) => ({ id: ctx.string() }),
      async (msg, { id }) => {
        let infs;
        if (id.toLowerCase() === 'ml') {
          infs = (await getInfractionBy({ actorId: msg.author.id }));
          if (infs.length > 0) {
            infs = [infs[infs.length - 1]];
          }
        } else {
          infs = (await getInfractionBy({ id }));
        }
        if (infs.length !== 1) {
          await msg.reply(`${discord.decor.Emojis.X}No infraction found`);
          return;
        }
        const inf = infs[0];
        if (inf.actorId !== msg.author.id && typeof config.modules.infractions.targetting.othersEditLevel === 'number' && getUserAuth(msg.member) < config.modules.infractions.targetting.othersEditLevel) {
          await msg.reply(`${discord.decor.Emojis.X}You cannot edit other people's infractions.`);
          return;
        }
        await utils.KVManager.delete(inf.getKey());
        await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} infraction deleted !`);
        const extras = new Map<string, any>();
        extras.set('_ACTORTAG_', logUtils.getActorTag(msg.author));
        extras.set('_ACTOR_', msg.author);
        extras.set('_ACTOR_ID_', msg.author.id);
        extras.set('_USER_ID_', msg.author.id);
        extras.set('_INFRACTION_ID_', inf.id);
        logCustom('INFRACTIONS', 'DELETED', extras);
      },
    );
    subCommandGroup.on(
      { name: 'clearuser', filters: c2.getFilters('infractions.inf.clearuser', Ranks.Administrator) },
      (ctx) => ({ user: ctx.user() }),
      async (msg, { user }) => {
        const infs = (await getInfractionBy({ memberId: user.id }));
        if (infs.length === 0) {
          await msg.reply(`${discord.decor.Emojis.X}Could not find any infractions for the given user`);
          return;
        }
        let count = 0;
        await pylon.requestCpuBurst(async () => {
          for (const key in infs) {
            const inf = infs[key];
            await utils.KVManager.delete(inf.getKey());
            count++;
          }
        });
        await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} ${count} infractions deleted !`);
      },
    );
    subCommandGroup.on(
      { name: 'clearactor', filters: c2.getFilters('infractions.inf.clearactor', Ranks.Administrator) },
      (ctx) => ({ actor: ctx.user() }),
      async (msg, { actor }) => {
        const infs = (await getInfractionBy({ actorId: actor.id }));
        if (infs.length === 0) {
          await msg.reply(`${discord.decor.Emojis.X}Could not find any infractions for the given actor`);
          return;
        }
        let count = 0;
        await pylon.requestCpuBurst(async () => {
          for (const key in infs) {
            const inf = infs[key];
            await utils.KVManager.delete(inf.getKey());
            count++;
          }
        });
        await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} ${count} infractions deleted !`);
      },
    );
    subCommandGroup.raw(
      { name: 'clearall', filters: c2.getFilters('infractions.inf.clearall', Ranks.Owner) },
      async (msg) => {
        const infs = (await getInfractionBy(null));
        if (infs.length === 0) {
          await msg.reply(`${discord.decor.Emojis.X}Could not find any infractions`);
          return;
        }
        let count = 0;
        await pylon.requestCpuBurst(async () => {
          for (const key in infs) {
            const inf = infs[key];
            await utils.KVManager.delete(inf.getKey());
            count++;
          }
        });
        await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} ${count} infractions deleted !`);
      },
    );
    subCommandGroup.subcommand('search', (subCommandGroup2) => {
      subCommandGroup2.on(
        { name: 'actor', filters: c2.getFilters('infractions.inf search.actor', Ranks.Moderator) },
        (ctx) => ({ actor: ctx.user() }),
        async (msg, { actor }) => {
          const infs = (await getInfractionBy({ actorId: actor.id }));
          const last10 = infs.slice(Math.max(infs.length - 10, 0));
          let txt = `**Displaying latest ${Math.min(last10.length, 10)} infractions made by **${actor.toMention()}\n\n**ID** | **User** | **Type** | **Reason**\n`;
          last10.map((inf) => {
            txt += `\n**[**||\`${inf.id}\`||**]** - <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason)}\`` : ''}`;
          });
          const remaining = infs.length - last10.length;
          if (remaining > 0) {
            txt += `\n\n**...** and ${remaining} more infractions`;
          }
          const emb = new discord.Embed();
          if (infs.length === 0) {
            txt = `**No infractions found by **${actor.toMention()}`;
          }
          emb.setDescription(txt);
          emb.setAuthor({ name: actor.getTag(), iconUrl: actor.getAvatarUrl() });
          emb.setTimestamp(new Date().toISOString());

          await msg.reply({ embed: emb, allowedMentions: {}, content: '' });
        },
      );
      subCommandGroup2.raw(
        { name: 'system', filters: c2.getFilters('infractions.inf search.system', Ranks.Moderator) },
        async (msg) => {
          const infs = (await getInfractionBy({ actorId: 'SYSTEM' }));
          const last10 = infs.slice(Math.max(infs.length - 10, 0));
          let txt = `**Displaying latest ${Math.min(last10.length, 10)} infractions made by **SYSTEM\n\n**ID** | **User** | **Type** | **Reason**\n`;
          last10.map((inf) => {
            txt += `\n**[**||\`${inf.id}\`||**]** - <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason)}\`` : ''}`;
          });
          const remaining = infs.length - last10.length;
          if (remaining > 0) {
            txt += `\n\n**...** and ${remaining} more infractions`;
          }
          const emb = new discord.Embed();
          if (infs.length === 0) {
            txt = '**No infractions found by **SYSTEM';
          }
          emb.setDescription(txt);
          emb.setAuthor({ name: 'SYSTEM' });
          emb.setTimestamp(new Date().toISOString());

          await msg.reply({ embed: emb, allowedMentions: {}, content: '' });
        },
      );
      subCommandGroup2.on(
        { name: 'user', filters: c2.getFilters('infractions.inf search.user', Ranks.Moderator) },
        (ctx) => ({ user: ctx.user() }),
        async (msg, { user }) => {
          const infs = await getInfractionBy({ memberId: user.id });
          const last10 = infs.slice(Math.max(infs.length - 10, 0));
          let txt = `**Displaying latest ${Math.min(last10.length, 10)} infractions applied to **${user.toMention()}\n\n**ID** | **Actor** | **Type** | **Reason**\n`;
          last10.map((inf) => {
            txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' ? 'SYSTEM' : `<@!${inf.actorId}>`} - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason)}\`` : ''}`;
          });
          const remaining = infs.length - last10.length;
          if (remaining > 0) {
            txt += `\n\n**...** and ${remaining} more infractions`;
          }
          const emb = new discord.Embed();
          if (infs.length === 0) {
            txt = `**No infractions found from **${user.toMention()}`;
          }
          emb.setDescription(txt);
          emb.setAuthor({ name: user.getTag(), iconUrl: user.getAvatarUrl() });
          emb.setTimestamp(new Date().toISOString());

          await msg.reply({ embed: emb, allowedMentions: {}, content: '' });
        },
      );
      subCommandGroup2.on(
        { name: 'type', filters: c2.getFilters('infractions.inf search.type', Ranks.Moderator) },
        (ctx) => ({ type: ctx.string() }),
        async (msg, { type }) => {
          const infs = await getInfractionBy({ type: type.toUpperCase() });
          const last10 = infs.slice(Math.max(infs.length - 10, 0));
          let txt = `**Displaying latest ${Math.min(last10.length, 10)} __${type.substr(0, 1).toUpperCase()}${type.substr(1).toLowerCase()}__ infractions**\n\n**ID** | **Actor** | **User** | **Reason**\n`;
          last10.map((inf) => {
            txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' ? 'SYSTEM' : `<@!${inf.actorId}>`} **>** <@!${inf.memberId}>${inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason)}\`` : ''}`;
          });
          const remaining = infs.length - last10.length;
          if (remaining > 0) {
            txt += `\n\n**...** and ${remaining} more infractions`;
          }
          const emb = new discord.Embed();
          if (infs.length === 0) {
            txt = `**No infractions found of type **${type.substr(0, 1).toUpperCase()}${type.substr(1).toLowerCase()}`;
          }
          emb.setDescription(txt);
          emb.setTimestamp(new Date().toISOString());

          await msg.reply({ embed: emb, allowedMentions: {}, content: '' });
        },
      );
    });
  });
  return cmdGroup;
}
export async function AL_OnGuildMemberUpdate(
  id: string,
  gid: string,
  log: any,
  member: discord.GuildMember,
  oldMember: discord.GuildMember,
) {
  if (config.modules.infractions && config.modules.infractions.muteRole && typeof config.modules.infractions.muteRole === 'string') {
    if (!member.roles.includes(config.modules.infractions.muteRole) && oldMember.roles.includes(config.modules.infractions.muteRole)) {
      // mute role removed
      const query = (await getInfractionBy({
        memberId: member.user.id,
        active: true,
      })).filter((inf) => inf.type === InfractionType.TEMPMUTE || inf.type === InfractionType.MUTE);
      if (query.length > 0) {
        const promises = [];
        query.forEach((inf) => {
          promises.push(inf.checkActive());
        });
        await Promise.all(promises);
      }
      if (!config.modules.infractions.checkLogs || !(log instanceof discord.AuditLogEntry) || log.userId === discord.getBotId() || member.user.id === log.userId) {
        return;
      }
      if (!isIgnoredActor(log.userId) && !isIgnoredUser(member.user)) {
        await logAction('unmute', log.user, member.user, new Map([['_REASON_', log.reason !== '' ? ` with reason \`${utils.escapeString(log.reason)}\`` : '']]), id);
      }
    } else if (member.roles.includes(config.modules.infractions.muteRole) && !oldMember.roles.includes(config.modules.infractions.muteRole)) {
      // mute role added
      if (!config.modules.infractions.checkLogs || !(log instanceof discord.AuditLogEntry) || log.userId === discord.getBotId() || member.user.id === log.userId) {
        return;
      }

      await addInfraction(member, log.user, InfractionType.MUTE, undefined, log.reason);
      if (!isIgnoredActor(log.userId) && !isIgnoredUser(member.user)) {
        await logAction('mute', log.user, member.user, new Map([['_REASON_', log.reason !== '' ? ` with reason \`${utils.escapeString(log.reason)}\`` : '']]), id);
      }
      return;
    }
    if (!config.modules.infractions.checkLogs || !config.modules.infractions.integrate || !(log instanceof discord.AuditLogEntry) || log.userId === discord.getBotId() || member.nick === oldMember.nick || typeof member.nick !== 'string' || member.user.id === log.userId || utils.isBlacklisted(log.user)) {
      return;
    }
    const changedNick = member.nick.toLowerCase();
    const gm = await (await discord.getGuild(guildId)).getMember(log.userId);
    if (gm === null) {
      return;
    }
    if (changedNick === 'unmute' && member.roles.includes(config.modules.infractions.muteRole)) {
      const res = await UnMute(member, gm, '');
      if (res === true) {
        await member.edit({ nick: oldMember.nick });
      }
    } else if (changedNick === 'mute' && !member.roles.includes(config.modules.infractions.muteRole)) {
      const res = await Mute(member, gm, '');
      if (res === true) {
        await member.edit({ nick: oldMember.nick });
      }
    } else if (changedNick.substr(0, 5) === 'mute ' && changedNick.length >= 6 && !member.roles.includes(config.modules.infractions.muteRole)) {
      const time = changedNick.substr(5);

      const res = await TempMute(member, gm, time, '');
      if (res === true) {
        await member.edit({ nick: oldMember.nick });
      }
    }
  }
}

export async function AL_OnGuildMemberRemove(
  id: string,
  gid: string,
  log: any,
  memberRemove: discord.Event.IGuildMemberRemove,
  oldMember: discord.GuildMember,
) {
  if (!config.modules.infractions.checkLogs || !(log instanceof discord.AuditLogEntry) || log.userId === discord.getBotId() || log.actionType !== discord.AuditLogEntry.ActionType.MEMBER_KICK) {
    return;
  }
  await addInfraction(memberRemove.user, log.user, InfractionType.KICK, undefined, log.reason);
  if (isIgnoredActor(log.userId) || isIgnoredUser(memberRemove.user)) {
    return;
  }
  await logAction('kick', log.user, memberRemove.user, new Map([['_REASON_', log.reason !== '' ? ` with reason \`${utils.escapeString(log.reason)}\`` : '']]), id);
}

export async function AL_OnGuildBanAdd(
  id: string,
  gid: string,
  log: any,
  ban: discord.GuildBan,
  oldMember: discord.GuildMember,
) {
  if (!config.modules.infractions.checkLogs || !(log instanceof discord.AuditLogEntry) || log.userId === discord.getBotId()) {
    return;
  }
  let { reason } = log;
  if (config.modules.infractions.integrate === true && !utils.isBlacklisted(log.user)) {
    if (reason.length > 0 && reason.includes('-')) {
      const sp = reason.split('-');
      const lastc = sp[sp.length - 1].split(' ').join('').toLowerCase();
      const newr = reason.split('-');
      newr[newr.length - 1] = '';
      if (['sb', 'softban'].includes(lastc)) {
        reason = newr.join('-').slice(0, -1);
        if (reason.substr(reason.length - 1, 1) === ' ') {
          reason = reason.slice(0, -1);
        }
        await ban.delete();
        await addInfraction(ban.user, log.user, InfractionType.SOFTBAN, undefined, reason);
        await logAction('softban', log.user, ban.user, new Map([['_DELETE_DAYS_', 'unknown'], ['_REASON_', reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]), id);
        return;
      }
      const dur = utils.timeArgumentToMs(lastc);
      if (dur > 1000 && dur < 365 * 24 * 60 * 60 * 1000 && dur !== 0) {
        reason = newr.join('-').slice(0, -1);
        if (reason.substr(reason.length - 1, 1) === ' ') {
          reason = reason.slice(0, -1);
        }
        const expiresAt = utils.composeSnowflake(Date.now() + dur);
        const durationText = utils.getLongAgoFormat(dur, 2, false, 'second');
        await addInfraction(ban.user, log.user, InfractionType.TEMPBAN, expiresAt, reason);
        await logAction('tempban', log.user, ban.user, new Map([['_DELETE_DAYS_', 'unknown'], ['_EXPIRES_', ''], ['_DURATION_', durationText], ['_REASON_', typeof reason === 'string' && reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]), id);
        return;
      }
    }
  }
  await addInfraction(ban.user, log.user, InfractionType.BAN, undefined, reason);
  if (isIgnoredActor(log.userId) || isIgnoredUser(ban.user)) {
    return;
  }
  await logAction('ban', log.user, ban.user, new Map([['_REASON_', reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]), id);
}

export async function AL_OnGuildBanRemove(
  id: string,
  gid: string,
  log: any,
  ban: discord.GuildBan,
  oldMember: discord.GuildMember,
) {
  const query = (await getInfractionBy({
    memberId: ban.user.id,
    active: true,
  })).filter((inf) => inf.type === InfractionType.BAN || inf.type === InfractionType.TEMPBAN);
  if (query.length > 0) {
    const promises = [];
    query.forEach((inf) => {
      promises.push(inf.checkActive());
    });
    await Promise.all(promises);
  }
  if (!config.modules.infractions.checkLogs || !(log instanceof discord.AuditLogEntry) || log.userId === discord.getBotId() || isIgnoredActor(log.userId) || isIgnoredUser(ban.user)) {
    return;
  }
  await logAction('unban', log.user, ban.user, new Map([['_REASON_', log.reason !== '' ? ` with reason \`${utils.escapeString(log.reason)}\`` : '']]), id);
}
