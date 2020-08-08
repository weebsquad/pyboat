import { logDebug, logCustom } from '../modules/logging/events/custom';
import * as conf from '../config';
import { getMemberTag } from '../modules/logging/main';

const { globalConfig } = conf;
const { config } = conf;

export function getUserAuth(mem: discord.GuildMember) {
  let highest = 0;
  let lowest = 0;
  const usrLevel = config.levels.users[mem.user.id];
  if (typeof usrLevel === 'number' && usrLevel > highest) {
    highest = usrLevel;
  } else if (typeof usrLevel === 'number' && usrLevel < 0) {
    lowest = -1;
  }
  for (const key in config.levels.roles) {
    const roleLevel = config.levels.roles[key];
    if (mem.roles.includes(key) && roleLevel > highest) {
      highest = roleLevel;
    }
  }
  if (lowest < 0 && !isGlobalAdmin(mem.user.id)) {
    highest = lowest;
  } // blacklist!
  return highest;
}

export function isBlacklisted(member: discord.GuildMember, noCheckGlobal = false) {
  if (isGlobalAdmin(member.user.id)) {
    return false;
  }
  if (isGlobalBlacklisted(member.user.id) && !noCheckGlobal) {
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
      if(_cd) return;
    await logDebug('BLACKLISTED_USER_ACTION', new Map([['_USERTAG_', getMemberTag(member)], ['_ACTION_', action]]));
    await reportingCooldowns.put(keyCdGlobal, true, { ttl: 10000});
  }
  if (isBlacklisted(member, true)) {
    const _cd = await reportingCooldowns.get(keyCdGlobal);
    if(_cd) return;
    await logCustom('CORE', 'BLACKLISTED_USER_ACTION', new Map([['_USERTAG_', getMemberTag(member)], ['_ACTION_', action]]));
    await reportingCooldowns.put(keyCdLocal, true, { ttl: 10000});
  }
}
