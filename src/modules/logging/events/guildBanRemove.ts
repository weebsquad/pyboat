import { handleEvent, getUserTag, getMemberTag, isIgnoredUser } from '../main';

export function getKeys(log: discord.AuditLogEntry, ban: discord.GuildBan) {
  if (isIgnoredUser(ban.user.id)) {
    return [];
  }
  return ['memberUnbanned'];
}

export function isAuditLog(log: discord.AuditLogEntry) {
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  memberUnbanned(log: discord.AuditLogEntry, ban: discord.GuildBan) {
    return new Map([['_USERTAG_', getUserTag(ban.user)], ['_USER_', ban.user], ['_TYPE_', 'MEMBER_UNBANNED'], ['_USER_ID_', ban.user.id]]);
  },
};

export async function AL_OnGuildBanRemove(
  id: string,
  guildId: string,
  log: any,
  ban: discord.GuildBan,
) {
  await handleEvent(id, guildId, discord.Event.GUILD_BAN_REMOVE, log, ban);
}
