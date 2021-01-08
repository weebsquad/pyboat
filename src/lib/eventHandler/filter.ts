// edgy cases lmao

import { deepCompare } from '../utils';
import { isMessageConfigUpdate, globalConfig, guildId } from '../../config';

const eventFilters = <any>{
  global: {
    // Stops event functions from running
    GUILD_UPDATE: (guild: discord.Guild, oldGuild: discord.Guild) => {
      if (deepCompare(guild, oldGuild)) {
        return true;
      }
    },
    GUILD_MEMBER_UPDATE: (
      member: discord.GuildMember,
      oldMember: discord.GuildMember,
    ) => {
      if (!(oldMember instanceof discord.GuildMember)) {
        return false;
      }
      // if (deepCompare(member, oldMember)) return true;
      for (const key in member) {
        if (key === 'roles' || key === 'user') {
          continue;
        }
        if (
          !deepCompare(member[key], oldMember[key])
          || member[key] !== oldMember[key]
        ) {
          return false;
        }
      }
      if (member.roles.length !== oldMember.roles.length) {
        return false;
      }
      if (member.user.avatar !== oldMember.user.avatar || member.user.discriminator !== oldMember.user.discriminator || member.user.username !== oldMember.user.username || member.premiumSince !== oldMember.premiumSince) {
        return false;
      }
      const mismatch1 = member.roles.filter((ele) => {
        if (oldMember.roles.find((ele2) => ele2 === ele)) {
          return false;
        }
        return true;
      });
      const mismatch2 = oldMember.roles.filter((ele) => {
        if (member.roles.find((ele2) => ele2 === ele)) {
          return false;
        }
        return true;
      });
      if (mismatch1.length === 0 && mismatch2.length === 0) {
        return true;
      }
    },
    GUILD_EMOJIS_UPDATE: (
      emojis: discord.Event.IGuildEmojisUpdate,
      oldEmojis: discord.Event.IGuildEmojisUpdate,
    ) => {
      if (deepCompare(emojis, oldEmojis)) {
        return true;
      }
    },
    GUILD_ROLE_UPDATE: (role: discord.Role, oldRole: discord.Role) => {
      // let role = roleUpdate.role;
      if (deepCompare(role, oldRole)) {
        return true;
      }
      // we dont care abt role positions
      const wipeProps = ['position'];
      const n: any = JSON.parse(JSON.stringify(role));
      const o: any = JSON.parse(JSON.stringify(oldRole));
      wipeProps.map((e) => {
        delete n[e]; delete o[e];
      });
      if (deepCompare(n, o)) {
        return true;
      }
      if (role.name === oldRole.name && role.color === oldRole.color && role.hoist === oldRole.hoist && role.managed === oldRole.managed && role.mentionable === oldRole.mentionable && role.permissions === oldRole.permissions) {
        return true;
      }
    },
    CHANNEL_CREATE: (channel: discord.Channel.AnyChannel) => {
      if (typeof globalConfig === 'object' && typeof globalConfig.masterGuild === 'string' && guildId !== globalConfig.masterGuild && (channel.type === discord.Channel.Type.DM)) {
        return true;
      }
    },
    CHANNEL_UPDATE: (
      channel: discord.Channel.AnyChannel,
      oldChannel: discord.Channel.AnyChannel,
    ) => {
      if (channel === null || oldChannel === null) {
        return true;
      }
      if (deepCompare(channel, oldChannel)) {
        return true;
      }
      const wipeProps = ['position'];

      const n: any = JSON.parse(JSON.stringify(channel));
      const o: any = JSON.parse(JSON.stringify(oldChannel));
      wipeProps.map((e) => {
        delete n[e]; delete o[e];
      });
      if (deepCompare(n, o)) {
        return true;
      }
    },
    MESSAGE_CREATE: (message: discord.Message.AnyMessage) => {
      if (typeof globalConfig === 'object' && typeof globalConfig.masterGuild === 'string' && guildId !== globalConfig.masterGuild && (!(message.member instanceof discord.GuildMember))) {
        return true;
      }
      /* if (message.author !== null && message.author.id === discord.getBotId() && message.type === discord.Message.Type.DEFAULT) {
        return true;
      } */
      if (isMessageConfigUpdate(message) !== false) {
        return true;
      }
    },
    MESSAGE_UPDATE: (message: discord.Message, oldMessage: discord.Message) => {
      if (typeof globalConfig === 'object' && typeof globalConfig.masterGuild === 'string' && guildId !== globalConfig.masterGuild && (!(message.member instanceof discord.GuildMember))) {
        return true;
      }
      if (deepCompare(message, oldMessage)) {
        return true;
      }
      if (oldMessage !== null && message.content === oldMessage.content) {
        return true;
      }
    },
    MESSAGE_DELETE: (ev: discord.Event.IMessageDelete, msg: discord.Message.AnyMessage) => {
      if (typeof globalConfig === 'object' && typeof globalConfig.masterGuild === 'string' && guildId !== globalConfig.masterGuild && !ev.guildId) {
        return true;
      }
      if (msg && isMessageConfigUpdate(msg) !== false) {
        return true;
      }
      /* if (msg && msg.author.id === discord.getBotId()) {
        return true;
      } */
    },
    TYPING_START: (ev: discord.Event.ITypingStart) => {
      if (typeof globalConfig === 'object' && typeof globalConfig.masterGuild === 'string' && guildId !== globalConfig.masterGuild && !ev.guildId) {
        return true;
      }
      if (ev.userId === discord.getBotId()) {
        return true;
      }
    },
    VOICE_SERVER_UPDATE: (ev: discord.Event.IVoiceServerUpdate) => {
      if (typeof globalConfig === 'object' && typeof globalConfig.masterGuild === 'string' && guildId !== globalConfig.masterGuild) {
        return true;
      }
    },
  },
  auditlog: {
    // Stops audit log pulling data for events that match this
    GUILD_EMOJIS_UPDATE: (...args: any[]) => {
      // check if we're missing cached data
      if (!Array.isArray(args)) {
        return true;
      }
      if (args.length !== 2) {
        return true;
      }
    },
    GUILD_MEMBER_ADD: (mem: discord.GuildMember) => {
      if (!mem.user.bot) {
        return true;
      }
    },
    MESSAGE_DELETE: (msg: discord.Event.IMessageDelete, oldMsg: discord.Message.AnyMessage | null) => {
      if (oldMsg === null) {
        return true;
      }
      const msg_: discord.Message = oldMsg;
      if (msg_.type !== discord.Message.Type.DEFAULT) {
        return true;
      }
    },
    VOICE_STATE_UPDATE: (vc: discord.VoiceState, oldVc: discord.VoiceState) => {
      if (vc === null || oldVc === null) {
        return true;
      }
      if (
        vc.channelId !== oldVc.channelId
            && vc.mute !== oldVc.mute
            && vc.deaf !== oldVc.deaf
      ) {
        return true;
      }
    },
    GUILD_UPDATE: (guild: discord.Guild, oldGuild: discord.Guild) => {
      const wipeProps = ['applicationId', 'features', 'maxPresences', 'maxMembers', 'memberCount', 'premiumSubscriptionCount', 'premiumTier'];
      const n: any = JSON.parse(JSON.stringify(guild));
      const o: any = JSON.parse(JSON.stringify(oldGuild));
      wipeProps.map((e) => {
        delete n[e]; delete o[e];
      });
      if (deepCompare(n, o)) {
        return true;
      }
    },
  },
};

// Returns true if it IS filtered
export function isFiltered(event: string, type: string, ...args: any) {
  if (eventFilters[type][event] instanceof Function) {
    const _ret: boolean | undefined = eventFilters[type][event](...args);
    if (_ret === undefined) {
      return false;
    }
    return _ret;
  }
  return false;
}
