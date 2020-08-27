# Antiping

## How it works

The antiping module is a relatively intuitive auto-moderation feature to stop people from mentioning certain users in configured channels!

Keep in mind that **even if someone's mention gets censored, the mentioned user will still receive a ping**, this module is just a moral incentive for your members to not mention specific people.

Once a member sends a illegal mention in chat, the bot will swiftly let them know so, and will add reactions to it's own message that staff members can use to assign punishments to the user for using the mention.

**This module is NOT a anti-spam module!  
It only handles up to 6 mentions per message!**

There is a configurable auto-mute for repeated mentions, and if a user has multiple pending mention punishments, having a staff member click any one of them will remove all the others, since the action will only be applied once!

Similarly, if the user gets auto-muted and you select the "Ignore" or "IgnoreOnce" actions, the bot will also automatically unmute them.

![](../.gitbook/assets/image%20%282%29.png)



## Core Configuration

```text
{
	"modules": {
		"logging": {
			"enabled": true,
			"caughtMessages": [],
			"actualCaughtMessage": "",
			"instaDeletePings": false,
			"banOnLeave": false,
			"pingsForAutoMute": 3,
			"staff": 50,
			"emojiActions": {},
			"bypass": {},
			"targets": {}
		}
	}
}
```

| Setting |  | Type |
| :--- | :--- | :--- |
| `enabled` | Enables the module | Boolean |
| `caughtMessages` | Randomly selected message on trigger | String Array |
| `actualCaughtMessage` | Static message on trigger | String |
| `instaDeletePings` | Instantly delete mentions messages on trigger | Boolean |
| `banOnLeave` | Auto ban users with pending punishments who leave the server | Boolean |
| `pingsForAutoMute` | Number of triggers to auto-mute users | Number |
| `staff` | Staff level \(to pass punishments and bypass triggers\) | Number |
| `emojiActions` | The reaction triggers for punishments | {emoji: action} |
| `bypass` | People who bypass triggers entirely | {bypass} |
| `targets` | Targets for tracking illegal mentions on | {targets} |

### emojiActions

| Name | Desc |
| :--- | :--- |
| `IgnoreOnce` | Ignores this mention |
| `Ignore` | Ignores this mention and adds the user to a bypass list |
| `Mute` | Mutes the user |
| `Kick` | Kicks the user |
| `Softban` | Softbans the user, deleting their last 7 days of messages |
| `Ban` | Bans the user |

### bypass

| Name | Desc | Type |
| :--- | :--- | :--- |
| `users` | User ids who bypass any illegal mentions | String Array |
| `roles` | Role ids who bypass any illegal mentions | String Array |
| `level` | Level and above who bypass any illegal mentions | Number |

### targets

**For targets to work, you will need to specify at least one user OR role along with at least one channel OR category!**

| Name | Desc | Type |
| :--- | :--- | :--- |
| `users` | Targetted users | Target |
| `roles` | Targetted roles | Target |
| `channels` | Targetted channels | Target |
| `categories` | Targetted categories | Target |

#### Target sub-type

| Name | Desc | Type |
| :--- | :--- | :--- |
| `include` | Objects to include in this target | String Array |
| `exclude` | Objects to exclude from this target | String Array |

## Sample Configuration

```text
{
	"modules": {
		"logging": {
			"enabled": true,
			"muteRole": "mute role id",
			"caughtMessages": ["dont ping people!", "stop this crime"],
			"actualCaughtMessage": 'Please dont mention our staff',
			"instaDeletePings": false,
			"banOnLeave": false,
			"pingsForAutoMute": 3,
			"staff": 50,
			"bypass": {
				"users": ["your_id"],
				"roles": ["role_id"],
				"level": 10
			},
			"emojiActions": {
				"👌": "IgnoreOnce",
        "☑️": "Ignore",
        "🔇": "Mute",
        "👢": "Kick",
        "🔨": "Ban'
      },
      "targets": {
      	"users": {
      		"include": [],
      		"exclude": ["some sneaky staff user"]
      	},
      	"roles": {
          "include": ["your mods role"],
      		"exclude": []
      	}
      	"channels": {
          "include": [],
      		"exclude": []
      	},
      	"categories": {
          "include": ["your main chat category"],
      		"exclude": []
      	}
      }
		}
	}
}
```

## Commands

There are currently no commands for this module.

