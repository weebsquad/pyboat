# Utilities

The utilities module features several random features that do not belong in any other module, along with some commands.

## Configuration

```text
{
	"modules": {
		"utilities": {
			"enabled": true,
			"snipe": {},
			"persist": {}
		}
	}
}
```

## Snipe

Snipe is a simple short time message store for user self-deleted messages.

It tracks a single message deletion per channel, and users can type the command within X seconds to display it to everyone.

![](../.gitbook/assets/image%20%283%29.png)

### Configuration

```text
"snipe": {
    "enabled": true,
    "delay": 120000
}
```

| Name | Desc | Type |
| :--- | :--- | :--- |
| `enabled` | Whether to enable the system | Boolean |
| `delay` | Delay for members to use the snipe command and also how old a message can be to be tracked | Number \(ms\) |

## Persist \(Backups\)

Persist is your usual role/nickname saving for when members leave and rejoin your server!

### Configuration

```text
"persist": {
  "enabled": true,
  "levels": {
    1000: {
      "roles": true,
      "nick": true,
      "mute": true,
      "deaf": true,
      "channels": true,
      "roleIncludes": [],
      "roleExcludes": []
    }
  },
  "saveOnBan": false
}
```

| Name | Desc | Type |
| :--- | :--- | :--- |
| `enabled` | Whether to enable the system | Boolean |
| `levels` | The targetted levels system | {level: levelsConf} |
| `saveOnBan` | Whether to save backup data if the member gets banned | Boolean |

#### levelsConf

The levels conf will apply the lowest applicable level configuration to a specific member.

For example:  
If you define a config for level 1000 and one for level 100, anyone up to level 100 will be affected by the level 100 config, and anyone from 101 to 1000 will be affected by the level 1000 config.

<table>
  <thead>
    <tr>
      <th style="text-align:left">Name</th>
      <th style="text-align:left">Desc</th>
      <th style="text-align:left">Type</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:left"><code>roles</code>
      </td>
      <td style="text-align:left">Whether to save roles</td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>nick</code>
      </td>
      <td style="text-align:left">Whether to save the member&apos;s nickname</td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>mute</code>
      </td>
      <td style="text-align:left">
        <p>Whether to save the member&apos;s voice server mute state</p>
        <p>Not currently supported.</p>
      </td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>deaf</code>
      </td>
      <td style="text-align:left">
        <p>Whether to save the member&apos;s voice server deafen state</p>
        <p>Not currently supported.</p>
      </td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>channels</code>
      </td>
      <td style="text-align:left">Whether to save channel overrides applied to members of this config</td>
      <td
      style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>roleIncludes</code>
      </td>
      <td style="text-align:left">
        <p>The roles to include in the member&apos;s backups</p>
        <p>Note: If this is empty, all their roles will be included</p>
      </td>
      <td style="text-align:left">String Array</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>roleExcludes</code>
      </td>
      <td style="text-align:left">The roles to exclude from the member&apos;s backups</td>
      <td style="text-align:left">String Array</td>
    </tr>
  </tbody>
</table>

## Commands

| Command | Arguments | Default Level | Description |
| :--- | :--- | :--- | :--- |
| `snowflake` | &lt;string&gt; | Guest | Gets info on a snowflake |
| `cat` |  | Guest | Pulls a random cat image |
| `snipe` |  | Authorized | Snipes the last message |
| `backup show` | &lt;user id&gt; | Moderator | Shows data of a user's backup |
| `backup delete` | &lt;user id&gt; | Moderator | Deletes data of a user's backup |
| `backup save` | &lt;user id&gt; | Moderator | Saves a backup for a member |
| `backup restore` | &lt;user id&gt; | Moderator | Restores a backup for a member |

