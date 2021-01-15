import { handleEvent, getUserTag, getMemberTag, isIgnoredUser } from '../main';

export function getKeys(log: discord.AuditLogEntry, ban: discord.GuildBan) {
  if (isIgnoredUser(ban.user.id)) {
    return [];
  }
  return ['memberBanned'];
}

export function isAuditLog(log: discord.AuditLogEntry) {
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  memberBanned(log: discord.AuditLogEntry, ban: discord.GuildBan) {
    return new Map([['USERTAG', getUserTag(ban.user)], ['USER', ban.user], ['TYPE', 'MEMBER_BANNED'], ['USER_ID', ban.user.id]]);
  },
};

export async function AL_OnGuildBanAdd(
  id: string,
  guildId: string,
  log: any,
  ban: discord.GuildBan,
) {
  await handleEvent(id, guildId, discord.Event.GUILD_BAN_ADD, log, ban);
}
