'use strict';

/* eslint-disable no-console */
/* eslint-disable no-undef */

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const WebSocket = require('ws');

const defaultMainText = '/*\n\tHi, the code running on this server\'s pylon instance is private.\n\tPublishing code on this editor will get rid of the current running code.\n\n\tIf there\'s something you need to ask regarding the current running code,\n\tplease contact metal#0666 on discord.\n\tGitHub Org: https://github.com/weebsquad\n\n*/';
const dep = process.env.DEPLOYMENTS;
const isGh = process.env.GITHUB !== undefined;
const wh = process.env.WEBHOOK_URL;
let _dep = [dep];
if (dep.includes('|')) {
  _dep = [].concat(dep.split('|'));
}
const isDebug = !isGh && _dep.length === 1;
let toPost = '';
function deserialize(value) {
  if (typeof value === 'object' && value !== null) {
    switch (value['@t']) {
      case '[[undefined]]':
        return undefined;
      case 'Function': {
        const f = function renameMe() {};
        Object.defineProperty(f, 'name', {
          value: value.data.name,
        });
        return f;
      }
      case 'BigInt':
        return BigInt(value.data.value);
      default:
        break;
    }
    if (Array.isArray(value)) {
      return value.map(deserialize);
    }
    return Object.fromEntries(Object.entries(value)
      .map(([k, v]) => {
        if (typeof k === 'string' && k.startsWith('#') && k.endsWith('@t')) {
          k = k.slice(1);
        }
        return [k, deserialize(v)];
      }));
  }
  return value;
}

function workbenchWs(url) {
  const ws = new WebSocket(url);
  ws.onopen = () => console.log('WS Open');
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    console[data[0].method]('PYLON LOG:', ...data[0].data.map(deserialize));
  };
  ws.onerror = console.error;
  ws.onclose = () => workbenchWs(url);
}

function sendWebhook(txt) {
  if (typeof (wh) !== 'string' || isDebug) {
    return;
  }
  fetch(wh, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: txt,
      username: 'Pyboat Publish',
    }),
  });
}

if (typeof (wh) === 'string' && _dep.length > 1 && isGh && !isDebug) {
  sendWebhook(`Publishing PyBoat to **${_dep.length}** guilds ...`);
}

const doneGuilds = [];
_dep.forEach((deployment_id) => {
  if (doneGuilds.includes(deployment_id)) {
    return;
  }
  doneGuilds.push(deployment_id);
  const bundle = fs.readFileSync('./dist/bundle.ts', 'utf8');
  const data = {
    method: 'POST',
    headers: {
      'Authorization': process.env.API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: {
        contents: bundle,
        // contents: '',
        project: {
          files: [{ path: '/main.ts', content: defaultMainText }],
        },
      },
    }),
  };

  // eslint-disable-next-line consistent-return
  fetch(`https://pylon.bot/api/deployments/${deployment_id}`, data).then(async (r) => {
    // if (!isGh) {
    //   console.log(r);
    // }
    try {
      const txtJson = r.json();
      return txtJson;
    } catch (e) {
      console.error(`Publish error: ${r.url} > ${r.status} - ${r.statusText}`);
      if (!isGh) {
        console.error(`Publish error: ${r}`);
        const txt = await r.text();
        console.error(txt);
      }
      process.exit(1);
    }
  })
    .then((obj) => {
      if (typeof (obj.msg) === 'string') {
        console.error(`Publish error: ${obj.msg}`);
        process.exit(1);
      } else {
        console.log(`Published to ${obj.guild.name}${isGh === false ? ` (${obj.guild.id}) ` : ' '}successfully (Revision ${obj.revision})! `);
        if (typeof (wh) === 'string' && isGh && !isDebug) {
          toPost += `✅ Published PyBoat to \`${obj.guild.name}\` (<@!${obj.bot_id}>) - rev #**${obj.revision}**\n**Guild ID**:**[**||\`${obj.guild.id}\`||**]**\n**Script ID**:**[**||\`${obj.script.id}\`||**]**\n**Deployment ID**:**[**||\`${deployment_id}\`||**]**\n\n`;
        }
        if (isDebug && !isGh) {
          // console.log(obj);
          workbenchWs(obj.workbench_url);
        }
      }
    })
    .catch((e) => {
      console.error('Deploy Error!');
      console.error(e);
      process.exit(1);
    });
  if (toPost !== '') {
    sendWebhook(toPost);
  }
});
