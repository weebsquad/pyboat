import { handleEvent, getUserTag, getMemberTag } from '../main';

export async function getKeys(log: null, guild: discord.Guild) {
  const _me = await guild.getMember(discord.getBotId());
  if (_me === null) return ['reconnected'];
  let ndiff = new Date().getTime() - new Date(_me.joinedAt).getTime();
  if (ndiff > 60 * 1000) return ['reconnected'];
  return ['newGuild'];
}

export function isAuditLog() {
  return false;
}

export const messages = {
  reconnected: function(log: discord.AuditLogEntry, guild: discord.Guild) {
    return new Map([
      ['_TYPE_', 'RECONNECTED'],
      ['_GUILD_ID_', guild.id],
      ['_GUILD_NAME_', guild.name]
    ]);
  },
  newGuild: function(log: discord.AuditLogEntry, guild: discord.Guild) {
    return new Map([
      ['_TYPE_', 'NEW_GUILD'],
      ['_GUILD_ID_', guild.id],
      ['_GUILD_NAME_', guild.name]
    ]);
  }
};

export async function OnGuildCreate(
  id: string,
  guildId: string,
  guild: discord.Guild
) {
  console.log('onGuildCreate', guild);
  await handleEvent(id, guildId, discord.Event.GUILD_CREATE, null, guild);
}
