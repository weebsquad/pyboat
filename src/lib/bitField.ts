import * as utils from './utils';
import * as constants from '../constants/constants';

export class BitField {
  FLAGS: any = {};
  bitfield: bigint;
  constructor(bits: string | number | BigInt) {
    if (typeof bits === 'string' && utils.isNumber(bits)) {
      bits = BigInt(bits);
    }
    if (typeof bits === 'string') {
      return;
    }
    this.bitfield = BigInt(this.resolve(bits));
  }

  any(bit: any) {
    return (this.bitfield & this.resolve(bit)) !== BigInt('0');
  }

  equals(bit: any) {
    return this.bitfield === this.resolve(bit);
  }

  has(bit: any) {
    if (Array.isArray(bit)) {
      return bit.every((p) => this.has(p));
    }
    bit = this.resolve(bit);

    if (typeof this.bitfield === 'bigint' && typeof bit !== 'bigint') {
      bit = BigInt(bit);
    }
    return (this.bitfield & bit) === bit;
  }

  missing(bits: any) {
    if (!Array.isArray(bits)) {
      bits = this.constructor(bits).toArray(false);
    }
    return bits.filter((p: any) => !this.has(p));
  }

  freeze() {
    return Object.freeze(this);
  }
  add(...bits: any[]) {
    let total = BigInt('0');
    for (const bit of bits) {
      total |= this.resolve(bit);
    }
    if (typeof this.bitfield === 'bigint') {
      total = BigInt(total);
    }
    if (Object.isFrozen(this)) {
      return this.constructor(this.bitfield | total);
    }
    this.bitfield |= total;
    return this;
  }

  remove(...bits: any[]) {
    let total = BigInt('0');
    for (const bit of bits) {
      total |= this.resolve(bit);
    }
    if (Object.isFrozen(this)) {
      return this.constructor(this.bitfield & ~total);
    }
    this.bitfield &= ~total;
    return this;
  }

  serialize() {
    const serialized = <any>{};
    for (const [flag, bit] of Object.entries(this.FLAGS)) {
      serialized[flag] = this.has(bit);
    }
    return serialized;
  }

  toArray() {
    return Object.keys(this.FLAGS).filter((bit) => this.has(bit));
  }

  toJSON() {
    return this.bitfield;
  }

  valueOf() {
    return this.bitfield;
  }

  * [Symbol.iterator]() {
    yield* this.toArray();
  }

  resolve(bit: number | BigInt | BitField = 0) {
    if (typeof bit === 'number' && bit >= 0) {
      if (typeof this.bitfield === 'bigint') {
        bit = BigInt(bit);
      }
      return bit;
    }
    if (bit instanceof BitField) {
      return bit.bitfield;
    }
    if (typeof bit === 'bigint') {
      return bit;
    }
    if (Array.isArray(bit)) {
      return bit.map((p) => this.resolve(p)).reduce((prev, p) => prev | p, 0);
    }
    if (typeof bit === 'string' && typeof this.FLAGS[bit] !== 'undefined') {
      let ret: number | BigInt = this.FLAGS[bit];
      if (typeof ret === 'number') {
        ret = BigInt(ret);
      }
      return ret;
    }
    throw new Error('BITFIELD_INVALID');
  }
}

export class Permissions extends BitField {
  FLAGS: any = constants.PermissionFlags;
  ALL: any = Object.values(this.FLAGS).reduce((all: any, p: any) => {
    if (typeof p === 'bigint') {
      all = BigInt(all);
    }
    return all | p;
  }, 0);
  DEFAULT = 104324673;
  any(permission: any, checkAdmin = true) {
    return (
      (checkAdmin && super.has(this.FLAGS.ADMINISTRATOR))
      || super.any(permission)
    );
  }

  has(permission: any, checkAdmin = true) {
    return (
      (checkAdmin && super.has(this.FLAGS.ADMINISTRATOR))
      || super.has(permission)
    );
  }

  serialize(checkAdmin = true) {
    const serialized = <any>{};
    for (const [flag, bit] of Object.entries(this.FLAGS)) {
      serialized[flag] = this.has(bit, checkAdmin);
    }
    return serialized;
  }
}

export class UserFlags extends BitField {
  FLAGS: any = constants.UserFlags;
  ALL: any = Object.values(this.FLAGS).reduce((all: any, p: any) => {
    if (typeof p === 'bigint') {
      all = BigInt(all);
    }
    return all | p;
  }, 0);
  DEFAULT = 0;
  any(permission: any) {
    return super.any(permission);
  }

  has(permission: any) {
    return super.has(permission);
  }
}
