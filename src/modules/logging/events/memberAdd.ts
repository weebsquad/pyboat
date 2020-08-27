import { handleEvent, getUserTag, getMemberTag, isIgnoredUser } from '../main';
import * as utils from '../../../lib/utils';

export function getKeys(
  log: discord.AuditLogEntry,
  member: discord.GuildMember,
) {
  if (isIgnoredUser(member)) {
    return [];
  }
  if (member.user.bot) {
    return ['botAdd'];
  }
  return ['memberJoin'];
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  member: discord.GuildMember,
) {
  if (member.user.bot) {
    return log instanceof discord.AuditLogEntry;
  }
  return false;
}

export const messages = {
  memberJoin(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
  ) {
    const mp = new Map();
    mp.set('_TYPE_', 'MEMBER_JOIN');
    mp.set('_USER_ID_', member.user.id);
    mp.set('_ACCOUNT_AGE_', utils.getLongAgoFormat(utils.decomposeSnowflake(member.user.id).timestamp, 2, true, 'second'));
    mp.set('_USERTAG_', getMemberTag(member));
    mp.set('_USER_', member.user);
    return mp;
  },
  botAdd(log: discord.AuditLogEntry, member: discord.GuildMember) {
    const mp = new Map();
    mp.set('_TYPE_', 'BOT_ADDED');
    mp.set('_USER_ID_', member.user.id);
    mp.set('_USERTAG_', getMemberTag(member));
    mp.set('_USER_', member.user);

    return mp;
  },
};

export async function AL_OnGuildMemberAdd(
  id: string,
  guildId: string,
  log: any,
  member: discord.GuildMember,
) {
  await handleEvent(id, guildId, discord.Event.GUILD_MEMBER_ADD, log, member);
}
