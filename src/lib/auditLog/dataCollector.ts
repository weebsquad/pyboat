/* eslint-disable eqeqeq */
import { formatDiagnosticsWithColorAndContext } from 'typescript';
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
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => dt[0],
    // CHANNEL_OVERWRITE_CREATE
    10(dt: any[], log: discord.AuditLogEntry.ChannelCreate) {
      if (dt[0].id === log.targetId) {
        return true;
      }
      return false;
    },
    auditLogEntries: discord.AuditLogEntry.ActionType.CHANNEL_CREATE,
    store: {
      ignoreFound: true,
    },
  },
  CHANNEL_DELETE: {
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => dt[0],
    auditLogEntries: discord.AuditLogEntry.ActionType.CHANNEL_DELETE,
    store: {
      ignoreFound: true,
    },
  },
  CHANNEL_UPDATE: {
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => [dt[0], dt[1]],
    // CHANNEL_OVERWRITE_CREATE
    13(dt: any[], log: discord.AuditLogEntry.ChannelPermissionOverwriteCreate) {
      const perms = utils.getPermDiffs(dt[0], dt[1]);
      if (perms.added.length === 1) {
        const thisp = perms.added[0];
        // @ts-ignore
        if (thisp.id === log.options.id && (thisp.type === log.options.type || (thisp.type == 0 && log.options.type === 'role') || (thisp.type == 1 && log.options.type === 'member'))) {
          if (log.changes.allow.newValue === thisp.allow && log.changes.deny.newValue === thisp.deny) {
            return true;
          }
        }
      }
      return false;
    },
    // CHANNEL_OVERWRITE_UPDATE
    14(dt: any[], log: discord.AuditLogEntry.ChannelPermissionOverwritesUpdate) {
      const perms = utils.getPermDiffs(dt[0], dt[1]);
      if (perms.changed.length === 1) {
        const thisp = perms.changed[0];
        // @ts-ignore
        if (thisp.id === log.options.id && (thisp.type === log.options.type || (thisp.type == 0 && log.options.type === 'role') || (thisp.type == 1 && log.options.type === 'member'))) {
          const oldpe = dt[1].permissionOverwrites.find((obj: discord.Channel.IPermissionOverwrite) => obj.id === thisp.id);
          if (!oldpe) {
            return false;
          }
          if (log.changes.allow) {
            if ((log.changes.allow.newValue && log.changes.allow.newValue !== thisp.allow) || (log.changes.allow.oldValue && log.changes.allow.oldValue !== oldpe.allow)) {
              return false;
            }
          }
          if (log.changes.deny) {
            if ((log.changes.deny.newValue && log.changes.deny.newValue !== thisp.deny) || (log.changes.deny.oldValue && log.changes.deny.oldValue !== oldpe.deny)) {
              return false;
            }
          }
          return true;
        }
      }
      return false;
    },
    // CHANNEL_OVERWRITE_DELETE
    15(dt: any[], log: discord.AuditLogEntry.ChannelPermissionOverwriteDelete) {
      const perms = utils.getPermDiffs(dt[0], dt[1]);
      if (perms.removed.length === 1) {
        const thisp = perms.removed[0];
        // @ts-ignore
        if (thisp.id === log.options.id && (thisp.type === log.options.type || (thisp.type == 0 && log.options.type === 'role') || (thisp.type == 1 && log.options.type === 'member'))) {
          if (log.changes.allow.oldValue === thisp.allow && log.changes.deny.oldValue === thisp.deny) {
            return true;
          }
        }
      }
      return false;
    },
    auditLogEntries: [discord.AuditLogEntry.ActionType.CHANNEL_OVERWRITE_CREATE, discord.AuditLogEntry.ActionType.CHANNEL_OVERWRITE_DELETE, discord.AuditLogEntry.ActionType.CHANNEL_OVERWRITE_UPDATE, discord.AuditLogEntry.ActionType.CHANNEL_UPDATE],
    store: {
      ignoreFound: true,
    },
  },
  CHANNEL_PINS_UPDATE: {
    validate(dt: any[], log: discord.AuditLogEntry | any, store: any) {
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
    targetId: (dt: any) => dt[0].user.id,
    validate: (dt: any, log: any) => dt[0].user.id === log.targetId,
    auditLogEntries: discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD,
    store: {
      ignoreFound: true,
    },
  },
  GUILD_BAN_REMOVE: {
    targetId: (dt: any) => dt[0].user.id,
    validate: (dt: any, log: any) => dt[0].user.id === log.targetId,
    auditLogEntries: discord.AuditLogEntry.ActionType.MEMBER_BAN_REMOVE,
    store: {
      ignoreFound: true,
    },
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
    store: {
      ignoreFound: true,
    },
  },
  GUILD_MEMBER_ADD: {
    beforeFetch(dt: any[]) {
      return dt[0].user.bot; // return false if the user is not a bot, canceling the audit log fetch
    },
    targetId: (dt: any) => dt[0].user.id,
    validate: (dt: any, log: any) => dt[0].user.id === log.targetId,
    auditLogEntries: discord.AuditLogEntry.ActionType.BOT_ADD,
    store: {
      ignoreFound: true,
    },
  },
  GUILD_MEMBER_UPDATE: {
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
    store: {
      ignoreFound: true,
    },
  },
  GUILD_MEMBER_REMOVE: {
    targetId: (dt: any) => dt[0].user.id,
    getCompareData: (dt: any) => dt[0],
    auditLogEntries: [
      discord.AuditLogEntry.ActionType.MEMBER_KICK,
      discord.AuditLogEntry.ActionType.MEMBER_PRUNE,
      discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD,
    ],
    store: {
      ignoreFound: true,
    },
  },
  GUILD_ROLE_CREATE: {
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => dt[0],
    auditLogEntries: discord.AuditLogEntry.ActionType.ROLE_CREATE,
    store: {
      ignoreFound: true,
    },
  },
  GUILD_ROLE_UPDATE: {
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => [dt[0], dt[1]],
    auditLogEntries: discord.AuditLogEntry.ActionType.ROLE_UPDATE,
    store: {
      ignoreFound: true,
    },
  },
  GUILD_ROLE_DELETE: {
    targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => dt[1],
    auditLogEntries: discord.AuditLogEntry.ActionType.ROLE_DELETE,
    store: {
      ignoreFound: true,
    },
  },
  GUILD_UPDATE: {
    // targetId: (dt: any) => dt[0].id,
    getCompareData: (dt: any) => [dt[0], dt[1]],
    auditLogEntries: [
      discord.AuditLogEntry.ActionType.GUILD_UPDATE,
      discord.AuditLogEntry.ActionType.INTEGRATION_CREATE,
      discord.AuditLogEntry.ActionType.INTEGRATION_UPDATE,
      discord.AuditLogEntry.ActionType.INTEGRATION_DELETE,
    ],
    store: {
      ignoreFound: true,
    },
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
        let oldCount: any = store.options.count;
        if (typeof (oldCount) === 'number') {
          oldCount = oldCount.toString();
        }
        let newCount: any = log.options.count;
        if (typeof (newCount) === 'number') {
          newCount = newCount.toString();
        }
        if (store.id === log.id && oldCount !== newCount) {
          return true;
        }
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
    73: (dt: any, log: discord.AuditLogEntry.MessageBulkDelete, store: discord.AuditLogEntry.MessageBulkDelete) => {
      if (dt[0].channelId !== log.targetId) {
        return false;
      }
      if (store && typeof store === 'object') {
        const storedCount = +store.options.count;
        return storedCount + 1 === +log.options.count;
      }
      if (log.options.count === '1') {
        return true;
      } // if we got nothing saved and the log is a single delete

      return false;
    },
    store: {
      entryFound: true,
    },
    auditLogEntries: [
      discord.AuditLogEntry.ActionType.MESSAGE_DELETE,
      discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD,
      discord.AuditLogEntry.ActionType.MESSAGE_BULK_DELETE,
    ],
  },
  MESSAGE_DELETE_BULK: {
    validate: (
      dt: any,
      log: discord.AuditLogEntry.MessageBulkDelete,
      store: discord.AuditLogEntry.MessageBulkDelete,
    ) => {
      if (dt[0].channelId !== log.targetId) {
        return false;
      }
      if (typeof store === 'object') {
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
    // MEMBER_UPDATE
    24: (dt: any, log: discord.AuditLogEntry.MemberUpdate) => {
      const voiceState: discord.VoiceState = dt[0];
      const oldVoiceState: discord.VoiceState = dt[1];
      if (log.userId === voiceState.userId) {
        return false;
      }
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
        && typeof log.changes.mute === 'object'
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
      if (log.userId === voiceState.userId) {
        return false;
      }
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
      if (log.userId === voiceState.userId) {
        return false;
      }
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

};
