import { config } from '../config';

export async function metalApiRequest(
  token: string,
  apiPath: string,
  protocol: string,
  body: any
) {
  protocol = protocol.toUpperCase();
  let realBody = {
    key: config.global.metalApi.key, // My api key
    protocol: protocol,
    apiUrl: apiPath,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  };
  if (typeof token === 'string' && token.length > 0)
    realBody['headers']['Authorization'] = `Bot ${token}`;
  if (
    typeof body !== 'undefined' &&
    body !== null &&
    (typeof body !== 'string' || body !== '')
  ) {
    realBody['body'] = body;
    //if (typeof body === 'string') realBody['body'] = JSON.parse(body);
  }

  let req = new Request(config.global.metalApi.url, {
    method: 'POST',
    body: JSON.stringify(realBody)
  });
  return await fetch(req);
}
