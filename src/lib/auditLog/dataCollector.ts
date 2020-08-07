import * as utils from '../utils';

/*
EVENT: {
    // returning false prevents audit log data from being pulled
    beforeFetch: function(dt: any[]) {

    },

    // return the guildId from the raw payload data
    guildId: function(dt: any[]) {
      return dt[0].guildId;
    },

    // return ID for comparison with auditLog.targetId
    targetId: (dt: any) => {
      return dt[0]['id'];
    },

    // for simple comparing, return objects for comparing with auditLog.changes
    getCompareData: (dt: any) => {
      return Array(newObject, oldObject)
      return newObject
    },

    // for advanced comparing, instead of getCompareData, return true to verify correct auditlogs for payload data
    validate: (dt: any, log: any, store: any) => {
      return true;
    },

    // more advanced validate comparing function, runs AFTER validate and allows you to specify action types
    // that this should only run for.
    <enum>discord.AuditLogEntry.ActionType.*: (dt: any, log: any, store: any) => {

    },

    store: {
      // Triggers whenever a valid entry for this is found, stores it for comparing to next checks
      'entryFound': true
    }

    // possible action types that this event could generate
    auditLogEntries: discord.AuditLogEntry.ActionType. ,
}
*/
export const auditLogDefinitions: {[key: string]: any} = {
  CHANNEL_CREATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => dt[0],
    auditLogEntries: discord.AuditLogEntry.ActionType.CHANNEL_CREATE,
  },
  CHANNEL_DELETE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => dt[0],
    auditLogEntries: discord.AuditLogEntry.ActionType.CHANNEL_DELETE,
  },
  CHANNEL_UPDATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => [dt[0], dt[1]],
    auditLogEntries: discord.AuditLogEntry.ActionType.CHANNEL_UPDATE,
  },
  CHANNEL_PINS_UPDATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    validate(dt: any[], log: discord.AuditLogEntry, store: any) {
      const ev: discord.Event.IChannelPinsUpdate = dt[0];
      if (log.actionType !== discord.AuditLogEntry.ActionType.MESSAGE_PIN && log.actionType !== discord.AuditLogEntry.ActionType.MESSAGE_UNPIN) {
        return false;
      }
      if (typeof log.options === 'object' && ev.channelId !== log.options.channelId) {
        return false;
      }
      if (
        ev.lastPinTimestamp !== undefined
        && log.actionType !== discord.AuditLogEntry.ActionType.MESSAGE_PIN
      ) {
        return false;
      }
      if (store instanceof discord.AuditLogEntry) {
        return false;
      }
      if (ev.lastPinTimestamp !== undefined) {
        // pin
        const d = utils.decomposeSnowflake(log.id).timestamp
          - new Date(ev.lastPinTimestamp).getTime();
        if (d < 150 && d > -150) {
          return true;
        }
      } else {
        // unpin
        return true; // reeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
      }
      return false;
    },
    store: {
      entryFound: true,
    },
    auditLogEntries: [
      discord.AuditLogEntry.ActionType.MESSAGE_PIN,
      discord.AuditLogEntry.ActionType.MESSAGE_UNPIN,
    ],
  },
  GUILD_BAN_ADD: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].user.id,
    validate: (dt: any, log: any) => dt[0].user.id === log.targetId,
    auditLogEntries: discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD,
  },
  GUILD_BAN_REMOVE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].user.id,
    validate: (dt: any, log: any) => dt[0].user.id === log.targetId,
    auditLogEntries: discord.AuditLogEntry.ActionType.MEMBER_BAN_REMOVE,
  },
  GUILD_EMOJIS_UPDATE: {
    beforeFetch(dt: any[]) {
      // check if we're missing cached data
      if (!Array.isArray(dt)) {
        return false;
      }
      if (dt.length !== 2) {
        return false;
      }
      return true;
    },
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    60: (dt: any, log: any) => {
      // discord.AuditLogEntry.ActionType.EMOJI_CREATE
      const newE = dt[0].emojis.find(
        (ele: discord.Emoji) => ele.id === log.targetId,
      );
      const oldE = dt[1].emojis.find(
        (ele: discord.Emoji) => ele.id === log.targetId,
      );
      if (typeof oldE !== 'undefined' || !(newE instanceof discord.Emoji)) {
        return false;
      }
      if (newE.id !== log.targetId) {
        return false;
      }
      for (const key in log.changes) {
        const val = log.changes[key];
        if (typeof newE[key] !== 'undefined' && newE[key] !== val.newValue) {
          return false;
        }
      }
      return true;
    },
    61: (dt: any, log: any) => {
      // discord.AuditLogEntry.ActionType.EMOJI_UPDATE
      const newE = dt[0].emojis.find(
        (ele: discord.Emoji) => ele.id === log.targetId,
      );
      const oldE = dt[1].emojis.find(
        (ele: discord.Emoji) => ele.id === log.targetId,
      );
      if (!(newE instanceof discord.Emoji) || !(oldE instanceof discord.Emoji)) {
        return false;
      }
      if (newE.id !== oldE.id) {
        return false;
      }
      for (const key in log.changes) {
        const val = log.changes[key];
        if (typeof newE[key] !== 'undefined' && newE[key] !== val.newValue) {
          return false;
        }
        if (typeof oldE[key] !== 'undefined' && oldE[key] !== val.oldValue) {
          return false;
        }
      }
      return true;
    },
    62: (dt: any, log: any) => {
      // discord.AuditLogEntry.ActionType.EMOJI_DELETE
      const newE = dt[0].emojis.find(
        (ele: discord.Emoji) => ele.id === log.targetId,
      );
      const oldE = dt[1].emojis.find(
        (ele: discord.Emoji) => ele.id === log.targetId,
      );
      if (typeof newE !== 'undefined' || !(oldE instanceof discord.Emoji)) {
        return false;
      }
      if (oldE.id !== log.targetId) {
        return false;
      }
      for (const key in log.changes) {
        const val = log.changes[key];
        if (typeof oldE[key] !== 'undefined' && oldE[key] !== val.oldValue) {
          return false;
        }
      }
      return true;
    },
    auditLogEntries: [
      discord.AuditLogEntry.ActionType.EMOJI_CREATE,
      discord.AuditLogEntry.ActionType.EMOJI_DELETE,
      discord.AuditLogEntry.ActionType.EMOJI_UPDATE,
    ],
  },
  GUILD_MEMBER_ADD: {
    beforeFetch(dt: any[]) {
      return dt[0].user.bot; // return false if the user is not a bot, canceling the audit log fetch
    },
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].user.id,
    validate: (dt: any, log: any) => dt[0].user.id === log.targetId,
    auditLogEntries: discord.AuditLogEntry.ActionType.BOT_ADD,
  },
  GUILD_MEMBER_UPDATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].user.id,
    getCompareData: (dt: any) => [dt[0], dt[1]],
    // discord.AuditLogEntry.ActionType.MEMBER_ROLE_UPDATE
    // i know its cringe lmao
    25: (dt: any, log: any, store: any) => {
      const newM = dt[0].roles;
      const oldM = dt[1].roles;
      const adds = newM.filter((ele: string) => {
        let had = oldM.find((ele2: string) => ele2 === ele);
        if (typeof had === 'undefined') {
          had = false;
        }
        return !had;
      });
      const removes = oldM.filter((ele: string) => {
        let have = newM.find((ele2: string) => ele2 === ele);
        if (typeof have === 'undefined') {
          have = false;
        }
        return !have;
      });
      let verifs = 0;
      for (const key in log.changes) {
        if (key !== '$add' && key !== '$remove') {
          continue;
        }
        const obj = log.changes[key].newValue;
        let cc = adds;
        if (key === '$remove') {
          cc = removes;
        }
        const anydiff = obj.find((ele: any) => cc.indexOf(ele.id) === -1);
        if (typeof anydiff !== 'undefined') {
          continue;
        }
        verifs += 1;
      }
      if (verifs === Object.keys(log.changes).length) {
        return true;
      }
      return false;
    },
    auditLogEntries: [
      discord.AuditLogEntry.ActionType.MEMBER_UPDATE,
      discord.AuditLogEntry.ActionType.MEMBER_ROLE_UPDATE,
    ],
  },
  GUILD_MEMBER_REMOVE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].user.id,
    getCompareData: (dt: any) => dt[0],
    auditLogEntries: [
      discord.AuditLogEntry.ActionType.MEMBER_KICK,
      discord.AuditLogEntry.ActionType.MEMBER_PRUNE,
      discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD,
    ],
  },
  GUILD_ROLE_CREATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => dt[0],
    auditLogEntries: discord.AuditLogEntry.ActionType.ROLE_CREATE,
  },
  GUILD_ROLE_UPDATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => [dt[0], dt[1]],
    auditLogEntries: discord.AuditLogEntry.ActionType.ROLE_UPDATE,
  },
  GUILD_ROLE_DELETE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => dt[1],
    auditLogEntries: discord.AuditLogEntry.ActionType.ROLE_DELETE,
  },
  GUILD_UPDATE: {
    guildId(dt: any[]) {
      return dt[0].id;
    },
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => [dt[0], dt[1]],
    auditLogEntries: [
      discord.AuditLogEntry.ActionType.GUILD_UPDATE,
      discord.AuditLogEntry.ActionType.INTEGRATION_CREATE,
      discord.AuditLogEntry.ActionType.INTEGRATION_UPDATE,
      discord.AuditLogEntry.ActionType.INTEGRATION_DELETE,
    ],
  },
  MESSAGE_DELETE: {
    beforeFetch(dt: any[]) {
      if (dt.length !== 2) {
        return false;
      }
      if (dt[1] === null) {
        return false;
      }
      const msg = dt[1] as discord.Message;
      if (msg.type !== discord.Message.Type.DEFAULT) {
        return false;
      }
      return true;
    },
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    // discord.AuditLogEntry.ActionType.MESSAGE_DELETE
    72: (
      dt: any,
      log: discord.AuditLogEntry.MessageDelete,
      store: discord.AuditLogEntry.MessageDelete,
    ) => {
      if (log.actionType !== discord.AuditLogEntry.ActionType.MESSAGE_DELETE) {
        return false;
      }
      if (dt[1] === null || typeof dt[1] === 'undefined') {
        return false;
      } // We're not gonna validate channelids, lol. no decent option
      if (
        dt[1].author.id !== log.targetId
        || dt[0].channelId !== log.options.channelId
      ) {
        return false;
      }
      if (typeof store === 'object') {
        if (store.id === log.id && store.options.count !== log.options.count) {
          return true;
        }
        // if (store.options.count !== log.options.count) return true;
        return false;
      }

      return true;
    },
    // discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD,
    22: (dt: any, log: discord.AuditLogEntry.MemberBanAdd) => {
      if (dt[1] === null || typeof dt[1] === 'undefined') {
        return false;
      }
      const author = dt[1].author.id;
      if (log.targetId === author) {
        return true;
      }
      return false;
    },
    store: {
      entryFound: true,
    },
    auditLogEntries: [
      discord.AuditLogEntry.ActionType.MESSAGE_DELETE,
      discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD,
    ],
  },
  MESSAGE_DELETE_BULK: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    validate: (
      dt: any,
      log: discord.AuditLogEntry.MessageBulkDelete,
      store: discord.AuditLogEntry.MessageBulkDelete,
    ) => {
      if (dt[0].channelId !== log.targetId) {
        return false;
      }
      if (store instanceof discord.AuditLogEntry.MessageBulkDelete) {
        if (dt[0].ids.length.toString() !== log.options.count.toString()) {
          if (log.id === store.id) {
            return true;
          } // lol
          // If counts are different from logs, let's add to our stored value and validate
          const storedCount = +store.options.count;
          const gottenCount = +log.options.count;
          if (storedCount + dt[0].ids.length === gottenCount) {
            return true;
          } // stored + event gotten adds up to log entries
        }
        return false;
      }
      if (dt[0].ids.length.toString() === log.options.count.toString()) {
        return true;
      }

      return false;
    },
    returnData: (log: any, store: discord.AuditLogEntry.MessageBulkDelete) => {
      if (typeof store !== 'object') {
        return log;
      }
      const toDeduct = +log.options.count - +store.options.count;
      log.options.count = toDeduct.toString();
      return log;
    },
    store: {
      entryFound: true,
    },
    auditLogEntries: [discord.AuditLogEntry.ActionType.MESSAGE_BULK_DELETE],
  },
  VOICE_STATE_UPDATE: {
    beforeFetch(dt: any[]) {
      if (dt.length !== 2) {
        return false;
      }
      if (dt[1] === null) {
        return false;
      }
      const voiceState: discord.VoiceState = dt[0];
      const oldVoiceState: discord.VoiceState = dt[1];
      if (
        voiceState.channelId !== oldVoiceState.channelId
        && voiceState.mute !== oldVoiceState.mute
        && voiceState.deaf !== oldVoiceState.deaf
      ) {
        return false;
      }
      return true;
    },
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    // MEMBER_UPDATE
    24: (dt: any, log: discord.AuditLogEntry.MemberUpdate) => {
      const voiceState: discord.VoiceState = dt[0];
      const oldVoiceState: discord.VoiceState = dt[1];
      if (voiceState.channelId === null) {
        return false;
      }
      if (
        voiceState.mute === oldVoiceState.mute
        && voiceState.deaf === oldVoiceState.deaf
      ) {
        return false;
      }
      if (
        voiceState.mute !== oldVoiceState.mute
        && log.changes.mute
        && log.changes.mute.newValue === voiceState.mute
        && log.changes.mute.oldValue === oldVoiceState.mute
      ) {
        return true;
      }
      if (
        voiceState.deaf !== oldVoiceState.deaf
        && log.changes.deaf
        && log.changes.deaf.newValue === voiceState.deaf
        && log.changes.deaf.oldValue === oldVoiceState.deaf
      ) {
        return true;
      }

      return false;
    },
    // MEMBER_MOVE
    26: (
      dt: any,
      log: discord.AuditLogEntry.MemberMove,
      store: discord.AuditLogEntry.MemberMove,
    ) => {
      const voiceState: discord.VoiceState = dt[0];
      const oldVoiceState: discord.VoiceState = dt[1];
      if (
        voiceState.channelId === oldVoiceState.channelId
        || voiceState.channelId !== log.options.channelId
      ) {
        return false;
      }
      if (voiceState.channelId === null || oldVoiceState.channelId === null) {
        return false;
      }
      if (!(store instanceof discord.AuditLogEntry.MemberMove)) {
        return true;
      }
      if (store.id === log.id && store.options.count !== log.options.count) {
        return true;
      }
      return false;
    },
    // MEMBER_DISCONNECT
    27: (
      dt: any,
      log: discord.AuditLogEntry.MemberDisconnect,
      store: discord.AuditLogEntry.MemberDisconnect,
    ) => {
      const voiceState: discord.VoiceState = dt[0];
      const oldVoiceState: discord.VoiceState = dt[1];
      if (
        voiceState.channelId === oldVoiceState.channelId
        || voiceState.channelId !== null
      ) {
        return false;
      }
      if (oldVoiceState.channelId === null) {
        return false;
      }
      if (!(store instanceof discord.AuditLogEntry.MemberDisconnect)) {
        return true;
      }
      if (store.id === log.id && store.options.count !== log.options.count) {
        return true;
      }
      return false;
    },
    store: {
      entryFound: true,
    },
    auditLogEntries: [
      discord.AuditLogEntry.ActionType.MEMBER_MOVE,
      discord.AuditLogEntry.ActionType.MEMBER_DISCONNECT,
      discord.AuditLogEntry.ActionType.MEMBER_UPDATE,
    ],
  },

  // only here for guild ids

  GUILD_INTEGRATIONS_UPDATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
    auditLogEntries: discord.AuditLogEntry.ActionType.INTEGRATION_UPDATE,
  },
  MESSAGE_REACTION_ADD: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
  },
  MESSAGE_CREATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
  },
  MESSAGE_REACTION_REMOVE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
  },
  MESSAGE_REACTION_REMOVE_ALL: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
  },
  MESSAGE_UPDATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
  },

  VOICE_SERVER_UPDATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
  },
  TYPING_START: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
  },
  WEBHOOKS_UPDATE: {
    guildId(dt: any[]) {
      return dt[0].guildId;
    },
  },
};
