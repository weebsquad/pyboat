import { handleEvent, getUserTag, getMemberTag, isIgnoredUser } from '../main';
import * as utils from '../../../lib/utils';
import { language as i18n, setPlaceholders } from '../../../localization/interface';

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
    mp.set('TYPE', 'MEMBER_JOIN');
    mp.set('USER_ID', member.user.id);
    mp.set('ACCOUNT_AGE', utils.getLongAgoFormat(utils.decomposeSnowflake(member.user.id).timestamp, 2, true, i18n.time_units.ti_full.singular.second));
    mp.set('USERTAG', getMemberTag(member));
    mp.set('USER', member.user);
    return mp;
  },
  botAdd(log: discord.AuditLogEntry, member: discord.GuildMember) {
    const mp = new Map();
    mp.set('TYPE', 'BOT_ADDED');
    mp.set('USER_ID', member.user.id);
    mp.set('USERTAG', getMemberTag(member));
    mp.set('USER', member.user);

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
