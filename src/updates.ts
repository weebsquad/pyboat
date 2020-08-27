import { KVManager } from './lib/kvManager';

const configKv = new pylon.KVNamespace('config');

export async function runUpdates(oldVersion: string, newVersion: string) {
  console.log('Running update!');

  await pylon.requestCpuBurst(async () => {
    if (newVersion === '1.5.0') {
      let oldcfg: any = await pylon.kv.get('__guildConfig');
      if (typeof oldcfg !== 'undefined') {
        oldcfg = JSON.parse(oldcfg);
        const parts = JSON.stringify(oldcfg).match(/.{1,8000}/g);
        await configKv.clear();
        for (let i = 0; i < parts.length; i += 1) {
          await configKv.put(i.toString(), parts[i]);
        }
        await pylon.kv.delete('__guildConfig');
      }
    }
    let cfg: any;
    const itemsC = await configKv.items();
    if (itemsC.length > 0) {
      cfg = JSON.parse(itemsC.map((item) => item.value).join(''));
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
      const parts = JSON.stringify(cfg).match(/.{1,8000}/g);
      await configKv.clear();
      for (let i = 0; i < parts.length; i += 1) {
        await configKv.put(i.toString(), parts[i]);
      }
    }
  });
}
