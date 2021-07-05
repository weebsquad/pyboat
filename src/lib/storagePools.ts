/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as utils from './utils';
import * as constants from '../constants/constants';

export const InitializedPools: Array<StoragePool> = [];
const ASSUMED_MAX_KEYS = 256;
type PoolOptions = {
  name: string;
  itemDuration?: number; // duration for each entry
  idProperty: string; // unique id prop on the objects
  timestampProperty?: string; // timestamp prop on the objects for calcs
  maxObjects?: number; // max objects per array instead of byte calcs
  reduceAt?: number; // what key count to start reducing duration at
  local: Boolean; // whether this should be kv or local
}
export class StoragePool {
    kv: pylon.KVNamespace;
    options: PoolOptions;
    localStore?: Array<any> = [];
    constructor(opts: PoolOptions) {
    // constructor(
    // name: string,
    // itemDuration = 0,
    // uniqueIdProperty: string,
    // timestampProperty: string | undefined = undefined,
    // maxObjects: number | undefined = undefined,
    // reduceAt: number | undefined = undefined,
    // local = false) {
      this.kv = new pylon.KVNamespace(opts.name);
      this.options = opts;
      const _ex = InitializedPools.find((e) => e.options.name === this.options.name);
      if (!_ex) {
        InitializedPools.push(this);
      }
      return this;
    }
    async getItems() {
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
      throw new TypeError(`[Storage Pool]: ${this.options.name}: ${txt}`);
    }
    async exists(id: string) {
      const ex = (await this.getAll(undefined, false)).find((item) => item[this.options.idProperty] === id);
      return ex !== undefined;
    }
    async delete(id: string) {
      await this.editPool(id, null);
    }
    private getTimestamp(obj: any) {
      if (typeof this.options.timestampProperty === 'string' && typeof obj[this.options.timestampProperty] === 'number') {
        return obj[this.options.timestampProperty];
      } if (typeof this.options.timestampProperty === 'string' && typeof obj[this.options.timestampProperty] === 'string') {
        return utils.decomposeSnowflake(obj[this.options.timestampProperty]).timestamp;
      }
      if (typeof obj[this.options.idProperty] !== 'string') {
        this.err('Can\'t parse timestamps on a non-string unique identifier');
        return false;
      }
      const id = obj[this.options.idProperty];
      return utils.decomposeSnowflake(id).timestamp;
    }
    async clear() {
      await this.kv.clear();
    }
    async clean() {
      // clear blank keys
      if (this.options.local === true) {
        if (typeof this.options.itemDuration !== 'number' || this.options.itemDuration === 0) {
          return;
        }
        const diff = Date.now() - this.options.itemDuration;
        const toRemove = this.localStore.filter((e) => e === null || diff > this.getTimestamp(e)).map((e) => (e === null ? null : e[this.options.idProperty]));
        if (toRemove.length > 0) {
          this.localStore = this.localStore.filter((v) => v !== null && !toRemove.includes(v[this.options.idProperty]));
        }
      } else {
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
                utils.logError('StoragePools, error deleting empty key', e);
              }
            }
          } else if (item.value.length === 0) {
            try {
              await this.kv.delete(key, { prevValue: [] });
            } catch (e) {
              utils.logError('StoragePools, error deleting empty key', e);
            }
          }
        }));
        if (typeof this.options.itemDuration !== 'number' || this.options.itemDuration === 0) {
          return;
        }
        if (typeof this.options.reduceAt === 'number' && this.options.reduceAt > 0) {
          let diff = Date.now() - this.options.itemDuration;
          const count = items.length;
          if (count > this.options.reduceAt) {
            const leftToMax = ASSUMED_MAX_KEYS - this.options.reduceAt;
            const toInc = this.options.itemDuration / Math.max(1, leftToMax);
            const extra = Math.floor(toInc * (count - this.options.reduceAt));
            diff += extra;
          }
        }
      }
    }

    async saveToPool<T>(newObj: T, retries = 0) {
      if (newObj === null || newObj === undefined) {
        return;
      }
      if (!newObj[this.options.idProperty]) {
        newObj[this.options.idProperty] = utils.composeSnowflake();
      }
      if (this.options.local === true) {
        const ex = this.localStore.find((item) => item !== null && typeof item === 'object' && item[this.options.idProperty] === newObj[this.options.idProperty]);
        if (typeof ex !== 'undefined') {
          const _res = await this.editPool(newObj[this.options.idProperty], newObj);
          return _res;
        }
        this.localStore.push(newObj);
        return;
      }
      // check same len
      let _thisLen;
      const items = await this.getItems();
      const ex = items.map((v) => v.value).flat(1).find((item) => item !== null && typeof item === 'object' && item[this.options.idProperty] === newObj[this.options.idProperty]);
      if (typeof ex !== 'undefined') {
        const _res = await this.editPool(newObj[this.options.idProperty], newObj);
        return _res;
      }
      // @ts-ignore
      const cpuinitial = await pylon.getCpuTime();
      let saveTo: string | undefined;
      let saveLen : number;
      items.every((item: any) => {
        if (!Array.isArray(item.value)) {
          return true;
        }
        const _entries: Array<any> = item.value;
        if (typeof this.options.maxObjects === 'number' && this.options.maxObjects > 0) {
          if (_entries.length < this.options.maxObjects) {
            saveTo = item.key;
            saveLen = _entries.length;
            return false;
          }
        } else {
          if (typeof _thisLen !== 'number') {
            _thisLen = new TextEncoder().encode(JSON.stringify(newObj)).byteLength;
          }
          const len = (new TextEncoder().encode(JSON.stringify(_entries)).byteLength) + _thisLen;
          if (len < constants.MAX_KV_SIZE) {
            saveTo = item.key;
            saveLen = _entries.length;
            return false;
          }
        }
        return true;
      });
      if (!saveTo) {
        saveTo = utils.composeSnowflake();
        saveLen = 0;
      }

      try {
        const { result } = await this.kv.transactWithResult<any, boolean>(saveTo, (prev: T[]) => {
          let newArr: Array<T>;
          if (!prev) {
            newArr = [];
          } else {
            newArr = [...prev];
          }
          if (newArr.length !== saveLen) {
            return { result: false, next: newArr.length > 0 ? newArr : undefined };
          }
          newArr.push(newObj);
          return { next: newArr, result: true };
        });
        if (!result) {
          if (retries > 3) {
            return false;
          }
          const newres = await this.saveToPool(newObj, retries + 1);
          return newres;
        }
        // @ts-ignore
        const cputnow = Math.floor(await pylon.getCpuTime() - cpuinitial);
        if (cputnow >= 5) {
          console.warn(`Saved item to [${this.options.name}] : Took ${cputnow}ms`);
        }
        return true;
      } catch (e) {
        utils.logError('[StoragePools] Transact:', e);
        if (retries > 3) {
          return false;
        }
        const newres = await this.saveToPool(newObj, retries + 1);
        return newres;
      }
    }
    async editTransact<T>(id: string, callback: (val: T) => T | null | undefined) {
      if (this.options.local === true) {
        const _f = this.localStore.findIndex((v) => v !== null && typeof v === 'object' && v[this.options.idProperty] === id);
        if (_f !== -1) {
          const vl = callback({ ...this.localStore[_f] });
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
      const res = items.find((item: any) => item.value.find((e: any) => e !== null && typeof e === 'object' && e[this.options.idProperty] === id) !== undefined);
      if (res) {
        try {
          await this.kv.transact(res.key, (prev: any) => {
            const newData = [...prev];
            const _ind = newData.findIndex((e: any) => e !== null && typeof e === 'object' && e[this.options.idProperty] === id);
            if (_ind !== -1) {
              let newDataVal = callback({ ...newData[_ind] });
              if (newDataVal === null) {
                newDataVal = undefined;
              }
              newData[_ind] = newDataVal;
            }
            return newData;
          });
          return true;
        } catch (e) {
          console.error('pools.editTransact error', e);
        }

        return false;
      }
      console.warn('pools.editTransact couldnt find matching key in a pool');
      return false;
    }
    async editTransactWithResult<T>(id: string, callback: (val: T) => { next: T | undefined | null; result: boolean }) {
      if (this.options.local === true) {
        const _f = this.localStore.findIndex((v) => v !== null && typeof v === 'object' && v[this.options.idProperty] === id);
        if (_f !== -1) {
          const { next: vl, result } = callback({ ...this.localStore[_f] });
          if (vl === null || typeof vl === 'undefined') {
            delete this.localStore[_f];
          } else if (result === true) {
            this.localStore[_f] = vl;
            return true;
          }
        }
        return false;
      }
      const items = await this.getItems();
      const res = items.find((item: any) => item.value.find((e: T) => e !== null && typeof e === 'object' && e[this.options.idProperty] === id) !== undefined);
      if (res) {
        try {
          const { result } = await this.kv.transactWithResult(res.key, (prev: any) => {
            const newData = [...prev];
            const _ind = newData.findIndex((e: T) => e !== null && typeof e === 'object' && e[this.options.idProperty] === id);
            let rest = false;
            if (_ind !== -1) {
              let { next: newDataVal, result: resultT } = callback({ ...newData[_ind] });
              if (newDataVal === null) {
                newDataVal = undefined;
              }
              if (resultT === true) {
                rest = true;
                newData[_ind] = newDataVal;
              }
            }
            return { result: rest, next: newData };
          });
          return result;
        } catch (e) {
        }
        return false;
      }
      return false;
    }
    async editPool(id: string, newObj: any) {
      if (this.options.local === true) {
        const _f = this.localStore.findIndex((v) => v !== null && typeof v === 'object' && v[this.options.idProperty] === id);
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
      const res = items.find((item: any) => item.value.find((e: any) => e !== null && typeof e === 'object' && e[this.options.idProperty] === id) !== undefined);
      if (res) {
        for (let i = 0; i < 2; i += 1) {
          try {
            await this.kv.transact(res.key, (prev: any) => {
              const newData = [...prev];
              const _ind = newData.findIndex((e: any) => e !== null && typeof e === 'object' && e[this.options.idProperty] === id);
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
      if (this.options.local === true) {
        this.localStore = this.localStore.map((v) => {
          if (v === null) {
            return v;
          }
          if (!ids.includes(v[this.options.idProperty])) {
            return v;
          }
          return callback(v);
        }).filter((v) => v !== null && typeof v === 'object' && typeof v !== 'undefined');
        return false;
      }
      const items = await this.getItems();
      const transactPools = items.filter((item: any) => {
        if (Array.isArray(item.value)) {
          const _val: Array<T> = item.value;
          const hasAny = _val.find((entry) => entry !== null && typeof entry === 'object' && ids.includes(entry[this.options.idProperty]));
          if (!hasAny) {
            return false;
          }
          return true;
        }
        return false;
      });
      if (transactPools.length > 0) {
        // @ts-ignore
        await this.kv.transactMulti<Array<T>>(transactPools.map((v) => v.key), (prev) => {
          let prevt: T[][] = prev.filter(() => true);
          prevt = prevt.map((val) => {
            val = val.filter((v) => v !== null && typeof v !== 'undefined' && typeof v === 'object').map((v) => (!ids.includes(v[this.options.idProperty]) ? v : callback(v))).filter((v) => v !== null && typeof v !== 'undefined' && typeof v === 'object');
            return val;
          });
          return prevt;
        });
        return true;
      }
      return false;
    }
    async editTransactMultiWithResult<T>(ids: Array<string>, modifier: (val: T) => { next: T | undefined | null; result: boolean } | null | undefined): Promise<Map<string, boolean>> {
      const retVal = new Map<string, boolean>();
      ids.forEach((v) => retVal.set(v, false));
      if (this.options.local === true) {
        this.localStore = this.localStore.map((v) => {
          if (v === null) {
            return v;
          }
          if (!ids.includes(v[this.options.idProperty])) {
            return v;
          }

          const replacer: { next: T | undefined; result: boolean } = modifier({ ...v });
          if (replacer.result === true) {
            retVal.set(v[this.options.idProperty], true);
          }
          return replacer.next;
        }).filter((v) => v !== null && typeof v === 'object' && typeof v !== 'undefined');
        return retVal;
      }
      const items = await this.getItems();
      const transactPools = items.filter((item: any) => {
        if (Array.isArray(item.value)) {
          const _val: Array<T> = item.value;
          const hasAny = _val.find((entry) => entry !== null && typeof entry === 'object' && ids.includes(entry[this.options.idProperty]));
          if (!hasAny) {
            return false;
          }
          return true;
        }
        return false;
      });
      if (transactPools.length > 0) {
        // @ts-ignore
        await this.kv.transactMulti<Array<T>>(transactPools.map((v) => v.key), (prev) => {
          let prevt: T[][] = prev.filter(() => true);
          prevt = prevt.map((val) => {
            val = val.filter((v) => v !== null && typeof v !== 'undefined' && typeof v === 'object').map((v) => {
              if (!ids.includes(v[this.options.idProperty])) {
                return v;
              }
              const replacer: { next: T | undefined; result: boolean } = modifier({ ...v });
              if (replacer.result === true) {
                retVal.set(v[this.options.idProperty], true);
              }
              return replacer.next;
            }).filter((v) => v !== null && typeof v !== 'undefined' && typeof v === 'object');

            return val;
          });
          return prevt;
        });
      }
      return retVal;
    }
    /**
     *
     * @param it Array of the items, for using this to sort
     * @param sort Wether to sort or not
     */
    async getAll<T>(it: Array<any> = undefined, sort = true): Promise<Array<T>> {
      const now = Date.now();
      let items: Array<any> = [];
      if (this.options.local === true) {
        items = this.localStore;
      } else {
        if(!Array.isArray(it)) {
          items = await this.getItems();
        } else {
          items = it;
        }
      }
      if (items.length === 0) {
        
        return [] as Array<T>;
      }
      if (!Array.isArray(it) && !this.options.local) {
        items = items.map((v) => v.value).flat(1);
      }
      items = items.filter((item) => typeof item === 'object' && item !== null && typeof item !== 'undefined');
      if (typeof this.options.timestampProperty === 'string' || typeof this.options.idProperty === 'string') {
        if(this.options.itemDuration && this.options.itemDuration>0) {
          const diff = now - this.options.itemDuration;
        items = items.filter((item) => {
          const ts = this.getTimestamp(item);
          return typeof ts === 'number' && ts >= diff;
        });
      }
        if (sort === true) {
          items = items.sort((a, b) => this.getTimestamp(b) - this.getTimestamp(a));
        }
      }
      const _new: any = items;
      return _new as Array<T>;
    }
    async getById<T>(id: string): Promise<T | undefined> {
      const _f: any = (await this.getAll(undefined, false)).find((e) => e !== null && typeof e === 'object' && e[this.options.idProperty] === id);
      if (typeof _f === 'undefined') {
        return;
      }
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
