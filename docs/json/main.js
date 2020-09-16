/* eslint-disable no-undef */
/* eslint-disable strict */
/* eslint-disable no-console */
/* eslint-disable guard-for-in */

function toArray(dt) {
  const dtN = [];
  for (const key in dt) {
    const top = {};
    top[key] = dt[key];
    dtN.push(top);
  }
  return dtN;
}

function parseData(dt, compose = true) {
  if (typeof dt.levels === 'object') {
    if (Array.isArray(dt.levels.roles) && compose) {
      // dt.levels = Object.fromEntries(dt.levels.roles);
    } else if (typeof dt.levels.roles === 'object' && dt.levels.roles !== null && !compose) {
      dt.levels.roles = toArray(dt.levels.roles);
    }
  }
  return dt;
}

const button_copy = document.querySelector('#button_copy');
const button_download = document.querySelector('#button_download');
const directLink = document.querySelector('#direct_link');
const json_output = document.querySelector('#json_output');
let editor;
function submit() {
  editor.validate();
  let data = { levels: editor.getEditor('root.levels').getValue() };
  console.log('data', data);
  console.log('before', data, typeof data.levels);
  data = parseData(data, true);
  console.log('after', data);
}

function download(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function getConfigJson() {
  const vali = editor.validate();
  if (vali.length) {
    return;
  }
  download('config.json', JSON.stringify(JSON.parse(json_output.value), null, 2));
}

function copyJson() {
  const vali = editor.validate();
  if (vali.length) {
    return;
  }
  const copyText = json_output;

  /* Select the text field */
  copyText.select();
  copyText.setSelectionRange(0, 999999); /* For mobile devices */

  /* Copy the text inside the text field */
  document.execCommand('copy');
}

function recursiveSet(thisData, previousString) {
  for (const key in thisData) {
    const thisEditor = `${previousString}.${key}`;
    if (typeof thisData[key] === 'object' && !Array.isArray(thisData[key]) && thisData[key] !== null) {
      recursiveSet(thisData[key], thisEditor);
      continue;
    }
    const edi = editor.getEditor(thisEditor);
    if (edi) {
      edi.setValue(thisData[key]);
    }
  }
}

function importJSON() {
  editor.disable();
  try {
    const val = JSON.parse(document.getElementById('import').value);
    recursiveSet(val, 'root');
  } catch (e) {
    console.error(e);
  }
  editor.enable();
}

function updateDirectLink() {
  const vali = editor.validate();
  if (vali.length) {
    return;
  }
  let url = window.location.href.replace(/\?.*/, '');
  url += '?data=';
  url += LZString.compressToBase64(JSON.stringify(JSON.parse(json_output.value)));
  directLink.href = url;
}

function parseUrl() {
  const url = window.location.search;
  const queryParamsString = url.substring(1, url.length);
  const queryParams = queryParamsString.split('&');

  if (queryParamsString.length) {
    queryParams.forEach((queryParam) => {
      const splittedParam = queryParam.split('=');
      const param = splittedParam[0];
      const value = splittedParam[1];

      // data query param
      if (param === 'data') {
        // compress schema and value
        try {
          data = JSON.parse(LZString.decompressFromBase64(value));
          if (typeof data === 'object' && data !== null && typeof data.modules === 'object') {
            recursiveSet(data, 'root');
          }
        } catch (reason) {
        }
      }
    });
  }
}

fetch('./schema.json')
  .then((response) => response.json())
  .then((obj) => {
    const defaultOptions = {
      iconlib: 'spectre',
      object_layout: 'table',
      show_errors: 'interaction',
      schema: obj,
      theme: 'spectre',
      disable_properties: true,
      disable_edit_json: true,
      disable_array_reorder: true,
      keep_oneof_values: true,
      disable_array_delete_last_row: true,
      disable_array_delete_all_rows: false,
      prompt_before_delete: false,
      required_by_default: false,
      show_opt_in: false,
      no_additional_properties: false,
      remove_empty_properties: true,
    };

    const element = document.getElementById('editor_holder');
    editor = new JSONEditor(element, defaultOptions);
    editor.disable();

    /* document.getElementById('submit').addEventListener('click', () => {
  // Get the value from the editor
  submit();
}); */
    editor.on('change', () => {
      const vali = editor.validate();
      if (vali.length) {
        button_copy.style = 'background-color:red';
        button_copy.disabled = true;
        button_download.style = 'background-color:red';
        button_download.disabled = true;
        json_output.value = `JSON Error: ${JSON.stringify(vali, null, 2)}`;
        directLink.disabled = true;
        directLink.style = 'background-color:red';
      } else {
        button_copy.style = 'background-color:green';
        button_copy.disabled = false;
        button_download.style = 'background-color:green';
        button_download.disabled = false;
        json_output.value = JSON.stringify(editor.getValue(), null, 2);
        directLink.disabled = false;
        directLink.style = 'background-color:green';
        updateDirectLink();
      }
    });
    editor.on('ready', () => {
      // Now the api methods will be available
      parseUrl();
      editor.enable();
      console.log('ready');
      editor.validate();
    });
  });

button_copy.addEventListener('click', () => {
  copyJson();
});

button_download.addEventListener('click', () => {
  getConfigJson();
});
