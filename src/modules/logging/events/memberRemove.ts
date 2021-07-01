import { handleEvent, getUserTag, getMemberTag, isIgnoredUser } from '../main';
import { decomposeSnowflake, getDiscordTimestamp } from '../../../lib/utils';

export function getKeys(
  log: discord.AuditLogEntry,
  member: discord.Event.IGuildMemberRemove,
) {
  if (isIgnoredUser(member.user.id)) {
    return [];
  }
  if (!(log instanceof discord.AuditLogEntry)) {
    return ['memberLeft'];
  }
  if (log.actionType === discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD) {
    return [];
  } // we handle bans elsewhere since this would rely on audit logs!
  if (log.actionType === discord.AuditLogEntry.ActionType.MEMBER_PRUNE) {
    return ['memberPruned'];
  } // this isnt implemented, but whatever.
  return ['memberKicked'];
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  member: discord.Event.IGuildMemberRemove,
) {
  return (
    log instanceof discord.AuditLogEntry
    && log.actionType !== discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD
  );
}

export const messages = {
  memberLeft(
    log: discord.AuditLogEntry,
    member: discord.Event.IGuildMemberRemove,
    oldMember: discord.GuildMember,
  ) {
    const mp = new Map();
    mp.set('TYPE', 'MEMBER_LEFT');
    mp.set('USER_ID', member.user.id);
    mp.set('USERTAG', getUserTag(member.user));
    mp.set('USER', member.user);
    mp.set('RESIDENCE_DURATION', '?');
    if (oldMember instanceof discord.GuildMember) {
      mp.set('RESIDENCE_DURATION', getDiscordTimestamp(new Date(oldMember.joinedAt).getTime(), 'R'));
    }
    return mp;
  },
  memberKicked(
    log: discord.AuditLogEntry,
    member: discord.Event.IGuildMemberRemove,
  ) {
    const mp = new Map();
    mp.set('TYPE', 'MEMBER_KICKED');
    mp.set('USER_ID', member.user.id);
    mp.set('USERTAG', getUserTag(member.user));
    mp.set('USER', member.user);
    return mp;
  },
};

export async function AL_OnGuildMemberRemove(
  id: string,
  guildId: string,
  log: any,
  member: discord.Event.IGuildMemberRemove,
  oldMember: discord.GuildMember,
) {
  await handleEvent(
    id,
    guildId,
    discord.Event.GUILD_MEMBER_REMOVE,
    log,
    member,
    oldMember,
  );
}
