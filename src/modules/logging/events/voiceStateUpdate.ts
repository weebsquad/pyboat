import { handleEvent, getUserTag, getMemberTag, isIgnoredChannel, isIgnoredUser, getChannelEmoji } from '../main';
import * as utils from '../../../lib/utils';

export function getKeys(
  log: discord.AuditLogEntry,
  voiceState: discord.VoiceState,
  oldVoiceState: discord.VoiceState,
) {
  if (isIgnoredChannel(voiceState.channelId)) {
    return [];
  }
  if (isIgnoredUser(voiceState.userId)) {
    return [];
  }
  const keys = [];
  if (voiceState.channelId !== oldVoiceState.channelId) {
    if (
      (voiceState.channelId === null || voiceState.channelId === undefined)
      && oldVoiceState.channelId !== null
      && oldVoiceState.channelId !== undefined
    ) {
      keys.push('channelLeft');
    } else if (
      voiceState.channelId !== null
      && voiceState.channelId !== undefined
      && (oldVoiceState.channelId === null
        || oldVoiceState.channelId === undefined)
    ) {
      keys.push('channelJoined');
    } else {
      keys.push('channelMove');
    }
  }
  if (voiceState.deaf !== oldVoiceState.deaf && voiceState.deaf === true) {
    keys.push('serverDeaf');
  }
  if (voiceState.deaf !== oldVoiceState.deaf && voiceState.deaf === false) {
    keys.push('serverUndeaf');
  }
  if (voiceState.mute !== oldVoiceState.mute && voiceState.mute === true) {
    keys.push('serverMute');
  }
  if (voiceState.mute !== oldVoiceState.mute && voiceState.mute === false) {
    keys.push('serverUnmute');
  }
  if (
    voiceState.selfDeaf !== oldVoiceState.selfDeaf
    && voiceState.selfDeaf === true
  ) {
    keys.push('selfDeaf');
  }
  if (
    voiceState.selfDeaf !== oldVoiceState.selfDeaf
    && voiceState.selfDeaf === false
  ) {
    keys.push('selfUndeaf');
  }
  if (
    voiceState.selfMute !== oldVoiceState.selfMute
    && voiceState.selfMute === true
  ) {
    keys.push('selfMute');
  }
  if (
    voiceState.selfMute !== oldVoiceState.selfMute
    && voiceState.selfMute === false
  ) {
    keys.push('selfUnmute');
  }
  if (
    voiceState.selfStream !== oldVoiceState.selfStream
    && voiceState.selfStream === true
  ) {
    keys.push('startStream');
  }
  if (
    voiceState.selfStream !== oldVoiceState.selfStream
    && voiceState.selfStream === false
  ) {
    keys.push('stopStream');
  }

  if (
    voiceState.selfVideo !== oldVoiceState.selfVideo
    && voiceState.selfVideo === true
  ) {
    keys.push('startVideo');
  }
  if (
    voiceState.selfVideo !== oldVoiceState.selfVideo
    && voiceState.selfVideo === false
  ) {
    keys.push('stopVideo');
  }

  return keys;
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  ...args: any
) {
  if (!key.includes('server') && !key.includes('channel')) {
    return false;
  }
  if (key === 'channelJoined') {
    return false;
  }
  if (!(log instanceof discord.AuditLogEntry)) {
    return false;
  }
  if (log.userId === args[0].userId) {
    return false;
  }
  return true;
}

export const messages = {
  async serverDeaf(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'SERVER_DEAFENED'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async serverUndeaf(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'SERVER_UNDEAFENED'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async serverMute(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'SERVER_MUTED'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async serverUnmute(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'SERVER_UNMUTED'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async selfDeaf(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'SELF_DEAFENED'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async selfUndeaf(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'SELF_UNDEAFENED'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async selfMute(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'SELF_MUTED'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async selfUnmute(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'SELF_UNMUTED'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async startStream(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'START_STREAM'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async stopStream(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'STOP_STREAM'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async startVideo(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'START_VIDEO'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async stopVideo(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'STOP_VIDEO'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async channelJoined(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'ENTERED_CHANNEL'],
      ['CHANNEL_ID', voiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async channelLeft(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
    oldVoiceState: discord.VoiceState,
  ) {
    const _chan = await oldVoiceState.getChannel();
    if (_chan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'LEFT_CHANNEL'],
      ['CHANNEL_ID', oldVoiceState.channelId],
      [
        'CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
  async channelMove(
    log: discord.AuditLogEntry,
    voiceState: discord.VoiceState,
    oldVoiceState: discord.VoiceState,
  ) {
    const _chan = await voiceState.getChannel();
    const oldChan = await oldVoiceState.getChannel();
    if (_chan === null || oldChan === null) {
      return;
    }
    const parent = typeof _chan.parentId === 'string' ? await discord.getGuildCategory(_chan.parentId) : null;
    const oldParent = typeof oldChan.parentId === 'string' ? await discord.getGuildCategory(oldChan.parentId) : null;
    const mp = new Map([
      ['USERTAG', getMemberTag(voiceState.member)],
      ['USER_ID', voiceState.userId],
      ['USER', voiceState.member.user],
      ['TYPE', 'MOVED_CHANNEL'],
      ['OLD_CHANNEL_ID', oldVoiceState.channelId],
      [
        'NEW_CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(_chan.name, true)}`,
      ],
      ['NEW_CHANNEL_ID', voiceState.channelId],
      [
        'OLD_CHANNEL_NAME',
        `${discord.decor.Emojis.SPEAKER}${utils.escapeString(oldChan.name, true)}`,
      ],
      ['OLD_CHANNEL_MENTION', `${oldParent !== null ? `${getChannelEmoji(oldParent)}\`${utils.escapeString(oldParent.name, true)}\`**>**` : ''}${getChannelEmoji(oldChan)}\`${utils.escapeString(oldChan.name, true)}\``],
      ['NEW_CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(_chan)}\`${utils.escapeString(_chan.name, true)}\``],
    ]);
    return mp;
  },
};

export async function AL_OnVoiceStateUpdate(
  id: string,
  guildId: string,
  log: any,
  voiceState: discord.VoiceState,
  oldVoiceState: discord.VoiceState,
) {
  console.log('onvoicestateupdate logging', voiceState, oldVoiceState);
  await handleEvent(
    id,
    guildId,
    discord.Event.VOICE_STATE_UPDATE,
    log,
    voiceState,
    oldVoiceState,
  );
}
