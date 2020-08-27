# Counting

## How it works

The counting module implements a simple counting system on a channel.

![](../.gitbook/assets/image%20%284%29.png)

## Configuration

```text
{
	"modules": {
		"counting": {
			"enabled": true,
			"channels": [],
			"autoPins": {},
			"useWebhook": false,
			"webhook": ""
		}
	}
}
```

| Name | Desc | Type |
| :--- | :--- | :--- |
| `enabled` | Whether to enable the module | Boolean |
| `channels` | Channels that will serve as counting channels | String Array |
| `autoPins` | Config for automatically pinning certain numbers | {autoPins} |
| `useWebhook` | Whether to delete user's messages and replace them with a webhook message \(to stop them from self-deleting\) | Boolean |
| `webhook` | if useWebhook is true, define your webhook here | String |

### autoPins

```text
"autoPins": {
	"single": [1, 69, 100, 200, 420, 666, 1000, 1337, 6969, 9001, 10000, 99999],
	"repeating": [1000],
	"repeatingLast": [69]
}
```

| Name | Desc | Type |
| :--- | :--- | :--- |
| `single` | Single entire numbers to pin | Number Array |
| `repeating` | Repeating numbers to pin \(by division\) i.e. 1000 = 1000, 2000, 3000 | Number Array |
| `repeatingLast` | Repeating numbers to pin by their last digits i.e. 69 = 69, 169, 269, 369, 469 | Number Array |

## Sample Configuration

```text
{
	"modules": {
		"counting": {
			"enabled": true,
			"channels": ["your channel"],
			"autoPins": {
				"single": [1, 69, 100, 200, 420, 666, 1000, 1337, 6969, 9001, 10000, 99999],
				"repeating": [1000],
				"repeatingLast": [69]
			},
			"useWebhook": false,
			"webhook": ""
		}
	}
}
```

## Commands

The counting module has special usable commands inside counting channels only.

**In order to use both commands, you require "Manage Messages" permission on the counting channel!**

**These commands do not take in a prefix!**

| Command | Desc |
| :--- | :--- |
| `RESET` | Resets the count in the channel to 0 |
| `SET <number>` | Sets the count in the channel to &lt;number&gt; |

