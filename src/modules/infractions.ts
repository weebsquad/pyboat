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
  MUTE = 'MUTE'
}

export class Infraction {
  active = true;
  expiresAt: number | undefined;
  id: string;
  memberId: string;
  actorId: string;
  type: InfractionType;
  reason = '';
  constructor(type: InfractionType, actor: string, target: string, expires: number | undefined, reason = '') {
    const id = utils.composeSnowflake();
    this.id = id;
    this.type = type;
    this.actorId = actor;
    this.memberId = target;
    this.reason = reason;
    this.expiresAt = expires;
    this.active = !!(typeof (expires) === 'number' && expires > 0);
    return this;
  }
  async checkExpired() {
    if (!this.active || typeof (this.expiresAt) !== 'number' || this.expiresAt < 1) {
      return false;
    }
    console.log('checking expired ', this.id);
    return true;
  }
  getKey() {
    const _data = [this.id, this.actorId, this.memberId, typeof this.expiresAt === 'number' ? this.expiresAt.toString() : '0', this.reason.split('|').join('/'), this.active];
    return `${keyPrefix}${_data.join(indexSep)}`;
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
    if (splitted.length !== 6) {
      return undefined;
    }
    const newobj = {
      id: splitted[0],
      actorId: splitted[1],
      memberId: splitted[2],
      expiresAt: parseInt(splitted[3], 10),
      reason: splitted[4],
      active: splitted[5],
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
  // console.log(infs);
  // console.log(`Took ${diff}ms to get ${infs.length} inf keys (~${Math.floor(diff / infs.length)}ms per key)`);
  const actives = infs.filter((inf) => inf.active);
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
export async function addInfraction(target: discord.GuildMember, actor: discord.GuildMember, type: InfractionType, expires: number | undefined, reason = '') {
  reason = reason.split(indexSep).join('/');
  const newInf = new Infraction(type, actor.user.id, target.user.id, expires, reason);
  // console.log(newInf);
  const _data = [newInf.id, newInf.actorId, newInf.memberId, typeof newInf.expiresAt === 'number' ? newInf.expiresAt.toString() : '0', newInf.reason, newInf.active];
  await utils.KVManager.set(`${keyPrefix}${_data.join(indexSep)}`, true);
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

  // check bot can actually do it
  if (actionType === InfractionType.KICK && !me.can(discord.Permissions.KICK_MEMBERS)) {
    return 'I can\'t kick members';
  }
  const highestRoleTarget = await utils.getMemberHighestRole(target);
  if (actionType === InfractionType.KICK || actionType === InfractionType.BAN) {
    const highestRoleMe = await utils.getMemberHighestRole(me);

    if (highestRoleMe.position <= highestRoleTarget.position) {
      return `I can't ${actionType} this member`;
    }
  }
  // check levels and discord perms
  if (config.modules.infractions && config.modules.infractions.targetting && !isOverride) {
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
    if (actor.user.id !== guild.ownerId) {
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
          if (msg === true && _theMsg instanceof discord.Message) {
            await _theMsg.delete();
          }

          if (react === true && chan.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
            await ogMsg.deleteAllReactionsForEmoji(result === true ? discord.decor.Emojis.WHITE_CHECK_MARK : discord.decor.Emojis.X);
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
                /* await member.kick();
                const gm = await (await msg.getGuild()).getMember(member.user.id);
                if (gm !== null) {
                  await confirmResult(undefined, msg, false, 'Failed to kick the member (still in the guild?)');
                  return;
                } */
                const inf = await addInfraction(member, msg.member, InfractionType.KICK, undefined, reason);
                await logAction('kick', msg.author, member.user, new Map([['_REASON_', reason !== '' ? `with reason \`${utils.escapeString(reason)}\`` : '']]));
                await confirmResult(undefined, msg, true, `Kicked \`${utils.escapeString(member.user.getTag())}\` from the server${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
              });
  return cmdGroup;
}
