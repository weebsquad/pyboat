import * as utils from '../lib/utils';
import { config, globalConfig } from '../config';
import { isJSDocNonNullableType } from 'typescript';


// TODO:
// Automatically snatch and validate bearer tokens and store them in kv

const twitchApiUrl = 'https://api.twitch.tv/helix';
/*
def get_channel_statuses(self, channel_ids, login=False):
if len(channel_ids) == 0:
    return None

try:
    if not login:
        r = self.s.get(TWITCH_API_URL + '/streams/', params={'user_id': channel_ids})
    else:
        r = self.s.get(TWITCH_API_URL + '/streams/', params={'user_login': channel_ids})
    r.raise_for_status()
except:
    self.log.exception('Failed to get channel statuses: ')
    return None

result = {cid: None for cid in channel_ids}
for stream in r.json()['data']:
    result[stream['user_id']] = stream

return result
*/
function formParams(params: any) {
    const esc = encodeURIComponent;
    const query = Object.keys(params)
      .map((k) => `${esc(k)}=${esc(params[k])}`)
      .join('&');
    return query;
  }

async function baseRequest(endpoint: string, method: string, body: string | null = null, parameters: {[key: string]: string} | null = null) {
    method = method.toUpperCase();
    const baseHeaders: { [key: string]: string } = {
        'content-type': 'application/json',
        'accept': '*/*',
        'client-id': globalConfig.twitch.clientId,
        'Authorization': `Bearer ${globalConfig.twitch.token}`
      };
      const url = `${twitchApiUrl}/${endpoint}${!parameters ? '' : `?${formParams(parameters)}`}`
      const request = new Request(url, {
        method,
        headers: baseHeaders,
        body: body || undefined,
      });
      const fe = await fetch(request);
      const json = await fe.json();
      return json;
}

export async function getChannelStatuses(channelIds: Array<string>, loginName: boolean = true) {
    const params = {
    }
    if(!loginName) {
        params['user_id'] = channelIds.join(',');
    } else 
    {
        params['user_login'] = channelIds.join(',');
    }
    const ch = await baseRequest('streams', 'GET', null, params );
    return ch;
}

export async function checkStreams() {
  //
}
