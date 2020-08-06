import { handleEvent, getUserTag } from '../main';

export async function getKeys(log: null, guild: discord.Guild) {
  return ['userUpdate'];
}

export function isAuditLog() {
  return false;
}

export const messages = {
  userUpdate: function(log: discord.AuditLogEntry, user: discord.User) {
    return new Map([
      ['_TYPE_', 'USER_UPDATED'],
      ['_USER_ID_', user.id],
      ['_USERTAG_', getUserTag(user)]
    ]);
  }
};

export async function OnUserUpdate(
  id: string,
  guildId: string,
  user: discord.User
) {
  await handleEvent(id, guildId, discord.Event.USER_UPDATE, null, user);
}
