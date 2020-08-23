import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { config, globalConfig, Ranks } from '../config';
import { logCustom } from './logging/events/custom';

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
                console.log('kick', member.user.getTag());
              });
  return cmdGroup;
}
