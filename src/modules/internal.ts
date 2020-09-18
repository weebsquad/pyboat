import * as utils from '../lib/utils';
import { config, guildId, globalConfig } from '../config';

class Entry {
    id: string; // the id
    ts: number;
    source: string; // guild id originated from
    target: string; // guild id target
    requestData = {};
    responseData = {};
    ack = false;
    constructor(data: any, target: string) {
      this.requestData = data;
      this.target = target;
      this.id = utils.composeSnowflake();
      this.ts = utils.decomposeSnowflake(this.id).timestamp;
      this.source = guildId;
    }
}

async function getEntries() {
  const req = new Request(`${globalConfig.memStore.url}/${guildId}`, {
    method: 'GET',
    headers: {
      Authorization: globalConfig.memStore.key,
      Host: 'Pylon',
    },
  });
  console.log('url', req.url);
  const res = await fetch(req);
  const text = await res.text();
  console.log('text', text);
  const json = await res.json();
  console.log('json', json);
  return json.data as Array<Entry>;
}

export async function OnAnyEvent(
  event: string,
  id: string,
  gid: string,
  ...args: any
) {
  // console.log('hi');
  // const resp = await getEntries();
  // console.log('resp', resp);
}
