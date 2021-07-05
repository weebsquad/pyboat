/* eslint-disable @typescript-eslint/ban-types */
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks, guildId } from '../config';
import { logCustom } from './logging/events/custom';
import * as logUtils from './logging/utils';
import { getUserAuth } from '../lib/utils';
import { isIgnoredActor, isIgnoredUser } from './logging/utils';
import { saveMessage } from './admin';
import { registerSlash, registerSlashGroup, registerSlashSub, interactionChannelRespond, registerChatOn, registerChatRaw, registerChatSubCallback } from './commands';
import { language as i18n, setPlaceholders } from '../localization/interface';

export const infsPool = new utils.StoragePool({
  name: 'infractions',
  idProperty: 'id',
  local: false,
  timestampProperty: 'ts',
});

export enum InfractionType {
  MUTE = 'MUTE',
  TEMPMUTE = 'TEMPMUTE',
  KICK = 'KICK',
  TEMPBAN = 'TEMPBAN',
  SOFTBAN = 'SOFTBAN',
  BAN = 'BAN',
}

export class Infraction {
  active: boolean;
  expiresAt: string | undefined;
  id: string;
  ts: number;
  memberId: string;
  actorId: string | null;
  type: InfractionType;
  reason: string | undefined;
  constructor(type: InfractionType, actor: string | null, target: string, expires: string | undefined = '', reason = '') {
    const id = utils.composeSnowflake();
    this.id = id;
    this.ts = utils.decomposeSnowflake(id).timestamp;
    this.type = type;
    this.actorId = actor;
    this.memberId = target;
    if (typeof reason === 'string' && reason.length > 0) {
      this.reason = reason;
    }
    if (typeof expires === 'string' && expires !== '') {
      this.expiresAt = expires;
    }
    this.active = this.expiresAt !== this.id && typeof this.expiresAt === 'string';
    return this;
  }
  async updateStorage() {
    await infsPool.editPool(this.id, this);
  }
  async checkActive() {
    if (!this.active) {
      return false;
    }
    const guild = await discord.getGuild(guildId);

    if (this.type === InfractionType.TEMPMUTE) {
      const member = await guild!.getMember(this.memberId);
      if (!member) {
        this.active = false;
        await this.updateStorage();
        return false;
      }
      if (config.modules.infractions && config.modules.infractions.muteRole && typeof config.modules.infractions.muteRole === 'string') {
        if (!member.roles.includes(config.modules.infractions.muteRole)) {
          this.active = false;
          await this.updateStorage();
          return false;
        }
        return true;
      }
      this.active = false;
      await this.updateStorage();
      return false;
    } if (this.type === InfractionType.TEMPBAN) {
      const ban = await guild!.getBan(this.memberId);
      if (!ban) {
        this.active = false;
        await this.updateStorage();
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
    const guild = await discord.getGuild(guildId);
    if (this.type === InfractionType.TEMPMUTE) {
      const member = await guild!.getMember(this.memberId);
      if (!member) {
        return;
      }
      await member.removeRole(config.modules.infractions.muteRole);
      await logAction('tempmute_expired', null, member);
      await this.checkActive();
    } else if (this.type === InfractionType.TEMPBAN) {
      const usr = await utils.getUser(this.memberId);
      await guild!.deleteBan(this.memberId);
      await logAction('tempban_expired', null, usr);
      await this.checkActive();
    }
  }
  isExpired() {
    if (typeof this.expiresAt !== 'string' || this.id === this.expiresAt) {
      return false;
    }
    const exp = utils.decomposeSnowflake(this.expiresAt).timestamp;
    const diff = Date.now() - exp;
    return diff > 0;
  }
}

export async function every5Min() {
  try {
    const infs = (await infsPool.getByQuery<Infraction>({
      active: true,
    }));
    const actives = infs.map((v) => utils.makeFake<Infraction>(v, Infraction)).filter((inf) => inf.active === true && inf.isExpired());
    if (actives.length > 0) {
      const promises2: Promise<void>[] = [];
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
    utils.logError(e);
  }
}
export async function clearInfractions() {
  await infsPool.clear();
}
export async function addInfraction(target: discord.GuildMember | discord.User | string, actor: discord.GuildMember | discord.User | string | null, type: InfractionType, expires: string | undefined = '', reason = '') {
  if (!actor) {
    actor = discord.getBotId();
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

  let actorId = '';
  if (typeof actor === 'string') {
    actorId = actor;
  }
  if (actor instanceof discord.User) {
    actorId = actor.id;
  }
  if (actor instanceof discord.GuildMember) {
    actorId = actor.user.id;
  }
  const newInf = new Infraction(type, actorId, targetId, expires, reason);
  await infsPool.saveToPool(newInf);
  return newInf;
}

type extendedReqDiscordPerms = {
  'KICK_MEMBERS': boolean;
  'BAN_MEMBERS': boolean;
  'MANAGE_ROLES': boolean;
  'MANAGE_NICKNAMES': boolean;
  'MANAGE_MESSAGES': boolean;
}
export type reqDiscordPerms = boolean | extendedReqDiscordPerms;
export async function canTarget(actor: discord.GuildMember | null, target: discord.GuildMember | discord.User, actionType: InfractionType): Promise<boolean | string> {
  const targetId = target instanceof discord.GuildMember ? target.user.id : target.id;
  const isTargetAdmin = utils.isGlobalAdmin(targetId);
  if (!actor && targetId === discord.getBotId()) {
    return false;
  }
  if (!actor) {
    return !isTargetAdmin;
  }
  const isGA = utils.isGlobalAdmin(actor.user.id);
  let isOverride = false;
  if (isGA) {
    isOverride = await utils.isGAOverride(actor.user.id);
  }

  const guild = await actor.getGuild();
  const me = await guild.getMember(discord.getBotId());
  if (!me) {
    return false;
  }
  // check bot can actually do it
  if (actionType === InfractionType.KICK && !me.can(discord.Permissions.KICK_MEMBERS)) {
    return i18n.modules.infractions.targeting.bot_cant_kick;
  }
  if ((actionType === InfractionType.SOFTBAN || actionType === InfractionType.TEMPBAN || actionType === InfractionType.BAN) && !me.can(discord.Permissions.BAN_MEMBERS)) {
    return i18n.modules.infractions.targeting.bot_cant_ban;
  }

  const highestRoleMe = await utils.getMemberHighestRole(me);
  const isGuildOwner = guild.ownerId === actor.user.id;
  if (!isOverride && !isGuildOwner && targetId === discord.getBotId()) {
    return i18n.modules.infractions.targeting.cant_target_bot;
  }
  const amIOwner = guild.ownerId === me.user.id;
  if (actionType === InfractionType.MUTE || actionType === InfractionType.TEMPMUTE) {
    if (!me.can(discord.Permissions.MANAGE_ROLES) && !amIOwner) {
      return i18n.modules.infractions.targeting.bot_cant_manage_roles;
    }
    const mtRole = await guild.getRole(config.modules.infractions.muteRole);
    if (!amIOwner && mtRole !== null && highestRoleMe.position <= mtRole.position) {
      return i18n.modules.infractions.targeting.bot_cant_manage_mute_role;
    }
  }
  const highestRoleTarget = target instanceof discord.GuildMember ? await utils.getMemberHighestRole(target) : null;
  if (actionType === InfractionType.KICK || actionType === InfractionType.BAN || actionType === InfractionType.SOFTBAN || actionType === InfractionType.TEMPBAN) {
    if (!amIOwner && target instanceof discord.GuildMember && target.user.id === guild.ownerId) {
      return setPlaceholders(i18n.modules.infractions.targeting.bot_cant_perform_action, ['action', actionType.toLowerCase()]);
    }
    if (!amIOwner && highestRoleTarget instanceof discord.Role && highestRoleMe.position <= highestRoleTarget.position) {
      return setPlaceholders(i18n.modules.infractions.targeting.bot_cant_perform_action, ['action', actionType.toLowerCase()]);
    }
    if (targetId === discord.getBotId()) {
      return setPlaceholders(i18n.modules.infractions.targeting.bot_cant_perform_action, ['action', actionType.toLowerCase()]);
    }
  }
  // check levels and discord perms
  if (config.modules.infractions && config.modules.infractions.targeting && !isOverride && !isGuildOwner) {
    const checkLevels = typeof config.modules.infractions.targeting.checkLevels === 'boolean' ? config.modules.infractions.targeting.checkLevels : true;
    const checkRoles = typeof config.modules.infractions.targeting.checkRoles === 'boolean' ? config.modules.infractions.targeting.checkRoles : true;
    const requireExtraPerms: reqDiscordPerms = typeof config.modules.infractions.targeting.reqDiscordPermissions === 'boolean' || typeof config.modules.infractions.targeting.reqDiscordPermissions === 'object' ? config.modules.infractions.targeting.reqDiscordPermissions : true;
    const allowSelf = typeof config.modules.infractions.targeting.allowSelf === 'boolean' ? config.modules.infractions.targeting.allowSelf : false;
    if (requireExtraPerms === true) {
      if (actionType === InfractionType.KICK && !actor.can(discord.Permissions.KICK_MEMBERS)) {
        return i18n.modules.infractions.targeting.actor_cant_kick;
      } if ((actionType === InfractionType.BAN || actionType === InfractionType.SOFTBAN || actionType === InfractionType.TEMPBAN) && !actor.can(discord.Permissions.BAN_MEMBERS)) {
        return i18n.modules.infractions.targeting.actor_cant_ban;
      } if ((actionType === InfractionType.MUTE || actionType === InfractionType.TEMPMUTE) && !actor.can(discord.Permissions.MANAGE_ROLES)) {
        return i18n.modules.infractions.targeting.actor_cant_roles;
      }
    } else if (typeof requireExtraPerms === 'object') {
      if (requireExtraPerms.KICK_MEMBERS === true && actionType === InfractionType.KICK && !actor.can(discord.Permissions.KICK_MEMBERS)) {
        return i18n.modules.infractions.targeting.actor_cant_kick;
      } if (requireExtraPerms.BAN_MEMBERS === true && (actionType === InfractionType.BAN || actionType === InfractionType.SOFTBAN || actionType === InfractionType.TEMPBAN) && !actor.can(discord.Permissions.BAN_MEMBERS)) {
        return i18n.modules.infractions.targeting.actor_cant_ban;
      } if (requireExtraPerms.MANAGE_ROLES === true && (actionType === InfractionType.MUTE || actionType === InfractionType.TEMPMUTE) && !actor.can(discord.Permissions.MANAGE_ROLES)) {
        return i18n.modules.infractions.targeting.actor_cant_roles;
      }
    }
    if (actor.user.id === targetId) {
      if (!allowSelf) {
        return i18n.modules.infractions.targeting.cant_self_target;
      }
      return true;
    }
    if (checkLevels === true && target instanceof discord.GuildMember) {
      const actorLevel = utils.getUserAuth(actor);
      const targetLevel = utils.getUserAuth(target);
      if (actorLevel <= targetLevel) {
        return setPlaceholders(i18n.modules.infractions.targeting.actor_cant_level, ['level', targetLevel.toString()]);
      }
    }
    if (checkRoles === true) {
      const highestActor = await utils.getMemberHighestRole(actor);
      if (highestRoleTarget instanceof discord.Role && highestActor.position <= highestRoleTarget.position) {
        return i18n.modules.infractions.targeting.actor_cant_hierarchy;
      }
    }
  }
  if (isTargetAdmin === true && actor.user.id !== targetId) {
    if (!isGuildOwner) {
      return i18n.modules.infractions.targeting.actor_cant_admin;
    }
  }
  return true;
}

export async function logAction(actionType: string, actor: discord.User | discord.GuildMember | null, member: discord.User | discord.GuildMember | null, extras: Map<string, any> | undefined = new Map(), id: string | undefined = undefined) {
  if (member instanceof discord.GuildMember) {
    member = member.user;
  }
  if (!member) {
    return;
  }
  if ((actor !== null && isIgnoredActor(actor)) || isIgnoredUser(member)) {
    return;
  }
  if (member !== null) {
    extras.set('USERTAG', logUtils.getUserTag(member));
    extras.set('USER_ID', member.id);
    extras.set('USER', member);
  }
  if (actor === null) {
    extras.set('ACTORTAG', i18n.ranks.system);
  } else {
    if (actor instanceof discord.GuildMember) {
      actor = actor.user;
    }
    extras.set('ACTORTAG', logUtils.getActorTag(actor));
    extras.set('ACTOR_ID', actor.id);
    extras.set('ACTOR', actor);
  }
  logCustom('INFRACTIONS', `${actionType}`, extras, id);
}
export async function confirmResult(me: discord.GuildMember | undefined | null, ogMsg: discord.GuildMemberMessage, result: boolean | null, txt: string | undefined, noDeleteOriginal = false) {
  if (!(me instanceof discord.GuildMember)) {
    me = await (await ogMsg.getGuild())!.getMember(discord.getBotId());
  }
  if (!me) {
    return;
  }
  const botme = me;
  const chan = await ogMsg.getChannel();
  if (config.modules.infractions && config.modules.infractions.confirmation) {
    const react = typeof result === 'boolean' && typeof config.modules.infractions.confirmation.reaction === 'boolean' && chan.canMember(me, discord.Permissions.ADD_REACTIONS) ? config.modules.infractions.confirmation.reaction : false;
    const msg = typeof config.modules.infractions.confirmation.message === 'boolean' && chan.canMember(me, discord.Permissions.SEND_MESSAGES) && typeof txt === 'string' && txt.length > 0 ? config.modules.infractions.confirmation.message : false;
    const expiry = typeof config.modules.infractions.confirmation.expiry === 'number' ? Math.min(12, Math.max(0, config.modules.infractions.confirmation.expiry)) : 0;
    const del = typeof config.modules.infractions.confirmation.deleteOriginal === 'boolean' && !noDeleteOriginal ? config.modules.infractions.confirmation.deleteOriginal : false;

    const _deletedOg = false;
    if (react === true) {
      try {
        if (result === true) {
          await ogMsg.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
        } else if (result === false) {
          await ogMsg.addReaction(discord.decor.Emojis.X);
        }
      } catch (e) {}
    }
    /* if (del === true && !_deletedOg && chan.canMember(me, discord.Permissions.MANAGE_MESSAGES) && expiry === 0) {
      try {
        _deletedOg = true;
        await ogMsg.delete();
      } catch (e) {}
    } */
    let replyMsg;
    if (msg === true) {
      try {
        const emj = '';
        if (result === true) {
          // emj = discord.decor.Emojis.WHITE_CHECK_MARK;
        }
        if (result === false) {
          // emj = discord.decor.Emojis.X;
        }
        replyMsg = await ogMsg.inlineReply({ content: `${emj !== '' ? `${emj} ` : ''}${txt}`,
          allowedMentions: {} });
        if (expiry === 0) {
          // @ts-ignore
          saveMessage(replyMsg);
        }
      } catch (e) {
        replyMsg = undefined;
      }
    }
    if ((react === true || msg === true) && expiry > 0) {
      const _theMsg = replyMsg;
      setTimeout(async () => {
        try {
          if (chan.canMember(botme, discord.Permissions.MANAGE_MESSAGES)) {
            if (react === true && !del) {
              if (result === true || result === false) {
                await ogMsg.deleteAllReactionsForEmoji(result === true ? discord.decor.Emojis.WHITE_CHECK_MARK : discord.decor.Emojis.X);
              }
            }
            if (del === true && !_deletedOg) {
              await ogMsg.delete();
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

export async function confirmResultInteraction(me: discord.GuildMember | undefined | null, interaction: discord.interactions.commands.SlashCommandInteraction, result: boolean | null, txt: string | undefined, noDeleteOriginal = false) {
  if (!(me instanceof discord.GuildMember)) {
    me = await (await interaction.getGuild())!.getMember(discord.getBotId());
  }
  if (!me) {
    return;
  }
  const chan = await interaction.getChannel();
  if (config.modules.infractions && config.modules.infractions.confirmation) {
    const react = typeof result === 'boolean' && typeof config.modules.infractions.confirmation.reaction === 'boolean' && chan.canMember(me, discord.Permissions.ADD_REACTIONS) ? config.modules.infractions.confirmation.reaction : false;
    const msg = typeof config.modules.infractions.confirmation.message === 'boolean' && chan.canMember(me, discord.Permissions.SEND_MESSAGES) && typeof txt === 'string' && txt.length > 0 ? config.modules.infractions.confirmation.message : false;
    const expiry = typeof config.modules.infractions.confirmation.expiry === 'number' ? Math.min(12, Math.max(0, config.modules.infractions.confirmation.expiry)) : 0;
    const del = typeof config.modules.infractions.confirmation.deleteOriginal === 'boolean' && !noDeleteOriginal ? config.modules.infractions.confirmation.deleteOriginal : false;

    let replyMsg;
    if (msg === true) {
      try {
        const emj = '';
        if (result === true) {
          // emj = discord.decor.Emojis.WHITE_CHECK_MARK;
        }
        if (result === false) {
          // emj = discord.decor.Emojis.X;
          await interaction.respondEphemeral(`${emj !== '' ? `${emj} ` : ''}${txt}`);
        } else {
          // replyMsg = await interactionChannelRespond(interaction, { content: `${emj !== '' ? `${emj} ` : ''}${txt}`,allowedMentions: {} });
          replyMsg = await interaction.respond({ content: `${emj !== '' ? `${emj} ` : ''}${txt}`, allowedMentions: {} });
        }
      } catch (_) {
      }
    }
    if ((/* react === true || */ msg === true) && expiry > 0 && replyMsg instanceof discord.interactions.commands.SlashCommandResponse && result === true) {
      const _theMsg = replyMsg;
      setTimeout(async () => {
        try {
          await _theMsg.delete();
        } catch (_) {}
        try {
          if (del) {
            await interaction.deleteOriginal();
          }
        } catch (_) {}
      }, 5 * 1000);
    }
  }
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
    return i18n.modules.admin.duration_malformed;
  }
  if (dur < 1000 || dur > 365 * 24 * 60 * 60 * 1000) {
    return i18n.modules.infractions.inf_terms.exceeds_duration;
  }
  const { muteRole } = config.modules.infractions;
  if (typeof muteRole !== 'string' || muteRole === '') {
    return i18n.modules.infractions.inf_terms.mute_undefined;
  }
  const guild = await member.getGuild();
  const mtRole = await guild.getRole(muteRole);
  if (mtRole === null) {
    return i18n.modules.infractions.inf_terms.unknown_mute_role;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (isMuted(member)) {
    return setPlaceholders(i18n.modules.infractions.inf_terms.already_muted, ['user_mention', member.user.toMention()]);
  }
  const canT = await canTarget(actor, member, InfractionType.TEMPMUTE);
  if (canT !== true) {
    return canT;
  }
  const expiresAt = utils.composeSnowflake(Date.now() + dur);
  const durationText = utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second);
  await member.addRole(muteRole);

  await addInfraction(member, actor, InfractionType.TEMPMUTE, expiresAt, reason);
  await logAction('tempmute', actor, member.user, new Map([['EXPIRES', ''], ['DURATION', durationText], ['REASON', typeof reason === 'string' && reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]));
  return true;
}
/*
  MUTE
*/
export async function Mute(member: discord.GuildMember, actor: discord.GuildMember | null, reason: string) {
  const { muteRole } = config.modules.infractions;
  if (typeof muteRole !== 'string' || muteRole === '') {
    return i18n.modules.infractions.inf_terms.mute_undefined;
  }
  const guild = await member.getGuild();
  const mtRole = await guild.getRole(muteRole);
  if (mtRole === null) {
    return i18n.modules.infractions.inf_terms.unknown_mute_role;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (isMuted(member)) {
    return setPlaceholders(i18n.modules.infractions.inf_terms.already_muted, ['user_mention', member.user.toMention()]);
  }
  const canT = await canTarget(actor, member, InfractionType.MUTE);
  if (canT !== true) {
    return canT;
  }
  await member.addRole(muteRole);

  await addInfraction(member, actor, InfractionType.MUTE, undefined, reason);
  await logAction('mute', actor, member.user, new Map([['REASON', typeof reason === 'string' && reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]));
  return true;
}
/*
  UNMUTE
*/
export async function UnMute(member: discord.GuildMember, actor: discord.GuildMember | null, reason: string) {
  const { muteRole } = config.modules.infractions;
  if (typeof muteRole !== 'string' || muteRole === '') {
    return i18n.modules.infractions.inf_terms.mute_undefined;
  }
  const guild = await member.getGuild();
  const mtRole = await guild.getRole(muteRole);
  if (mtRole === null) {
    return i18n.modules.infractions.inf_terms.unknown_mute_role;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  if (!member.roles.includes(mtRole.id)) {
    return setPlaceholders(i18n.modules.infractions.inf_terms.not_muted, ['user_mention', member.user.toMention()]);
  }
  // we can check against mute, it's the same thing.
  const canT = await canTarget(actor, member, InfractionType.MUTE);
  if (canT !== true) {
    return canT;
  }
  await member.removeRole(muteRole);
  await logAction('unmute', actor, member.user, new Map([['REASON', typeof reason === 'string' && reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]));
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
  await logAction('kick', actor, member.user, new Map([['REASON', reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]));
  return true;
}
/*
  BAN
*/
export async function Ban(member: discord.GuildMember | discord.User, actor: discord.GuildMember | null, deleteDays: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, reason: string) {
  const memberId = member instanceof discord.GuildMember ? member.user.id : member.id;
  const usr = member instanceof discord.GuildMember ? member.user : member;
  const guild = await discord.getGuild(guildId);
  if (!guild) {
    return;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const ban = await guild.getBan(memberId);
  if (ban) {
    return setPlaceholders(i18n.modules.infractions.inf_terms.already_banned, ['user_mention', usr.toMention()]);
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
  await guild.createBan(memberId, { deleteMessageDays: deleteDays, reason: `(${actor instanceof discord.GuildMember ? `${actor.user.getTag()}[${actor.user.id}]` : i18n.ranks.system}): ${reason}` });
  await addInfraction(member, actor, InfractionType.BAN, undefined, reason);
  await logAction('ban', actor, usr, new Map([['DELETE_DAYS', deleteDays.toString()], ['REASON', typeof reason === 'string' && reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]));
  return true;
}
/*
  MASSBAN
*/
export async function MassBan(members: Array<discord.GuildMember | discord.User>, actor: discord.GuildMember | null, deleteDays: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, reason: string) {
  const results: {[key: string]: string[]} = {
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
  if (!guild) {
    return results;
  }
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

      await guild.createBan(memberId, { deleteMessageDays: deleteDays, reason: `(${actor instanceof discord.GuildMember ? `${actor.user.getTag()}[${actor.user.id}]` : i18n.ranks.system}): ${reason}` });
      await addInfraction(member, actor, InfractionType.BAN, undefined, reason);
      results.success.push(memberId);
    }
  });
  if (results.success.length > 0) {
    await logAction('massban', actor, null, new Map([['DELETE_DAYS', deleteDays.toString()], ['REASON', typeof reason === 'string' && reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : ''], ['BANNED_USER_COUNT', results.success.length.toString()], ['BANNED_USERS', results.success.join(', ')]]));
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
    return i18n.modules.admin.duration_malformed;
  }
  if (dur < 1000 || dur > 365 * 24 * 60 * 60 * 1000) {
    return i18n.modules.infractions.inf_terms.exceeds_duration;
  }

  const guild = await discord.getGuild(guildId);
  if (!guild) {
    return false;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const ban = await guild.getBan(memberId);
  if (ban !== null) {
    return setPlaceholders(i18n.modules.infractions.inf_terms.already_banned, ['user_mention', usr.toMention()]);
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
  const durationText = utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second);
  await guild.createBan(memberId, { deleteMessageDays: deleteDays, reason });

  await addInfraction(member, actor, InfractionType.TEMPBAN, expiresAt, reason);
  await logAction('tempban', actor, usr, new Map([['DELETE_DAYS', deleteDays.toString()], ['EXPIRES', ''], ['DURATION', durationText], ['REASON', typeof reason === 'string' && reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]));
  return true;
}
/*
  SOFTBAN
*/
export async function SoftBan(member: discord.GuildMember | discord.User, actor: discord.GuildMember | null, deleteDays: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, reason: string) {
  const memberId = member instanceof discord.GuildMember ? member.user.id : member.id;
  const usr = member instanceof discord.GuildMember ? member.user : member;
  const guild = await discord.getGuild(guildId);
  if (!guild) {
    return false;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const ban = await guild.getBan(memberId);
  if (ban !== null) {
    return setPlaceholders(i18n.modules.infractions.inf_terms.already_banned, ['user_mention', usr.toMention()]);
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
  await logAction('softban', actor, usr, new Map([['DELETE_DAYS', deleteDays.toString()], ['REASON', typeof reason === 'string' && reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]));
  return true;
}
/*
  UNBAN
*/
export async function UnBan(member: discord.GuildMember | discord.User, actor: discord.GuildMember | null, reason: string) {
  const memberId = member instanceof discord.GuildMember ? member.user.id : member.id;
  const usr = member instanceof discord.GuildMember ? member.user : member;
  const guild = await discord.getGuild(guildId);
  if (!guild) {
    return false;
  }
  if (typeof reason !== 'string') {
    reason = '';
  }
  if (reason.length > 101) {
    reason = reason.substr(0, 100);
  }
  const ban = await guild.getBan(memberId);
  if (ban === null) {
    return setPlaceholders(i18n.modules.infractions.inf_terms.not_banned, ['user_mention', usr.toMention()]);
  }
  const canT = await canTarget(actor, member, InfractionType.BAN);
  if (canT !== true) {
    return canT;
  }
  await guild.deleteBan(memberId);

  // await addInfraction(member, actor, InfractionType.TEMPBAN, expiresAt, reason);
  await logAction('unban', actor, usr, new Map([['REASON', typeof reason === 'string' && reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]));
  return true;
}

export function InitializeCommands() {
  const F = discord.command.filters;

  const _groupOptions = {
    description: 'Infraction Commands',
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );

  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  registerChatOn(
    cmdGroup,
    'kick',
    (ctx) => ({ member: ctx.guildMember(), reason: ctx.textOptional() }),
    async (msg, { member, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const result = await Kick(member, msg.member, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, i18n.modules.infractions.inf_terms.failed_kick);
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }

      await confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.infractions.inf_terms.kicked_member, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
    },
    {
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.kick',
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'mute',
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
            durationText = utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second);
            reason = reason.split(' ').slice(1).join(' ');
            result = await TempMute(member, msg.member, firstspace, reason);
          }
        }
      }
      if (typeof (result) === 'undefined') {
        result = await Mute(member, msg.member, reason);
      }
      if (result === false) {
        if (temp) {
          await confirmResult(undefined, msg, false, i18n.modules.infractions.inf_terms.failed_mute);
        } else {
          await confirmResult(undefined, msg, false, i18n.modules.infractions.inf_terms.failed_tempmute);
        }
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      if (temp === false) {
        await confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.infractions.inf_terms.muted_member, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
      } else {
        await confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.infractions.inf_terms.temp_muted_member, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '', 'duration', durationText]));
      }
    },
    {
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.mute',
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'tempmute',
    (ctx) => ({ member: ctx.guildMember(), time: ctx.string(), reason: ctx.textOptional() }),
    async (msg, { member, time, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const result = await TempMute(member, msg.member, time, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, i18n.modules.infractions.inf_terms.failed_tempmute);
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      const dur = utils.timeArgumentToMs(time);
      const durationText = utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second);
      await confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.infractions.inf_terms.temp_muted_member, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '', 'duration', durationText]));
    },
    {
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.tempmute',
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'unmute',
    (ctx) => ({ member: ctx.guildMember(), reason: ctx.textOptional() }),
    async (msg, { member, reason }) => {
      if (typeof reason !== 'string') {
        reason = '';
      }
      const result = await UnMute(member, msg.member, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, i18n.modules.infractions.inf_terms.failed_unmute);
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      await confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.infractions.inf_terms.unmuted_member, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
    },
    {
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.unmute',
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'ban',
    (ctx) => ({ user: ctx.string({ name: 'user', description: 'user' }), reason: ctx.textOptional() }),
    async (msg, { user, reason }) => {
      const usr = await utils.getUser(user.replace(/\D/g, ''));
      if (!usr) {
        await msg.inlineReply({ content: i18n.modules.infractions.inf_terms.user_not_found, allowedMentions: {} });
        return;
      }

      let member: discord.User | discord.GuildMember | null = await (await msg.getGuild())!.getMember(usr.id);
      if (!member) {
        member = usr;
      }
      if (typeof reason !== 'string') {
        reason = '';
      }
      const _del: any = typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0; // fuck off TS
      const result = await Ban(member, msg.member, _del, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, i18n.modules.infractions.inf_terms.failed_ban);
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      await confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.infractions.inf_terms.banned_user, ['user_tag', utils.escapeString(usr.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
    },
    {
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.ban',
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'massban',
    (ctx) => ({ deleteDays: ctx.integer({ choices: [0, 1, 2, 3, 4, 5, 6, 7] }), args: ctx.text() }),
    async (msg, { deleteDays, args }) => {
      let ids: string[] = [];
      const reas: string[] = [];
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
        const res: any = await msg.inlineReply(i18n.modules.infractions.inf_terms.massban_ids);
        saveMessage(res);
        return;
      }
      const objs: any[] = [];
      const failNotFound: string[] = [];
      const guild = await msg.getGuild();
      await Promise.all(ids.map(async (id) => {
        const gm = await guild.getMember(id);
        if (gm !== null) {
          objs.push(gm);
          return;
        }
        const usr = await utils.getUser(id);
        if (usr !== null) {
          objs.push(usr);
          return;
        }
        failNotFound.push(id);
      }));
      const _del: any = deleteDays; // fuck off TS
      const result = await MassBan(objs, msg.member, _del, reason);
      await confirmResult(undefined, msg, null, setPlaceholders(i18n.modules.infractions.inf_terms.massbanned, ['banned_success_count', result.success.length.toString(), 'banned_success', result.success.join(', '), 'banned_fail_count', result.fail.length.toString(), 'banned_fail', result.fail.join(', '), 'banned_unknown_count', failNotFound.length.toString(), 'banned_unknown', failNotFound.join(', ')]));
    },
    {
      permissions: {
        level: Ranks.Administrator,
        overrideableInfo: 'infractions.massban',
      },
    },
  );
  registerChatOn(
    cmdGroup,
    { name: 'cleanban', aliases: ['cban'] },
    (ctx) => ({ user: ctx.string({ name: 'user', description: 'user' }), deleteDays: ctx.integer({ choices: [0, 1, 2, 3, 4, 5, 6, 7] }), reason: ctx.textOptional() }),
    async (msg, { user, deleteDays, reason }) => {
      const usr = await utils.getUser(user.replace(/\D/g, ''));
      if (!usr) {
        await msg.inlineReply({ content: i18n.modules.infractions.inf_terms.user_not_found, allowedMentions: {} });
        return;
      }
      let member: discord.User | discord.GuildMember | null = await (await msg.getGuild()).getMember(usr.id);
      if (member === null) {
        member = usr;
      }
      if (typeof reason !== 'string') {
        reason = '';
      }
      const _del: any = deleteDays; // fuck off TS
      const result = await Ban(member, msg.member, _del, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, i18n.modules.infractions.inf_terms.failed_cleanban);
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      await confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.infractions.inf_terms.clean_banned_member, ['user_tag', utils.escapeString(usr.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
    },
    {
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.cleanban',
      },
    },
  );
  registerChatOn(
    cmdGroup,
    { name: 'softban', aliases: ['sban'] },
    (ctx) => ({ user: ctx.string({ name: 'user', description: 'user' }), deleteDays: ctx.integer({ choices: [0, 1, 2, 3, 4, 5, 6, 7] }), reason: ctx.textOptional() }),
    async (msg, { user, deleteDays, reason }) => {
      const usr = await utils.getUser(user.replace(/\D/g, ''));
      if (!usr) {
        await msg.inlineReply({ content: i18n.modules.infractions.inf_terms.user_not_found, allowedMentions: {} });
        return;
      }
      let member: discord.User | discord.GuildMember | null = await (await msg.getGuild()).getMember(usr.id);
      if (member === null) {
        member = usr;
      }
      if (typeof reason !== 'string') {
        reason = '';
      }
      const _del: any = deleteDays; // fuck off TS
      const result = await SoftBan(member, msg.member, _del, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, i18n.modules.infractions.inf_terms.failed_softban);
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      await confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.infractions.inf_terms.softbanned_user, ['user_tag', utils.escapeString(usr.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
    },
    {
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.softban',
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'tempban',
    (ctx) => ({ user: ctx.string({ name: 'user', description: 'user' }), time: ctx.string(), reason: ctx.textOptional() }),
    async (msg, { user, time, reason }) => {
      const usr = await utils.getUser(user.replace(/\D/g, ''));
      if (!usr) {
        await msg.inlineReply({ content: i18n.modules.infractions.inf_terms.user_not_found, allowedMentions: {} });
        return;
      }
      let member: discord.User | discord.GuildMember | null = await (await msg.getGuild()).getMember(usr.id);
      if (member === null) {
        member = usr;
      }
      if (typeof reason !== 'string') {
        reason = '';
      }
      const _del: any = typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0; // fuck off TS
      const result = await TempBan(member, msg.member, _del, time, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, i18n.modules.infractions.inf_terms.failed_tempban);
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      const dur = utils.timeArgumentToMs(time);
      const durationText = utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second);
      await confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.infractions.inf_terms.tempbanned_user, ['user_tag', utils.escapeString(usr.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '', 'duration', durationText]));
    },
    {
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.tempban',
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'unban',
    (ctx) => ({ user: ctx.string({ name: 'user', description: 'user' }), reason: ctx.textOptional() }),
    async (msg, { user, reason }) => {
      const usr = await utils.getUser(user.replace(/\D/g, ''));
      if (!usr) {
        await msg.inlineReply({ content: i18n.modules.infractions.inf_terms.user_not_found, allowedMentions: {} });
        return;
      }
      let member: discord.User | discord.GuildMember | null = await (await msg.getGuild()).getMember(usr.id);
      if (!member) {
        member = usr;
      }
      if (typeof reason !== 'string') {
        reason = '';
      }
      const result = await UnBan(member, msg.member, reason);
      if (result === false) {
        await confirmResult(undefined, msg, false, i18n.modules.infractions.inf_terms.failed_unban);
        return;
      }
      if (typeof result === 'string') {
        await confirmResult(undefined, msg, false, result);
        return;
      }
      await confirmResult(undefined, msg, true, setPlaceholders(i18n.modules.infractions.inf_terms.unbanned_user, ['user_tag', utils.escapeString(usr.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
    },
    {
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.unban',
      },
    },
  );
  registerChatSubCallback(cmdGroup, 'inf', (subCommandGroup) => {
    registerChatRaw(
      subCommandGroup,
      'recent',
      async (msg) => {
        const res:any = await msg.inlineReply(async () => {
          const infs = (await infsPool.getAll<Infraction>(null));
          if (infs.length === 0) {
            return { content: i18n.modules.infractions.inf_terms.no_infractions };
          }
          const last10 = infs.slice(0, Math.min(infs.length, 10));
          let txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_recent, ['count', Math.min(last10.length, 10).toString()]);
          last10.map((inf) => {
            txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' ? i18n.ranks.system : `${inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`}`} **>** <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
          });
          const remaining = infs.length - last10.length;
          if (remaining > 0) {
            txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
          }
          const emb = new discord.Embed();
          emb.setDescription(txt);
          emb.setTimestamp(new Date().toISOString());
          return { embed: emb, allowedMentions: {}, content: '' };
        });
        saveMessage(res);
      },
      {
        permissions: {
          level: Ranks.Moderator,
          overrideableInfo: 'infractions.inf.recent',
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      'active',
      async (msg) => {
        const res:any = await msg.inlineReply(async () => {
          const infs = (await infsPool.getByQuery<Infraction>({ active: true }));
          if (infs.length === 0) {
            return { content: i18n.modules.infractions.inf_terms.cant_find_infractions };
          }
          const last10 = infs.slice(0, Math.min(infs.length, 10));
          let txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_active, ['count', Math.min(last10.length, 10).toString()]);
          last10.map((inf) => {
            txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`} **>** <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
          });
          const remaining = infs.length - last10.length;
          if (remaining > 0) {
            txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
          }
          const emb = new discord.Embed();
          emb.setDescription(txt);
          emb.setTimestamp(new Date().toISOString());
          return { embed: emb, allowedMentions: {}, content: '' };
        });
        saveMessage(res);
      },
      {
        permissions: {
          level: Ranks.Moderator,
          overrideableInfo: 'infractions.inf.active',
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'info',
      (ctx) => ({ id: ctx.string() }),
      async (msg, { id }) => {
        const res:any = await msg.inlineReply(async () => {
          let infs;
          if (id.toLowerCase() === 'ml') {
            infs = (await infsPool.getByQuery<Infraction>({ actorId: msg.author.id }));
            if (infs.length > 0) {
              infs = [infs[0]];
            }
          } else {
            infs = (await infsPool.getByQuery<Infraction>({ id }));
          }
          if (infs.length !== 1) {
            return { content: i18n.modules.infractions.inf_terms.inf_not_found };
          }
          const inf = infs[0];
          const txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_info, ['inf_id', inf.id, 'actor_tag', inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`, 'actor_id', inf.actorId, 'target_mention', `<@!${inf.memberId}>`, 'target_id', inf.memberId, 'type', inf.type.toUpperCase(), 'active', inf.active, 'created_date', new Date(inf.ts).toISOString(), 'expires', inf.expiresAt !== inf.id && typeof inf.expiresAt === 'string' ? new Date(utils.decomposeSnowflake(inf.expiresAt).timestamp) : 'Never', 'reason', inf.reason]);
          const emb = new discord.Embed();
          emb.setDescription(txt);
          emb.setTimestamp(new Date().toISOString());
          return { embed: emb, allowedMentions: {}, content: '' };
        });
        saveMessage(res);
      },
      {
        permissions: {
          level: Ranks.Moderator,
          overrideableInfo: 'infractions.inf.info',
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'duration',
      (ctx) => ({ id: ctx.string(), duration: ctx.string() }),
      async (msg, { id, duration }) => {
        const res:any = await msg.inlineReply(async () => {
          const dur = utils.timeArgumentToMs(duration);
          if (dur === 0) {
            return i18n.modules.admin.duration_malformed;
          }
          if (dur < 1000 || dur > 365 * 24 * 60 * 60 * 1000) {
            return i18n.modules.infractions.inf_terms.exceeds_duration;
          }
          let infs;
          if (id.toLowerCase() === 'ml') {
            infs = (await infsPool.getByQuery<Infraction>({ actorId: msg.author.id }));
            if (infs.length > 0) {
              infs = [infs[0]];
            }
          } else {
            infs = (await infsPool.getByQuery<Infraction>({ id }));
          }
          if (infs.length !== 1) {
            return i18n.modules.infractions.inf_terms.inf_not_found;
          }
          const inf: Infraction = utils.makeFake(infs[0], Infraction);
          if (!inf.active) {
            return i18n.modules.infractions.inf_terms.inf_not_active;
          }
          if (inf.actorId !== msg.author.id && typeof config.modules.infractions.targeting.othersEditLevel === 'number' && getUserAuth(msg.member) < config.modules.infractions.targeting.othersEditLevel) {
            return i18n.modules.infractions.inf_terms.cannot_edit_inf;
          }
          inf.expiresAt = utils.composeSnowflake(inf.ts + dur);
          await inf.updateStorage();

          const extras = new Map<string, any>();
          extras.set('ACTORTAG', logUtils.getActorTag(msg.author));
          extras.set('ACTOR', msg.author);
          extras.set('ACTOR_ID', msg.author.id);
          extras.set('INFRACTION_ID', inf.id);
          extras.set('TYPE', 'duration');
          extras.set('NEW_VALUE', utils.escapeString(duration, true));
          logCustom('INFRACTIONS', 'EDITED', extras);
          return i18n.modules.infractions.inf_terms.inf_duration_updated;
        });
        saveMessage(res);
      },
      {
        permissions: {
          level: Ranks.Moderator,
          overrideableInfo: 'infractions.inf.duration',
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'reason',
      (ctx) => ({ id: ctx.string(), reason: ctx.text() }),
      async (msg, { id, reason }) => {
        const res:any = await msg.inlineReply(async () => {
          let infs;
          if (id.toLowerCase() === 'ml') {
            infs = (await infsPool.getByQuery<Infraction>({ actorId: msg.author.id }));
            if (infs.length > 0) {
              infs = [infs[0]];
            }
          } else {
            infs = (await infsPool.getByQuery<Infraction>({ id }));
          }
          if (infs.length !== 1) {
            return i18n.modules.infractions.inf_terms.inf_not_found;
          }
          const inf: Infraction = utils.makeFake(infs[0], Infraction);

          if (inf.actorId !== msg.author.id && typeof config.modules.infractions.targeting.othersEditLevel === 'number' && getUserAuth(msg.member) < config.modules.infractions.targeting.othersEditLevel) {
            return i18n.modules.infractions.inf_terms.cannot_edit_inf;
          }
          inf.reason = reason;
          await inf.updateStorage();
          const extras = new Map<string, any>();
          extras.set('ACTORTAG', logUtils.getActorTag(msg.author));
          extras.set('ACTOR_ID', msg.author.id);
          extras.set('ACTOR', msg.author);
          extras.set('USER_ID', msg.author.id);
          extras.set('INFRACTION_ID', inf.id);
          extras.set('TYPE', 'reason');
          extras.set('NEW_VALUE', utils.escapeString(reason, true));
          logCustom('INFRACTIONS', 'EDITED', extras);
          return i18n.modules.infractions.inf_terms.inf_reason_updated;
        });
        saveMessage(res);
      },
      {
        permissions: {
          level: Ranks.Moderator,
          overrideableInfo: 'infractions.inf.reason',
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'actor',
      (ctx) => ({ id: ctx.string(), actor: ctx.user() }),
      async (msg, { id, actor }) => {
        const res:any = await msg.inlineReply(async () => {
          let infs;
          if (id.toLowerCase() === 'ml') {
            infs = (await infsPool.getByQuery<Infraction>({ actorId: msg.author.id }));
            if (infs.length > 0) {
              infs = [infs[0]];
            }
          } else {
            infs = (await infsPool.getByQuery<Infraction>({ id }));
          }
          if (infs.length !== 1) {
            return i18n.modules.infractions.inf_terms.inf_not_found;
          }
          const inf: Infraction = utils.makeFake(infs[0], Infraction);

          if (typeof config.modules.infractions.targeting.othersEditLevel === 'number' && getUserAuth(msg.member) < config.modules.infractions.targeting.othersEditLevel) {
            return i18n.modules.infractions.inf_terms.cannot_edit_inf;
          }
          if (actor.id === discord.getBotId()) {
            return i18n.modules.infractions.inf_terms.cannot_assign_system;
          }
          inf.actorId = actor.id;
          await inf.updateStorage();

          const extras = new Map<string, any>();
          extras.set('ACTORTAG', logUtils.getActorTag(msg.author));
          extras.set('ACTOR_ID', msg.author.id);
          extras.set('ACTOR', msg.author);
          extras.set('USER_ID', msg.author.id);
          extras.set('INFRACTION_ID', inf.id);
          extras.set('TYPE', 'actor');
          extras.set('NEW_VALUE', actor.toMention());
          logCustom('INFRACTIONS', 'EDITED', extras);
          return i18n.modules.infractions.inf_terms.inf_actor_updated;
        });
        saveMessage(res);
      },
      {
        permissions: {
          level: Ranks.Moderator,
          overrideableInfo: 'infractions.inf.actor',
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'delete',
      (ctx) => ({ id: ctx.string() }),
      async (msg, { id }) => {
        const res:any = await msg.inlineReply(async () => {
          let infs;
          if (id.toLowerCase() === 'ml') {
            infs = (await infsPool.getByQuery<Infraction>({ actorId: msg.author.id }));
            if (infs.length > 0) {
              infs = [infs[0]];
            }
          } else {
            infs = (await infsPool.getByQuery<Infraction>({ id }));
          }
          if (infs.length !== 1) {
            return i18n.modules.infractions.inf_terms.inf_not_found;
          }
          const inf: Infraction = infs[0];
          if (inf.actorId !== msg.author.id && typeof config.modules.infractions.targeting.othersEditLevel === 'number' && getUserAuth(msg.member) < config.modules.infractions.targeting.othersEditLevel) {
            return i18n.modules.infractions.inf_terms.cannot_edit_inf;
          }
          await infsPool.delete(inf.id);
          const extras = new Map<string, any>();
          extras.set('ACTORTAG', logUtils.getActorTag(msg.author));
          extras.set('ACTOR', msg.author);
          extras.set('ACTOR_ID', msg.author.id);
          extras.set('USER_ID', msg.author.id);
          extras.set('INFRACTION_ID', inf.id);
          logCustom('INFRACTIONS', 'DELETED', extras);
          return i18n.modules.infractions.inf_terms.inf_deleted;
        });
        saveMessage(res);
      },
      {
        permissions: {
          level: Ranks.Administrator,
          overrideableInfo: 'infractions.inf.delete',
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'clearuser',
      (ctx) => ({ user: ctx.user() }),
      async (msg, { user }) => {
        const res:any = await msg.inlineReply(async () => {
          const infs = (await infsPool.getByQuery<Infraction>({ memberId: user.id }));
          if (!infs || infs.length === 0) {
            return i18n.modules.infractions.inf_terms.cant_find_infractions;
          }
          await infsPool.editPools<Infraction>(infs.map((v) => v.id), () => null);
          return setPlaceholders(i18n.modules.infractions.inf_terms.infs_deleted, ['count', infs.length.toString()]);
        });
        saveMessage(res);
      },
      {
        permissions: {
          level: Ranks.Administrator,
          overrideableInfo: 'infractions.inf.clearuser',
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'clearactor',
      (ctx) => ({ actor: ctx.user() }),
      async (msg, { actor }) => {
        const res:any = await msg.inlineReply(async () => {
          const infs = (await infsPool.getByQuery<Infraction>({ actorId: actor.id }));
          if (!infs || infs.length === 0) {
            return i18n.modules.infractions.inf_terms.cant_find_infractions;
          }
          await infsPool.editPools<Infraction>(infs.map((v) => v.id), () => null);
          return setPlaceholders(i18n.modules.infractions.inf_terms.infs_deleted, ['count', infs.length.toString()]);
        });
        saveMessage(res);
      },
      {
        permissions: {
          level: Ranks.Administrator,
          overrideableInfo: 'infractions.inf.clearactor',
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      'clearall',
      async (msg) => {
        const res:any = await msg.inlineReply(async () => {
          const infs = (await infsPool.getAll(null));
          if (infs.length === 0) {
            return i18n.modules.infractions.inf_terms.cant_find_infractions;
          }
          await infsPool.clear();
          return setPlaceholders(i18n.modules.infractions.inf_terms.infs_deleted, ['count', infs.length.toString()]);
        });
        saveMessage(res);
      },
      {
        permissions: {
          level: Ranks.Owner,
          overrideableInfo: 'infractions.inf.clearall',
        },
      },
    );
    registerChatSubCallback(subCommandGroup, 'search', (subCommandGroup2) => {
      registerChatOn(
        subCommandGroup2,
        'actor',
        (ctx) => ({ actor: ctx.user() }),
        async (msg, { actor }) => {
          const res:any = await msg.inlineReply(async () => {
            const infs = (await infsPool.getByQuery<Infraction>({ actorId: actor.id === discord.getBotId() ? discord.getBotId() : actor.id }));
            if (infs.length === 0) {
              return { content: i18n.modules.infractions.inf_terms.no_infs_by_actor };
            }
            const last10 = infs.slice(0, Math.min(infs.length, 10));
            let txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_search_actor, ['count', Math.min(last10.length, 10).toString(), 'actor_mention', actor.id === discord.getBotId() ? i18n.ranks.system : actor.toMention()]);
            last10.map((inf) => {
              txt += `\n**[**||\`${inf.id}\`||**]** - <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
            });
            const remaining = infs.length - last10.length;
            if (remaining > 0) {
              txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
            }
            const emb = new discord.Embed();
            emb.setDescription(txt);
            emb.setAuthor({ name: actor.getTag(), iconUrl: actor.getAvatarUrl() });
            emb.setTimestamp(new Date().toISOString());

            return { embed: emb, allowedMentions: {}, content: '' };
          });
          saveMessage(res);
        },
        {
          permissions: {
            level: Ranks.Moderator,
            overrideableInfo: 'infractions.inf search.actor',
          },
        },
      );
      registerChatRaw(
        subCommandGroup2,
        'system',
        async (msg) => {
          const res:any = await msg.inlineReply(async () => {
            const infs = (await infsPool.getByQuery<Infraction>({ actorId: discord.getBotId() }));
            if (infs.length === 0) {
              return { content: i18n.modules.infractions.inf_terms.no_infs_by_system };
            }
            const last10 = infs.slice(0, Math.min(infs.length, 10));
            let txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_search_system, ['count', Math.min(last10.length, 10).toString()]);
            last10.map((inf) => {
              txt += `\n**[**||\`${inf.id}\`||**]** - <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
            });
            const remaining = infs.length - last10.length;
            if (remaining > 0) {
              txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
            }
            const emb = new discord.Embed();
            emb.setDescription(txt);
            emb.setAuthor({ name: i18n.ranks.system });
            emb.setTimestamp(new Date().toISOString());

            return { embed: emb, allowedMentions: {}, content: '' };
          });
          saveMessage(res);
        },
        {
          permissions: {
            level: Ranks.Moderator,
            overrideableInfo: 'infractions.inf search.system',
          },
        },
      );
      registerChatOn(
        subCommandGroup2,
        'user',
        (ctx) => ({ user: ctx.user() }),
        async (msg, { user }) => {
          const res:any = await msg.inlineReply(async () => {
            const infs = await infsPool.getByQuery<Infraction>({ memberId: user.id });
            if (infs.length === 0) {
              return { content: i18n.modules.infractions.inf_terms.no_infs_to_user };
            }
            const last10 = infs.slice(0, Math.min(infs.length, 10));
            let txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_search_user, ['count', Math.min(last10.length, 10).toString(), 'user_mention', user.toMention()]);
            last10.map((inf) => {
              txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`} - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
            });
            const remaining = infs.length - last10.length;
            if (remaining > 0) {
              txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
            }
            const emb = new discord.Embed();
            emb.setDescription(txt);
            emb.setAuthor({ name: user.getTag(), iconUrl: user.getAvatarUrl() });
            emb.setTimestamp(new Date().toISOString());

            return { embed: emb, allowedMentions: {}, content: '' };
          });
          saveMessage(res);
        },
        {
          permissions: {
            level: Ranks.Moderator,
            overrideableInfo: 'infractions.inf search.user',
          },
        },
      );
      registerChatOn(
        subCommandGroup2,
        'type',
        (ctx) => ({ type: ctx.string() }),
        async (msg, { type }) => {
          const res:any = await msg.inlineReply(async () => {
            const infs = await infsPool.getByQuery<Infraction>({ type: type.toUpperCase() });
            if (infs.length === 0) {
              return { content: i18n.modules.infractions.inf_terms.no_infs_type };
            }
            const last10 = infs.slice(0, Math.min(infs.length, 10));
            let txt = setPlaceholders(i18n.modules.infractions.inf_terms.infs_search_type, ['count', Math.min(last10.length, 10).toString(), 'type', `${type.substr(0, 1).toUpperCase()}${type.substr(1).toLowerCase()}`]);
            last10.map((inf) => {
              txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`} **>** <@!${inf.memberId}>${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
            });
            const remaining = infs.length - last10.length;
            if (remaining > 0) {
              txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
            }
            const emb = new discord.Embed();
            emb.setDescription(txt);
            emb.setTimestamp(new Date().toISOString());

            return { embed: emb, allowedMentions: {}, content: '' };
          });
          saveMessage(res);
        },
        {
          permissions: {
            level: Ranks.Moderator,
            overrideableInfo: 'infractions.inf search.type',
          },
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
      const query = (await infsPool.getByQuery<Infraction>({
        memberId: member.user.id,
        active: true,
      })).filter((inf) => inf.type === InfractionType.TEMPMUTE || inf.type === InfractionType.MUTE);
      if (query.length > 0) {
        const promises: Promise<boolean>[] = [];
        query.forEach((inf) => {
          inf = utils.makeFake<Infraction>(inf, Infraction);
          promises.push(inf.checkActive());
        });
        await Promise.all(promises);
      }
      if (!config.modules.infractions.checkLogs || !(log instanceof discord.AuditLogEntry) || log.userId === discord.getBotId() || (member.user.id === log.userId && member.user.bot)) {
        return;
      }
      if (!isIgnoredActor(log.userId) && !isIgnoredUser(member.user)) {
        await logAction('unmute', log.user, member.user, new Map([['REASON', log.reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(log.reason, true)]) : '']]), id);
      }
    } else if (member.roles.includes(config.modules.infractions.muteRole) && !oldMember.roles.includes(config.modules.infractions.muteRole)) {
      // mute role added
      if (!config.modules.infractions.checkLogs || !(log instanceof discord.AuditLogEntry) || log.userId === discord.getBotId() || (member.user.id === log.userId && member.user.bot)) {
        return;
      }

      await addInfraction(member, log.user, InfractionType.MUTE, undefined, log.reason);
      if (!isIgnoredActor(log.userId) && !isIgnoredUser(member.user)) {
        await logAction('mute', log.user, member.user, new Map([['REASON', log.reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(log.reason, true)]) : '']]), id);
      }
      return;
    }
    if (!config.modules.infractions.checkLogs || !config.modules.infractions.integrate || !(log instanceof discord.AuditLogEntry) || log.userId === discord.getBotId() || member.nick === oldMember.nick || typeof member.nick !== 'string' || member.user.id === log.userId || utils.isBlacklisted(log.user)) {
      return;
    }
    const changedNick = member.nick.toLowerCase();
    const gm = await (await discord.getGuild(guildId))!.getMember(log.userId);
    if (!gm) {
      return;
    }
    if (changedNick === 'unmute' && member.roles.includes(config.modules.infractions.muteRole)) {
      const res = await UnMute(member, gm, '');
      if (res === true) {
        await member.edit({ nick: oldMember.nick! });
      }
    } else if (changedNick === 'mute' && !member.roles.includes(config.modules.infractions.muteRole)) {
      const res = await Mute(member, gm, '');
      if (res === true) {
        await member.edit({ nick: oldMember.nick! });
      }
    } else if (changedNick.substr(0, 5) === 'mute ' && changedNick.length >= 6 && !member.roles.includes(config.modules.infractions.muteRole)) {
      const time = changedNick.substr(5);

      const res = await TempMute(member, gm, time, '');
      if (res === true) {
        await member.edit({ nick: oldMember.nick! });
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
  await logAction('kick', log.user, memberRemove.user, new Map([['REASON', log.reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(log.reason, true)]) : '']]), id);
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
        await logAction('softban', log.user, ban.user, new Map([['DELETE_DAYS', 'unknown'], ['REASON', reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]), id);
        return;
      }
      const dur = utils.timeArgumentToMs(lastc);
      if (dur > 1000 && dur < 365 * 24 * 60 * 60 * 1000 && dur !== 0) {
        reason = newr.join('-').slice(0, -1);
        if (reason.substr(reason.length - 1, 1) === ' ') {
          reason = reason.slice(0, -1);
        }
        const expiresAt = utils.composeSnowflake(Date.now() + dur);
        const durationText = utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second);
        await addInfraction(ban.user, log.user, InfractionType.TEMPBAN, expiresAt, reason);
        await logAction('tempban', log.user, ban.user, new Map([['DELETE_DAYS', 'unknown'], ['EXPIRES', ''], ['DURATION', durationText], ['REASON', typeof reason === 'string' && reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]), id);
        return;
      }
    }
  }
  await addInfraction(ban.user, log.user, InfractionType.BAN, undefined, reason);
  if (isIgnoredActor(log.userId) || isIgnoredUser(ban.user)) {
    return;
  }
  await logAction('ban', log.user, ban.user, new Map([['REASON', reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']]), id);
}

export async function AL_OnGuildBanRemove(
  id: string,
  gid: string,
  log: any,
  ban: discord.GuildBan,
  oldMember: discord.GuildMember,
) {
  const query = (await infsPool.getByQuery<Infraction>({
    memberId: ban.user.id,
    active: true,
  })).filter((inf) => inf.type === InfractionType.BAN || inf.type === InfractionType.TEMPBAN);
  if (query.length > 0) {
    const promises: Promise<boolean>[] = [];
    query.forEach((inf) => {
      inf = utils.makeFake<Infraction>(inf, Infraction);
      promises.push(inf.checkActive());
    });
    await Promise.all(promises);
  }
  if (!config.modules.infractions.checkLogs || !(log instanceof discord.AuditLogEntry) || log.userId === discord.getBotId() || isIgnoredActor(log.userId) || isIgnoredUser(ban.user)) {
    return;
  }
  await logAction('unban', log.user, ban.user, new Map([['REASON', log.reason !== '' ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(log.reason, true)]) : '']]), id);
}

registerSlash(
  { name: 'kick',
    description: 'Kicks a member from the server',
    options: (ctx) => ({ member: ctx.guildMember({ required: true, description: 'The member to kick' }), reason: ctx.string({ required: false, description: 'The reason' }) }) },
  async (inter, { member, reason }) => {
    if (typeof reason !== 'string') {
      reason = '';
    }
    const result = await Kick(member, inter.member, reason);
    if (result === false) {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, i18n.modules.infractions.inf_terms.failed_kick);
      return false;
    }
    if (typeof result === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, result);
      return false;
    }
    await inter.acknowledge({ ephemeral: false });
    await confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.infractions.inf_terms.kicked_member, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
  }, {
    module: 'infractions',
    permissions: {
      overrideableInfo: 'infractions.kick',
      level: Ranks.Moderator,
    },
  },
);

registerSlash(
  { name: 'mute', description: 'Mutes a member', options: (ctx) => ({ member: ctx.guildMember({ required: true, description: 'The member to mute' }), reason: ctx.string({ required: false, description: 'The reason' }) }) },
  async (inter, { member, reason }) => {
    if (typeof reason !== 'string') {
      reason = '';
    }
    let result;
    if (typeof (result) === 'undefined') {
      result = await Mute(member, inter.member, reason);
    }
    if (result === false) {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, i18n.modules.infractions.inf_terms.failed_mute);
      return false;
    }
    if (typeof result === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, result);
      return false;
    }
    await inter.acknowledge({ ephemeral: false });
    await confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.infractions.inf_terms.muted_member, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
  }, {
    module: 'infractions',
    permissions: {
      overrideableInfo: 'infractions.mute',
      level: Ranks.Moderator,
    },
  },
);

registerSlash(
  { name: 'tempmute', description: 'Tempmutes a member', options: (ctx) => ({ member: ctx.guildMember({ required: true, description: 'The member to tempmute' }), time: ctx.string({ required: true, description: 'Time to mute for (1h30m format)' }), reason: ctx.string({ required: false, description: 'The reason' }) }) },
  async (inter, { member, time, reason }) => {
    if (typeof reason !== 'string') {
      reason = '';
    }
    const result = await TempMute(member, inter.member, time, reason);
    if (result === false) {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, i18n.modules.infractions.inf_terms.failed_tempmute);
      return false;
    }
    if (typeof result === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, result);
      return false;
    }
    await inter.acknowledge({ ephemeral: false });
    const dur = utils.timeArgumentToMs(time);
    const durationText = utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second);
    await confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.infractions.inf_terms.temp_muted_member, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '', 'duration', durationText]));
  }, {
    module: 'infractions',
    permissions: {
      overrideableInfo: 'infractions.tempmute',
      level: Ranks.Moderator,
    },
  },
);

registerSlash(
  { name: 'unmute', description: 'Unmutes a member', options: (ctx) => ({ member: ctx.guildMember({ required: true, description: 'The member to Unmute' }), reason: ctx.string({ required: false, description: 'The reason' }) }) },
  async (inter, { member, reason }) => {
    if (typeof reason !== 'string') {
      reason = '';
    }
    const result = await UnMute(member, inter.member, reason);
    if (result === false) {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, i18n.modules.infractions.inf_terms.failed_unmute);
      return false;
    }
    if (typeof result === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, result);
      return false;
    }
    await inter.acknowledge({ ephemeral: false });
    await confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.infractions.inf_terms.unmuted_member, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
  }, {
    module: 'infractions',
    permissions: {
      overrideableInfo: 'infractions.unmute',
      level: Ranks.Moderator,
    },
  },
);

registerSlash(
  { name: 'ban', description: 'Ban a member', options: (ctx) => ({ member: ctx.guildMember({ required: true, description: 'The member to ban' }), reason: ctx.string({ required: false, description: 'The reason' }) }) },
  async (inter, { member, reason }) => {
    if (typeof reason !== 'string') {
      reason = '';
    }
    const _del: any = typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0; // fuck off TS
    const result = await Ban(member, inter.member, _del, reason);
    if (result === false) {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, i18n.modules.infractions.inf_terms.failed_ban);
      return false;
    }
    if (typeof result === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, result);
      return false;
    }
    await inter.acknowledge({ ephemeral: false });
    await confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.infractions.inf_terms.banned_user, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
  }, {
    module: 'infractions',
    permissions: {
      overrideableInfo: 'infractions.ban',
      level: Ranks.Moderator,
    },
  },
);

registerSlash(
  { name: 'massban',
    description: 'Massbans a bunch of users by their ids',
    options: (ctx) => ({
      ids: ctx.string({ required: true, description: 'IDs of users to ban, space seperated' }),
      delete_days: ctx.integer({ required: true, description: 'Days of messages to delete', choices: [0, 1, 2, 3, 4, 5, 6, 7] }),
      reason: ctx.string({ required: false, description: 'The reason' }),
    }) },
  async (inter, { ids, reason, delete_days }) => {
    const _ids: string[] = [];
    ids.split(' ').forEach((test) => {
      const rmpossible = test.split('@').join('').split('<').join('')
        .split('>')
        .join('')
        .split('!')
        .join('');
      if (utils.isNumber(rmpossible)) {
        ids.push(rmpossible);
      }
    });
    ids = [...new Set(ids)]; // remove duplicates
    if (ids.length < 2) {
      await inter.acknowledge({ ephemeral: true });
      await inter.respondEphemeral(i18n.modules.infractions.inf_terms.massban_ids);
      return false;
    }
    await inter.acknowledge({ ephemeral: false });
    const objs: any[] = [];
    const failNotFound: string[] = [];
    const guild = await inter.getGuild();
    await Promise.all(_ids.map(async (id) => {
      const gm = await guild.getMember(id);
      if (gm !== null) {
        objs.push(gm);
        return;
      }
      const usr = await utils.getUser(id);
      if (usr !== null) {
        objs.push(usr);
        return;
      }
      failNotFound.push(id);
    }));

    const _del: any = delete_days; // fuck off TS
    const result = await MassBan(objs, inter.member, _del, reason);
    await confirmResultInteraction(undefined, inter, null, setPlaceholders(i18n.modules.infractions.inf_terms.massbanned, ['banned_success_count', result.success.length.toString(), 'banned_success', result.success.join(', '), 'banned_fail_count', result.fail.length.toString(), 'banned_fail', result.fail.join(', '), 'banned_unknown_count', failNotFound.length.toString(), 'banned_unknown', failNotFound.join(', ')]));
  }, {
    module: 'infractions',
    permissions: {
      overrideableInfo: 'infractions.massban',
      level: Ranks.Administrator,
    },
  },
);

registerSlash(
  { name: 'cleanban',
    description: 'Ban a member and clean X days of their messages',
    options: (ctx) => ({
      member: ctx.guildMember({ required: true, description: 'The member to cleanban' }),
      delete_days: ctx.integer({ required: true, description: 'Days of messages to delete', choices: [0, 1, 2, 3, 4, 5, 6, 7] }),
      reason: ctx.string({ required: false, description: 'The reason' }) }) },
  async (inter, { member, delete_days, reason }) => {
    if (typeof reason !== 'string') {
      reason = '';
    }
    const _del: any = delete_days; // fuck off TS
    const result = await Ban(member, inter.member, _del, reason);
    if (result === false) {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, i18n.modules.infractions.inf_terms.failed_cleanban);
      return false;
    }
    if (typeof result === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, result);
      return false;
    }
    await inter.acknowledge({ ephemeral: false });
    await confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.infractions.inf_terms.clean_banned_member, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
  }, {
    module: 'infractions',
    permissions: {
      overrideableInfo: 'infractions.cleanban',
      level: Ranks.Moderator,
    },
  },
);

registerSlash(
  { name: 'softban',
    description: 'Ban a member and unban right after, clearing X days of messages',
    options: (ctx) => ({
      member: ctx.guildMember({ required: true, description: 'The member to softban' }),
      delete_days: ctx.integer({ required: true, description: 'Days of messages to delete', choices: [0, 1, 2, 3, 4, 5, 6, 7] }),
      reason: ctx.string({ required: false, description: 'The reason' }) }) },
  async (inter, { member, delete_days, reason }) => {
    if (typeof reason !== 'string') {
      reason = '';
    }
    const _del: any = delete_days; // fuck off TS
    const result = await SoftBan(member, inter.member, _del, reason);
    if (result === false) {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, i18n.modules.infractions.inf_terms.failed_softban);
      return false;
    }
    if (typeof result === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, result);
      return false;
    }
    await inter.acknowledge({ ephemeral: false });
    await confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.infractions.inf_terms.softbanned_user, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
  }, {
    module: 'infractions',
    permissions: {
      overrideableInfo: 'infractions.softban',
      level: Ranks.Moderator,
    },
  },
);

registerSlash(
  { name: 'tempban',
    description: 'Ban a member for X amount of time',
    options: (ctx) => ({
      member: ctx.guildMember({ required: true, description: 'The member to tempban' }),
      time: ctx.string({ required: true, description: 'Time to ban the member for (in 1h30m format)' }),
      reason: ctx.string({ required: false, description: 'The reason' }) }) },
  async (inter, { member, time, reason }) => {
    if (typeof reason !== 'string') {
      reason = '';
    }
    const _del: any = typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0; // fuck off TS
    const result = await TempBan(member, inter.member, _del, time, reason);
    if (result === false) {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, i18n.modules.infractions.inf_terms.failed_tempban);
      return false;
    }
    if (typeof result === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, result);
      return false;
    }
    await inter.acknowledge({ ephemeral: false });
    const dur = utils.timeArgumentToMs(time);
    const durationText = utils.getLongAgoFormat(dur, 2, false, i18n.time_units.ti_full.singular.second);
    await confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.infractions.inf_terms.tempbanned_user, ['user_tag', utils.escapeString(member.user.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '', 'duration', durationText]));
  }, {
    module: 'infractions',
    permissions: {
      overrideableInfo: 'infractions.tempban',
      level: Ranks.Moderator,
    },
  },
);

registerSlash(
  { name: 'unban',
    description: 'Unban a member',
    options: (ctx) => ({
      user_id: ctx.string({ required: true, description: 'The user ID to unban' }),

      reason: ctx.string({ required: false, description: 'The reason' }) }) },
  async (inter, { user_id, reason }) => {
    const usr = await utils.getUser(user_id.replace(/\D/g, ''));
    if (!usr) {
      await inter.acknowledge({ ephemeral: true });
      await inter.respondEphemeral(i18n.modules.infractions.inf_terms.user_not_found);
      return false;
    }
    let member: discord.User | discord.GuildMember | null = await (await inter.getGuild()).getMember(usr.id);
    if (!member) {
      member = usr;
    }
    if (typeof reason !== 'string') {
      reason = '';
    }
    const result = await UnBan(member, inter.member, reason);
    if (result === false) {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, i18n.modules.infractions.inf_terms.failed_unban);
      return false;
    }
    if (typeof result === 'string') {
      await inter.acknowledge({ ephemeral: true });
      await confirmResultInteraction(undefined, inter, false, result);
      return false;
    }
    await inter.acknowledge({ ephemeral: false });
    await confirmResultInteraction(undefined, inter, true, setPlaceholders(i18n.modules.infractions.inf_terms.unbanned_user, ['user_tag', utils.escapeString(usr.getTag(), true), 'reason', reason ? setPlaceholders(i18n.modules.infractions.inf_terms.with_reason, ['reason', utils.escapeString(reason, true)]) : '']));
  }, {
    module: 'infractions',
    permissions: {
      overrideableInfo: 'infractions.unban',
      level: Ranks.Moderator,
    },
  },
);

const infGroup = registerSlashGroup(
  { name: 'inf', description: 'Infractions management and visualization commands' },
  {
    module: 'infractions',
  },
);
if (infGroup) {
  registerSlashSub(
    infGroup,
    {
      name: 'recent',
      description: 'Shows the latest 10 infractions',
    },
    async (inter) => {
      const infs = (await infsPool.getAll<Infraction>(null));
      if (infs.length === 0) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.no_infractions);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      const last10 = infs.slice(0, Math.min(infs.length, 10));
      let txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_recent, ['count', Math.min(last10.length, 10).toString()]);
      last10.map((inf) => {
        txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `${inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`}`} **>** <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
      });
      const remaining = infs.length - last10.length;
      if (remaining > 0) {
        txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
      }
      const emb = new discord.Embed();
      emb.setDescription(txt);
      emb.setTimestamp(new Date().toISOString());
      await interactionChannelRespond(inter, { embed: emb, allowedMentions: {}, content: '' });
    },
    {
      module: 'infractions',
      parent: 'inf',
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.inf.recent',
      },
    },
  );

  registerSlashSub(
    infGroup,
    {
      name: 'active',
      description: 'Shows currently active infractions (temporary ones)',
    },
    async (inter) => {
      const infs = (await infsPool.getByQuery<Infraction>({ active: true }));
      if (infs.length === 0) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral('There are no active infractions');
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      const last10 = infs.slice(0, Math.min(infs.length, 10));
      let txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_active, ['count', Math.min(last10.length, 10).toString()]);
      last10.map((inf) => {
        txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`} **>** <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
      });
      const remaining = infs.length - last10.length;
      if (remaining > 0) {
        txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
      }
      const emb = new discord.Embed();
      emb.setDescription(txt);
      emb.setTimestamp(new Date().toISOString());
      await interactionChannelRespond(inter, { embed: emb, allowedMentions: {}, content: '' });
    },
    {
      module: 'infractions',
      parent: 'inf',
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.inf.active',
      },
    },
  );

  registerSlashSub(
    infGroup,
    {
      name: 'info',
      description: 'Gets detailed info on a specific infraction',
      options: (ctx) => ({
        inf_id: ctx.string({ required: true, description: 'The ID of the infraction. You can also use `ml` to see info on your latest applied infraction' }),
      }),
    },
    async (inter, { inf_id }) => {
      let infs;
      if (inf_id.toLowerCase() === 'ml') {
        infs = (await infsPool.getByQuery<Infraction>({ actorId: inter.member.user.id }));
        if (infs.length > 0) {
          infs = [infs[0]];
        }
      } else {
        infs = (await infsPool.getByQuery<Infraction>({ id: inf_id }));
      }
      if (infs.length !== 1) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.inf_not_found);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      const inf = infs[0];
      const txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_info, ['inf_id', inf.id, 'actor_tag', inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`, 'actor_id', inf.actorId, 'target_mention', `<@!${inf.memberId}>`, 'target_id', inf.memberId, 'type', inf.type.toUpperCase(), 'active', inf.active, 'created_date', new Date(inf.ts).toISOString(), 'expires', inf.expiresAt !== inf.id && typeof inf.expiresAt === 'string' ? new Date(utils.decomposeSnowflake(inf.expiresAt).timestamp) : 'Never', 'reason', inf.reason]);
      const emb = new discord.Embed();
      emb.setDescription(txt);
      emb.setTimestamp(new Date().toISOString());
      await interactionChannelRespond(inter, { embed: emb, allowedMentions: {}, content: '' });
    },
    {
      module: 'infractions',
      parent: 'inf',
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.inf.info',
      },
    },
  );

  registerSlashSub(
    infGroup,
    {
      name: 'duration',
      description: 'Edit the duration on a infraction',
      options: (ctx) => ({
        inf_id: ctx.string({ required: true, description: 'The ID of the infraction. You can also use `ml` to see info on your latest applied infraction' }),
        duration: ctx.string({ required: true, description: 'The new duration for the infraction (in 1h30m format)' }),
      }),
    },
    async (inter, { inf_id, duration }) => {
      const dur = utils.timeArgumentToMs(duration);
      if (dur === 0) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.admin.duration_malformed);
        return false;
      }
      if (dur < 1000 || dur > 365 * 24 * 60 * 60 * 1000) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.exceeds_duration);
        return false;
      }
      let infs;
      if (inf_id.toLowerCase() === 'ml') {
        infs = (await infsPool.getByQuery<Infraction>({ actorId: inter.member.user.id }));
        if (infs.length > 0) {
          infs = [infs[0]];
        }
      } else {
        infs = (await infsPool.getByQuery<Infraction>({ id: inf_id }));
      }
      if (infs.length !== 1) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.inf_not_found);
        return false;
      }
      const inf: Infraction = utils.makeFake(infs[0], Infraction);
      if (!inf.active) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.inf_not_active);
        return false;
      }
      if (inf.actorId !== inter.member.user.id && typeof config.modules.infractions.targeting.othersEditLevel === 'number' && getUserAuth(inter.member) < config.modules.infractions.targeting.othersEditLevel) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.cannot_edit_inf);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      inf.expiresAt = utils.composeSnowflake(inf.ts + dur);
      await inf.updateStorage();

      const extras = new Map<string, any>();
      extras.set('ACTORTAG', logUtils.getActorTag(inter.member.user));
      extras.set('ACTOR', inter.member.user);
      extras.set('ACTOR_ID', inter.member.user.id);
      extras.set('INFRACTION_ID', inf.id);
      extras.set('TYPE', 'duration');
      extras.set('NEW_VALUE', utils.escapeString(duration, true));
      logCustom('INFRACTIONS', 'EDITED', extras);
      await interactionChannelRespond(inter, i18n.modules.infractions.inf_terms.inf_duration_updated);
    },
    {
      module: 'infractions',
      parent: 'inf',
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.inf.duration',
      },
    },
  );

  registerSlashSub(
    infGroup,
    {
      name: 'reason',
      description: 'Edit the reason on a infraction',
      options: (ctx) => ({
        inf_id: ctx.string({ required: true, description: 'The ID of the infraction. You can also use `ml` to see info on your latest applied infraction' }),
        reason: ctx.string({ required: true, description: 'The new reason for the infraction' }),
      }),
    },
    async (inter, { inf_id, reason }) => {
      let infs;
      if (inf_id.toLowerCase() === 'ml') {
        infs = (await infsPool.getByQuery<Infraction>({ actorId: inter.member.user.id }));
        if (infs.length > 0) {
          infs = [infs[0]];
        }
      } else {
        infs = (await infsPool.getByQuery<Infraction>({ id: inf_id }));
      }
      if (infs.length !== 1) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.inf_not_found);
        return false;
      }
      const inf: Infraction = utils.makeFake(infs[0], Infraction);
      if (!inf.active) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.inf_not_active);
        return false;
      }
      if (inf.actorId !== inter.member.user.id && typeof config.modules.infractions.targeting.othersEditLevel === 'number' && getUserAuth(inter.member) < config.modules.infractions.targeting.othersEditLevel) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.cannot_edit_inf);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });

      inf.reason = reason;
      await inf.updateStorage();
      const extras = new Map<string, any>();
      extras.set('ACTORTAG', logUtils.getActorTag(inter.member.user));
      extras.set('ACTOR_ID', inter.member.user.id);
      extras.set('ACTOR', inter.member.user);
      extras.set('USER_ID', inter.member.user.id);
      extras.set('INFRACTION_ID', inf.id);
      extras.set('TYPE', 'reason');
      extras.set('NEW_VALUE', utils.escapeString(reason, true));
      logCustom('INFRACTIONS', 'EDITED', extras);
      await interactionChannelRespond(inter, i18n.modules.infractions.inf_terms.inf_reason_updated);
    },
    {
      module: 'infractions',
      parent: 'inf',
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.inf.reason',
      },
    },
  );

  registerSlashSub(
    infGroup,
    {
      name: 'actor',
      description: 'Changes the registered actor on a given infraction',
      options: (ctx) => ({
        inf_id: ctx.string({ required: true, description: 'The ID of the infraction. You can also use `ml` to see info on your latest applied infraction' }),
        new_actor: ctx.guildMember({ required: true, description: 'The new actor for this infraction' }),
      }),
    },
    async (inter, { inf_id, new_actor }) => {
      let infs;
      if (inf_id.toLowerCase() === 'ml') {
        infs = (await infsPool.getByQuery<Infraction>({ actorId: inter.member.user.id }));
        if (infs.length > 0) {
          infs = [infs[0]];
        }
      } else {
        infs = (await infsPool.getByQuery<Infraction>({ id: inf_id }));
      }
      if (infs.length !== 1) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.inf_not_found);
        return false;
      }
      const inf: Infraction = utils.makeFake(infs[0], Infraction);

      if (typeof config.modules.infractions.targeting.othersEditLevel === 'number' && getUserAuth(inter.member) < config.modules.infractions.targeting.othersEditLevel) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.cannot_edit_inf);
        return false;
      }
      if (new_actor.user.id === discord.getBotId()) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.cannot_assign_system);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      inf.actorId = new_actor.user.id;
      await inf.updateStorage();

      const extras = new Map<string, any>();
      extras.set('ACTORTAG', logUtils.getActorTag(inter.member.user));
      extras.set('ACTOR_ID', inter.member.user.id);
      extras.set('ACTOR', inter.member.user);
      extras.set('USER_ID', inter.member.user.id);
      extras.set('INFRACTION_ID', inf.id);
      extras.set('TYPE', 'actor');
      extras.set('NEW_VALUE', new_actor.user.toMention());
      logCustom('INFRACTIONS', 'EDITED', extras);
      await interactionChannelRespond(inter, i18n.modules.infractions.inf_terms.inf_actor_updated);
    },
    {
      module: 'infractions',
      parent: 'inf',
      permissions: {
        level: Ranks.Moderator,
        overrideableInfo: 'infractions.inf.actor',
      },
    },
  );

  registerSlashSub(
    infGroup,
    {
      name: 'delete',
      description: 'Deletes a infraction',
      options: (ctx) => ({
        inf_id: ctx.string({ required: true, description: 'The ID of the infraction. You can also use `ml` to see info on your latest applied infraction' }),
      }),
    },
    async (inter, { inf_id }) => {
      let infs;
      if (inf_id.toLowerCase() === 'ml') {
        infs = (await infsPool.getByQuery<Infraction>({ actorId: inter.member.user.id }));
        if (infs.length > 0) {
          infs = [infs[0]];
        }
      } else {
        infs = (await infsPool.getByQuery<Infraction>({ id: inf_id }));
      }
      if (infs.length !== 1) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.inf_not_found);
        return false;
      }
      const inf: Infraction = infs[0];
      if (inf.actorId !== inter.member.user.id && typeof config.modules.infractions.targeting.othersEditLevel === 'number' && getUserAuth(inter.member) < config.modules.infractions.targeting.othersEditLevel) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.cannot_edit_inf);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      await infsPool.delete(inf.id);
      const extras = new Map<string, any>();
      extras.set('ACTORTAG', logUtils.getActorTag(inter.member.user));
      extras.set('ACTOR', inter.member.user);
      extras.set('ACTOR_ID', inter.member.user.id);
      extras.set('USER_ID', inter.member.user.id);
      extras.set('INFRACTION_ID', inf.id);
      logCustom('INFRACTIONS', 'DELETED', extras);
      await interactionChannelRespond(inter, i18n.modules.infractions.inf_terms.inf_deleted);
    },
    {
      module: 'infractions',
      parent: 'inf',
      permissions: {
        level: Ranks.Administrator,
        overrideableInfo: 'infractions.inf.delete',
      },
    },
  );

  registerSlashSub(
    infGroup,
    {
      name: 'clearuser',
      description: 'Clear every infraction applied to a specific user',
      options: (ctx) => ({
        user: ctx.guildMember({ required: true, description: 'The user to clear infractions from' }),
      }),
    },
    async (inter, { user }) => {
      user = user.id;
      const infs = (await infsPool.getByQuery<Infraction>({ memberId: user.id }));
      if (!infs || infs.length === 0) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.cant_find_infractions);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      await infsPool.editPools<Infraction>(infs.map((v) => v.id), () => null);
      await interactionChannelRespond(inter, setPlaceholders(i18n.modules.infractions.inf_terms.infs_deleted, ['count', infs.length.toString()]));
    },
    {
      module: 'infractions',
      parent: 'inf',
      permissions: {
        level: Ranks.Administrator,
        overrideableInfo: 'infractions.inf.clearuser',
      },
    },
  );

  registerSlashSub(
    infGroup,
    {
      name: 'clearactor',
      description: 'Clear every infraction applied by a specific actor',
      options: (ctx) => ({
        actor: ctx.guildMember({ required: true, description: 'The actor to clear infractions by' }),
      }),
    },
    async (inter, { actor }) => {
      actor = actor.user;
      const infs = (await infsPool.getByQuery<Infraction>({ actorId: actor.id }));
      if (!infs || infs.length === 0) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.infractions.inf_terms.cant_find_infractions);
        return false;
      }
      await inter.acknowledge({ ephemeral: false });
      await infsPool.editPools<Infraction>(infs.map((v) => v.id), () => null);
      await interactionChannelRespond(inter, setPlaceholders(i18n.modules.infractions.inf_terms.infs_deleted, ['count', infs.length.toString()]));
    },
    {
      module: 'infractions',
      parent: 'inf',
      permissions: {
        level: Ranks.Administrator,
        overrideableInfo: 'infractions.inf.clearactor',
      },
    },
  );

  /*
// Disabled due to subcmds limit of 10 (currently 11 !inf commands)

registerSlashSub(
  infGroup,
  {
    name: 'clearall',
    description: 'Clears every infraction on the server'
  },
  async (inter) => {
    const infs = (await infsPool.getAll(null));
    if (infs.length === 0) {
      await inter.acknowledge({ephemeral: true});
      await inter.respondEphemeral(`${discord.decor.Emojis.X} Could not find any infractions`);
      return;
    }
    await inter.acknowledge({ephemeral: false});
    await infsPool.clear();
    await interactionChannelRespond(inter, setPlaceholders(i18n.modules.infractions.inf_terms.infs_deleted, ['count', infs.length.toString()]));
  },
  {
    module: 'infractions',
    parent: 'inf',
    permissions: {
      level: Ranks.Owner,
      overrideableInfo: 'infractions.inf.clearall'
    }
  }
)
*/

  const infSearchGroup = registerSlashGroup(
    {
      name: 'search',
      description: 'Infraction search commands',
    },
    {
      module: 'infractions',
      parent: 'inf',
    },
    infGroup,
  );
  if (infSearchGroup) {
    registerSlashSub(
      infSearchGroup,
      {
        name: 'actor',
        description: 'Search infractions by the given actor',
        options: (ctx) => ({
          actor: ctx.guildMember({ required: true, description: 'The actor to search infractions by' }),
        }),
      },
      async (inter, { actor }) => {
        actor = actor.user;
        const infs = (await infsPool.getByQuery<Infraction>({ actorId: actor.id === discord.getBotId() ? discord.getBotId() : actor.id }));
        if (infs.length === 0) {
          await inter.acknowledge({ ephemeral: true });
          await inter.respondEphemeral(i18n.modules.infractions.inf_terms.no_infs_by_actor);
          return false;
        }
        await inter.acknowledge({ ephemeral: false });
        const last10 = infs.slice(0, Math.min(infs.length, 10));
        let txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_search_actor, ['count', Math.min(last10.length, 10).toString(), 'actor_mention', actor.id === discord.getBotId() ? i18n.ranks.system : actor.toMention()]);
        last10.map((inf) => {
          txt += `\n**[**||\`${inf.id}\`||**]** - <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
        });
        const remaining = infs.length - last10.length;
        if (remaining > 0) {
          txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
        }
        const emb = new discord.Embed();
        emb.setDescription(txt);
        emb.setAuthor({ name: actor.getTag(), iconUrl: actor.getAvatarUrl() });
        emb.setTimestamp(new Date().toISOString());

        await interactionChannelRespond(inter, { embed: emb, allowedMentions: {}, content: '' });
      },
      {
        module: 'infractions',
        parent: 'search',
        permissions: {
          level: Ranks.Moderator,
          overrideableInfo: 'infractions.inf search.actor',
        },
      },
    );

    registerSlashSub(
      infSearchGroup,
      {
        name: 'system',
        description: 'Search infractions applied by the bot automatically',
      },
      async (inter) => {
        const infs = (await infsPool.getByQuery<Infraction>({ actorId: discord.getBotId() }));
        if (infs.length === 0) {
          await inter.acknowledge({ ephemeral: true });
          await inter.respondEphemeral(i18n.modules.infractions.inf_terms.no_infs_by_system);
          return false;
        }
        await inter.acknowledge({ ephemeral: false });
        const last10 = infs.slice(0, Math.min(infs.length, 10));
        let txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_search_system, ['count', Math.min(last10.length, 10).toString()]);
        last10.map((inf) => {
          txt += `\n**[**||\`${inf.id}\`||**]** - <@!${inf.memberId}> - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
        });
        const remaining = infs.length - last10.length;
        if (remaining > 0) {
          txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
        }
        const emb = new discord.Embed();
        emb.setDescription(txt);
        emb.setAuthor({ name: i18n.ranks.system });
        emb.setTimestamp(new Date().toISOString());

        await interactionChannelRespond(inter, { embed: emb, allowedMentions: {}, content: '' });
      }, {
        module: 'infractions',
        parent: 'search',
        permissions: {
          level: Ranks.Moderator,
          overrideableInfo: 'infractions.inf search.system',
        },
      },
    );

    registerSlashSub(
      infSearchGroup,
      {
        name: 'user',
        description: 'Search infractions for the given user',
        options: (ctx) => ({
          user: ctx.guildMember({ required: true, description: 'The user to search infractions for' }),
        }),
      },
      async (inter, { user }) => {
        user = user.user;
        const infs = await infsPool.getByQuery<Infraction>({ memberId: user.id });
        if (infs.length === 0) {
          await inter.acknowledge({ ephemeral: true });
          await inter.respondEphemeral(i18n.modules.infractions.inf_terms.no_infs_to_user);
          return false;
        }
        await inter.acknowledge({ ephemeral: false });
        const last10 = infs.slice(0, Math.min(infs.length, 10));
        let txt = setPlaceholders(i18n.modules.infractions.inf_terms.inf_search_user, ['count', Math.min(last10.length, 10).toString(), 'user_mention', user.toMention()]);
        last10.map((inf) => {
          txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`} - **${inf.type.substr(0, 1).toUpperCase()}${inf.type.substr(1).toLowerCase()}**${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
        });
        const remaining = infs.length - last10.length;
        if (remaining > 0) {
          txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
        }
        const emb = new discord.Embed();
        emb.setDescription(txt);
        emb.setAuthor({ name: user.getTag(), iconUrl: user.getAvatarUrl() });
        emb.setTimestamp(new Date().toISOString());

        await interactionChannelRespond(inter, { embed: emb, allowedMentions: {}, content: '' });
      }, {
        module: 'infractions',
        parent: 'search',
        permissions: {
          level: Ranks.Moderator,
          overrideableInfo: 'infractions.inf search.user',
        },
      },
    );

    registerSlashSub(
      infSearchGroup,
      {
        name: 'type',
        description: 'Search infractions of a given type',
        options: (ctx) => ({
          type: ctx.string({ required: true, description: 'The infraction type', choices: Object.keys(InfractionType).map((v) => `${v.substr(0, 1).toUpperCase()}${v.substr(1).toLowerCase()}`) }),
        }),
      },
      async (inter, { type }) => {
        const infs = await infsPool.getByQuery<Infraction>({ type: type.toUpperCase() });
        if (infs.length === 0) {
          await inter.acknowledge({ ephemeral: true });
          await inter.respondEphemeral(i18n.modules.infractions.inf_terms.no_infs_type);
          return false;
        }
        await inter.acknowledge({ ephemeral: false });
        const last10 = infs.slice(0, Math.min(infs.length, 10));
        let txt = setPlaceholders(i18n.modules.infractions.inf_terms.infs_search_type, ['count', Math.min(last10.length, 10).toString(), 'type', type.substr(0, 1).toUpperCase()]);
        last10.map((inf) => {
          txt += `\n**[**||\`${inf.id}\`||**]** - ${inf.actorId === null || inf.actorId === 'SYSTEM' || inf.actorId === discord.getBotId() ? i18n.ranks.system : `<@!${inf.actorId}>`} **>** <@!${inf.memberId}>${typeof inf.reason === 'string' && inf.reason.length > 0 ? ` - \`${utils.escapeString(inf.reason, true)}\`` : ''}`;
        });
        const remaining = infs.length - last10.length;
        if (remaining > 0) {
          txt += setPlaceholders(i18n.modules.infractions.inf_terms.more_infs, ['remaining', remaining.toString()]);
        }
        const emb = new discord.Embed();
        emb.setDescription(txt);
        emb.setTimestamp(new Date().toISOString());

        await interactionChannelRespond(inter, { embed: emb, allowedMentions: {}, content: '' });
      },
      {
        module: 'infractions',
        parent: 'search',
        permissions: {
          level: Ranks.Moderator,
          overrideableInfo: 'infractions.inf search.type',
        },
      },
    );
  }
}
