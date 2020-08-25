/* eslint-disable @typescript-eslint/ban-types */
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks, guildId } from '../config';
import { logCustom } from './logging/events/custom';
import * as logUtils from './logging/utils';
import { check } from './disabled/onJoin';

const keyPrefix = 'Infraction_';
const indexSep = '|';
export enum InfractionType {
  KICK = 'KICK',
  BAN = 'BAN',
  MUTE = 'MUTE',
  TEMPMUTE = 'TEMPMUTE'
}

export class Infraction {
  active: boolean;
  expiresAt: string;
  id: string;
  memberId: string;
  actorId: string | null;
  type: InfractionType;
  reason = '';
  constructor(type: InfractionType, actor: string | null, target: string, expires: string | undefined = '', reason = '') {
    const id = utils.composeSnowflake();
    this.id = id;
    this.type = type;
    this.actorId = actor;
    this.memberId = target;
    this.reason = reason;
    if (typeof expires === 'undefined' || expires === '') {
      expires = id;
    }
    this.expiresAt = expires;
    this.active = this.expiresAt !== this.id;
    return this;
  }
  private async updateStorage(keyOld: string, keyNew: string) {
    await utils.KVManager.delete(keyOld);
    await utils.KVManager.set(keyNew, true);
  }
  async checkActive() {
    if (!this.active) {
      return false;
    }
    const guild = await discord.getGuild(guildId);
    const member = await guild.getMember(this.memberId);
    if (member === null) {
      const keyOld = this.getKey();
      this.active = false;
      await this.updateStorage(keyOld, this.getKey());
      return false;
    }
    if (this.type === InfractionType.TEMPMUTE) {
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
    }
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
    const member = await guild.getMember(this.memberId);
    if (member === null) {
      return;
    }
    console.log('checking expired ', this.id);
    if (this.type === InfractionType.TEMPMUTE) {
      if (config.modules.infractions && config.modules.infractions.muteRole && typeof config.modules.infractions.muteRole === 'string') {
        if (member.roles.includes(config.modules.infractions.muteRole)) {
          await member.removeRole(config.modules.infractions.muteRole);
          await this.checkActive();
        }
      }
    }
  }
  getKey() {
    const _data = [this.id, this.actorId, this.memberId, this.expiresAt, this.reason.split('|').join('/'), this.type, this.active];
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
const makeFake = <T>(data: object, type: { prototype: object }) => Object.assign(Object.create(type.prototype), data) as T;
export async function getInfractions() {
  const keys = (await utils.KVManager.listKeys());
  // enforce keys having our identifier
  const keysInf = keys.filter((inf) => inf.substr(0, keyPrefix.length) === keyPrefix);
  // transform them into fake infraction objects
  const transf = keys.map((e) => {
    const splitted = e.split(keyPrefix).join('').split(indexSep);
    if (splitted.length !== 7) {
      return undefined;
    }
    const newobj = {
      id: splitted[0],
      actorId: splitted[1],
      memberId: splitted[2],
      expiresAt: splitted[3],
      reason: splitted[4],
      type: splitted[5],
      active: splitted[6],
    };
    return makeFake<Infraction>(newobj, Infraction);
  });
  const exist: Array<Infraction> = transf.filter((e) => e instanceof Infraction);
  return exist;
}
export async function every5Min() {
  console.log('every 5 min infractions');
  const now = Date.now();
  const infs = await getInfractions();
  const actives = infs.filter((inf) => inf.active && inf.isExpired());
  console.log(actives);
  if (actives.length > 0) {
    const promises1 = [];
    actives.forEach((inf) => {
      if (inf.active) {
        promises1.push(inf.checkActive());
      }
    });
    await Promise.all(promises1);
    const promises2 = [];
    actives.forEach((inf) => {
      if (inf.isExpired()) {
        promises2.push(inf.checkExpired());
      }
    });
    await Promise.all(promises2);
  }
  const diff = Date.now() - now;
  console.log(`Every5min Took ${diff}ms to pass thru ${infs.length} inf keys (~${Math.floor(diff / infs.length)}ms per key)`);
}
export async function clearInfractions() {
  await pylon.requestCpuBurst(async () => {
    const now = Date.now();
    const keys = await utils.KVManager.listKeys();
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      await utils.KVManager.delete(key);
    }
    // console.log(keys);
    console.log(`Took ${Date.now() - now}ms to clear ${keys.length} inf keys`);
  });
}
export async function addInfraction(target: discord.GuildMember, actor: discord.GuildMember | null, type: InfractionType, expires: string | undefined = '', reason = '') {
  reason = reason.split(indexSep).join('/');
  const act = actor !== null ? actor.user.id : null;
  const newInf = new Infraction(type, act, target.user.id, expires, reason);
  await utils.KVManager.set(`${newInf.getKey()}`, true);
  return newInf;
}
export async function canTarget(actor: discord.GuildMember | null, target: discord.GuildMember, actionType: InfractionType): Promise<boolean | string> {
  if (actor === null) {
    let isTargetOverride = false;
    if (utils.isGlobalAdmin(target.user.id)) {
      isTargetOverride = await utils.isGAOverride(target.user.id);
      return isTargetOverride;
    }
    return true;
  }
  const isGA = utils.isGlobalAdmin(actor.user.id);
  let isOverride = false;
  if (isGA) {
    isOverride = await utils.isGAOverride(actor.user.id);
  }
  let isTargetOverride = false;
  if (utils.isGlobalAdmin(target.user.id)) {
    isTargetOverride = await utils.isGAOverride(target.user.id);
  }
  if (actor.user.id === target.user.id && !isOverride) {
    return 'You can\'t target yourself';
  }
  const guild = await actor.getGuild();
  const me = await guild.getMember(discord.getBotId());
  const highestRoleTarget = await utils.getMemberHighestRole(target);
  const highestRoleMe = await utils.getMemberHighestRole(me);
  const isGuildOwner = guild.ownerId === actor.user.id;
  // check bot can actually do it
  if (actionType === InfractionType.KICK && !me.can(discord.Permissions.KICK_MEMBERS)) {
    return 'I can\'t kick members';
  }
  if (actionType === InfractionType.BAN && !me.can(discord.Permissions.BAN_MEMBERS)) {
    return 'I can\'t ban members';
  }
  if (actionType === InfractionType.MUTE || actionType === InfractionType.TEMPMUTE) {
    if (!me.can(discord.Permissions.MANAGE_ROLES)) {
      return 'I can\'t manage roles';
    }
    const mtRole = await guild.getRole(config.modules.infractions.muteRole);
    if (mtRole !== null && highestRoleMe.position <= mtRole.position) {
      return 'I can\'t apply this role to members';
    }
  }

  if (actionType === InfractionType.KICK || actionType === InfractionType.BAN) {
    if (highestRoleMe.position <= highestRoleTarget.position) {
      return `I can't ${actionType} this member`;
    }
  }
  // check levels and discord perms
  if (config.modules.infractions && config.modules.infractions.targetting && !isOverride && !isGuildOwner) {
    const checkLevels = typeof config.modules.infractions.targetting.checkLevels === 'boolean' ? config.modules.infractions.targetting.checkLevels : true;
    const checkRoles = typeof config.modules.infractions.targetting.checkRoles === 'boolean' ? config.modules.infractions.targetting.checkRoles : true;
    const requireExtraPerms = typeof config.modules.infractions.targetting.reqDiscordPermissions === 'boolean' ? config.modules.infractions.targetting.reqDiscordPermissions : true;
    if (requireExtraPerms === true) {
      if (actionType === InfractionType.KICK && !actor.can(discord.Permissions.KICK_MEMBERS)) {
        return 'You can\'t kick members';
      } if (actionType === InfractionType.BAN && !actor.can(discord.Permissions.BAN_MEMBERS)) {
        return 'You can\'t ban members';
      }
    }
    if (checkLevels === true) {
      const actorLevel = utils.getUserAuth(actor);
      const targetLevel = utils.getUserAuth(target);
      if (actorLevel <= targetLevel) {
        return `You can't target this user (due to their level of ${targetLevel})`;
      }
    }
    if (checkRoles === true) {
      const highestActor = await utils.getMemberHighestRole(actor);
      if (highestActor.position <= highestRoleTarget.position) {
        return 'You can\'t target this user (due to their roles)';
      }
    }
  }
  if (isTargetOverride === true && !isOverride && actor.user.id !== target.user.id) {
    if (!isGuildOwner) {
      return 'You can\'t target this user as they are a global admin.\nIf you really believe this action is applicable, please have the server owner perform it.';
    }
  }
  return true;
}

export async function logAction(actionType: string, actor: discord.User | discord.GuildMember | null, member: discord.User, extras: Map<string, string> | undefined = new Map()) {
  extras.set('_USERTAG_', logUtils.getUserTag(member));
  extras.set('_USER_ID_', member.id);
  if (actor === null) {
    extras.set('_ACTORTAG_', 'SYSTEM');
  } else {
    if (actor instanceof discord.GuildMember) {
      actor = actor.user;
    }
    extras.set('_ACTORTAG_', logUtils.getUserTag(actor));
  }
  await logCustom('INFRACTIONS', `${actionType}`, extras);
}
async function confirmResult(me: discord.GuildMember | undefined, ogMsg: discord.GuildMemberMessage, result: boolean, txt: string | undefined) {
  if (!(me instanceof discord.GuildMember)) {
    me = await (await ogMsg.getGuild()).getMember(discord.getBotId());
  }
  const chan = await ogMsg.getChannel();
  if (config.modules.infractions && config.modules.infractions.confirmation) {
    const react = typeof config.modules.infractions.confirmation.reaction === 'boolean' && chan.canMember(me, discord.Permissions.ADD_REACTIONS) ? config.modules.infractions.confirmation.reaction : false;
    const msg = typeof config.modules.infractions.confirmation.message === 'boolean' && chan.canMember(me, discord.Permissions.SEND_MESSAGES) && typeof txt === 'string' && txt.length > 0 ? config.modules.infractions.confirmation.message : false;
    const expiry = typeof config.modules.infractions.confirmation.expiry === 'number' ? Math.min(10, config.modules.infractions.confirmation.expiry) : 0;
    if (react === true) {
      try {
        if (result === true) {
          await ogMsg.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
        } else {
          await ogMsg.addReaction(discord.decor.Emojis.X);
        }
      } catch (e) {}
    }
    let replyMsg;
    if (msg === true) {
      try {
        replyMsg = await ogMsg.reply({ content: `${result === true ? discord.decor.Emojis.WHITE_CHECK_MARK : discord.decor.Emojis.X} ${txt}`,
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
            await ogMsg.deleteAllReactionsForEmoji(result === true ? discord.decor.Emojis.WHITE_CHECK_MARK : discord.decor.Emojis.X);
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
  if (query !== null && typeof query !== 'object') {
    return false;
  }

  const infs = await getInfractions();
  if (query === null) {
    return infs;
  }
  const newInfs = infs.filter((inf) => {
    for (const key in query) {
      if (inf[key] !== query[key]) {
        return false;
      }
    }
    return true;
  });
  return newInfs;
}
export async function TempMute(member: discord.GuildMember, actor: discord.GuildMember | null, time: string, reason: string) {
  const dur = utils.timeArgumentToMs(time);
  if (dur === 0) {
    return 'Mute duration malformed (try 1h30m format)';
  }
  if (dur < 1000 || dur > 365 * 24 * 60 * 60 * 1000) {
    return 'Mute duration must be between a minute and a year';
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

  const inf = await addInfraction(member, actor, InfractionType.TEMPMUTE, expiresAt, reason);
  await logAction('tempmute', actor, member.user, new Map([['_EXPIRES_', ''], ['_DURATION_', durationText], ['_REASON_', reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]));
  return true;
}
export async function Mute() {
  return true;
}
export async function UnMute() {
  return true;
}
export async function Kick(member: discord.GuildMember, actor: discord.GuildMember | null, reason: string) {
  if (typeof reason !== 'string') {
    reason = '';
  }
  const canT = await canTarget(actor, member, InfractionType.KICK);
  if (typeof canT === 'string') {
    return canT;
  }
  if (canT === false) {
    return false;
  }
  await member.kick();
  const gm = await (await member.getGuild()).getMember(member.user.id);
  if (gm !== null) {
    return 'Failed to kick the member (still in the guild?)';
  }
  const inf = await addInfraction(member, actor, InfractionType.KICK, undefined, reason);
  await logAction('kick', actor, member.user, new Map([['_REASON_', reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : '']]));
  return true;
}
export async function Ban() {
  return true;
}
export async function TempBan() {
  return true;
}
export async function SoftBan() {
  return true;
}
export async function UnBan() {
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
  cmdGroup.on({ name: 'kick', filters: c2.getFilters('infractions.kick', Ranks.Moderator) },
              (ctx) => ({ member: ctx.guildMember(), reason: ctx.textOptional() }),
              async (msg, { member, reason }) => {
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
              });

  cmdGroup.on({ name: 'tempmute', filters: c2.getFilters('infractions.tempmute', Ranks.Moderator) },
              (ctx) => ({ member: ctx.guildMember(), time: ctx.string(), reason: ctx.textOptional() }),
              async (msg, { member, time, reason }) => {
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
                await confirmResult(undefined, msg, true, `Tempmuted \`${utils.escapeString(member.user.getTag())}\` for ${durationText}${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
              });
  return cmdGroup;
}
