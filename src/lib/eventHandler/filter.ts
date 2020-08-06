// edgy cases lmao

import { deepCompare } from '../utils';

const eventFilters = <any>{
  global: {
    // Stops event functions from running
    MESSAGE_UPDATE: (message: discord.Message, oldMessage: discord.Message) => {
      if (deepCompare(message, oldMessage)) return true;
      return false;
    },
    GUILD_UPDATE: (guild: discord.Guild, oldGuild: discord.Guild) => {
      if (deepCompare(guild, oldGuild)) return true;
      return false;
    },
    GUILD_MEMBER_UPDATE: (
      member: discord.GuildMember,
      oldMember: discord.GuildMember
    ) => {
      if (!(oldMember instanceof discord.GuildMember)) return false;
      //if (deepCompare(member, oldMember)) return true;
      for (var key in member) {
        if (key === 'roles' || key === 'user') continue;
        if (
          !deepCompare(member[key], oldMember[key]) ||
          member[key] !== oldMember[key]
        )
          return false;
      }
      if (member.roles.length === oldMember.roles.length) {
        let mismatch1 = member.roles.filter((ele) => {
          if (
            typeof oldMember.roles.find((ele2) => ele2 === ele) !== 'undefined'
          )
            return false;
          return true;
        });
        let mismatch2 = member.roles.filter((ele) => {
          if (
            typeof oldMember.roles.find((ele2) => ele2 === ele) !== 'undefined'
          )
            return false;
          return true;
        });
        if (mismatch1.length !== 0 || mismatch2.length !== 0) return false;
      } else {
        return false;
      }
      return true;
    },
    GUILD_EMOJIS_UPDATE: (
      emojis: discord.Event.IGuildEmojisUpdate,
      oldEmojis: discord.Event.IGuildEmojisUpdate
    ) => {
      if (deepCompare(emojis, oldEmojis)) return true;
      return false;
    },
    GUILD_ROLE_UPDATE: (role: discord.Role, oldRole: discord.Role) => {
      //let role = roleUpdate.role;
      if (deepCompare(role, oldRole)) return true;
      if (
        role.name === oldRole.name &&
        role.color === oldRole.color &&
        role.hoist === oldRole.hoist &&
        role.id === oldRole.id &&
        role.managed === oldRole.managed &&
        role.mentionable === oldRole.mentionable &&
        role.permissions === oldRole.permissions &&
        role.position === oldRole.position
      )
        return true;

      return false;
    },
    CHANNEL_UPDATE: (
      channel: discord.Channel.AnyChannel,
      oldChannel: discord.Channel.AnyChannel
    ) => {
      if (deepCompare(channel, oldChannel)) return true;
      return false;
    },
    MESSAGE_CREATE: (message: discord.Message) => {
      if (message.author !== null && message.author.id === discord.getBotId()) return true;
      return false;
    },
    TYPING_START: (ev: discord.Event.ITypingStart) => {
      if (ev.userId === discord.getBotId()) return true;
    }
  },
  auditlog: {
    // Stops audit log pulling data for events that match this
  }
};

// Returns true if it IS filtered
export function isFiltered(event: string, type: string, ...args: any) {
  if (eventFilters[type][event] instanceof Function)
    return eventFilters[type][event](...args);
  return false;
}
