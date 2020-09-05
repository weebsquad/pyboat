// add all events here
import * as utils from '../../lib/utils';
import * as utilsLogging from './utils';
import { QueuedEvent } from '../../lib/eventHandler/queue';
import { handleMultiEvents } from './main';

import * as custom from './events/custom';
import * as memberUpdate from './events/memberUpdate';
import * as guildUpdate from './events/guildUpdate';
import * as typingStart from './events/typingStart';
import * as messageDelete from './events/messageDelete';
import * as messageUpdate from './events/messageUpdate';
import * as messageDeleteBulk from './events/messageDeleteBulk';
import * as messageReactionAdd from './events/messageReactionAdd';
import * as messageReactionRemove from './events/messageReactionRemove';
import * as messageReactionRemoveAll from './events/messageReactionRemoveAll';
import * as memberAdd from './events/memberAdd';
import * as memberRemove from './events/memberRemove';
import * as guildBanAdd from './events/guildBanAdd';
import * as guildBanRemove from './events/guildBanRemove';
import * as guildCreate from './events/guildCreate';
import * as guildRoleUpdate from './events/guildRoleUpdate';
import * as guildRoleCreate from './events/guildRoleCreate';
import * as guildRoleDelete from './events/guildRoleDelete';
import * as guildIntegrationsUpdate from './events/guildIntegrationsUpdate';
import * as webhooksUpdate from './events/webhooksUpdate';
import * as userUpdate from './events/userUpdate';
import * as voiceStateUpdate from './events/voiceStateUpdate';
import * as voiceServerUpdate from './events/voiceServerUpdate';
import * as guildEmojisUpdate from './events/guildEmojisUpdate';
import * as channelPinsUpdate from './events/channelPinsUpdate';
import * as channelCreate from './events/channelCreate';
import * as channelDelete from './events/channelDelete';
import * as channelUpdate from './events/channelUpdate';

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
export { AL_OnChannelCreate } from './events/channelCreate';
export { AL_OnChannelDelete } from './events/channelDelete';
export { AL_OnChannelUpdate } from './events/channelUpdate';

export const eventData: Map<string, any> = new Map();
eventData.set('CUSTOM', custom); // needs to be here for custom logs to work!
eventData.set('DEBUG', custom);
eventData.set(discord.Event.GUILD_MEMBER_UPDATE, memberUpdate);
eventData.set(discord.Event.GUILD_UPDATE, guildUpdate);
eventData.set(discord.Event.TYPING_START, typingStart);
eventData.set(discord.Event.MESSAGE_DELETE, messageDelete);
eventData.set(discord.Event.MESSAGE_UPDATE, messageUpdate);
eventData.set(discord.Event.MESSAGE_DELETE_BULK, messageDeleteBulk);
eventData.set(discord.Event.MESSAGE_REACTION_ADD, messageReactionAdd);
eventData.set(discord.Event.MESSAGE_REACTION_REMOVE, messageReactionRemove);
eventData.set(
  discord.Event.MESSAGE_REACTION_REMOVE_ALL,
  messageReactionRemoveAll,
);
eventData.set(discord.Event.GUILD_MEMBER_ADD, memberAdd);
eventData.set(discord.Event.GUILD_MEMBER_REMOVE, memberRemove);
eventData.set(discord.Event.GUILD_BAN_ADD, guildBanAdd);
eventData.set(discord.Event.GUILD_BAN_REMOVE, guildBanRemove);
eventData.set(discord.Event.GUILD_CREATE, guildCreate);
eventData.set(discord.Event.GUILD_ROLE_UPDATE, guildRoleUpdate);
eventData.set(discord.Event.GUILD_ROLE_CREATE, guildRoleCreate);
eventData.set(discord.Event.GUILD_ROLE_DELETE, guildRoleDelete);
eventData.set(discord.Event.GUILD_INTEGRATIONS_UPDATE, guildIntegrationsUpdate);
eventData.set(discord.Event.WEBHOOKS_UPDATE, webhooksUpdate);
eventData.set(discord.Event.USER_UPDATE, userUpdate);
eventData.set(discord.Event.VOICE_STATE_UPDATE, voiceStateUpdate);
eventData.set(discord.Event.VOICE_SERVER_UPDATE, voiceServerUpdate);
eventData.set(discord.Event.GUILD_EMOJIS_UPDATE, guildEmojisUpdate);
eventData.set(discord.Event.CHANNEL_PINS_UPDATE, channelPinsUpdate);
eventData.set(discord.Event.CHANNEL_CREATE, channelCreate);
eventData.set(discord.Event.CHANNEL_DELETE, channelDelete);
eventData.set(discord.Event.CHANNEL_UPDATE, channelUpdate);

export const _ForceIndividualEvents = false;
export async function AL_OnBatchEvents(q: Array<QueuedEvent>) {
  //if (utilsLogging.isDebug()) {
    console.log('AL_OnBatchEvents', q);
  //}
  await handleMultiEvents(q);
}

export async function OnAnyEvent(event: string, id: string) {
  await custom.logDebug(
    'RAW_EVENT',
    new Map<string, any>([
      ['EVENT', event],
      ['QUEUE', 'N/A'],
    ]),
  );
}
