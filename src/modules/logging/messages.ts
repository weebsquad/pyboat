// import { config, globalConfig } from '../../config';

// const _c = config.modules.logging.auditLogs === true;

const _c = false; // todo: reflect auditlogs config abvoe
const jumpMessageText = '→ Jump to message';
const fieldName = '​​​';
//  <' + fieldName + '>[' +jumpMessageText +'](https://discord.com/channels/_GUILD_ID_/_CHANNEL_ID_/_MESSAGE_ID_)',
export const messageJump = ` <${
  fieldName
}>[${
  jumpMessageText
}](https://discord.com/channels/_GUILD_ID_/_CHANNEL_ID_/_MESSAGE_ID_)`;

export function getTimestamp(dt: Date) {
  return `\`[${(`0${dt.getHours()}`).substr(-2)}:${(
    `0${dt.getMinutes()}`
  ).substr(-2)}:${(`0${dt.getSeconds()}`).substr(-2)}]\``;
}
export const messages: {[key: string]: {[key: string]: string}} = {
  'DEBUG': {
    BOT_ERROR: `${discord.decor.Emojis.NO_ENTRY} Bot error\n\`\`\`js\n_ERROR_\n\`\`\``,
    BOT_STARTED: `${discord.decor.Emojis.WHITE_CHECK_MARK} Bot code reloaded`,
    RAW_EVENT: `${discord.decor.Emojis.INBOX_TRAY} received \`_EVENT_\` / Queue: **_QUEUE_**`,
    CRON_RAN: `${discord.decor.Emojis.WATCH} Cron task \`_CRON_NAME_\` executed.`,
    BLACKLISTED_USER_ACTION: `${discord.decor.Emojis.NO_ENTRY} global-blacklisted user _USERTAG_ tried to perform _ACTION_`,
  },
  '|PERSIST': {
    SAVED: `${discord.decor.Emojis.FLOPPY_DISK} _USERTAG_ backup data saved.`,
    RESTORED: `${discord.decor.Emojis.FLOPPY_DISK} _USERTAG_ backup data restored.`,
  },
  '|INFRACTIONS': {
    KICK: `${discord.decor.Emojis.BOOT} _ACTORTAG_ kicked _USERTAG__REASON_`,
    MUTE: `${discord.decor.Emojis.MUTE} _ACTORTAG_ muted _USERTAG__REASON_`,
    UNMUTE: `${discord.decor.Emojis.SPEAKER} _ACTORTAG_ unmuted _USERTAG__REASON_`,
    TEMPMUTE: `${discord.decor.Emojis.MUTE} _ACTORTAG_ temp-muted _USERTAG_ for _DURATION__REASON_`,
    TEMPMUTE_EXPIRED: `${discord.decor.Emojis.ALARM_CLOCK} _USERTAG_ 's tempmute expired.`,
    BAN: `${discord.decor.Emojis.HAMMER} _ACTORTAG_ banned _USERTAG__REASON_`,
    UNBAN: `${discord.decor.Emojis.CYCLONE} _ACTORTAG_ unbanned _USERTAG__REASON_`,
    SOFTBAN: `${discord.decor.Emojis.CYCLONE} _ACTORTAG_ softbanned _USERTAG_ (deleting _DELETE_DAYS_ days of their messages)_REASON_`,
    TEMPBAN: `${discord.decor.Emojis.HAMMER} _ACTORTAG_ temp-banned _USERTAG_ for _DURATION__REASON_`,
    TEMPBAN_EXPIRED: `${discord.decor.Emojis.ALARM_CLOCK} _USERTAG_ 's tempban expired.`,
    MASSBAN: `${discord.decor.Emojis.HAMMER}${discord.decor.Emojis.HAMMER}${discord.decor.Emojis.HAMMER} _ACTORTAG_ mass-banned _BANNED_USER_COUNT_ users **[**\`_BANNED_USERS_\`**]**_REASON_`,
    EDITED: `${discord.decor.Emojis.PENCIL2} _ACTORTAG_ edited infraction id \`_INFRACTION_ID_\` : **_TYPE_** : \`_NEW_VALUE_\``,
    DELETED: `${discord.decor.Emojis.EXCLAMATION} _ACTORTAG_ deleted infraction id \`_INFRACTION_ID_\``,
  },
  '|CORE': {
    BLACKLISTED_USER_ACTION: `${discord.decor.Emojis.NO_ENTRY} blacklisted user _USERTAG_ tried to perform _ACTION_`,
  },
  '|COMMANDS': {
    COMMAND_USED: `${discord.decor.Emojis.TOOLS} _USERTAG_ used command in <#_CHANNEL_ID_> : \`_COMMAND_NAME_\``,
  },
  '|ADMIN': {
    CLEAN: `${discord.decor.Emojis.WASTEBASKET} _ACTORTAG_ cleaned **_MESSAGES_** messages_CHANNEL__USERTAG_`,
  },
  '|ANTISPAM': {
    ANTIRAID: `${discord.decor.Emojis.EXCLAMATION} Message Anti Raid triggered with \`_FLAGS_\` and action \`_ACTION_\` was automatically performed`,
    ANTIRAID_VIOLATION: `${discord.decor.Emojis.EXCLAMATION} Message Anti Raid triggered with \`_FLAGS_\` and there were **_DELETED_MESSAGES_** messages deleted.`,
    VIOLATION: `${discord.decor.Emojis.TOOLBOX} _USERTAG_ violated anti-spam flags: \`_FLAGS_\` and had **_DELETED_MESSAGES_** messages deleted.`,
  },
  '|CENSOR': {
    CENSORED_MESSAGE: `${discord.decor.Emojis.SPEECH_BALLOON} _USERTAG_ had their message **[**||\`_MESSAGE_ID_\`||**]** in <#_CHANNEL_ID_> censored: \`_CENSOR_MESSAGE_\`**[**:_CENSOR_TP_**]** => \`_CENSOR_TARGET_\``,
    CENSORED_USERNAME: `${discord.decor.Emojis.SPEECH_BALLOON} _USERTAG_ had their name of \`_OLD_NAME_\`censored: \`_CENSOR_MESSAGE_\`**[**:_CENSOR_TP_**]** => \`_CENSOR_TARGET_\``,
  },
  '|ANTIPING': {
    FAIL_MARK_MEMBER_NOT_FOUND: '_ACTORTAG_ tried to mark anti-ping punishment of _USERTAG_ as _ACTION_ but _USERTAG_ left the server',
    FAIL_MARK_UNMUTE: '_ACTORTAG_ tried to mark anti-ping punishment of _USERTAG_ as _ACTION_ but failed to unmute',
    FAIL_MARK_ACTION: '_ACTORTAG_ tried to mark anti-ping punishment of _USERTAG_ as _ACTION_ but I failed to _ACTION_ them',
    MARK_SUCCESS: '_ACTORTAG_ successfully marked _USERTAG_ \'s punishment in <#_CHANNEL_ID_> as _ACTION_',
    LEFT_BANNED: '_USERTAG_ left the server with pending anti-ping punishments and was auto-banned',
    TRIGGERED: '_USERTAG_ triggered anti-ping in <#_CHANNEL_ID_>',
    TRIGGERED_MUTE: '_USERTAG_ triggered anti-ping in <#_CHANNEL_ID_> and was auto-muted',
  },

  'CHANNEL_CREATE': {
    CHANNEL_CREATED: `${discord.decor.Emojis.WRENCH} new channel created: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]**`,
    DM_CHANNEL_OPENED: `${discord.decor.Emojis.BOOKMARK_TABS} _USERTAG_ opened a dm channel with the bot`,
  },
  'CHANNEL_UPDATE': {
    NAME_CHANGED: `${discord.decor.Emojis.WRENCH} channel edited: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** name updated: \`_OLD_NAME_\` => \`_NEW_NAME_\``,
    CATEGORY_CHANGED: `${discord.decor.Emojis.WRENCH} channel edited: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed category: _OLD_MENTION_ => _NEW_MENTION_`,
    TYPE_CHANGED: `${discord.decor.Emojis.WRENCH} channel edited: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed type: \`_OLD_TYPE_\` => \`_NEW_TYPE_\``,
    NSFW_CHANGED: `${discord.decor.Emojis.WRENCH} channel edited: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** nsfw status set to **_NEW_NSFW_**`,
    TOPIC_CHANGED: `${discord.decor.Emojis.WRENCH} channel edited: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed topic: \`_OLD_TOPIC_\` => \`_NEW_TOPIC_\``,
    SLOWMODE_CHANGED: `${discord.decor.Emojis.WRENCH} channel edited: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed slowmode: **_OLD_SLOWMODE_s** => **_NEW_SLOWMODE_s**`,
    BITRATE_CHANGED: `${discord.decor.Emojis.WRENCH} channel edited: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed bitrated: **_OLD_BITRATE_kbps** => **_NEW_BITRATE_kbps**`,
    USERLIMIT_CHANGED: `${discord.decor.Emojis.WRENCH} channel edited: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed user limit: **_OLD_LIMIT_** => **_NEW_LIMIT_**`,
    PERMS_SYNCED: `${discord.decor.Emojis.WRENCH} channel edited: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** permissions synchronized with _PARENT_MENTION_`,
    PERMS_CHANGED: `${discord.decor.Emojis.WRENCH} channel edited: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** permissions changed: _CHANGES_`,
  },
  'CHANNEL_DELETE': {
    CHANNEL_DELETED: `${discord.decor.Emojis.WRENCH} channel deleted: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]**`,
  },
  'CHANNEL_PINS_UPDATE': {
    MESSAGE_PINNED: `${discord.decor.Emojis.PUSHPIN} pinned a message **[**||\`_MESSAGE_ID_\`||**]** by _USERTAG_ in <#_CHANNEL_ID_>${messageJump}`,
    MESSAGE_UNPINNED: `${discord.decor.Emojis.PUSHPIN} unpinned a message **[**||\`_MESSAGE_ID_\`||**]** by _USERTAG_ in <#_CHANNEL_ID_>${messageJump}`,
  },
  'GUILD_MEMBER_ADD': {
    BOT_ADDED: '<:bot:735780703945490542> _USERTAG_ was added to the server',
    MEMBER_JOIN: `${discord.decor.Emojis.INBOX_TRAY} _USERTAG_ joined the server (account created _ACCOUNT_AGE_ ago)`,
  },
  'GUILD_MEMBER_REMOVE': {
    MEMBER_LEFT: `${discord.decor.Emojis.OUTBOX_TRAY} _USERTAG_ left the server`,
  },
  'GUILD_BAN_ADD': {
    MEMBER_BANNED: `${discord.decor.Emojis.HAMMER} _USERTAG_ was banned from the server`,
  },
  'GUILD_BAN_REMOVE': {
    MEMBER_UNBANNED: `${discord.decor.Emojis.CYCLONE} _USERTAG_ was unbanned from the server`,
  },
  'GUILD_MEMBER_UPDATE': {
    NICK_ADDED: `${discord.decor.Emojis.RED_ENVELOPE} _USERTAG_ ${_c ? 'added nickname' : 'nickname added'} \`_NEW_NICK_\``,
    NICK_CHANGED: `${discord.decor.Emojis.RED_ENVELOPE} _USERTAG_ ${_c ? 'changed their nickname' : 'nickname changed'} from \`_OLD_NICK_\` to \`_NEW_NICK_\``,
    NICK_REMOVED: `${discord.decor.Emojis.RED_ENVELOPE} _USERTAG_ ${_c ? 'removed their nickname' : 'nickname removed'} of \`_OLD_NICK_\``,
    ROLES_ADDED: `${discord.decor.Emojis.SHIELD} _USERTAG_ ${_c ? 'added role(s) to themselves' : 'role(s) added'}: _ADDED_ROLES_`,
    ROLES_REMOVED: `${discord.decor.Emojis.SHIELD} _USERTAG_ ${_c ? 'removed role(s) from themselves' : 'role(s) removed'}: _REMOVED_ROLES_`,
    ROLES_CHANGED: `${discord.decor.Emojis.SHIELD} _USERTAG_ ${_c ? 'changed own roles' : 'roles changed'}: _CHANGED_ROLES_`,
    AVATAR_ADDED: `${discord.decor.Emojis.FRAME_PHOTO} _USERTAG_ added avatar : _NEW_AVATAR_`,
    AVATAR_REMOVED: `${discord.decor.Emojis.FRAME_PHOTO} _USERTAG_ removed their avatar : _OLD_AVATAR_`,
    AVATAR_CHANGED: `${discord.decor.Emojis.FRAME_PHOTO} _USERTAG_ changed their avatar to _NEW_AVATAR_`,
    USERNAME_CHANGED: `${discord.decor.Emojis.PAGE_WITH_CURL} _USERTAG_ changed their username from \`_OLD_USERNAME_\` to \`_NEW_USERNAME_\``,
    DISCRIMINATOR_CHANGED: `${discord.decor.Emojis.PAGE_WITH_CURL} _USERTAG_ changed their discriminator from \`_OLD_DISCRIMINATOR_\` to \`_NEW_DISCRIMINATOR_\``,
    BOOSTING_STARTED: `${discord.decor.Emojis.CHART_WITH_UPWARDS_TREND} _USERTAG_ boosted the server`,
    BOOSTING_STOPPED: `${discord.decor.Emojis.CHART_WITH_UPWARDS_TREND} _USERTAG_ unboosted the server`,
  },
  'GUILD_CREATE': {
    RECONNECTED: `${discord.decor.Emojis.SATELLITE} _GUILD_NAME_ **[**||\`_GUILD_ID_\`||**]** reconnected to gateway`,
    NEW_GUILD: `${discord.decor.Emojis.CRYSTAL_BALL} _GUILD_NAME_ **[**||\`_GUILD_ID_\`||**]** new guild added`,
  },
  'GUILD_INTEGRATIONS_UPDATE': {
    INTEGRATIONS_UPDATED: `${discord.decor.Emojis.MONEY_WITH_WINGS} _GUILD_NAME_ **[**||\`_GUILD_ID_\`||**]** integrations have updated`,
  },
  // sadly hardcoded :v
  'GUILD_EMOJIS_UPDATE': {
    EDITED_EMOJIS: `${discord.decor.Emojis.SLIGHT_SMILE} _MESSAGE_`,
    ADDED_EMOJIS: `${discord.decor.Emojis.SLIGHT_SMILE} _MESSAGE_`,
    REMOVED_EMOJIS: `${discord.decor.Emojis.SLIGHT_SMILE} _MESSAGE_`,
  },
  'GUILD_UPDATE': {
    NAME_CHANGE: 'server name changed from `_OLD_NAME_` to `_NEW_NAME_`',
    REGION_CHANGE: 'server region changed from **_OLD_REGION_** to **_NEW_REGION_**',
    DESCRIPTION_CHANGE: 'server description changed from `_OLD_DESC_` to `_NEW_DESC_`',
    DMN_CHANGE: 'server default message notifications changed from **_OLD_DMN_** to **_NEW_DMN_**',
    EXPLICIT_FILTER_CHANGE: 'server explicit content filter changed from **_OLD_FILTER_** to **_NEW_FILTER_**',
    VERIFICATION_LEVEL_CHANGE: 'server verification level changed from **_OLD_LEVEL_** to **_NEW_LEVEL_**',
    BANNER_ADDED: 'server banner added _NEW_BANNER_',
    BANNER_REMOVED: 'server banner removed',
    BANNER_CHANGED: 'server banner changed to _NEW_BANNER_',
    ICON_ADDED: 'server icon added _NEW_ICON_',
    ICON_REMOVED: 'server icon removed',
    ICON_CHANGED: 'server icon changed to _NEW_ICON_',
    PRESENCES_CHANGED: 'server max presences changed from _OLD_PRES_ to _NEW_PRES_',
    MFA_LEVEL_CHANGED: 'server 2fa requirement for moderation changed from **_OLD_LEVEL_** to **_NEW_LEVEL_**',
    OWNER_CHANGED: 'server ownership changed from <@!_OLD_OWNER_> to <@!_NEW_OWNER_>',
    AFKCHANNEL_ADDED: 'server voice afk channel set to <#_NEW_CHANNEL_>',
    AFKCHANNEL_REMOVED: 'server voice afk channel removed: <#_OLD_CHANNEL_>',
    AFKCHANNEL_CHANGED: 'server voice afk channel changed from <#_OLD_CHANNEL_> to <#_NEW_CHANNEL_>',
    AFKTIMEOUT_CHANGED: 'server voice afk timeout changed from **_OLD_TIMEOUT_**s to **_NEW_TIMEOUT_**s',
    BOOST_TIER_CHANGED: 'server boost tier changed from **_OLD_TIER_** to **_NEW_TIER_**',
    BOOST_SUBSCRIPTIONS_CHANGED: 'server boost count changed from **_OLD_SUBS_** to **_NEW_SUBS_**',
    PREFERRED_LOCALE_CHANGED: 'server preferred locale changed from `_OLD_LOCALE_` to `_NEW_LOCALE_`',
    SPLASH_ADDED: 'server splash added _NEW_SPLASH_',
    SPLASH_REMOVED: 'server splash removed',
    SPLASH_CHANGED: 'server splash changed to _NEW_SPLASH_',
    SYSTEM_CHANNEL_ADDED: 'server system channel added <#_NEW_CHANNEL_>',
    SYSTEM_CHANNEL_REMOVED: 'server system channel removed <#_OLD_CHANNEL_>',
    SYSTEM_CHANNEL_CHANGED: 'server system channel changed from <#_OLD_CHANNEL_> to <#_NEW_CHANNEL_>',
    VANITY_URL_ADDED: 'server vanity url added `_NEW_VANITY_`',
    VANITY_URL_REMOVED: 'server vanity url removed `_OLD_VANITY_`',
    VANITY_URL_CHANGED: 'server vanity url changed from `_OLD_VANITY_` to `_NEW_VANITY_`',
    WIDGET_CHANGED: 'server widget changed from **_OLD_WIDGET_** to **_NEW_WIDGET_**',
    WIDGET_CHANNEL_ADDED: 'server widget channel changed to <#_NEW_CHANNEL_>',
    WIDGET_CHANNEL_REMOVED: 'server widget channel removed from <#_OLD_CHANNEL_>',
    WIDGET_CHANNEL_CHANGED: 'server widget channel changed from <#_OLD_CHANNEL_> to <#_NEW_CHANNEL_>',
    FEATURES_REMOVED: 'server features removed `_REMOVED_FEATURES_`',
    FEATURES_CHANGED: 'server features changed `_CHANGED_FEATURES_`',
    FEATURES_ADDED: 'server features added `_ADDED_FEATURES_`',
  },
  'GUILD_ROLE_CREATE': {
    NEW_ROLE: `${discord.decor.Emojis.GEAR} new role created **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** `,
  },
  'GUILD_ROLE_UPDATE': {
    NAME_CHANGED: `${discord.decor.Emojis.GEAR} role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** name was changed:  \n**•** __Before__: \`_OLD_NAME_\`\n**•** __After__:   \`_NEW_NAME_\``,
    COLOR_CHANGED: `${discord.decor.Emojis.GEAR} role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** color was changed: \`#_OLD_COLOR_\` ${discord.decor.Emojis.ARROW_RIGHT} \`#_NEW_COLOR_\``,
    HOIST_CHANGED: `${discord.decor.Emojis.GEAR} role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** hoist state was changed to \`_NEW_HOIST_\` `,
    MENTIONABLE_CHANGED: `${discord.decor.Emojis.GEAR} role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** mentionable state was changed to \`_NEW_MENTIONABLE_\` `,
    POSITION_CHANGED: `${discord.decor.Emojis.GEAR} role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** position was changed: \`_OLD_POSITION_\` ${discord.decor.Emojis.ARROW_RIGHT} \`_NEW_POSITION_\``,
    MANAGED_CHANGED: `${discord.decor.Emojis.GEAR} role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** managed role status was changed to \`_NEW_MANAGED_\``,
    PERMS_ADDED: `${discord.decor.Emojis.GEAR} role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** permissions granted: _ADDED_PERMS_`,
    PERMS_REMOVED: `${discord.decor.Emojis.GEAR} role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** permissions revoked: _REMOVED_PERMS_`,
    PERMS_CHANGED: `${discord.decor.Emojis.GEAR} role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** permissions edited: _CHANGED_PERMS_`,
  },
  'GUILD_ROLE_DELETE': {
    REMOVED_ROLE: `${discord.decor.Emojis.GEAR} role \`_NAME_\` **[**||\`_ROLE_ID_\`||**]** was deleted`,
  },
  'MESSAGE_UPDATE': {
    MESSAGE_CONTENT_UPDATED_GUILD: `${discord.decor.Emojis.PENCIL} _USERTAG_ edited their message **[**||\`_MESSAGE_ID_\`||**]** in <#_CHANNEL_ID_>: \n**•** __Before__: _CONTENT_BEFORE_\n**•** __After__:   _CONTENT_AFTER_ ${messageJump}`,
    MESSAGE_CONTENT_UPDATED_DM: `${discord.decor.Emojis.PENCIL} _USERTAG_ edited their message **[**||\`_MESSAGE_ID_\`||**]** in the bot's dms: \n**•** __Before__: _CONTENT_BEFORE_\n**•** __After__:   _CONTENT_AFTER_`,
  },
  'MESSAGE_DELETE': {
    MESSAGE_DELETED_DM: `${discord.decor.Emojis.WASTEBASKET} message by _USERTAG_ **[**||\`_MESSAGE_ID_\`||**]** was deleted in the bot's dms: \n_CONTENT_`,
    MESSAGE_DELETED_GUILD: `${discord.decor.Emojis.WASTEBASKET} _USERTAG_ message deleted **[**||\`_MESSAGE_ID_\`||**]** in <#_CHANNEL_ID_>: \n_CONTENT_`,
    MESSAGE_DELETED_GUILD_WEBHOOK: `${discord.decor.Emojis.WASTEBASKET} _USERTAG_ message deleted **[**||\`_MESSAGE_ID_\`||**]** in <#_CHANNEL_ID_>: \n_CONTENT_`,
    MESSAGE_DELETED_DM_NO_CACHE: `${discord.decor.Emojis.WASTEBASKET} message **[**||\`_MESSAGE_ID_\`||**]** was deleted in the bot's dms (no data)`,
    MESSAGE_DELETED_GUILD_NO_CACHE: `${discord.decor.Emojis.WASTEBASKET} message **[**||\`_MESSAGE_ID_\`||**]** was deleted in <#_CHANNEL_ID_> (no data)`,
  },
  'MESSAGE_DELETE_BULK': {
    MESSAGES_DELETED: `${discord.decor.Emojis.WASTEBASKET} _COUNT_ messages were deleted in <#_CHANNEL_ID_>`,
  },
  'MESSAGE_REACTION_ADD': {
    ADD_REACTION: `${discord.decor.Emojis.SLIGHT_SMILE} _USERTAG_ added reaction to message **[**||\`_MESSAGE_ID_\`||**]** in <#_CHANNEL_ID_>: _EMOJI_MENTION_${messageJump}`,
  },
  'MESSAGE_REACTION_REMOVE': {
    REMOVED_REACTION: `${discord.decor.Emojis.SLIGHT_SMILE} _USERTAG_ removed reaction from message **[**||\`_MESSAGE_ID_\`||**]** in <#_CHANNEL_ID_>: _EMOJI_MENTION_${messageJump}`,
  },
  'MESSAGE_REACTION_REMOVE_ALL': {
    REMOVED_ALL_REACTIONS: `${discord.decor.Emojis.SLIGHT_SMILE} all reactions removed from message **[**||\`_MESSAGE_ID_\`||**]** in <#_CHANNEL_ID_>${messageJump}`,
  },
  'USER_UPDATE': {
    USER_UPDATED: `${discord.decor.Emojis.GEAR} bot user was updated _USERTAG_`,
  },
  'VOICE_STATE_UPDATE': {
    SERVER_DEAFENED: `${discord.decor.Emojis.MUTE} _USERTAG_ was server deafened in \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    SERVER_UNDEAFENED: `${discord.decor.Emojis.SPEAKER} _USERTAG_ was server undeafened in \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    SERVER_MUTED: `${discord.decor.Emojis.MICROPHONE2} _USERTAG_ was server muted in \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    SERVER_UNMUTED: `${discord.decor.Emojis.MICROPHONE2} _USERTAG_ was server unmuted in \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    SELF_DEAFENED: `${discord.decor.Emojis.MUTE} _USERTAG_ deafened themselves in \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    SELF_UNDEAFENED: `${discord.decor.Emojis.SPEAKER} _USERTAG_ undeafened themselves in \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    SELF_MUTED: `${discord.decor.Emojis.MICROPHONE2} _USERTAG_ muted themselves in \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    SELF_UNMUTED: `${discord.decor.Emojis.MICROPHONE2} _USERTAG_ unmuted themselves in \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    START_STREAM: `${discord.decor.Emojis.DESKTOP_COMPUTER} _USERTAG_ started streaming in \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    STOP_STREAM: `${discord.decor.Emojis.DESKTOP_COMPUTER} _USERTAG_ stopped streaming in \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    ENTERED_CHANNEL: `${discord.decor.Emojis.TELEPHONE} _USERTAG_ joined \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    LEFT_CHANNEL: `${discord.decor.Emojis.TELEPHONE} _USERTAG_ left \`_CHANNEL_NAME_\` **[**||\`_CHANNEL_ID_\`||**]**`,
    MOVED_CHANNEL: `${discord.decor.Emojis.ARROW_RIGHT} _USERTAG_ moved from \`_OLD_CHANNEL_NAME_\` **[**||\`_OLD_CHANNEL_ID_\`||**]** to \`_NEW_CHANNEL_NAME_\` **[**||\`_NEW_CHANNEL_ID_\`||**]**`,
  },
  'VOICE_SERVER_UPDATE': {
    CONNECTED: 'connected to voice @`_ENDPOINT_` with token ||`_TOKEN_`||',
  },
  'TYPING_START': {
    START_TYPING_GUILD: `${discord.decor.Emojis.WRITING_HAND} _USERTAG_ started typing in <#_CHANNEL_ID_>`,
    START_TYPING_DM: `${discord.decor.Emojis.WRITING_HAND} _USERTAG_ started typing in the bot DMs`,
  },
  'WEBHOOKS_UPDATE': {
    WEBHOOK_UPDATED: `${discord.decor.Emojis.RECEIPT} webhook updated in <#_CHANNEL_ID_>`,
  },
};

/*
    ----------------
       AUDIT LOGS
    ----------------
  */

export const messagesAuditLogs: {[key: string]: {[key: string]: string}} = {
  CHANNEL_CREATE: {
    CHANNEL_CREATED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ created new channel: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]**`,
  },
  CHANNEL_UPDATE: {
    NAME_CHANGED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ edited channel _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** name updated: \`_OLD_NAME_\` => \`_NEW_NAME_\``,
    CATEGORY_CHANGED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ edited channel _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed category: _OLD_MENTION_ => _NEW_MENTION_`,
    TYPE_CHANGED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ edited channel _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed type: \`_OLD_TYPE_\` => \`_NEW_TYPE_\``,
    NSFW_CHANGED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ edited channel _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** nsfw status set to **_NEW_NSFW_**`,
    TOPIC_CHANGED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ edited channel _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed topic: \`_OLD_TOPIC_\` => \`_NEW_TOPIC_\``,
    SLOWMODE_CHANGED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ edited channel _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed slowmode: **_OLD_SLOWMODE_s** => **_NEW_SLOWMODE_s**`,
    BITRATE_CHANGED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ edited channel _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed bitrated: **_OLD_BITRATE_kbps** => **_NEW_BITRATE_kbps**`,
    USERLIMIT_CHANGED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ edited channel _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** changed user limit: **_OLD_LIMIT_** => **_NEW_LIMIT_**`,
    PERMS_SYNCED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ edited channel _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** permissions synchronized with _PARENT_MENTION_`,
    PERMS_CHANGED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ edited channel _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]** permissions changed: _CHANGES_`,
  },
  CHANNEL_DELETE: {
    CHANNEL_DELETED: `${discord.decor.Emojis.WRENCH} _ACTORTAG_ deleted channel: _CHANNEL_MENTION_ **[**||\`_CHANNEL_ID_\`||**]**`,
  },
  CHANNEL_PINS_UPDATE: {
    MESSAGE_PINNED: `${discord.decor.Emojis.PUSHPIN} _ACTORTAG_ pinned a message **[**||\`_MESSAGE_ID_\`||**]** by _USERTAG_ in <#_CHANNEL_ID_>${messageJump}`,
    MESSAGE_UNPINNED: `${discord.decor.Emojis.PUSHPIN} _ACTORTAG_ unpinned a message **[**||\`_MESSAGE_ID_\`||**]** by _USERTAG_ in <#_CHANNEL_ID_>${messageJump}`,
  },
  GUILD_MEMBER_ADD: {
    BOT_ADDED: '<:bot:735780703945490542> _ACTORTAG_ added _USERTAG_ to the server',
  },
  GUILD_MEMBER_REMOVE: {
    MEMBER_KICKED: `${discord.decor.Emojis.BOOT} _ACTORTAG_ kicked _USERTAG_ from the server`,
  },
  GUILD_BAN_ADD: {
    MEMBER_BANNED: `${discord.decor.Emojis.HAMMER} _ACTORTAG_ banned _USERTAG_ from the server`,
  },
  GUILD_BAN_REMOVE: {
    MEMBER_UNBANNED:
      `${discord.decor.Emojis.CYCLONE} _ACTORTAG_ unbanned _USERTAG_ from the server`,
  },
  GUILD_MEMBER_UPDATE: {
    NICK_ADDED: `${discord.decor.Emojis.RED_ENVELOPE} _ACTORTAG_ added _USERTAG_ 's nickname : \`_NEW_NICK_\``,
    NICK_CHANGED: `${discord.decor.Emojis.RED_ENVELOPE} _ACTORTAG_ changed _USERTAG_ 's nickname from \`_OLD_NICK_\` to \`_NEW_NICK_\``,
    NICK_REMOVED: `${discord.decor.Emojis.RED_ENVELOPE} _ACTORTAG_ removed _USERTAG_ 's nickname of \`_OLD_NICK_\``,
    ROLES_ADDED: `${discord.decor.Emojis.SHIELD} _ACTORTAG_ added role(s) to _USERTAG_ : _ADDED_ROLES_`,
    ROLES_REMOVED: `${discord.decor.Emojis.SHIELD} _ACTORTAG_ removed role(s) from _USERTAG_ : _REMOVED_ROLES_`,
    ROLES_CHANGED: `${discord.decor.Emojis.SHIELD} _ACTORTAG_ changed roles of _USERTAG_ : _CHANGED_ROLES_`,
  },
  // sadly hardcoded :v
  GUILD_EMOJIS_UPDATE: {
    EDITED_EMOJIS: `${discord.decor.Emojis.SLIGHT_SMILE} _ACTORTAG_ _MESSAGE_`,
    ADDED_EMOJIS: `${discord.decor.Emojis.SLIGHT_SMILE} _ACTORTAG_ _MESSAGE_`,
    REMOVED_EMOJIS: `${discord.decor.Emojis.SLIGHT_SMILE} _ACTORTAG_ _MESSAGE_`,
  },
  GUILD_UPDATE: {
    NAME_CHANGED: '_ACTORTAG_ changed server name from `_OLD_NAME_` to `_NEW_NAME_`',
    REGION_CHANGED: '_ACTORTAG_ changed server region from **_OLD_REGION_** to **_NEW_REGION_**',
    DESCRIPTION_CHANGED: '_ACTORTAG_ changed server description from `_OLD_DESC_` to `_NEW_DESC_`',
    DMN_CHANGED: '_ACTORTAG_ changed server default message notifications from **_OLD_DMN_** to **_NEW_DMN_**',
    EXPLICIT_FILTER_CHANGED: '_ACTORTAG_ changed server explicit content filter from **_OLD_FILTER_** to **_NEW_FILTER_**',
    VERIFICATION_LEVEL_CHANGED: '_ACTORTAG_ changed server verification level from **_OLD_LEVEL_** to **_NEW_LEVEL_**',
    BANNER_ADDED: '_ACTORTAG_ added server banner _NEW_BANNER_',
    BANNER_REMOVED: '_ACTORTAG_ removed server banner',
    BANNER_CHANGED: '_ACTORTAG_ changed server banner to _NEW_BANNER_',
    ICON_ADDED: '_ACTORTAG_ added server icon _NEW_ICON_',
    ICON_REMOVED: '_ACTORTAG_ removed server icon',
    ICON_CHANGED: '_ACTORTAG_ changed server icon to _NEW_ICON_',
    MFA_LEVEL_CHANGED: '_ACTORTAG_ changed server 2fa requirement for moderation from **_OLD_LEVEL_** to **_NEW_LEVEL_**',
    OWNER_CHANGED: '<@!_OLD_OWNER_> transferred server ownership to <@!_NEW_OWNER_>',
    AFKCHANNEL_ADDED: '_ACTORTAG_ set server voice afk channel to <#_NEW_CHANNEL_>',
    AFKCHANNEL_REMOVED: '_ACTORTAG_ removed server voice afk channel: <#_OLD_CHANNEL_>',
    AFKCHANNEL_CHANGED: '_ACTORTAG_ changed server voice afk channel from <#_OLD_CHANNEL_> to <#_NEW_CHANNEL_>',
    AFKTIMEOUT_CHANGED: '_ACTORTAG_ changed server voice afk timeout from **_OLD_TIMEOUT_**s to **_NEW_TIMEOUT_**s',
    PREFERRED_LOCALE_CHANGED: '_ACTORTAG_ changed server preferred locale from `_OLD_LOCALE_` to `_NEW_LOCALE_`',
    SPLASH_ADDED: '_ACTORTAG_ added server splash _NEW_SPLASH_',
    SPLASH_REMOVED: '_ACTORTAG_ removed server splash',
    SPLASH_CHANGED: '_ACTORTAG_ changed server splash to _NEW_SPLASH_',
    SYSTEM_CHANNEL_ADDED: '_ACTORTAG_ added server system channel <#_NEW_CHANNEL_>',
    SYSTEM_CHANNEL_REMOVED: '_ACTORTAG_ removed server system channel <#_OLD_CHANNEL_>',
    SYSTEM_CHANNEL_CHANGED: '_ACTORTAG_ changed server system channel from <#_OLD_CHANNEL_> to <#_NEW_CHANNEL_>',
    VANITY_URL_ADDED: '_ACTORTAG_ added server vanity url `_NEW_VANITY_`',
    VANITY_URL_REMOVED: '_ACTORTAG_ removed server vanity url `_OLD_VANITY_`',
    VANITY_URL_CHANGED: '_ACTORTAG_ changed server vanity url from `_OLD_VANITY_` to `_NEW_VANITY_`',
    WIDGET_CHANGED: '_ACTORTAG_ changed server widget from **_OLD_WIDGET_** to **_NEW_WIDGET_**',
    WIDGET_CHANNEL_ADDED: '_ACTORTAG_ changed server widget channel to <#_NEW_CHANNEL_>',
    WIDGET_CHANNEL_REMOVED: '_ACTORTAG_ removed server widget channel from <#_OLD_CHANNEL_>',
    WIDGET_CHANNEL_CHANGED: '_ACTORTAG_ changed server widget channel from <#_OLD_CHANNEL_> to <#_NEW_CHANNEL_>',
  },
  GUILD_ROLE_CREATE: {
    NEW_ROLE: `${discord.decor.Emojis.GEAR} _ACTORTAG_ created new role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** `,
  },
  GUILD_ROLE_UPDATE: {
    NAME_CHANGED: `${discord.decor.Emojis.GEAR} _ACTORTAG_ changed role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** name:  \n**•** __Before__: \`_OLD_NAME_\`\n**•** __After__:   \`_NEW_NAME_\``,
    COLOR_CHANGED: `${discord.decor.Emojis.GEAR} _ACTORTAG_ changed role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** color: \`#_OLD_COLOR_\` ${discord.decor.Emojis.ARROW_RIGHT} \`#_NEW_COLOR_\``,
    HOIST_CHANGED: `${discord.decor.Emojis.GEAR} _ACTORTAG_ changed role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** hoist state to \`_NEW_HOIST_\` `,
    MENTIONABLE_CHANGED: `${discord.decor.Emojis.GEAR} _ACTORTAG_ changed role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** mentionable state to \`_NEW_MENTIONABLE_\` `,
    POSITION_CHANGED:
      `${discord.decor.Emojis.GEAR
      } _ACTORTAG_ changed role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** position: \`_OLD_POSITION_\` ${
        discord.decor.Emojis.ARROW_RIGHT
      } \`_NEW_POSITION_\``,
    MANAGED_CHANGED:
      `${discord.decor.Emojis.GEAR
      } _ACTORTAG_ changed role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** managed status to \`_NEW_MANAGED_\``,
    PERMS_ADDED:
      `${discord.decor.Emojis.GEAR
      } _ACTORTAG_ granted role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** permissions: _ADDED_PERMS_`,
    PERMS_REMOVED:
      `${discord.decor.Emojis.GEAR
      } _ACTORTAG_ revoked role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** permissions: _REMOVED_PERMS_`,
    PERMS_CHANGED:
      `${discord.decor.Emojis.GEAR
      } _ACTORTAG_ edited role **(**<@&_ROLE_ID_>**)** **[**||\`_ROLE_ID_\`||**]** permissions: _CHANGED_PERMS_`,
  },
  GUILD_ROLE_DELETE: {
    REMOVED_ROLE:
      `${discord.decor.Emojis.GEAR
      } _ACTORTAG_ deleted role \`_NAME_\` **[**||\`_ROLE_ID_\`||**]** `,
  },

  MESSAGE_DELETE: {
    MESSAGE_DELETED_GUILD:
      `${discord.decor.Emojis.WASTEBASKET
      } _ACTORTAG_ deleted message by _AUTHOR_ **[**||\`_MESSAGE_ID_\`||**]** in <#_CHANNEL_ID_>: \n_CONTENT_`,
  },
  MESSAGE_DELETE_BULK: {
    MESSAGES_DELETED:
      `${discord.decor.Emojis.WASTEBASKET
      } _ACTORTAG_ deleted _COUNT_ messages in <#_CHANNEL_ID_>`,
  },
  VOICE_STATE_UPDATE: {
    SERVER_DEAFENED:
      `${discord.decor.Emojis.MUTE
      } _ACTORTAG_ server deafened _USERTAG_ in \`_CHANNEL_NAME_\``,
    SERVER_UNDEAFENED:
      `${discord.decor.Emojis.SPEAKER
      } _ACTORTAG_ server undeafened _USERTAG_ in \`_CHANNEL_NAME_\``,
    SERVER_MUTED:
      `${discord.decor.Emojis.MICROPHONE2
      } _ACTORTAG_ server muted _USERTAG_ in \`_CHANNEL_NAME_\``,
    SERVER_UNMUTED:
      `${discord.decor.Emojis.MICROPHONE2
      } _ACTORTAG_ server unmuted _USERTAG_ in \`_CHANNEL_NAME_\``,
    LEFT_CHANNEL:
      `${discord.decor.Emojis.TELEPHONE
      } _ACTORTAG_ disconnected _USERTAG_ from \`_CHANNEL_NAME_\``,
    MOVED_CHANNEL:
      `${discord.decor.Emojis.ARROW_RIGHT
      } _ACTORTAG_ moved _USERTAG_ from \`_OLD_CHANNEL_NAME_\` to \`_NEW_CHANNEL_NAME_\``,
  },
};
