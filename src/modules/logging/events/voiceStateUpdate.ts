import { handleEvent, getUserTag, getMemberTag } from '../main';
import * as utils from '../../../lib/utils';

export function getKeys(
  log: discord.AuditLogEntry,
  voiceState: discord.VoiceState,
  oldVoiceState: discord.VoiceState
) {
  let keys = new Array();
  if (voiceState.deaf !== oldVoiceState.deaf && voiceState.deaf === true)
    keys.push('serverDeaf');
  if (voiceState.deaf !== oldVoiceState.deaf && voiceState.deaf === false)
    keys.push('serverUndeaf');
  if (voiceState.mute !== oldVoiceState.mute && voiceState.mute === true)
    keys.push('serverMute');
  if (voiceState.mute !== oldVoiceState.mute && voiceState.mute === false)
    keys.push('serverUnmute');
  if (
    voiceState.selfDeaf !== oldVoiceState.selfDeaf &&
    voiceState.selfDeaf === true
  )
    keys.push('selfDeaf');
  if (
    voiceState.selfDeaf !== oldVoiceState.selfDeaf &&
    voiceState.selfDeaf === false
  )
    keys.push('selfUndeaf');
  if (
    voiceState.selfMute !== oldVoiceState.selfMute &&
    voiceState.selfMute === true
  )
    keys.push('selfMute');
  if (
    voiceState.selfMute !== oldVoiceState.selfMute &&
    voiceState.selfMute === false
  )
    keys.push('selfUnmute');
  if (
    voiceState.selfStream !== voiceState.selfStream &&
    voiceState.selfStream === true
  )
    keys.push('startStream');
  if (
    voiceState.selfStream !== voiceState.selfStream &&
    voiceState.selfStream === false
  )
    keys.push('stopStream');
  if (voiceState.channelId !== oldVoiceState.channelId) {
    if (
      (voiceState.channelId === null || voiceState.channelId === undefined) &&
      oldVoiceState.channelId !== null &&
      oldVoiceState.channelId !== undefined
    ) {
      keys.push('channelLeft');
    } else if (
      voiceState.channelId !== null &&
      voiceState.channelId !== undefined &&
      (oldVoiceState.channelId === null ||
        oldVoiceState.channelId === undefined)
    ) {
      keys.push('channelJoined');
    } else {
      keys.push('channelMove');
    }
  }

  return keys;
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  ...args: any
) {
  if (!key.includes('server') && !key.includes('channel')) return false;
  if (key === 'channelJoined') return false;
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  serverDeaf: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'SERVER_DEAFENED'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  serverUndeaf: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'SERVER_UNDEAFENED'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  serverMute: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'SERVER_MUTED'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  serverUnmute: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'SERVER_UNMUTED'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  selfDeaf: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'SELF_DEAFENED'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  selfUndeaf: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'SELF_UNDEAFENED'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  selfMute: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'SELF_MUTED'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  selfUnmute: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'SELF_UNMUTED'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  startStream: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'START_STREAM'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  stopStream: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'STOP_STREAM'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  channelJoined: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'ENTERED_CHANNEL'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  channelLeft: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
    oldVoiceState: discord.VoiceState
  ) {
    const _chan = await oldVoiceState.getChannel();
    if (_chan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'LEFT_CHANNEL'],
      ['_CHANNEL_ID_', voiceState.channelId],
      [
        '_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ]
    ]);
    return mp;
  },
  channelMove: async function(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
    oldVoiceState: discord.VoiceState
  ) {
    const _chan = await voiceState.getChannel();
    const oldChan = await oldVoiceState.getChannel();
    if (_chan === null || oldChan === null) return;
    let mp = new Map([
      ['_USERTAG_', getMemberTag(voiceState.member)],
      ['_TYPE_', 'MOVED_CHANNEL'],
      ['_OLD_CHANNEL_ID_', voiceState.channelId],
      [
        '_OLD_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name)}`
      ],
      ['_NEW_CHANNEL_ID_', oldVoiceState.channelId],
      [
        '_NEW_CHANNEL_NAME_',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(oldChan.name)}`
      ]
    ]);
    return mp;
  }
};

export async function AL_OnVoiceStateUpdate(
  id: string,
  guildId: string,
  log: any,
  voiceState: discord.VoiceState,
  oldVoiceState: discord.VoiceState
) {
  //console.log('onVoiceState.', log, voiceState, oldVoiceState);
  await handleEvent(
    id,
    guildId,
    discord.Event.VOICE_STATE_UPDATE,
    log,
    voiceState,
    oldVoiceState
  );
}
