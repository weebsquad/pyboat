/* eslint-disable no-loop-func */
import { handleEvent, getUserTag, getMemberTag } from '../main';
import { language as i18n, setPlaceholders } from '../../../localization/interface';

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
    mp.set('TYPE', 'EDITED_EMOJIS');
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
          oldProp = emjOld[changedProp] === true ? i18n.modules.logging.l_terms.trueval : i18n.modules.logging.l_terms.falseval;
          newProp = emj[changedProp] === true ? i18n.modules.logging.l_terms.trueval : i18n.modules.logging.l_terms.falseval;
        }
        if (msg !== '') {
          msg += '\n';
        }
        if (changedProp !== 'roles') {
          msg += setPlaceholders(i18n.modules.logging.l_terms.edited_emoji, ['emoji_mention', emj.toMention(), 'emoji_id', emj.id, 'old_value', oldProp, 'new_value', newProp]);
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
          msg += setPlaceholders(i18n.modules.logging.l_terms.edited_emoji_roles, ['emoji_mention', emj.toMention(), 'emoji_id', emj.id, 'new_value', _edit]);
        }
      });
    }
    mp.set('MESSAGE', msg);
    return mp;
  },
  addedEmoji(
    log: discord.AuditLogEntry,
    ev: discord.Event.IGuildEmojisUpdate,
    oldEv: discord.Event.IGuildEmojisUpdate,
  ) {
    const edited = getChanges(ev, oldEv);
    const { added } = edited;
    const mp = new Map([['TYPE', 'ADDED_EMOJIS']]);
    let msg = '';
    added.forEach((newE: discord.Emoji) => {
      if (msg !== '') {
        msg += '\n';
      }
      msg += setPlaceholders(i18n.modules.logging.l_terms.added_emoji, ['emoji_mention', newE.toMention(), 'emoji_id', newE.id]);
    });
    mp.set('MESSAGE', msg);
    return mp;
  },
  removedEmoji(
    log: discord.AuditLogEntry,
    ev: discord.Event.IGuildEmojisUpdate,
    oldEv: discord.Event.IGuildEmojisUpdate,
  ) {
    const edited = getChanges(ev, oldEv);
    const { removed } = edited;
    const mp = new Map([['TYPE', 'REMOVED_EMOJIS']]);
    let msg = '';
    removed.forEach((newE: discord.Emoji) => {
      if (msg !== '') {
        msg += '\n';
      }
      msg += setPlaceholders(i18n.modules.logging.l_terms.removed_emoji, ['emoji_mention', newE.toMention(), 'emoji_id', newE.id]);
    });
    mp.set('MESSAGE', msg);
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
