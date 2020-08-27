---
description: log it all
---

# Logging

## Core Configuration

{% hint style="info" %}
This page is rather large, consider using the sidebar on the right to navigate better!
{% endhint %}

The logging module is similarly configurable to rowboat, though with a few changes.

Keep in mind that other modules also use this module, so if this is disabled you might miss important stuff!

{% hint style="info" %}
**Regarding duplicate logging with infractions**

The raw event scopes \(i.e. `GUILD_BAN_ADD`\) will **ALWAYS** be logged even when originating from other modules \(i.e. infractions\) unless the originating user is being ignored.

If you would like to avoid duplicate log messages for when you ban someone with infractions, just set `ignores.self` and `ignores.selfAuditLogs` to true, since the user performing actions in infractions is always the bot \(when using commands\), this will effectively hide those duplicate logs.  
Preferebly, you should just not log these raw event scopes at all, because Infractions should catch them all anyway.
{% endhint %}

```text
{
	"modules": {
		"logging": {
			"enabled": true,
			"auditLogs": true,
			"logChannels": {},
			"ignores": {},
      "userTag": "_MENTION_",
      "actorTag": "_MENTION_",
      "suffixReasonToAuditlog": true,
      "reasonSuffix": " with reason `_REASON_RAW_`",
      "timezone": "Etc/GMT+0"
		}
	}
}
```

| Setting |  | Type |
| :--- | :--- | :--- |
| `enabled` | Enables this module | Boolean |
| `auditLogs` | Whether to use audit log info during logging | Boolean |
| `logChannels` | Your log channels configuration! | {string: LogChannel} |
| `ignores` | Configuration of what to ignore during event logging | Ignores |
| `userTag` | How normal user tags are shown, currently only MENTION is supported. | string |
| `actorTag` | How audit log actor tags are shown, currently only MENTION is supported. | string |
| `suffixReasonToAuditLog` | Whether to automatically add audit log reasons at the end of log messages | Boolean |
| `reasonSuffix` | If suffixReasonToAuditLog is true, the string to attach to the end of the message. | string |
| `timezone` | The timezone for time calcs in log messages \(ianatz format\): [https://en.wikipedia.org/wiki/List\_of\_tz\_database\_time\_zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) | string |

### logChannels

```text
{
    "logChannels": {
        "channel id": {
          "description": "experimental logs",
          "embed": true,
          "embedColor": 2263842,
          "footerAvatar": "",
          "webhookUrl": "",
          "showEventName": false,
          "showTimestamps": true,
          "scopes": {
            "include": [
              "*"
            ],
            "exclude": [
              "TYPING_START.*"
            ]
          }
        }
    }
}
```

| Setting |  | Type |
| :--- | :--- | :--- |
| `description` | Text to show on footer of embeds | string |
| `embed` | Whether logs in this channel will be embeds | Boolean |
| `embedColor` | Color of the embed | Number |
| `footerAvatar` | Avatar URL for footer icon in embeds | string |
| `webhookUrl` | A discord webhook URL relating to this channel | string |
| `showEventName` | Whether to show event/action namings in the logs | Boolean |
| `showTimestamps` | Whether to show timestamps | Boolean |
| `scopes` | The scopes to log in this channel | Object |

#### Scopes

```text
{
  "scopes": {
    "include": [
      "*"
    ],
    "exclude": [
      "TYPING_START.*"
    ]
}
```

{% hint style="info" %}
You can have multiple channels with the same scopes, unlike rowboat !
{% endhint %}

| Setting |  | Type |
| :--- | :--- | :--- |
| `include` | scopes to include | String Array |
| `exclude` | scopes to exclude | String Array |

#### Scope List

| Category | Description |
| :--- | :--- |
| `*` | Every scope |
|  |  |
| `CORE` or `CORE.*` | Every core sub-log |
| `CORE.BLACKLISTED_USER_ACTION` | Blacklisted user tried to do something |
|  |  |
| `COMMANDS` or `COMMANDS.*` | Every commands sub-log |
| `COMMANDS.COMMAND_USED` | A command was used |
|  |  |
| `PERSIST` or `PERSIST.*` | Every persist sub-log |
| `PERSIST.SAVED` | Saved persist data for a user |
| `PERSIST.RESTORED` | Restored persist data for a user |
|  |  |
| `ANTIPING` or `ANTIPING.*` | Every antiping sub-log |
| `ANTIPING.FAIL_MARK_MEMBER_NOT_FOUND` | Failed to mark action on user because they're not on the server |
| `ANTIPING.FAIL_MARK_UNMUTE` | Failed to unmute the user |
| `ANTIPING.FAIL_MARK_ACTION` | Failed to perform action on the user |
| `ANTIPING.MARK_SUCCESS` | Successfully marked action on the user |
| `ANTIPING.LEFT_BANNED` | User left the server with pending punishments and was auto-banned |
| `ANTIPING.TRIGGERED` | User triggered anti-ping |
| `ANTIPING.TRIGGERED_MUTE` | User triggered anti-ping and was muted for it |
|  |  |
| `INFRACTIONS` or `INFRACTIONS.*` | Every infractions sub-log |
| `INFRACTIONS.KICK` | A member was kicked |
| `INFRACTIONS.MUTE` | A member was muted |
| `INFRACTIONS.UNMUTE` | A member was unmuted |
| `INFRACTIONS.TEMPMUTE` | A member was tempmuted |
| `INFRACTIONS.TEMPMUTE_EXPIRED` | A member's tempmute expired naturally |
| `INFRACTIONS.BAN` | A member was banned |
| `INFRACTIONS.UNBAN` | A member was unbanned |
| `INFRACTIONS.SOFTBAN` | A member was soft-banned |
| `INFRACTIONS.TEMPBAN` | A member was tempbanned |
| `INFRACTIONS.TEMPBAN_EXPIRED` | A member's tempban expired naturally |
| `INFRACTIONS.EDITED` | A infraction was edited |
| `INFRACTIONS.DELETED` | A infraction was deleted |
|  |  |
| `CHANNEL_CREATE` or `CHANNEL_CREATE.*` | Every channel-create sub-log |
| `CHANNEL_CREATE.CHANNEL_CREATED` | New channel created |
|  |  |
| `CHANNEL_UPDATE` or `CHANNEL_UPDATE.*` | Every channel-update sub-log |
| `CHANNEL_UPDATE.NAME_CHANGED` | Channel name changed |
| `CHANNEL_UPDATE.CATEGORY_CHANGED` | Channel category changed |
| `CHANNEL_UPDATE.TYPE_CHANGED` | Channel type changed |
| `CHANNEL_UPDATE.NSFW_CHANGED` | Channel nsfw status changed |
| `CHANNEL_UPDATE.TOPIC_CHANGED` | Channel topic changed |
| `CHANNEL_UPDATE.SLOWMODE_CHANGED` | Channel slowmode changed |
| `CHANNEL_UPDATE.BITRATE_CHANGED` | Channel bitrate changed |
| `CHANNEL_UPDATE.USERLIMIT_CHANGED` | Channel user limit changed |
| `CHANNEL_UPDATE.PERMS_SYNCED` | Channel perms synced to the category |
| `CHANNEL_UPDATE.PERMS_CHANGED` | Channel perms changed |
|  |  |
| `CHANNEL_DELETE or CHANNEL_DELETE.*` | Every channel-delete sub-log |
| `CHANNEL_DELETE.CHANNEL_DELETED` | Channel deleted |
|  |  |
| `CHANNEL_PINS_UPDATE` or `CHANNEL_PINS_UPDATE.*` | Channel pins update |
| `CHANNEL_PINS_UPDATE.MESSAGE_PINNED` | Message pinned |
| `CHANNEL_PINS_UPDATE.MESSAGE_UNPINNED` | Message unpinned |
|  |  |
| `GUILD_MEMBER_ADD` or `GUILD_MEMBER_ADD.*` | Every member-add sub-log |
| `GUILD_MEMBER_ADD.MEMBER_JOIN` | Member joined the server |
| `GUILD_MEMBER_ADD.BOT_ADDED` | Bot joined the server |
|  |  |
| `GUILD_MEMBER_REMOVE` or `GUILD_MEMBER_REMOVE.*` | Every member-remove sub-log |
| `GUILD_MEMBER_REMOVE.MEMBER_LEFT` | Member left the server |
| `GUILD_MEMBER_REMOVE.MEMBER_KICKED` | \[Audit log only\] Member was kicked from the server |
|  |  |
| `GUILD_BAN_ADD` or `GUILD_BAN_ADD.*` | Every guild-ban-add sub-log |
| `GUILD_BAN_ADD.MEMBER_BANNED` | A member was banned |
|  |  |
| `GUILD_BAN_REMOVE` or `GUILD_BAN_REMOVE.*` | Every guild-ban-remove sub-log |
| `GUILD_BAN_REMOVE.MEMBER_UNBANNED` | A member was unbanned |
|  |  |
| `GUILD_MEMBER_UPDATE` or `GUILD_MEMBER_UPDATE.*` | Every guild-member-update sub-log |
| `GUILD_MEMBER_UPDATE.NICK_ADDED` | Nickname added |
| `GUILD_MEMBER_UPDATE.NICK_CHANGED` | Nickname changed |
| `GUILD_MEMBER_UPDATE.NICK_REMOVED` | Nickname removed |
| `GUILD_MEMBER_UPDATE.ROLES_ADDED` | Roles added |
| `GUILD_MEMBER_UPDATE.ROLES_REMOVED` | Roles removed |
| `GUILD_MEMBER_UPDATE.ROLES_CHANGED` | Roles changed |
| `GUILD_MEMBER_UPDATE.AVATAR_ADDED` | User avatar added |
| `GUILD_MEMBER_UPDATE.AVATAR_REMOVED` | User avatar deleted |
| `GUILD_MEMBER_UPDATE.AVATAR_CHANGED` | User avatar changed |
| `GUILD_MEMBER_UPDATE.USERNAME_CHANGED` | User's username changed |
| `GUILD_MEMBER_UPDATE.DISCRIMINATOR_CHANGED` | User's discriminator changed |
| `GUILD_MEMBER_UPDATE.BOOSTING_STARTED` | User started boosting the guild |
| `GUILD_MEMBER_UPDATE.BOOSTING_STOPPED` | User stopped boosting the guild |
|  |  |
| `GUILD_CREATE` or `GUILD_CREATE.*` | Every guild-create sub-log |
| `GUILD_CREATE.RECONNECTED` | Bot reconnected to the gateway |
|  |  |
| `GUILD_INTEGRATIONS_UPDATE` or `GUILD_INTEGRATIONS_UPDATE.*` | Every integrations-update sub-log |
| `GUILD_INTEGRATIONS_UPDATE.INTEGRATIONS_UPDATED` | Some integration on the guild was updated |
|  |  |
| `GUILD_EMOJIS_UPDATE` or `GUILD_EMOJIS_UPDATE.*` | Every emoji update sub-log |
| `GUILD_EMOJIS_UPDATE.EDITED_EMOJIS` | Emoji were edited |
| `GUILD_EMOJIS_UPDATE.ADDED_EMOJIS` | Emoji were added |
| `GUILD_EMOJIS_UPDATE.REMOVED_EMOJIS` | Emoji were removed |
|  |  |
| `GUILD_UPDATE` or `GUILD_UPDATE.*` | Every guild-update sub-log |
| `GUILD_UPDATE.NAME_CHANGE` | Name changed |
| `GUILD_UPDATE.REGION_CHANGE` | Region changed |
| `GUILD_UPDATE.DESCRIPTION_CHANGE` | Description changed \(for partners/verif\) |
| `GUILD_UPDATE.DMN_CHANGE` | Default message notifs changed |
| `GUILD_UPDATE.EXPLICIT_FILTER_CHANGE` | Nsfw filter changed |
| `GUILD_UPDATE.VERIFICATION_LEVEL_CHANGE` | Verification level changed |
| `GUILD_UPDATE.BANNER_ADDED` | Banner was added |
| `GUILD_UPDATE.BANNER_REMOVED` | Banner was removed |
| `GUILD_UPDATE.BANNER_CHANGED` | Banner was changed |
| `GUILD_UPDATE.ICON_ADDED` | Icon was added |
| `GUILD_UPDATE.ICON_REMOVED` | Icon was removed |
| `GUILD_UPDATE.ICON_CHANGED` | Icon was changed |
| `GUILD_UPDATE.PRESENCES_CHANGED` | Max presences changed \(from a support ticket, maybe\) |
| `GUILD_UPDATE.MFA_LEVEL_CHANGED` | Server forced 2fa status changed |
| `GUILD_UPDATE.OWNER_CHANGED` | Owner changed |
| `GUILD_UPDATE.AFKCHANNEL_ADDED` | Voice afk channel added |
| `GUILD_UPDATE.AFKCHANNEL_REMOVED` | Voice afk channel removed |
| `GUILD_UPDATE.AFKCHANNEL_CHANGED` | Voice afk channel changed |
| `GUILD_UPDATE.AFKTIMEOUT_CHANGED` | Voice afk timeout changed |
| `GUILD_UPDATE.BOOST_TIER_CHANGED` | Boost tier changed |
| `GUILD_UPDATE.BOOST_SUBSCRIPTIONS_CHANGED` | Boost count changed |
| `GUILD_UPDATE.PREFERRED_LOCALE_CHANGED` | Preferred locale changed |
| `GUILD_UPDATE.SPLASH_ADDED` | Splash image added |
| `GUILD_UPDATE.SPLASH_REMOVED` | Splash image removed |
| `GUILD_UPDATE.SPLASH_CHANGED` | Splash image changed |
| `GUILD_UPDATE.SYSTEM_CHANNEL_ADDED` | System channel added |
| `GUILD_UPDATE.SYSTEM_CHANNEL_REMOVED` | System channel removed |
| `GUILD_UPDATE.SYSTEM_CHANNEL_CHANGED` | System channel changed |
| `GUILD_UPDATE.VANITY_URL_ADDED` | Vanity url added |
| `GUILD_UPDATE.VANITY_URL_REMOVED` | Vanity url removed |
| `GUILD_UPDATE.VANITY_URL_CHANGED` | Vanity url changed |
| `GUILD_UPDATE.WIDGET_CHANGED` | Widget enabled status changed |
| `GUILD_UPDATE.WIDGET_CHANNEL_ADDED` | Widget channel added |
| `GUILD_UPDATE.WIDGET_CHANNEL_REMOVED` | Widget channel removed |
| `GUILD_UPDATE.WIDGET_CHANNEL_CHANGED` | Widget channel changed |
| `GUILD_UPDATE.FEATURES_ADDED` | Feature flags added |
| `GUILD_UPDATE.FEATURES_REMOVED` | Feature flags removed |
| `GUILD_UPDATE.FEATURES_CHANGED` | Feature flags changed |
|  |  |
| `GUILD_ROLE_CREATE` or `GUILD_ROLE_CREATE.*` | Every guild-role-create sub-log |
| `GUILD_ROLE_CREATE.NEW_ROLE` | New role created |
|  |  |
| `GUILD_ROLE_DELETE` or `GUILD_ROLE_DELETE.*` | Every guild-role-delete sub-log |
| `GUILD_ROLE_DELETE.REMOVED_ROLE` | Role was removed |
|  |  |
| `GUILD_ROLE_UPDATE` or `GUILD_ROLE_UPDATE.*` | Every guild-role-update sub-log |
| `GUILD_ROLE_UPDATE.NAME_CHANGED` | Role name changed |
| `GUILD_ROLE_UPDATE.COLOR_CHANGED` | Role color changed |
| `GUILD_ROLE_UPDATE.HOIST_CHANGED` | Role hoist status changed |
| `GUILD_ROLE_UPDATE.MENTIONABLE_CHANGED` | Role mentionable status changed |
| `GUILD_ROLE_UPDATE.POSITION_CHANGED` | Role position changed |
| `GUILD_ROLE_UPDATE.MANAGED_CHANGED` | Role managed status changed \(this should never trigger\) |
| `GUILD_ROLE_UPDATE.PERMS_ADDED` | Role permissions granted |
| `GUILD_ROLE_UPDATE.PERMS_REMOVED` | Role permissions revoked |
| `GUILD_ROLE_UPDATE.PERMS_CHANGED` | Role permissions changed |
|  |  |
| `MESSAGE_UPDATE` or `MESSAGE_UPDATE.*` | Every message-update sub-log |
| `MESSAGE_UPDATE.MESSAGE_CONTENT_UPDATED_GUILD` | A message's text was edited |
|  |  |
| `MESSAGE_DELETE` or `MESSAGE_DELETE.*` | Every message-delete sub-log |
| `MESSAGE_DELETE.MESSAGE_DELETED_GUILD` | A user message was deleted |
| `MESSAGE_DELETE.MESSAGE_DELETED_GUILD_WEBHOOK` | A webhook's message was deleted |
| `MESSAGE_DELETE.MESSAGE_DELETED_GUILD_NO_CACHE` | A message was deleted but we can't display what it was |
|  |  |
| `MESSAGE_DELETE_BULK` or `MESSAGE_DELETE_BULK.*` | Every message bulk delete sub-log |
| `MESSAGE_DELETE_BULK.MESSAGES_DELETED` | X messages were deleted in a channel |
|  |  |
| `MESSAGE_REACTION_ADD` or `MESSAGE_REACTION_ADD.*` | Every message reaction add sub-log |
| `MESSAGE_REACTION_ADD.ADD_REACTION` | A reaction was added on a message |
|  |  |
| `MESSAGE_REACTION_REMOVE` or `MESSAGE_REACTION_REMOVE.*` | Every message reaction remove sub-log |
| `MESSAGE_REACTION_REMOVE.REMOVED_REACTION` | A reaction was removed from a message |
|  |  |
| `MESSAGE_REACTION_REMOVE_ALL` or `MESSAGE_REACTION_REMOVE_ALL.*` | Every message reaction remove all sub-log |
| `MESSAGE_REACTION_REMOVE_ALL.REMOVED_ALL_REACTIONS` | Every reaction was removed at once from a message |
|  |  |
| `USER_UPDATE` or `USER_UPDATE.*` | Every user update sub-log |
| `USER_UPDATE.USER_UPDATED` | The bot user account was updated \(avatar, name\) |
|  |  |
| `VOICE_STATE_UPDATE` or `VOICE_STATE_UPDATE.*` | Every voice state update sub-log |
| `VOICE_STATE_UPDATE.SERVER_DEAFENED` | Member was server-deafened |
| `VOICE_STATE_UPDATE.SERVER_UNDEAFENED` | Member was server-undeafened |
| `VOICE_STATE_UPDATE.SERVER_MUTED` | Member was server-muted |
| `VOICE_STATE_UPDATE.SERVER_UNMUTED` | Member was server-unmuted |
| `VOICE_STATE_UPDATE.SELF_DEAFENED` | Member self-deafened |
| `VOICE_STATE_UPDATE.SELF_UNDEAFENED` | Member self-undeafened |
| `VOICE_STATE_UPDATE.SELF_MUTED` | Member self-muted |
| `VOICE_STATE_UPDATE.SELF_UNMUTED` | Member self-unmuted |
| `VOICE_STATE_UPDATE.START_STREAM` | Member started streaming |
| `VOICE_STATE_UPDATE.STOP_STREAM` | Member stopped streaming |
| `VOICE_STATE_UPDATE.ENTERED_CHANNEL` | Member joined channel |
| `VOICE_STATE_UPDATE.LEFT_CHANNEL` | Member left channel |
| `VOICE_STATE_UPDATE.MOVED_CHANNEL` | Member moved channel |
|  |  |
| `TYPING_START` or `TYPING_START.*` | Every typing start sub-log |
| `TYPING_START.START_TYPING_GUILD` | User started typing in a channel |
|  |  |
| `WEBHOOKS_UPDATE` or `WEBHOOKS_UPDATE.*` | Every webhooks update sub-log |
| `WEBHOOKS_UPDATE.WEBHOOK_UPDATED` | A webhook was updated in the guild |

#### Debug Scopes

These following scopes are for debugging purposes only and **cannot be used in your server**, they're only here for reference.

| Category | Description |
| :--- | :--- |
| `DEBUG.BOT_ERROR` | Bot errored somewhere |
| `DEBUG.BOT_STARTED` | pylon isolate reloaded |
| `DEBUG.RAW_EVENT` | Received raw event \(spammy\) |
| `DEBUG.CRON_RAN` | A cron task ran |
| `DEBUG.BLACKLISTED_USER_ACTION` | Global-blacklisted user tried to do something |
| `GUILD_CREATE.NEW_GUILD` | New guild added the bot |
| `CHANNEL_CREATE.DM_CHANNEL_OPENED` | DM channel opened with the bot |
| `MESSAGE_UPDATE.MESSAGE_CONTENT_UPDATED_DM` | Message updated in bot's dms |
| `MESSAGE_DELETE.MESSAGE_DELETED_DM` | Message deleted in bot's dms |
| `MESSAGE_DELETE.MESSAGE_DELETED_DM_NO_CACHE` | Message delete in bot's dms \(no cache data\) |
| `VOICE_SERVER_UPDATE.CONNECTED` | Connected to voice server \(outputs token\) |

### Ignores 

```text
{
        "channels": [],
        "users": [],
        "self": false,
        "selfAuditLogs": false,
        "extendUsersToAuditLogs": true,
        "blacklistedUsers": false,
        "logChannels": true
}
```

{% hint style="info" %}
Ignores will generally only work for discord event logs, not for custom module logs.
{% endhint %}

| Setting |  | Type |
| :--- | :--- | :--- |
| `channels` | Channel ids to ignore logs from | String Array |
| `users` | User ids to ignore logs from | String Array |
| `self` | Whether to ignore logs of changes to the bot user | Boolean |
| `selfAuditLogs` | Whether to ignore logs of changes performed by the bot user | Boolean |
| `extendUsersToAuditLogs` | Also ignore changes performed by ignored users | Boolean |
| `blacklistedUsers` | Whether to ignore blacklisted users entirely | Boolean |
| `logChannels` | Whether to automatically ignore any channel defined as a log channel | Boolean |

## Sample Configuration

```text
{
	"modules": {
		"logging": {
			"enabled": true,
			"auditLogs": true,
			"logChannels": {
				"channel id": {
					"description": "server changes",
					"embed": true,
					"embedColor": 2263842,
					"footerAvatar": "",
					"webhookUrl": "",
					"showEventName": false,
					"showTimestamps": true,
					"scopes": {
						"include": [
							"GUILD_UPDATE.*",
							"CHANNEL_CREATE.*",
							"CHANNEL_UPDATE.*",
							"CHANNEL_DELETE.*",
							"GUILD_INTEGRATIONS_UPDATE.*",
							"GUILD_EMOJIS_UPDATE.*",
							"GUILD_ROLE_CREATE.*",
							"GUILD_ROLE_DELETE.*",
							"GUILD_ROLE_UPDATE.*",
							"WEBHOOKS_UPDATE.*",
							"GUILD_MEMBER_ADD.BOT_ADDED"
						],
						"exclude": []
					}
				},
				"channel id 2": {
					"description": "moderation",
					"embed": false,
					"embedColor": 2263842,
					"footerAvatar": "",
					"webhookUrl": "",
					"showEventName": false,
					"showTimestamps": true,
					"scopes": {
						"include": [
							"VOICE_STATE_UPDATE.SERVER_MUTED",
							"VOICE_STATE_UPDATE.SERVER_UNMUTED",
							"VOICE_STATE_UPDATE.SERVER_DEAFENED",
							"VOICE_STATE_UPDATE.SERVER_UNDEAFENED",
							"MESSAGE_REACTION_REMOVE_ALL.*",
							"GUILD_MEMBER_UPDATE.ROLES_ADDED",
							"GUILD_MEMBER_UPDATE.ROLES_REMOVED",
							"GUILD_MEMBER_UPDATE.ROLES_CHANGED",
							"GUILD_BAN_ADD.*",
							"GUILD_BAN_REMOVE.*",
							"GUILD_MEMBER_REMOVE.MEMBER_KICKED",
							"ANTIPING.*",
							"PERSIST.*",
							"CORE.BLACKLISTED_USER_ACTION"
						],
						"exclude": []
					}
				},
				"channel id 3": {
					"description": "actions",
					"embed": false,
					"embedColor": 2263842,
					"footerAvatar": "",
					"webhookUrl": "",
					"showEventName": false,
					"showTimestamps": true,
					"scopes": {
						"include": [
							"VOICE_STATE_UPDATE.*",
							"USER_UPDATE.*",
							"MESSAGE_REACTION_REMOVE.*",
							"MESSAGE_REACTION_ADD.*",
							"MESSAGE_DELETE_BULK.*",
							"MESSAGE_DELETE.*",
							"MESSAGE_UPDATE.*",
							"COMMANDS.COMMAND_USED",
							"CHANNEL_PINS_UPDATE.*",
							"GUILD_MEMBER_UPDATE.*",
							"GUILD_MEMBER_ADD.MEMBER_JOIN",
							"GUILD_MEMBER_REMOVE.MEMBER_LEFT"
							
						],
						"exclude": [
							"VOICE_STATE_UPDATE.SERVER_MUTED",
							"VOICE_STATE_UPDATE.SERVER_UNMUTED",
							"VOICE_STATE_UPDATE.SERVER_DEAFENED",
							"VOICE_STATE_UPDATE.SERVER_UNDEAFENED",
							"GUILD_MEMBER_UPDATE.ROLES_ADDED",
							"GUILD_MEMBER_UPDATE.ROLES_REMOVED",
							"GUILD_MEMBER_UPDATE.ROLES_CHANGED"
						]
					}
				}
			},
			"ignores": {
				"channels": [],
				"users": [
					"a bot"
				],
				"self": false,
				"selfAuditLogs": false,
				"extendUsersToAuditLogs": true,
				"blacklistedUsers": false,
				"logChannels": true
			},
			"userTag": "_MENTION_",
			"actorTag": "_MENTION_",
			"suffixReasonToAuditlog": true,
			"reasonSuffix": " with reason `_REASON_RAW_`",
			"timezone": "Etc/GMT+1"
		}
	}
}
```

## Commands

There are no commands for this module.

## Event Queue

This module takes advantage of the event queue by grouping multiple log messages together and sending them as a single discord chat message.

**If you use embeds for log messages**, make sure to define webhook urls for all of your channels using embeds, the bot will automatically switch to using webhooks whenever it needs to post long chains of messages \(not only do webhooks have larger ratelimits than bot accounts, but webhooks can post 10 embeds per message\)

