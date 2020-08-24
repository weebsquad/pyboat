/* eslint-disable @typescript-eslint/ban-types */
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks, guildId } from '../config';
import { logCustom } from './logging/events/custom';
import * as logUtils from './logging/utils';

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
  actorId: string;
  type: InfractionType;
  reason = '';
  constructor(type: InfractionType, actor: string, target: string, expires: string | undefined = '', reason = '') {
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
  async checkExpired() {
    if (!this.active || !this.isExpired()) {
      return;
    }
    console.log('checking expired ', this.id);
    const exp = utils.decomposeSnowflake(this.expiresAt).timestamp;
    if (this.type === InfractionType.TEMPMUTE) {

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
  /* const transf = await Promise.all(keys.map(async (e) => {
    const _transform = (await utils.KVManager.get(e));
    if (typeof _transform !== 'object') {
      return undefined;
    }
    return makeFake<Infraction>(_transform, Infraction);
  })); */
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
  const diff = Date.now() - now;
  console.log(infs);
  // console.log(`Took ${diff}ms to get ${infs.length} inf keys (~${Math.floor(diff / infs.length)}ms per key)`);
  const actives = infs.filter((inf) => inf.active && inf.isExpired());
  if (actives.length > 0) {
    const promises = [];
    actives.forEach((inf) => {
      promises.push(inf.checkExpired());
    });
    await Promise.all(promises);
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
    // console.log(keys);
    console.log(`Took ${Date.now() - now}ms to clear ${keys.length} inf keys`);
  });
}
export async function addInfraction(target: discord.GuildMember, actor: discord.GuildMember, type: InfractionType, expires: string | undefined = '', reason = '') {
  reason = reason.split(indexSep).join('/');
  const newInf = new Infraction(type, actor.user.id, target.user.id, expires, reason);
  await utils.KVManager.set(`${newInf.getKey()}`, true);
  return newInf;
}
export async function canTarget(actor: discord.GuildMember, target: discord.GuildMember, actionType: InfractionType) {
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

export async function logAction(actionType: string, actor: discord.User, member: discord.User, extras: Map<string, string> | undefined = new Map()) {
  extras.set('_USERTAG_', logUtils.getUserTag(member));
  extras.set('_ACTORTAG_', logUtils.getUserTag(actor));
  await logCustom('INFRACTIONS', `${actionType}`, extras);
}
async function confirmResult(me: discord.GuildMember | undefined, ogMsg: discord.GuildMemberMessage, result: boolean, txt: string) {
  if (!(me instanceof discord.GuildMember)) {
    me = await (await ogMsg.getGuild()).getMember(discord.getBotId());
  }
  const chan = await ogMsg.getChannel();
  if (config.modules.infractions && config.modules.infractions.confirmation) {
    const react = typeof config.modules.infractions.confirmation.reaction === 'boolean' && chan.canMember(me, discord.Permissions.ADD_REACTIONS) ? config.modules.infractions.confirmation.reaction : false;
    const msg = typeof config.modules.infractions.confirmation.message === 'boolean' && chan.canMember(me, discord.Permissions.SEND_MESSAGES) ? config.modules.infractions.confirmation.message : false;
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
                if (typeof reason !== 'string') {
                  reason = '';
                }
                const canT = await canTarget(msg.member, member, InfractionType.KICK);
                if (canT !== true) {
                  // await msg.reply(`${discord.decor.Emojis.NO_ENTRY_SIGN} ${canT}`);
                  await confirmResult(undefined, msg, false, canT);
                  return;
                }
                await member.kick();
                const gm = await (await msg.getGuild()).getMember(member.user.id);
                if (gm !== null) {
                  await confirmResult(undefined, msg, false, 'Failed to kick the member (still in the guild?)');
                  return;
                }
                const inf = await addInfraction(member, msg.member, InfractionType.KICK, undefined, reason);
                await logAction('kick', msg.author, member.user, new Map([['_REASON_', reason !== '' ? `with reason \`${utils.escapeString(reason)}\`` : '']]));
                await confirmResult(undefined, msg, true, `Kicked \`${utils.escapeString(member.user.getTag())}\` from the server${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
              });

  cmdGroup.on({ name: 'tempmute', filters: c2.getFilters('infractions.tempmute', Ranks.Moderator) },
              (ctx) => ({ member: ctx.guildMember(), time: ctx.string(), reason: ctx.textOptional() }),
              async (msg, { member, time, reason }) => {
                const dur = utils.timeArgumentToMs(time);
                if (dur === 0) {
                  await confirmResult(undefined, msg, false, 'Mute duration malformed (try 1h30m format)');
                  return;
                }
                if (dur < 1000 || dur > 365 * 24 * 60 * 60 * 1000) {
                  await confirmResult(undefined, msg, false, 'Mute duration must be between a minute and a year');
                  return;
                }
                const { muteRole } = config.modules.infractions;
                if (typeof muteRole !== 'string' || muteRole === '') {
                  await confirmResult(undefined, msg, false, 'Mute role not defined');
                  return;
                }
                const guild = await msg.getGuild();
                const mtRole = await guild.getRole(muteRole);
                if (mtRole === null) {
                  await confirmResult(undefined, msg, false, 'Couldn\'t find the mute role');
                  return;
                }
                if (typeof reason !== 'string') {
                  reason = '';
                }
                if (member.roles.includes(mtRole.id)) {
                  await confirmResult(undefined, msg, false, `${member.user.toMention()} is already muted`);
                  return;
                }
                const canT = await canTarget(msg.member, member, InfractionType.TEMPMUTE);
                if (canT !== true) {
                  // await msg.reply(`${discord.decor.Emojis.NO_ENTRY_SIGN} ${canT}`);
                  await confirmResult(undefined, msg, false, canT);
                  return;
                }
                const expiresAt = utils.composeSnowflake(Date.now() + dur);
                const durationText = utils.getLongAgoFormat(dur, 2, false, 'second');
                await member.addRole(muteRole);

                const inf = await addInfraction(member, msg.member, InfractionType.TEMPMUTE, expiresAt, reason);
                await logAction('tempmute', msg.author, member.user, new Map([['_EXPIRES_', ''], ['_DURATION_', durationText], ['_REASON_', reason !== '' ? `with reason \`${utils.escapeString(reason)}\`` : '']]));
                await confirmResult(undefined, msg, true, `Tempmuted \`${utils.escapeString(member.user.getTag())}\` for ${durationText}${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
              });
  return cmdGroup;
}
