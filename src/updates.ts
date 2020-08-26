import { KVManager } from './lib/kvManager';

export async function runUpdates() {
  console.log('Running update!');

  await pylon.requestCpuBurst(async () => {
    let cfg: any = await pylon.kv.get('__guildConfig');
    if (typeof (cfg) === 'string') {
      if (cfg.includes('{') || cfg.includes('%')) {
        if (cfg.includes('%')) {
          try {
            cfg = decodeURI(cfg);
          } catch (e) {}
        }
      } else {
        cfg = atob(cfg);
        if (cfg.includes('%')) {
          try {
            cfg = decodeURI(cfg);
          } catch (e) {}
        }
      }
      cfg = JSON.parse(cfg);
    }
    const persistkv = new pylon.KVNamespace('persists');
    const translationkv = new pylon.KVNamespace('translation');
    // await translationkv.clear();
    const items = await persistkv.items();
    if (items.length > 0) {
      for (const k in items) {
        const val: any = items[k];
        await KVManager.set(`Persist_${k}`, val);
      }
      await persistkv.clear();
    }

    let changedCfg = false;
    if (!cfg) {
      return;
    }
    if (typeof cfg === 'object' && typeof cfg.modules === 'object') {
      if (typeof cfg.modules.antiPing === 'object' && typeof cfg.modules.infractions === 'object') {
        if (typeof cfg.modules.antiPing.muteRole === 'string' && cfg.modules.infractions.muteRole !== cfg.modules.antiPing.muteRole) {
          cfg.modules.infractions.muteRole = cfg.modules.antiPing.muteRole;
          changedCfg = true;
        }
        if (cfg.modules.antiPing.muteRole) {
          delete cfg.modules.antiPing.muteRole;
          changedCfg = true;
        }
      }
      if (typeof cfg.modules.utilities === 'object') {
        if (typeof cfg.modules.utilities.persist === 'object') {
          if (cfg.modules.utilities.persist.duration) {
            delete cfg.modules.utilities.persist.duration;
            changedCfg = true;
          }
        }
      }
    }
    if (changedCfg === true) {
      console.log('Updated guild config!');
      await pylon.kv.put('__guildConfig', cfg);
    }
  });
}
