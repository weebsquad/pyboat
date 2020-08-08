import { handleEvent, getUserTag, getMemberTag } from '../main';

export function getKeys(log: discord.AuditLogEntry, ban: discord.GuildBan) {
  return ['memberUnbanned'];
}

export function isAuditLog(log: discord.AuditLogEntry) {
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  memberUnbanned(log: discord.AuditLogEntry, ban: discord.GuildBan) {
    const mp = new Map([['_USERTAG_', getUserTag(ban.user)]]);
    mp.set('_TYPE_', 'MEMBER_UNBANNED');
    mp.set('_USER_ID_', ban.user.id);
    return mp;
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
