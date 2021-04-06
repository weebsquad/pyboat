import { config, guildId, ConfigError } from '../config';
import * as utils from '../lib/utils';

let init = false;

let code;
let eventHandlers = {};

async function fetchCode() {
    if(init) return;
    init = true;
    if(config && config.modules && config.modules.customCode && config.modules.customCode.enabled === true && typeof config.modules.customCode.url === 'string') {
        const req = await fetch(config.modules.customCode.url);
        code = await req.text();
    }
}

async function loadCodeEvents() {

}

async function handlePylonEvent(event, ...args) {
    if(!init) await fetchCode();
    if(!code) return;
}


export async function OnAnyEvent(
    event: string,
    id: string,
    guildId: string,
    ...args: any
  ) {
      console.log('customCode: OnAnyEvent: ', event, id);
      await handlePylonEvent(event, ...args);
  }