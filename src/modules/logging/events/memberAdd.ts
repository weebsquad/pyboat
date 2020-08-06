import { handleEvent, getUserTag, getMemberTag } from '../main';

export function getKeys(
  log: discord.AuditLogEntry,
  member: discord.GuildMember
) {
  if (member.user.bot) return ['botAdd'];
  return ['memberJoin'];
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  member: discord.GuildMember
) {
  if (member.user.bot) return log instanceof discord.AuditLogEntry;
  return false;
}

export const messages = {
  memberJoin: function(
    log: discord.AuditLogEntry,
    member: discord.GuildMember
  ) {
    let mp = new Map();
    mp.set('_TYPE_', 'MEMBER_JOIN');
    mp.set('_USERTAG_', getMemberTag(member));
    return mp;
  },
  botAdd: function(log: discord.AuditLogEntry, member: discord.GuildMember) {
    let mp = new Map();
    mp.set('_TYPE_', 'BOT_ADDED');
    mp.set('_USERTAG_', getMemberTag(member));
    return mp;
  }
};

export async function AL_OnGuildMemberAdd(
  id: string,
  guildId: string,
  log: any,
  member: discord.GuildMember
) {
  await handleEvent(id, guildId, discord.Event.GUILD_MEMBER_ADD, log, member);
}
