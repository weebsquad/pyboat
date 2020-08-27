import { logDebug, logCustom } from '../modules/logging/events/custom';
import { config, globalConfig, guildId } from '../config';
import { getMemberTag } from '../modules/logging/main';

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
  if (lowest < 0 && !isGlobalAdmin(id)) { // global admins cant be blacklisted (even when not overriding)
    highest = lowest;
  } // blacklist!

  return Math.min(999, highest);
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

// todo change action to infractions enum!!!
export async function canTarget(action: string, source: discord.GuildMember, target: discord.GuildMember) {
  return true;
}

export async function canMemberRun(neededLevel: number, member: discord.GuildMember) {
  const ov = await isGAOverride(member.user.id);
  if (ov === true) {
    return true;
  }
  const usrLevel = getUserAuth(member);
  return usrLevel >= neededLevel;
}

export function isGlobalAdmin(userid: string) {
  return globalConfig.admins.includes(userid);
}

const overrideKv = new pylon.KVNamespace('globalAdminOverrides');
export async function insertGaOverride(uid: string, ms: number) {
  if (!isGlobalAdmin(uid)) {
    return 'user not a global admin';
  }
  if (guildId === globalConfig.masterGuild) {
    return 'user already overriding';
  }
  const kvcheck = await overrideKv.get(uid);
  if (kvcheck) {
    return 'user already overriding';
  }
  await overrideKv.put(uid, new Date().getTime() + ms, { ttl: ms });
  return true;
}
export async function deleteGaOverride(uid: string) {
  if (!isGlobalAdmin(uid)) {
    return 'user not a global admin';
  }
  if (guildId === globalConfig.masterGuild) {
    return 'Can\'t remove a override in the master guild.';
  }
  const checkov = await isGAOverride(uid);
  if (checkov === false) {
    return 'user not overriding';
  }
  await overrideKv.delete(uid);
  return true;
}
export async function isGAOverride(userId: string) {
  if (!isGlobalAdmin(userId)) {
    return false;
  }
  if (guildId === globalConfig.masterGuild) {
    return true;
  }
  const checkkv = await overrideKv.get(userId);
  return checkkv !== undefined;
}
export async function getOverrideTimeLeft(userId: string) {
  if (!isGAOverride(userId)) {
    return 0;
  }
  const checkkv = await overrideKv.get(userId);
  if (typeof checkkv !== 'number') {
    return 0;
  }
  const df = new Date(checkkv).getTime() - new Date().getTime();
  return df;
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
    await logDebug('BLACKLISTED_USER_ACTION', new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id], ['_USER_', member.user], ['_ACTION_', action]]));
  }
  if (isBlacklisted(member, true)) {
    const _cd = await reportingCooldowns.get(keyCdGlobal);
    if (_cd) {
      return;
    }
    await reportingCooldowns.put(keyCdLocal, true, { ttl: 10 * 1000 });
    await logCustom('CORE', 'BLACKLISTED_USER_ACTION', new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id], ['_USER_', member.user], ['_ACTION_', action]]));
  }
}
