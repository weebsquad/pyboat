/* eslint-disable no-plusplus */

/* eslint-disable no-console */
/* eslint-disable no-undef */

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const WebSocket = require('ws');
const { sleep } = require('sleep');
const Permissions = require('./permissions');

const defaultMainText = '/*\n\tHi, the code running on this server\'s pylon instance is private.\n\tPublishing code on this editor will get rid of the current running code.\n\n\tIf there\'s something you need to ask regarding the current running code,\n\tplease contact metal#0666 on discord.\n\tGitHub Org: https://github.com/weebsquad\n\n*/';
const lengthShorten = 5;
const isGh = process.env.GITHUB !== undefined;
const wh = process.env.WEBHOOK_URL;
const pylonApiBase = 'https://pylon.bot/api/';
const pylonToken = process.env.API_TOKEN;
const target = process.env.TARGET;

const isDebug = typeof process.env.TEST_GUILD === 'string';
const toPost = [];

async function getPyBoatGlobalConf() {
  const res = await fetch('https://pyboat.i0.tf/globalconf.json');
  const json = await res.json();
  return json;
}

async function getActivePylonGuilds() {
  const res = await fetch(`${pylonApiBase}user/guilds`, {
    method: 'GET',
    headers: {
      'authorization': pylonToken,
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36', // lol
    } });
  const json = await res.json();
  return json;
}

async function getNonActivePylonGuilds() {
  const active = await getActivePylonGuilds();
  sleep(1);
  const res = await fetch(`${pylonApiBase}user/guilds/available`, {
    method: 'GET',
    headers: {
      'authorization': pylonToken,
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36', // lol
    } });
  const txt = await res.text();
  if (txt === 'unauthorized') {
    throw new Error('Pylon Token Unauthorized');
  }
  //  console.log(res.status, res.statusText);
  // console.log('available raw: ', [txt]);
  const json = JSON.parse(txt);
  const nonActive = json.filter((val) => active.find((v) => v.id === val.id) === undefined && new Permissions(val.permissions).has('MANAGE_GUILD'));
  return nonActive;
}

const deploymentCache = {};
async function getDeployment(gid) {
  if (typeof deploymentCache[gid] === 'object' && deploymentCache[gid] !== null) {
    return deploymentCache[gid];
  }
  const res = await fetch(`${pylonApiBase}guilds/${gid}`, {
    method: 'GET',
    headers: {
      'authorization': pylonToken,
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36', // lol
    } });
  const json = await res.json();
  deploymentCache[gid] = json.deployments;
  return json.deployments;
}

async function getValidGuilds() {
  const active = await getActivePylonGuilds();
  sleep(1);
  const res = await fetch(`${pylonApiBase}user/guilds/available`, {
    method: 'GET',
    headers: {
      'authorization': pylonToken,
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36', // lol
    } });
  const txt = await res.text();
  // console.log(res.status, res.statusText);
  // console.log('available raw: ', [txt]);
  const json = JSON.parse(txt);
  const valid = json.filter((val) => active.find((v) => v.id === val.id) !== undefined && new Permissions(val.permissions).has('MANAGE_GUILD'));
  return valid;
}

async function getDeploymentIds() {
  const toRet = { deployments: [], skipped: [], added: [], failed: [] };
  if (isDebug === true || (!isDebug && isGh && typeof target === 'string' && target !== '*')) {
    const dept = await getDeployment(process.env.TEST_GUILD);
    const correctDep = dept.find((vall) => vall.disabled === false && vall.bot_id === '270148059269300224');
    if (correctDep !== undefined) {
      toRet.deployments.push(correctDep.id);
      return toRet;
    }
    console.error('Failed to grab deployment, data: ', dept);
  }
  const gconf = await getPyBoatGlobalConf();
  const whitelist = gconf.whitelistedGuilds;
  // await getActivePylonGuilds(); // pylon api bug where it doesnt cache our perms on the first request
  const nonactive = await getNonActivePylonGuilds();
  if (!nonactive) {
    return null;
  }
  sleep(1);
  const toadd = nonactive.filter((v) => whitelist.includes(v.id)).map((v) => v.id);
  if (toadd.length > 0) {
    console.log(`Adding guilds: \`${toadd.join(', ')}\` ....`);

    // https://pylon.bot/api/guilds/595608446150115348/add
    // {"requiresGuildAuth": false, "guild": ... }
    const failToAdd = [];
    await Promise.all(toadd.map(async (val) => {
      const res = await fetch(`${pylonApiBase}guilds/${val}/add`, {
        method: 'GET',
        headers: {
          'authorization': pylonToken,
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36', // lol
        } });
      const json = await res.json();
      if (json.requiresGuildAuth === true) {
        failToAdd.push(val);
      }
    }));
    const added = toadd.filter((v) => !failToAdd.includes(v));
    console.log(`${added.length > 0 ? `Added **${added.length}** guilds successfully!` : ''}${failToAdd.length > 0 ? `\nFailed to add **${failToAdd.length}** guilds: \`${failToAdd.join(', ')}\`` : ''}`);
    toRet.added.push(...added);
    toRet.failed.push(...failToAdd);
  }
  sleep(1);
  let validGuilds = await getValidGuilds();
  validGuilds = validGuilds.filter((val) => whitelist.includes(val.id)).map((v) => v.id);
  const notFound = whitelist.filter((v) => validGuilds.find((val) => val === v) === undefined && !toRet.failed.includes(v));
  if (notFound.length > 0) {
    toRet.skipped.push(...notFound);
    // console.log(`Could not find **${notFound.length}** guilds (from whitelist) : \`${notFound.join(', ')}\``);
  }
  sleep(1);
  await Promise.all(validGuilds.map(async (val) => {
    const dept = await getDeployment(val);
    const correctDep = dept.find((vall) => vall.disabled === false && vall.bot_id === '270148059269300224');
    if (correctDep !== undefined) {
      toRet.deployments.push(correctDep.id);
    } else {
      console.error('Failed to grab deployment, data: ', dept);
    }
  }));
  /* if (toret.deployments.length !== validGuilds.length) {
    const failed = validGuilds.filter((val) => deployments.find((v) => v.guild_id === val) === undefined);
    console.log(`Failed to grab deployment IDs for **${failed.length}** guilds: \`${failed.join(', ')}\``);
  } */
  if (toRet.deployments.length === 0) {
    // console.log('No guilds to deploy to!');
    return toRet;
  }
  /* const retval = deployments.map((v) => v.id);
  toRet.deployments.concat(retval); */
  return toRet;
}

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
const doneGuilds = [];
getDeploymentIds().then((objDeps) => {
  if (!objDeps) {
    throw new Error('Failed to fetch deployment IDs, closing');
  }
  const { deployments: ids, skipped, failed, added } = objDeps;
  if (!isGh) {
    console.log(ids, skipped, failed, added);
  }

  if (typeof (wh) === 'string' && ids.length > 1 && isGh && !isDebug) {
    let txt = '';
    if (added.length > 0) {
      txt += `\n📥 Added **${added.length}** guilds: \`${added.join(', ')}\``;
    }
    if (ids.length > 0) {
      txt += `\n✅ Publishing PyBoat to **${ids.length}** guilds..`;
    }
    if (skipped.length > 0) {
      txt += `\n🟡 Skipping **${skipped.length}** guild${skipped.length > 1 ? 's' : ''} ${skipped.map((e) => `\`${e}\``).join(', ')}`;
    }
    if (failed.length > 0) {
      txt += `\n🔴 Failed for **${failed.length}** guild${failed.length > 1 ? 's' : ''}: ${failed.map((e) => `\`${e}\``).join(', ')}`;
    }
    sendWebhook(txt);
    console.info(txt);
  }
  ids.forEach((deployment_id) => {
    if (doneGuilds.includes(deployment_id)) {
      return;
    }
    doneGuilds.push(deployment_id);
    let bundle;
    if (!isGh) {
      bundle = fs.readFileSync('./dist/bundle.js', 'utf8');
    } else {
      // fetch it from artifacts
    }
    if (!bundle) {
      console.error('Failed to fetch bundle, exiting...');
      process.exit(1);
    }
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
          if (!isGh) {
            console.log(`Published to ${obj.guild.name}${isGh === false ? ` (${obj.guild.id}) ` : ' '}successfully (Revision ${obj.revision})! `);
          } else {
            console.info('Published successfully');
          }

          if (typeof (wh) === 'string' && isGh && !isDebug) {
            if (ids.length >= lengthShorten) {
              toPost.push(`✅ \`${obj.guild.name}\` [||\`${obj.guild.id}\`||] (<@!${obj.bot_id}>) #${obj.revision}`);
            } else {
              toPost.push(`✅ \`${obj.guild.name}\` (<@!${obj.bot_id}>) - #${obj.revision}\nGID:[||\`${obj.guild.id}\`||]\nSID:[||\`${obj.script.id}\`||]\nDID:[||\`${deployment_id}\`||]`);
            }
          }
          if (isDebug && !isGh) {
            workbenchWs(obj.workbench_url);
          }
        }
      }).then(() => {
        if (toPost.length === ids.length) {
          console.info('Done deploying!');
          sendWebhook(toPost.join(`${ids.length >= lengthShorten ? '\n' : '\n\n'}`));
        }
      })
      .catch((e) => {
        console.error('Deploy Error!');
        console.error(e);
        process.exit(1);
      });
  });
}).catch((e) => {
  if (isGh && !isDebug) {
    sendWebhook(`Deploy error:\n${e}`);
  }
  throw new Error(e);
});
