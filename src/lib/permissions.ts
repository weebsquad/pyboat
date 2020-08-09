import { logDebug, logCustom } from '../modules/logging/events/custom';
import * as conf from '../config';
import { getMemberTag } from '../modules/logging/main';

const { globalConfig } = conf;
const { config } = conf;

export function getUserAuth(mem: discord.GuildMember | string) {
  const id = typeof mem === 'string' ? mem : mem.user.id;
  let highest = 0;
  let lowest = 0;
  const usrLevel = config.levels.users[id];
  if (typeof usrLevel === 'number' && usrLevel > highest) {
    highest = usrLevel;
  } else if (typeof usrLevel === 'number' && usrLevel < 0) {
    lowest = -1;
  }
  if (mem instanceof discord.GuildMember) {
    for (const key in config.levels.roles) {
      const roleLevel = config.levels.roles[key];
      if (mem.roles.includes(key) && roleLevel > highest) {
        highest = roleLevel;
      }
    }
  }
  if (lowest < 0 && !isGlobalAdmin(id)) {
    highest = lowest;
  } // blacklist!
  return highest;
}

export function isBlacklisted(member: discord.GuildMember | string, noCheckGlobal = false) {
  if (member instanceof discord.GuildMember) {
    member = member.user.id;
  }
  if (isGlobalAdmin(member)) {
    return false;
  }
  if (isGlobalBlacklisted(member) && !noCheckGlobal) {
    return true;
  }
  const usrLevel = getUserAuth(member);
  if (usrLevel < 0) {
    return true;
  }
  return false;
}

export function canMemberRun(neededLevel: number, member: discord.GuildMember) {
  if (isGlobalAdmin(member.user.id)) {
    return true;
  } // todo: OVERRIDES
  const usrLevel = getUserAuth(member);
  return usrLevel >= neededLevel;
}

export function isGlobalAdmin(userid: string) {
  return globalConfig.admins.includes(userid);
}
export function isGAOverride(userId: string) {
  if (!isGlobalAdmin(userId)) {
    return false;
  }
  return false;
}
export function isGlobalBlacklisted(userid: string) {
  return globalConfig.blacklist.includes(userid);
}
export function isCommandsAuthorized(member: discord.GuildMember) {
  if (!member.user.bot) {
    return !isBlacklisted(member);
  }
  return member.user.bot === true && globalConfig.botsCommands.includes(member.user.id) && !isBlacklisted(member);
}

const reportingCooldowns = new pylon.KVNamespace('blacklistReportCooldownds');
export async function reportBlockedAction(member: discord.GuildMember, action: string) {
  const keyCdGlobal = `GLOBAL_${member.user.id}`;
  const keyCdLocal = `SERVER_${member.user.id}`;
  if (isGlobalAdmin(member.user.id)) {
    return;
  }
  if (!isBlacklisted(member)) {
    return;
  }
  if (isGlobalBlacklisted(member.user.id)) {
    const _cd = await reportingCooldowns.get(keyCdGlobal);
    if (_cd) {
      return;
    }
    await reportingCooldowns.put(keyCdGlobal, true, { ttl: 10 * 1000 });
    await logDebug('BLACKLISTED_USER_ACTION', new Map([['_USERTAG_', getMemberTag(member)], ['_ACTION_', action]]));
  }
  if (isBlacklisted(member, true)) {
    const _cd = await reportingCooldowns.get(keyCdGlobal);
    if (_cd) {
      return;
    }
    await reportingCooldowns.put(keyCdLocal, true, { ttl: 10 * 1000 });
    await logCustom('CORE', 'BLACKLISTED_USER_ACTION', new Map([['_USERTAG_', getMemberTag(member)], ['_ACTION_', action]]));
  }
}
