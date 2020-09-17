/* eslint-disable no-loop-func */
import { handleEvent, getUserTag, getMemberTag } from '../main';

function getChanges(
  ev: discord.Event.IGuildEmojisUpdate,
  oldEv: discord.Event.IGuildEmojisUpdate,
) {
  const ret: {[key: string]: any} = {
    added: new Array<discord.Emoji>(),
    removed: new Array<discord.Emoji>(),
    changed: new Map<string, Array<string>>(),
  };
  ev.emojis.forEach((e) => {
    const _f = oldEv.emojis.find((e2) => e.id === e2.id);
    if (!_f) {
      ret.added.push(e);
    } else {
      for (const k in e) {
        if (typeof e[k] !== typeof _f[k]) {
          continue;
        }
        if (e[k] === _f[k] && k !== 'roles') {
          continue;
        }
        if (k === 'roles') {
          const oldRoles = _f.roles;
          const { roles } = e;
          let _d = false;
          roles.forEach((emjRole) => {
            if (!oldRoles.includes(emjRole)) {
              _d = true;
            }
          });
          oldRoles.forEach((emjRole) => {
            if (!roles.includes(emjRole)) {
              _d = true;
            }
          });
          if (!_d) {
            continue;
          }
        }

        if (!ret.changed.has(e.id)) {
          ret.changed.set(e.id, new Array<string>());
        }
        const g = ret.changed.get(e.id);
        g.push(k);
        ret.changed.set(e.id, g);
      }
    }
  });
  oldEv.emojis.forEach((e) => {
    const _f = ev.emojis.find((e2) => e.id === e2.id);
    if (!_f) {
      ret.removed.push(e);
    }
  });
  return ret;
}

export function getKeys(
  log: discord.AuditLogEntry,
  ev: discord.Event.IGuildEmojisUpdate,
  oldEv: discord.Event.IGuildEmojisUpdate,
) {
  const changes = getChanges(ev, oldEv);
  const { changed } = changes;
  const keys = [];
  if (changes.added.length > 0) {
    keys.push('addedEmoji');
  }
  if (changes.removed.length > 0) {
    keys.push('removedEmoji');
  }
  if (changed.size > 0) {
    keys.push('editedEmoji');
  }

  return keys;
}

export function isAuditLog(log: discord.AuditLogEntry) {
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  editedEmoji(
    log: discord.AuditLogEntry,
    ev: discord.Event.IGuildEmojisUpdate,
    oldEv: discord.Event.IGuildEmojisUpdate,
  ) {
    const edited = getChanges(ev, oldEv);
    const { changed } = edited;

    const mp = new Map();
    let msg = '';
    mp.set('_TYPE_', 'EDITED_EMOJIS');
    for (const [k, v] of changed) {
      const emj = ev.emojis.find((e) => e.id === k);
      const emjOld = oldEv.emojis.find((e) => e.id === k);
      if (!emj || !emjOld) {
        continue;
      }
      v.forEach((changedProp: string) => {
        let oldProp = emjOld[changedProp];
        let newProp = emj[changedProp];
        if (typeof changedProp === 'boolean') {
          oldProp = emjOld[changedProp] === true ? 'True' : 'False';
          newProp = emj[changedProp] === true ? 'True' : 'False';
        }
        if (msg !== '') {
          msg += '\n';
        }
        if (changedProp !== 'roles') {
          msg += `Edited emoji ${emj.toMention()} **[**||\`${
            emj.id
          }\`||**]** changed **${changedProp}**: \`${oldProp}\` ${
            discord.decor.Emojis.ARROW_RIGHT
          } \`${newProp}\``;
        } else {
          const added = [];
          const removed = [];
          emj.roles.forEach((newRoles) => {
            if (!emjOld.roles.includes(newRoles)) {
              added.push(newRoles);
            }
          });
          emjOld.roles.forEach((newRoles) => {
            if (!emj.roles.includes(newRoles)) {
              removed.push(newRoles);
            }
          });
          const _edit = added
            .map((e: string) => `**+**<@&${e}>`)
            .concat(
              removed.map((e: string) => `**-**<@&${e}>`),
            )
            .join('  ');
          msg += `Edited emoji ${emj.toMention()} **[**||\`${
            emj.id
          }\`||**]** changed **roles**: ${_edit}`;
        }
      });
    }
    mp.set('_MESSAGE_', msg);
    return mp;
  },
  addedEmoji(
    log: discord.AuditLogEntry,
    ev: discord.Event.IGuildEmojisUpdate,
    oldEv: discord.Event.IGuildEmojisUpdate,
  ) {
    const edited = getChanges(ev, oldEv);
    const { added } = edited;
    const mp = new Map([['_TYPE_', 'ADDED_EMOJIS']]);
    let msg = '';
    added.forEach((newE: discord.Emoji) => {
      if (msg !== '') {
        msg += '\n';
      }
      msg += `Added emoji ${newE.toMention()} **[**||\`${
        newE.id
      }\`||**]** to the server`;
    });
    mp.set('_MESSAGE_', msg);
    return mp;
  },
  removedEmoji(
    log: discord.AuditLogEntry,
    ev: discord.Event.IGuildEmojisUpdate,
    oldEv: discord.Event.IGuildEmojisUpdate,
  ) {
    const edited = getChanges(ev, oldEv);
    const { removed } = edited;
    const mp = new Map([['_TYPE_', 'REMOVED_EMOJIS']]);
    let msg = '';
    removed.forEach((newE: discord.Emoji) => {
      if (msg !== '') {
        msg += '\n';
      }
      msg += `Removed emoji \`${newE.name}\` **[**||\`${newE.id}\`||**]** from the server`;
    });
    mp.set('_MESSAGE_', msg);
    return mp;
  },
};

export async function AL_OnGuildEmojisUpdate(
  id: string,
  guildId: string,
  log: any,
  ev: discord.Event.IGuildEmojisUpdate,
  oldEv: discord.Event.IGuildEmojisUpdate,
) {
  await handleEvent(
    id,
    guildId,
    discord.Event.GUILD_EMOJIS_UPDATE,
    log,
    ev,
    oldEv,
  );
}
