import { handleEvent, getUserTag } from '../main';

export async function getKeys(log: null, guild: discord.Guild) {
  return ['userUpdate'];
}

export function isAuditLog() {
  return false;
}

export const messages = {
  userUpdate(log: discord.AuditLogEntry, user: discord.User) {
    return new Map([
      ['TYPE', 'USER_UPDATED'],
      ['USER_ID', user.id],
      ['USER', user],
      ['USERTAG', getUserTag(user)],
    ]);
  },
};

export async function OnUserUpdate(
  id: string,
  guildId: string,
  user: discord.User,
) {
  await handleEvent(id, guildId, discord.Event.USER_UPDATE, null, user);
}
