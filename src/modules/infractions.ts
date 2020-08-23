import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks } from '../config';
import { logCustom } from './logging/events/custom';

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
  // check levels and discord perms

  // check bot can actually do it
  if (actionType === 'kick' && !me.can(discord.Permissions.KICK_MEMBERS)) {
    return 'I can\'t kick members';
  }
  if (['kick'].includes(actionType)) {
    const highestRoleMe = await utils.getMemberHighestRole(me);
    const highestRoleTarget = await utils.getMemberHighestRole(target);
    if (highestRoleMe.position <= highestRoleTarget.position) {
      return `I can't ${actionType} this member`;
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
