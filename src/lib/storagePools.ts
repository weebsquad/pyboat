/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as utils from './utils';
import * as constants from '../constants/constants';

export const InitializedPools: Array<StoragePool> = [];
const ASSUMED_MAX_KEYS = 256;
export class StoragePool {
    kvName: string;
    kv: pylon.KVNamespace;
    local: Boolean; // whether this should be kv or local
    localStore: Array<any> = [];
    duration: number; // duration for each entry
    uniqueId: string; // unique id prop on the objects
    timestampProperty: string | undefined = undefined; // timestamp prop on the objects for calcs
    maxObjects: number | undefined = undefined; // max objects per array instead of byte calcs
    reduceAt: number | undefined = undefined; // what key count to start reducing duration at
    constructor(name: string, itemDuration = 0, uniqueIdProperty: string, timestampProperty: string | undefined = undefined, maxObjects: number | undefined = undefined, reduceAt: number | undefined = undefined, local = false) {
      this.kvName = name;
      this.kv = new pylon.KVNamespace(name);
      this.duration = itemDuration;
      this.uniqueId = uniqueIdProperty;
      this.timestampProperty = timestampProperty;
      this.maxObjects = maxObjects;
      this.reduceAt = reduceAt;
      const _ex = InitializedPools.find((e) => e.kvName === this.kvName);
      if (!_ex) {
        InitializedPools.push(this);
      }
      this.local = local;
      return this;
    }
    private async getItems() {
      const list = await this.kv.list();
      let items: pylon.KVNamespace.Item[];
      if (list.length > 100) {
        items = [];
        const runs = Math.floor(list.length / 100);
        for (let i = 0; i < runs; i += 1) {
          if (i !== 0) {
            const these = await this.kv.items({ from: items.slice(-1)[0].key });
            items.concat(...these);
          } else {
            items = await this.kv.items();
          }
        }
      } else {
        items = await this.kv.items();
      }
      return items;
    }
    private async err(txt: string) {
      throw new TypeError(`[Storage Pool]: ${this.kvName}: ${txt}`);
    }
    async exists(id: string) {
      const ex = (await this.getAll(undefined, false)).find((item) => item[this.uniqueId] === id);
      return ex !== undefined;
    }
    async delete(id: string) {
      await this.editPool(id, null);
    }
    private getTimestamp(obj: any) {
      if (typeof this.timestampProperty === 'string' && typeof obj[this.timestampProperty] === 'number') {
        return obj[this.timestampProperty];
      } if (typeof this.timestampProperty === 'string' && typeof obj[this.timestampProperty] === 'string') {
        return utils.decomposeSnowflake(obj[this.timestampProperty]).timestamp;
      }
      if (typeof obj[this.uniqueId] !== 'string') {
        this.err('Can\'t parse timestamps on a non-string unique identifier');
        return false;
      }
      const id = obj[this.uniqueId];
      return utils.decomposeSnowflake(id).timestamp;
    }
    async clear() {
      await this.kv.clear();
    }
    async clean() {
      if (typeof this.duration !== 'number' || this.duration === 0) {
        if (this.local === true) {
          return;
        }
        const items = await this.getItems();
        await Promise.all(items.map(async (item: any) => {
          const vl: Array<any> = item.value;
          const { key } = item;
          const toRemove = vl.find((e) => e === null || typeof e === 'undefined');
          if (toRemove !== undefined) {
            let vlCheckEmpty: undefined | Array<any>;
            await this.kv.transact(key, (prev: any) => {
              const newDt = prev.filter((e: any) => e !== null);
              vlCheckEmpty = newDt;
              return newDt;
            });
            if (Array.isArray(vlCheckEmpty) && vlCheckEmpty.length === 0) {
              try {
                await this.kv.delete(key, { prevValue: [] });
              } catch (e) {
              }
            }
          } else if (item.value.length === 0) {
            try {
              await this.kv.delete(key, { prevValue: [] });
            } catch (e) {
            }
          }
        }));
        return;
      }
      let diff = Date.now() - this.duration;
      if (this.local === true) {
        const toRemove = this.localStore.filter((e) => e === null || diff > this.getTimestamp(e)).map((e) => (e === null ? null : e[this.uniqueId]));
        if (toRemove.length > 0) {
          this.localStore = this.localStore.filter((v) => v !== null && !toRemove.includes(v[this.uniqueId]));
        }
        return;
      }
      const items = await this.getItems();
      if (typeof this.reduceAt === 'number' && this.reduceAt > 0) {
        const count = items.length;
        if (count > this.reduceAt) {
          const leftToMax = ASSUMED_MAX_KEYS - this.reduceAt;
          const toInc = this.duration / Math.max(1, leftToMax);
          const extra = Math.floor(toInc * (count - this.reduceAt));
          diff += extra;
        }
      }
      await Promise.all(items.map(async (item: any) => {
        const vl: Array<any> = item.value;
        const { key } = item;
        const toRemove = vl.filter((e) => e === null || diff > this.getTimestamp(e)).map((e) => (e === null ? null : e[this.uniqueId]));
        if (toRemove.length > 0) {
          let vlCheckEmpty: undefined | Array<any>;
          await this.kv.transact(key, (prev: any) => {
            const newDt = prev.filter((e: any) => e !== null && !toRemove.includes(e[this.uniqueId]));
            vlCheckEmpty = newDt;
            return newDt;
          });
          if (Array.isArray(vlCheckEmpty) && vlCheckEmpty.length === 0) {
            try {
              await this.kv.delete(key, { prevValue: [] });
            } catch (e) {
            }
          }
        } else if (item.value.length === 0) {
          try {
            await this.kv.delete(key, { prevValue: [] });
          } catch (e) {
          }
        }
      }));
    }

    async saveToPool(newObj: any) {
      if (newObj === null || newObj === undefined) {
        return;
      }
      if (this.local === true) {
        const ex = this.localStore.find((item) => item !== null && typeof item === 'object' && item[this.uniqueId] === newObj[this.uniqueId]);
        if (typeof ex !== 'undefined') {
          const _res = await this.editPool(newObj[this.uniqueId], newObj);
          return _res;
        }
        this.localStore.push(newObj);
        return;
      }
      // check same len
      let _thisLen;
      const items = await this.getItems();
      const ex = items.map((v) => v.value).flat(1).find((item) => item !== null && typeof item === 'object' && item[this.uniqueId] === newObj[this.uniqueId]);
      if (typeof ex !== 'undefined') {
        const _res = await this.editPool(newObj[this.uniqueId], newObj);
        return _res;
      }
      let saveTo;
      let lenOg;
      const res = items.every((item: any) => {
        if (!Array.isArray(item.value)) {
          return true;
        }
        const _entries: Array<any> = item.value;
        if (typeof this.maxObjects === 'number' && this.maxObjects > 0) {
          if (_entries.length < this.maxObjects) {
            saveTo = item.key;
            lenOg = item.value.length;
            return false;
          }
        } else {
          if (typeof _thisLen !== 'number') {
            _thisLen = new TextEncoder().encode(JSON.stringify(newObj)).byteLength;
          }
          const len = (new TextEncoder().encode(JSON.stringify(_entries)).byteLength) + _thisLen;
          if (len < constants.MAX_KV_SIZE) {
            saveTo = item.key;
            lenOg = item.value.length;
            return false;
          }
        }
        return true;
      });
      if (res === true) {
        await this.kv.put(utils.composeSnowflake(), [newObj]);
        return true;
      }
      if (res === false && typeof saveTo === 'string') {
        let failed = false;

        try {
          await this.kv.transact(saveTo, (prev: any) => {
            if (prev.length !== lenOg) {
              failed = true;
              return prev;
            }
            return prev.concat(newObj);
          });
          if (!failed) {
            return true;
          }
          const newres = await this.saveToPool(newObj);
          return newres;
        } catch (e) {
          const newres = await this.saveToPool(newObj);
          return newres;
        }
      }

      return false;
    }
    async editTransact<T>(id: string, callback: (val: T) => T | null | undefined) {
      if (this.local === true) {
        const _f = this.localStore.findIndex((v) => v !== null && typeof v === 'object' && v[this.uniqueId] === id);
        if (_f !== -1) {
          const vl = callback(this.localStore[_f]);
          if (vl === null || typeof vl === 'undefined') {
            delete this.localStore[_f];
          } else {
            this.localStore[_f] = vl;
          }
          return true;
        }
        return false;
      }
      const items = await this.getItems();
      const res = items.find((item: any) => item.value.find((e: any) => e !== null && typeof e === 'object' && e[this.uniqueId] === id) !== undefined);
      if (res) {
        try {
          await this.kv.transact(res.key, (prev: any) => {
            const newData = JSON.parse(JSON.stringify(prev));
            const _ind = newData.findIndex((e: any) => e !== null && typeof e === 'object' && e[this.uniqueId] === id);
            if (_ind !== -1) {
              let newDataVal = callback(newData[_ind]);
              if (newDataVal === null) {
                newDataVal = undefined;
              }
              newData[_ind] = newDataVal;
            }
            return newData;
          });
          return true;
        } catch (e) {
        }

        return false;
      }

      return false;
    }
    async editPool(id: string, newObj: any) {
      if (this.local === true) {
        const _f = this.localStore.findIndex((v) => v !== null && typeof v === 'object' && v[this.uniqueId] === id);
        if (_f !== -1) {
          if (newObj === null || typeof newObj === 'undefined') {
            delete this.localStore[_f];
          } else {
            this.localStore[_f] = newObj;
          }
          return true;
        }
        return false;
      }
      const items = await this.getItems();
      const res = items.find((item: any) => item.value.find((e: any) => e !== null && typeof e === 'object' && e[this.uniqueId] === id) !== undefined);
      if (res) {
        for (let i = 0; i < 2; i += 1) {
          try {
            await this.kv.transact(res.key, (prev: any) => {
              const newData = JSON.parse(JSON.stringify(prev));
              const _ind = newData.findIndex((e: any) => e !== null && typeof e === 'object' && e[this.uniqueId] === id);
              if (_ind !== -1) {
                if (typeof newObj === 'object' && newObj !== null) {
                  newData[_ind] = newObj;
                } else {
                  delete newData[_ind];
                }
              }
              return newData;
            });
            return true;
          } catch (e) {
          }
        }
        return false;
      }

      return false;
    }
    async editPools<T>(ids: Array<string>, callback: (val: T) => T | null | undefined) {
      if (this.local === true) {
        this.localStore = this.localStore.map((v) => {
          if (v === null) {
            return v;
          }
          if (!ids.includes(v[this.uniqueId])) {
            return v;
          }
          return callback(v);
        }).filter((v) => v !== null && typeof v === 'object' && typeof v !== 'undefined');
        return false;
      }
      const items = await this.getItems();
      const transactPools = items.filter((item: any) => {
        if (Array.isArray(item.value)) {
          const _val: Array<any> = item.value;
          const hasAny = _val.find((entry) => entry !== null && typeof entry === 'object' && ids.includes(entry[this.uniqueId]));
          if (!hasAny) {
            return false;
          }
          return true;
        }
        return false;
      });
      if (transactPools.length > 0) {
        // @ts-ignore
        await this.kv.transactMulti(transactPools.map((v) => v.key), (prev) => {
          const prevt: T[][] = <any[]>prev.filter(() => true);
          prevt.map((val) => {
            val = val.filter((v) => v !== null && typeof v !== 'undefined' && typeof v === 'object').map((v) => (!ids.includes(v[this.uniqueId]) ? v : callback(v))).filter((v) => v !== null && typeof v !== 'undefined' && typeof v === 'object');
            return val;
          });
        });
        /*
        await Promise.all(transactPools.map(async (item) => {
          await this.kv.transact(item.key, (prev: any) => {
            let dt: Array<any> = JSON.parse(JSON.stringify(prev));
            dt = dt.filter((val) => val !== null && typeof val === 'object' && typeof val !== 'undefined').map((val) => (!ids.includes(val[this.uniqueId]) ? val : callback(val))).filter((val) => val !== null && typeof val === 'object' && typeof val !== 'undefined');
            return dt;
          });
        }));
        */
        return true;
      }
      return false;
    }
    async getAll<T>(it: any = undefined, sort = true): Promise<Array<T>> {
      const diff = Date.now() - this.duration;
      let items: Array<any>;
      if (this.local === true) {
        items = this.localStore;
      } else {
        items = (Array.isArray(it) ? it : await this.getItems());
      }
      if (items.length === 0) {
        return [] as Array<T>;
      }
      if (!Array.isArray(it) && !this.local) {
        items = items.map((v) => v.value).flat(1);
      }
      items = items.filter((item) => typeof item === 'object' && item !== null && typeof item !== 'undefined');
      if (typeof this.timestampProperty === 'string' || typeof this.uniqueId === 'string') {
        items = items.filter((item) => {
          const ts = this.getTimestamp(item);
          return this.duration === 0 || (typeof ts === 'number' && ts >= diff);
        });
        if (sort === true) {
          items = items.sort((a, b) => this.getTimestamp(b) - this.getTimestamp(a));
        }
      }

      const _new: any = items;
      return _new as Array<T>;
    }
    async getById<T>(id: string): Promise<T | undefined> {
      const _f: any = (await this.getAll(undefined, false)).find((e) => e !== null && typeof e === 'object' && e[this.uniqueId] === id);
      return _f as T;
    }
    async getByQuery<T>(query: any, OR = false): Promise<Array<T>> {
      const toRet = (await this.getAll()).filter((item) => {
        for (const key in query) {
          if (typeof query[key] === 'undefined') {
            continue;
          }
          if (OR === true && query[key] === item[key]) {
            return true;
          }
          if (query[key] !== item[key]) {
            return false;
          }
        }
        return true;
      });
      return toRet as Array<T>;
    }
}
