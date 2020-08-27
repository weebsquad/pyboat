# Infractions

Infractions is the standard "moderation" system also present in rowboat.

The only automated feature of this module is automatic audit log tracking of infractions \(if enabled\) which will also mark moderator actions as infractions \(for example if you right-click ban a member with it enabled, the bot will make a new infraction for your ban\)

{% hint style="info" %}
**Note for temporary infractions**

Currently, due to Pylon not having accurate task scheduling, infractions are only checked every 5 minutes at most.  
So if you tempmute someone for a minute, it's possible that they will only be unmuted 5 minutes later.  
This will be rectified as soon as Pylon gives me a way to do so..
{% endhint %}

{% hint style="info" %}
**Note for other modules**

Any module that kicks/bans/mutes members will use this module, and as such this should be enabled, otherwise issues might arise.
{% endhint %}

## Configuration

```text
{
	"modules": {
		"infractions": {
			"enabled": true,
			"checkLogs": true,
			"integrate": true,
			"muteRole": "",
			"defaultDeleteDays": 0,
			"targetting": {
				"reqDiscordPermissions": true,
				"checkLevels": true,
				"checkRoles": true,
				"othersEditLevel": 100
			},
			"confirmation": {
				"reaction": true,
				"message": false,
				"expiry": 10
			}
		}
	}
}
```

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
      <td style="text-align:left"><code>enabled</code>
      </td>
      <td style="text-align:left">Whether to enable the module</td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>checkLogs</code>
      </td>
      <td style="text-align:left">Whether to automatically check audit logs and log as infractions (for
        example if you right-click ban or remove someone&apos;s mute role, the
        bot will approprietely mark them as infractions)</td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>integrate</code>
      </td>
      <td style="text-align:left">
        <p>Whether to use the reason integrate system (see below)</p>
        <p><b>Note</b>: this needs <code>checkLogs</code> to be enabled in order to
          function</p>
      </td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>muteRole</code>
      </td>
      <td style="text-align:left">Role id of your server&apos;s mute role</td>
      <td style="text-align:left">String</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>defaultDeleteDays</code>
      </td>
      <td style="text-align:left">Number of days of messages to delete for users when banning/tempbanning</td>
      <td
      style="text-align:left">Number</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>targetting</code>
      </td>
      <td style="text-align:left">Targetting configuration for mod commands</td>
      <td style="text-align:left">{targetting}</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>confirmation</code>
      </td>
      <td style="text-align:left">Confirmation configuration for mod commands</td>
      <td style="text-align:left">{confirmation}</td>
    </tr>
  </tbody>
</table>

### integrate

The integrate system is inspired by the [BetterBan bot](https://top.gg/bot/568865107283804202) and works similarly:

Suffixing your ban reasons:  
`<reason> - softban` or `<reason> - sb` -&gt; Unbans the target right after your ban  
`<reason> - <time>` -&gt; Unbans the target after &lt;time&gt;

Changing nicknames:  
`mute` -&gt; Mutes the target  
`mute <time>` or `m <time>` -&gt; Tempmutes the target  
`unmute` -&gt; Unmutes the target  
**Note**: This will check targetting permissions as if you ran the command.  
**Note 2**: This will not give verbose error messages if you do something wrong, if it succeeds, it will change the member's nickname back.  


### targetting

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
      <td style="text-align:left"><code>reqDiscordPermissions</code>
      </td>
      <td style="text-align:left">
        <p>Requires the actor of a command to also have the matching discord permission
          in order to execute it.
          <br />This is enabled by default as a safety precaution but can obviously be
          disabled.</p>
        <p>i.e. enforces your moderators to only be able to kick members through
          the bot if they have the kick members discord permission.</p>
      </td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>checkLevels</code>
      </td>
      <td style="text-align:left">
        <p>When checking targets, compare levels and disallow same or lower levels
          from targetting higher levels.</p>
        <p>You probably want to keep this on, otherwise your moderators can technically
          ban your admins.</p>
      </td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>checkRoles</code>
      </td>
      <td style="text-align:left">
        <p>When checking targets, compare highest roles of both members and disallow
          those with same or lower roles from targetting higher roles.</p>
        <p>You can disable this if your server uses some non-position-based role
          hierarchy but otherwise you should keep it on</p>
      </td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>othersEditLevel</code>
      </td>
      <td style="text-align:left">Bot level needed to edit other people&apos;s infractions</td>
      <td style="text-align:left">Number</td>
    </tr>
  </tbody>
</table>

### confirmation

<table>
  <thead>
    <tr>
      <th style="text-align:left">Name</th>
      <th style="text-align:left">Desc</th>
      <th style="text-align:left">Desc</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:left"><code>reaction</code>
      </td>
      <td style="text-align:left">Whether to react to the actor&apos;s message with the result of the command</td>
      <td
      style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>message</code>
      </td>
      <td style="text-align:left">Whether to reply to the actor&apos;s message with full verbose on the
        result of the command</td>
      <td style="text-align:left">Boolean</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>expiry</code>
      </td>
      <td style="text-align:left">
        <p>How long (in seconds) before deleting the reaction and/or reply message,
          zero disabling this behavior.</p>
        <p>Currently limited to a max of 10 seconds.</p>
      </td>
      <td style="text-align:left">Number (seconds)</td>
    </tr>
  </tbody>
</table>

## Commands

{% hint style="info" %}
Commands listed here will require their level to be executed, as per normal behaviour, but will also check against your server's configuration \(i.e. targetting\) when executing.
{% endhint %}

<table>
  <thead>
    <tr>
      <th style="text-align:left">Command</th>
      <th style="text-align:left">Arguments</th>
      <th style="text-align:left">Default Level</th>
      <th style="text-align:left">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:left"><code>kick</code>
      </td>
      <td style="text-align:left">&lt;member&gt; [reason]</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">Kicks a member</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>softban</code>
      </td>
      <td style="text-align:left">&lt;member&gt; &lt;deletiondays&gt; [reason]</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">Softbans a member (ban and unban)</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>tempban</code>
      </td>
      <td style="text-align:left">&lt;member&gt; &lt;time&gt; [reason]</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">Tempbans a member</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>cleanban</code>
      </td>
      <td style="text-align:left">&lt;member&gt; &lt;days&gt; [reason]</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left"></td>
    </tr>
    <tr>
      <td style="text-align:left"><code>ban</code>
      </td>
      <td style="text-align:left">&lt;member&gt; [reason]</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">
        <p>Bans a member</p>
        <p>deletiondays defaults to 0</p>
      </td>
    </tr>
    <tr>
      <td style="text-align:left"><code>unban</code>
      </td>
      <td style="text-align:left">&lt;member&gt; [reason]</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">Unbans a member</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>massban</code>
      </td>
      <td style="text-align:left">&lt;users&gt; [reason]</td>
      <td style="text-align:left">Administrator</td>
      <td style="text-align:left">Bans several users at once by their user ID, you can put the reason anywhere
        within the command.</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>mute</code>
      </td>
      <td style="text-align:left">&lt;member&gt; [reason]</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">
        <p>Mutes a member</p>
        <p><b>This command can also take in a time argument similarly to tempmute.</b>
        </p>
      </td>
    </tr>
    <tr>
      <td style="text-align:left"><code>tempmute</code>
      </td>
      <td style="text-align:left">&lt;member&gt; &lt;time&gt; [reason]</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">Tempmutes a member</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>unmute</code>
      </td>
      <td style="text-align:left">&lt;member&gt; [reason]</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">Unmutes a member</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>inf recent</code>
      </td>
      <td style="text-align:left"></td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">Shows the latest 10 infractions</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>inf active</code>
      </td>
      <td style="text-align:left"></td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">Shows the latest 10 active infractions (temporary infs)</td>
    </tr>
    <tr>
      <td style="text-align:left"><code>inf info</code>
      </td>
      <td style="text-align:left">&lt;inf. id&gt;</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">
        <p>Shows detailed info on a infraction</p>
        <p>You can also type <code>ml</code> instead of the id to view your latest
          applied infraction</p>
      </td>
    </tr>
    <tr>
      <td style="text-align:left"><code>inf duration</code>
      </td>
      <td style="text-align:left">&lt;inf. id&gt; &lt;new duration&gt;</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">
        <p>Changes duration on a infraction</p>
        <p>You can also type <code>ml</code> instead of the id to target your latest
          applied infraction</p>
      </td>
    </tr>
    <tr>
      <td style="text-align:left"><code>inf reason</code>
      </td>
      <td style="text-align:left">&lt;inf. id&gt; &lt;new reason&gt;</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">
        <p>Changes reason on a infraction</p>
        <p>You can also type <code>ml</code> instead of the id to target your latest
          applied infraction</p>
      </td>
    </tr>
    <tr>
      <td style="text-align:left"><code>inf delete</code>
      </td>
      <td style="text-align:left">&lt;inf. id&gt;</td>
      <td style="text-align:left">Administrator</td>
      <td style="text-align:left">
        <p>Deletes a given infraction
          <br />You can also type <code>ml</code> instead of the id to target your latest
          applied infraction</p>
        <p><b>Warning</b>: This will <b>NOT</b> perform any actions!</p>
      </td>
    </tr>
    <tr>
      <td style="text-align:left"><code>inf clearuser</code>
      </td>
      <td style="text-align:left">&lt;user&gt;</td>
      <td style="text-align:left">Administrator</td>
      <td style="text-align:left">
        <p>Clears all infractions applied to a given user</p>
        <p><b>Warning</b>: This will <b>NOT</b> perform any actions!</p>
      </td>
    </tr>
    <tr>
      <td style="text-align:left"><code>inf clearactor</code>
      </td>
      <td style="text-align:left">&lt;user&gt;</td>
      <td style="text-align:left">Administrator</td>
      <td style="text-align:left">
        <p>Clears all infractions attributed by a given actor</p>
        <p><b>Warning</b>: This will <b>NOT</b> perform any actions!</p>
      </td>
    </tr>
    <tr>
      <td style="text-align:left"><code>inf clearall</code>
      </td>
      <td style="text-align:left"></td>
      <td style="text-align:left">Owner</td>
      <td style="text-align:left">
        <p>Clears every infractions on your server</p>
        <p><b>Warning</b>: This will <b>NOT</b> perform any actions!</p>
      </td>
    </tr>
    <tr>
      <td style="text-align:left"><code>inf search</code>
      </td>
      <td style="text-align:left">&lt;user | actor | type&gt; &lt;id | type&gt;</td>
      <td style="text-align:left">Moderator</td>
      <td style="text-align:left">
        <p>Queries infractions for a user, actor or type.</p>
        <p>Example: <code>inf search user 344837487526412300</code>
        </p>
        <p><code>inf search type ban</code>
        </p>
        <p><b>Note</b>: for overriding, the command group is <code>inf search</code> and
          the command name is <code>user</code> | <code>actor</code> | <code>type</code>
        </p>
      </td>
    </tr>
  </tbody>
</table>

