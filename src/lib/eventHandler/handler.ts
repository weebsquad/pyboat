import { OnEvent, EventHasExecution } from './routing';
import { discordEventsMap, eventFunctions } from '../../constants/constants';
import * as utils from '../utils';



function registerHandler(name: string) {
    if (!EventHasExecution(name)) return;
    discord.on(discordEventsMap[name], async function(...args) {
        let ts = utils.composeSnowflake();
        await OnEvent(name, ts, ...args);
    });
}
export function InitializeEvents() {
  let names = Object.keys(eventFunctions);
  names.forEach(registerHandler);
}
