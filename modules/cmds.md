# Commands

## Configuration

PyBoat commands work similarly to Rowboat, though the configuration for them is very different.

```text
{
	"levels": {},
	"modules": {
		"queue": true,
		"commands": {
			"enabled": true,
			"prefix": ['!'],
			"allowMentionPrefix": true,
			"hideNoAccess": true,
			"overrides": {}
		}
	}
}
```

| Setting |  | Type |
| :--- | :--- | :--- |
| `enabled` | Enables the module, this needs to be enabled for command usage in other modules | Boolean |
| `prefix` | The prefixes the bot will respond to | String Array |
| `allowMentionPrefix` | Whether the bot will allow commands by mentioning it | Boolean |
| `hideNoAccess` | Whether to hide "You don't have access to this command" messages | Boolean |
| `overrides` | Command overrides, see below | Object |

### Overrides

Command overrides, similarly to Rowboat, allow you to customize requirements to use commands or even disable them entirely.

Here's an example:

```text
{
  "module.utilities": {
    level: 0
  },
  "group.backup": {
    level: 100
  },
  "command.ping": {
    disabled: true
  },
  "command.backup show": {
    level: 200
  }
}
```

> module.utilities

This will target any command relating to the utilities module, and set them all to level 0.

> group.backup

This will target the "backup" command group from utilities and set all their subcommands to level 100 \(!backup save, !backup restore, !backup show\)

> command.ping

This will target the "ping" command from commands module, and disable it.

> command.backup show

This will target the !backup show command from utilities and set it's level to 200.  
Also overriding the above definitions.

If you don't know what module or command group a command belongs to, you can always just override it by raw name:

```text
{
  "command.a command i dont know": {
    disabled: true
  }
}
```

{% hint style="info" %}
Override definitions have priority over each other based on the lowest scope, a raw command name's overrides will bypass any module/command group definitions, while command group definitions will bypass module definitions.

Keep this in mind when defining your overrides.
{% endhint %}



## Commands

This module also bundles a few default information/utility commands, you can override them as normal, but they're directly part of this module!

| Command | Arguments | Default Level | Description |
| :--- | :--- | :--- | :--- |
| `ping` |  | Guest | Pings the bot |
| `help` |  | Guest | Shows the bot's help text |
| `docs` |  | Guest | Shows the link to the bot documentation |
| `mylevel` |  | Guest | Gets your current bot auth level |
| `server` |  | Guest | Gets all server details |

#### 

#### Dev Commands

Commands below this point are for dev usage only and are only here for reference.

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `override` |  | Show GA overrides for this guild |
| `override` | disable | Disable active GA overrides in this guild |
| `override` | &lt;time&gt; | Insert a GA override in this guild for &lt;time&gt; |
| `eval` | &lt;code&gt; | Eval code |
| `falseupdate` |  | Send a false gw event update |
| `reload` |  | Reload the guild's config |
| `test` | &lt;test name&gt; | Run various tests |
| `listkv` | &lt;namespace&gt; | List all data in a kv namespace |
| `clearkv` | &lt;namespace&gt; | Clear all data in a kv namespace |
| `getemoji` | &lt;emoji id&gt; | Get emoji data by emoji id |



