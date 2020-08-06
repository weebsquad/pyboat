// add all events here
import * as utils from '../../lib/utils';
import { QueuedEvent } from '../../lib/eventHandler/queue';
import { handleMultiEvents } from './main';

export { AL_OnGuildMemberUpdate } from './events/memberUpdate';
export { AL_OnGuildUpdate } from './events/guildUpdate';
export { OnTypingStart } from './events/typingStart';
export { AL_OnMessageDelete } from './events/messageDelete';
export { OnMessageUpdate } from './events/messageUpdate';
export { AL_OnMessageDeleteBulk } from './events/messageDeleteBulk';
export { OnMessageReactionAdd } from './events/messageReactionAdd';
export { OnMessageReactionRemove } from './events/messageReactionRemove';
export { OnMessageReactionRemoveAll } from './events/messageReactionRemoveAll';
export { AL_OnGuildMemberAdd } from './events/memberAdd';
export { AL_OnGuildMemberRemove } from './events/memberRemove';
export { AL_OnGuildBanAdd } from './events/guildBanAdd';
export { AL_OnGuildBanRemove } from './events/guildBanRemove';
export { OnGuildCreate } from './events/guildCreate';
export { AL_OnGuildRoleUpdate } from './events/guildRoleUpdate';
export { AL_OnGuildRoleCreate } from './events/guildRoleCreate';
export { AL_OnGuildRoleDelete } from './events/guildRoleDelete';
export { OnGuildIntegrationsUpdate } from './events/guildIntegrationsUpdate';
export { OnWebhooksUpdate } from './events/webhooksUpdate';
export { OnUserUpdate } from './events/userUpdate';
export { AL_OnVoiceStateUpdate } from './events/voiceStateUpdate';
export { OnVoiceServerUpdate } from './events/voiceServerUpdate';
export { AL_OnGuildEmojisUpdate } from './events/guildEmojisUpdate';
export { AL_OnChannelPinsUpdate } from './events/channelPinsUpdate';

export let eventData: Map<string, any> = new Map();
import * as custom from './events/custom';
eventData.set('CUSTOM', custom);
eventData.set('DEBUG', custom);
import * as memberUpdate from './events/memberUpdate';
eventData.set(discord.Event.GUILD_MEMBER_UPDATE, memberUpdate);
import * as guildUpdate from './events/guildUpdate';
eventData.set(discord.Event.GUILD_UPDATE, guildUpdate);
import * as typingStart from './events/typingStart';
eventData.set(discord.Event.TYPING_START, typingStart);
import * as messageDelete from './events/messageDelete';
eventData.set(discord.Event.MESSAGE_DELETE, messageDelete);
import * as messageUpdate from './events/messageUpdate';
eventData.set(discord.Event.MESSAGE_UPDATE, messageUpdate);

import * as messageDeleteBulk from './events/messageDeleteBulk';
eventData.set(discord.Event.MESSAGE_DELETE_BULK, messageDeleteBulk);
import * as messageReactionAdd from './events/messageReactionAdd';
eventData.set(discord.Event.MESSAGE_REACTION_ADD, messageReactionAdd);
import * as messageReactionRemove from './events/messageReactionRemove';
eventData.set(discord.Event.MESSAGE_REACTION_REMOVE, messageReactionRemove);
import * as messageReactionRemoveAll from './events/messageReactionRemoveAll';
eventData.set(
  discord.Event.MESSAGE_REACTION_REMOVE_ALL,
  messageReactionRemoveAll
);
import * as memberAdd from './events/memberAdd';
eventData.set(discord.Event.GUILD_MEMBER_ADD, memberAdd);
import * as memberRemove from './events/memberRemove';
eventData.set(discord.Event.GUILD_MEMBER_REMOVE, memberRemove);
import * as guildBanAdd from './events/guildBanAdd';
eventData.set(discord.Event.GUILD_BAN_ADD, guildBanAdd);
import * as guildBanRemove from './events/guildBanRemove';
eventData.set(discord.Event.GUILD_BAN_REMOVE, guildBanRemove);
import * as guildCreate from './events/guildCreate';
eventData.set(discord.Event.GUILD_CREATE, guildCreate);
import * as guildRoleUpdate from './events/guildRoleUpdate';
eventData.set(discord.Event.GUILD_ROLE_UPDATE, guildRoleUpdate);
import * as guildRoleCreate from './events/guildRoleCreate';
eventData.set(discord.Event.GUILD_ROLE_CREATE, guildRoleCreate);
import * as guildRoleDelete from './events/guildRoleDelete';
eventData.set(discord.Event.GUILD_ROLE_DELETE, guildRoleDelete);
import * as guildIntegrationsUpdate from './events/guildIntegrationsUpdate';
eventData.set(discord.Event.GUILD_INTEGRATIONS_UPDATE, guildIntegrationsUpdate);
import * as webhooksUpdate from './events/webhooksUpdate';
eventData.set(discord.Event.WEBHOOKS_UPDATE, webhooksUpdate);
import * as userUpdate from './events/userUpdate';
eventData.set(discord.Event.USER_UPDATE, userUpdate);
import * as voiceStateUpdate from './events/voiceStateUpdate';
eventData.set(discord.Event.VOICE_STATE_UPDATE, voiceStateUpdate);
import * as voiceServerUpdate from './events/voiceServerUpdate';
eventData.set(discord.Event.VOICE_SERVER_UPDATE, voiceServerUpdate);
import * as guildEmojisUpdate from './events/guildEmojisUpdate';
eventData.set(discord.Event.GUILD_EMOJIS_UPDATE, guildEmojisUpdate);
import * as channelPinsUpdate from './events/channelPinsUpdate';
eventData.set(discord.Event.CHANNEL_PINS_UPDATE, channelPinsUpdate);

export const _ForceIndividualEvents = false;
export async function AL_OnBatchEvents(q: Array<QueuedEvent>) {
  console.log('AL_OnBatchEvents', q);
  await handleMultiEvents(q);
  //console.log('AL_OnBatchEvents', 'ids', ids);
}

export async function OnAnyEvent(event: string, id: string) {
  await custom.logDebug(
    'RAW_EVENT',
    new Map<string, any>([
      ['EVENT', event],
      ['QUEUE', 'N/A']
    ])
  );
}
