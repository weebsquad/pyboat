import { handleEvent, getUserTag, getMemberTag, isIgnoredUser } from '../main';

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
  ) {
    const mp = new Map();
    mp.set('_TYPE_', 'MEMBER_LEFT');
    mp.set('_USER_ID_', member.user.id);
    mp.set('_USERTAG_', getUserTag(member.user));
    mp.set('_USER_', member.user);
    return mp;
  },
  memberKicked(
    log: discord.AuditLogEntry,
    member: discord.Event.IGuildMemberRemove,
  ) {
    const mp = new Map();
    mp.set('_TYPE_', 'MEMBER_KICKED');
    mp.set('_USER_ID_', member.user.id);
    mp.set('_USERTAG_', getUserTag(member.user));
    mp.set('_USER_', member.user);
    return mp;
  },
};

export async function AL_OnGuildMemberRemove(
  id: string,
  guildId: string,
  log: any,
  member: discord.Event.IGuildMemberRemove,
) {
  await handleEvent(
    id,
    guildId,
    discord.Event.GUILD_MEMBER_REMOVE,
    log,
    member,
  );
}
