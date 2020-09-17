/* eslint-disable */
import { config } from '../config';
import * as utils from '../lib/utils';

const cfgMod = config!.modules.onJoin;

export async function OnGuildMemberAdd(member: discord.GuildMember) {
  await check(member);
}
export async function OnGuildMemberUpdate(
  member: discord.GuildMember,
  oldMember: discord.GuildMember,
) {
  await check(member);
}

export async function check(member: discord.GuildMember) {
  if (member.user.id === discord.getBotId()) {
    return;
  } // Don't trigger this on pylon, lol
  const roles = await utils.getUserRoles(member);

  async function checkRoles(
    member: discord.GuildMember,
    normal: string,
    reduced: string,
    replaceOnly: boolean = false,
  ) {
    const hasReduced = roles.find((o) => o.id === reduced);
    const hasNormal = roles.find((o) => o.id === normal);

    if (!hasReduced && !hasNormal && !replaceOnly) {
      await member.addRole(reduced);
    } else if (hasReduced && hasNormal) {
      await member.removeRole(reduced);
    }
  }
  if (member.user.bot === true) {
    await checkRoles(member, cfgMod.botRole, cfgMod.botRoleRP, false);
    await checkRoles(member, cfgMod.botRoleRP, cfgMod.memberRoleRP, true);
  } else {
    await checkRoles(member, cfgMod.memberRole, cfgMod.memberRoleRP, true);
  }
}
