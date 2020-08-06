// * CHANNELS * //
import { QueuedEvent } from '../../lib/eventHandler/queue';

export async function OnAnyEvent(
  event: string,
  id: string,
  guildId: string,
  ...args: any
) {}

export async function OnBatchEvents(q: Array<QueuedEvent>) {
  console.log('OnBatchEvents', q);
}

export async function AL_OnBatchEvents(q: Array<QueuedEvent>) {
  console.log('AL_OnBatchEvents', q);
}

export async function OnChannelCreate(
  id: string,
  guildId: string,
  channel: discord.GuildChannel
) {}
export async function AL_OnChannelCreate(
  id: string,
  guildId: string,
  log: any,
  channel: discord.GuildChannel
) {}

export async function OnChannelUpdate(
  id: string,
  guildId: string,
  channel: discord.Channel
) {}
export async function AL_OnChannelUpdate(
  id: string,
  guildId: string,
  log: any,
  channel: discord.GuildChannel,
  oldChannel: discord.GuildChannel
) {}

export async function OnChannelDelete(
  id: string,
  guildId: string,
  channel: discord.GuildChannel
) {}
export async function AL_OnChannelDelete(
  id: string,
  guildId: string,
  log: any,
  channel: discord.GuildChannel
) {}

export async function OnChannelPinsUpdate(
  id: string,
  guildId: string,
  pinUpdate: discord.Event.IChannelPinsUpdate
) {}

// * MESSAGES * //

export async function OnMessageCreate(
  id: string,
  guildId: string,
  message: discord.Message
) {}

export async function OnMessageDelete(
  id: string,
  guildId: string,
  messageDelete: discord.Event.IMessageDelete,
  oldMessage: discord.Message
) {}
export async function AL_OnMessageDelete(
  id: string,
  guildId: string,
  log: any,
  messageDelete: discord.Event.IMessageDelete,
  oldMessage: discord.Message
) {}

export async function OnMessageDeleteBulk(
  id: string,
  guildId: string,
  messages: discord.Event.IMessageDeleteBulk
) {}
export async function AL_OnMessageDeleteBulk(
  id: string,
  guildId: string,
  log: any,
  messages: discord.Event.IMessageDeleteBulk
) {}

export async function OnMessageReactionAdd(
  id: string,
  guildId: string,
  reaction: discord.Event.IMessageReactionAdd
) {}

export async function OnMessageReactionRemove(id: string, guildId: string) {}

export async function OnMessageReactionRemoveAll(id: string, guildId: string) {}

export async function OnMessageUpdate(
  id: string,
  guildId: string,
  message: discord.Message,
  oldMessage: discord.Message
) {}

export async function OnTypingStart(id: string, guildId: string) {}

// * MEMBER STUFF * //

export async function OnGuildBanAdd(
  id: string,
  guildId: string,
  ban: discord.GuildBan,
  oldMember: discord.GuildMember
) {}
export async function AL_OnGuildBanAdd(
  id: string,
  guildId: string,
  log: any,
  ban: discord.GuildBan,
  oldMember: discord.GuildMember
) {}

export async function OnGuildBanRemove(
  id: string,
  guildId: string,
  ban: discord.GuildBan,
  oldMember: discord.GuildMember
) {}
export async function AL_OnGuildBanRemove(
  id: string,
  guildId: string,
  log: any,
  ban: discord.GuildBan,
  oldMember: discord.GuildMember
) {}

export async function OnGuildMemberAdd(
  id: string,
  guildId: string,
  member: discord.GuildMember
) {}
export async function AL_OnGuildMemberAdd( // Only provides logs if joined member is a bot
  id: string,
  guildId: string,
  log: any,
  member: discord.GuildMember
) {}

export async function OnGuildMemberRemove(
  id: string,
  guildId: string,
  memberRemove: discord.Event.IGuildMemberRemove,
  oldMember: discord.GuildMember
) {}
export async function AL_OnGuildMemberRemove(
  id: string,
  guildId: string,
  log: any,
  memberRemove: discord.Event.IGuildMemberRemove,
  oldMember: discord.GuildMember
) {}

export async function OnGuildMemberUpdate(
  id: string,
  guildId: string,
  member: discord.GuildMember,
  oldMember: discord.GuildMember
) {}
export async function AL_OnGuildMemberUpdate(
  id: string,
  guildId: string,
  log: any,
  member: discord.GuildMember,
  oldMember: discord.GuildMember
) {}

// * GUILD UPDATES * //

export async function OnGuildEmojisUpdate(id: string, guildId: string, arg) {}
export async function OnGuildIntegrationsUpdate(
  id: string,
  guildId: string,
  arg
) {}

export async function OnGuildRoleCreate(
  id: string,
  guildId: string,
  role: discord.Role
) {}
export async function AL_OnGuildRoleCreate(
  id: string,
  guildId: string,
  log: any,
  role: discord.Role
) {}

export async function OnGuildRoleUpdate(
  id: string,
  guildId: string,
  role: discord.Role,
  oldRole: discord.Role
) {}
export async function AL_OnGuildRoleUpdate(
  id: string,
  guildId: string,
  log: discord.AuditLogEntry.AnyAction,
  role: discord.Role,
  oldRole: discord.Role
) {}

export async function OnGuildRoleDelete(
  id: string,
  guildId: string,
  role: discord.Role
) {}
export async function AL_OnGuildRoleDelete(
  id: string,
  guildId: string,
  log: any,
  role: discord.Role
) {}

export async function OnGuildUpdate(
  id: string,
  guildId: string,
  guild: discord.Guild,
  oldGuild: discord.Guild
) {}
export async function AL_OnGuildUpdate(
  id: string,
  guildId: string,
  log: any,
  guild: discord.Guild,
  oldGuild: discord.Guild
) {}

// * OTHER * //
export async function OnWebhooksUpdate(id: string, guildId: string) {}
