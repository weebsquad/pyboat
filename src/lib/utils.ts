/* eslint-disable */
import { config } from '../config';
import * as constants from '../constants/constants';

export * from './metalApi';
export * from './discordHelpers';
export * from './bitField';
export * from './permissions';
export * from './gTranslate';

export function isNormalInteger(str, checkPositive = false) {
  const n = Math.floor(Number(str));
  return n !== Infinity && String(n) === str && (n >= 0 || !checkPositive);
}
function stdTimezoneOffset(dt: Date) {
    var jan = new Date(dt.getFullYear(), 0, 1);
    var jul = new Date(dt.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

function isDateDst(dt: Date) {
    return dt.getTimezoneOffset() === stdTimezoneOffset(dt);
}
export function changeTimezone(date, ianatz) {
    // suppose the date is 12:00 UTC
    var invdate = new Date(date.toLocaleString('en-US', {
      timeZone: ianatz
    }));
    let diff = date.getTime() - invdate.getTime();
    const _extra = Math.floor(diff/(1000*60*60))*(1000*60*60); // wipe miliseconds diff lmao
    const newd = new Date(date.getTime() + _extra);
    //console.log(`Extra: ${_extra}\nDiff: ${diff}\nHours: ${newd.getHours()}\nNew Date: ${newd}`);
    return newd;
  }
  
const timeMap = new Map([
    ['decade', 1000 * 60 * 60 * 24 * 365 * 10],
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 31],
    ['week', 1000 * 60 * 60 * 24 * 7],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
    ['second', 1000],
    ['milisecond', 1],
  ]);
  export function getLongAgoFormat(ts: number, limiter: number) {
    ts = new Date(new Date().getTime() - ts).getTime();
    let runcheck = ts + 0;
    const txt = new Map();
    for (const [k, v] of timeMap) {
      if (runcheck < v || txt.entries.length >= limiter) {
        continue;
      }
      const runs = Math.ceil(runcheck / v) + 1;
      for (let i = 0; i <= runs; i += 1) {
        if (runcheck < v) {
          break;
        }
        if (txt.has(k)) {
          txt.set(k, txt.get(k) + 1);
        } else {
          txt.set(k, 1);
        }
        runcheck -= v;
      }
    }
    const txtret = [];
    let runsc = 0;
    for (const [key, value] of txt) {
      if (runsc >= limiter) {
        break;
      }
      const cc = value > 1 ? `${key}s` : key;
      txtret.push(`${value} ${cc}`);
      runsc += 1;
    }
    return txtret.join(', ');
  }
export function isNumber(n: string) {
  return /^-?[\d.]+(?:e-?\d+)?$/.test(n);
}
const blacklist = ['`', '\t', '@everyone', '@here'];
export function escapeString(string) {
  blacklist.forEach((vl) => {
    string = string.split(vl).join('');
  });
  return string;
}

export function chunkify(a: Array<any>, n: number, balanced: boolean = false) {
  if (n < 2) {
    return [a];
  }

  const len = a.length;
  const out = [];
  let i = 0;
  let size;

  if (len % n === 0) {
    size = Math.floor(len / n);
    while (i < len) {
      out.push(a.slice(i, (i += size)));
    }
  } else if (balanced) {
    while (i < len) {
      size = Math.ceil((len - i) / n--);
      out.push(a.slice(i, (i += size)));
    }
  } else {
    n--;
    size = Math.floor(len / n);
    if (len % size === 0) {
      size--;
    }
    while (i < size * n) {
      out.push(a.slice(i, (i += size)));
    }
    out.push(a.slice(size * n));
  }

  return out;
}

export async function getPresentableRequestData(resp: globalThis.Response) {
  let jsn;
  try {
    jsn = await resp.json();
  } catch (e) {}
  const newData: {[key: string]: any} = {};
  if (typeof jsn !== 'undefined') {
    newData.jsonResponse = jsn;
  }
  for (const key in resp) {
    if (
      key === 'headers'
      || key === 'redirected'
      || key === 'url'
      || key === 'bodySource'
      || key === 'type'
    ) {
      continue;
    }
    newData[key] = resp[key];
  }
  return newData;
}
export function strToObj(str, val) {
  let i;
  const obj = {};
  const strarr = str.split('.');
  let x = obj;
  for (i = 0; i < strarr.length - 1; i += 1) {
    x = x[strarr[i]] = {};
  }
  x[strarr[i]] = val;
  return obj;
}

export function pad(v, n, c = '0') {
  return String(v).length >= n
    ? String(v)
    : (String(c).repeat(n) + v).slice(-n);
}

export function text2Binary(string) {
  return string
    .split('')
    .map((char) => char.charCodeAt(0).toString(2))
    .join(' ');
}

export function swapKV(json): any {
  const ret: any = {};
  for (const key in json) {
    ret[json[key]] = key;
  }
  return ret;
}

export function getCommandDetails(content) {}

export function mathEval(exp) {
  const reg = /(?:[a-z$_][a-z0-9$_]*)|(?:[;={}\[\]"'!&<>^\\?:])/gi;
  let valid = true;

  // Detect valid JS identifier names and replace them
  exp = exp.replace(reg, ($0) => {
    // If the name is a direct member of Math, allow
    if (Math.hasOwnProperty($0)) {
      return `Math.${$0}`;
    }
    // Otherwise the expression is invalid
    valid = false;
  });

  // Don't eval if our replace function flagged as invalid
  if (!valid) {
    return false;
  }
  try {
    const res = eval(exp);
    return res;
  } catch (e) {
    return false;
  }
}

export function VBColorToHEX(i: number) {
  const bbggrr = (`000000${i.toString(16)}`).slice(-6);
  const rrggbb = bbggrr.substr(0, 2) + bbggrr.substr(2, 2) + bbggrr.substr(4, 2);
  return `#${rrggbb}`;
}

export function deepCompare(...args: any) {
  let i; let l; let leftChain; let
    rightChain;

  function compare2Objects(x, y) {
    let p;

    // remember that NaN === NaN returns false
    // and isNaN(undefined) returns true
    if (
      isNaN(x)
      && isNaN(y)
      && typeof x === 'number'
      && typeof y === 'number'
    ) {
      return true;
    }

    // Compare primitives and functions.
    // Check if both arguments link to the same object.
    // Especially useful on the step where we compare prototypes
    if (x === y) {
      return true;
    }

    // Works in case when functions are created in constructor.
    // Comparing dates is a common scenario. Another built-ins?
    // We can even handle functions passed across iframes
    if (
      (typeof x === 'function' && typeof y === 'function')
      || (x instanceof Date && y instanceof Date)
      || (x instanceof RegExp && y instanceof RegExp)
      || (x instanceof String && y instanceof String)
      || (x instanceof Number && y instanceof Number)
    ) {
      return x.toString() === y.toString();
    }

    // At last checking prototypes as good as we can
    if (!(x instanceof Object && y instanceof Object)) {
      return false;
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
      return false;
    }

    if (x.constructor !== y.constructor) {
      return false;
    }

    if (x.prototype !== y.prototype) {
      return false;
    }

    // Check for infinitive linking loops
    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
      return false;
    }

    // Quick checking of one object being a subset of another.
    // todo: cache the structure of arguments[0] for performance
    for (p in y) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        return false;
      } if (typeof y[p] !== typeof x[p]) {
        return false;
      }
    }

    for (p in x) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        return false;
      } if (typeof y[p] !== typeof x[p]) {
        return false;
      }

      switch (typeof x[p]) {
        case 'object':
        case 'function':
          leftChain.push(x);
          rightChain.push(y);

          if (!compare2Objects(x[p], y[p])) {
            return false;
          }

          leftChain.pop();
          rightChain.pop();
          break;

        default:
          if (x[p] !== y[p]) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  if (args.length < 1) {
    return true; // Die silently? Don't know how to handle such case, please help...
    // throw "Need two or more arguments to compare";
  }

  for (i = 1, l = args.length; i < l; i += 1) {
    leftChain = []; // Todo: this can be cached
    rightChain = [];

    if (!compare2Objects(args[0], args[i])) {
      return false;
    }
  }

  return true;
}

export function containsOnlyEmojis(text: string) {
  const onlyEmojis = text.replace(new RegExp('[\u0000-\u1eeff]', 'g'), '');
  const customEmojis = text.replace(new RegExp(constants.EmojiRegex, 'g'), '');
  const visibleChars = text.replace(new RegExp('[\n\rs]+|( )+', 'g'), '');
  return (
    onlyEmojis.length === visibleChars.length
    && customEmojis.length === visibleChars.length
  );
}
