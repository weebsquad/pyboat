import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks } from '../config';
import { logCustom } from './logging/events/custom';
import { CheckRole } from './disabled/cur';

export async function canTarget(actor: discord.GuildMember, target: discord.GuildMember, actionType: string) {
  actionType = actionType.toLowerCase();
  const isGA = utils.isGlobalAdmin(actor.user.id);
  let isOverride = false;
  if (isGA) {
    isOverride = await utils.isGAOverride(actor.user.id);
  }
  if (actor.user.id === target.user.id && !isOverride) {
    return 'You can\'t target yourself';
  }
  const guild = await actor.getGuild();
  const me = await guild.getMember(discord.getBotId());

  // check bot can actually do it
  if (actionType === 'kick' && !me.can(discord.Permissions.KICK_MEMBERS)) {
    return 'I can\'t kick members';
  }
  const highestRoleTarget = await utils.getMemberHighestRole(target);
  if (['kick', 'ban'].includes(actionType) || actionType.includes('ban')) {
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
      if (actionType === 'kick' && !actor.can(discord.Permissions.KICK_MEMBERS)) {
        return 'You can\'t kick members';
      } if (actionType.includes('ban') && !actor.can(discord.Permissions.BAN_MEMBERS)) {
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
  if(isOverride === true && actor.user.id !== target.user.id) {
      if(actor.user.id !== guild.ownerId) {
          return 'You can\'t target this user as they are a global admin.\nIf you really believe this action is applicable, please have the server owner perform it.';
      }
  }
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
                const canT = await canTarget(msg.member, member, 'kick');
                if (canT !== true) {
                  await msg.reply(`${discord.decor.Emojis.NO_ENTRY_SIGN} ${canT}`);
                  return;
                }
                await msg.reply(discord.decor.Emojis.WHITE_CHECK_MARK);
                // console.log('kick', member.user.getTag());
              });
  return cmdGroup;
}
