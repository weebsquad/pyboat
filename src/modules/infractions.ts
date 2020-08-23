import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks } from '../config';
import { logCustom } from './logging/events/custom';
import { CheckRole } from './disabled/cur';
import * as logUtils from './logging/utils';

export async function canTarget(actor: discord.GuildMember, target: discord.GuildMember, actionType: string) {
  actionType = actionType.toLowerCase();
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
      if (result === true) {
        await ogMsg.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
      } else {
        await ogMsg.addReaction(discord.decor.Emojis.X);
      }
    }
    let replyMsg;
    if (msg === true) {
      replyMsg = await ogMsg.reply({ content: `${result === true ? discord.decor.Emojis.WHITE_CHECK_MARK : discord.decor.Emojis.X} ${txt}`, allowedMentions: {} });
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
                const canT = await canTarget(msg.member, member, 'kick');
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
                await logAction('kick', msg.author, member.user, new Map([['_REASON_', reason !== '' ? `with reason \`${utils.escapeString(reason)}\`` : '']]));
                await confirmResult(undefined, msg, true, `Kicked \`${utils.escapeString(member.user.getTag())}\` from the server${reason !== '' ? ` with reason \`${utils.escapeString(reason)}\`` : ''}`);
              });
  return cmdGroup;
}
