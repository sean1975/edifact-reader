var body = document.body.innerText;

function isEdifact(text) {
  // Do not support optional UNA segment
  let pattern = /^UN[BGH]\+/i;
  return pattern.test(text);
}

function normalize(text) {
  let normalized = text.replace(/\r?\n+/gm,'')
                       .replace(/'&/gm,'\'')
                       .replace(/\\([^\\])/gm,"$1");
  return normalized;
}

function parseGCX(image) {
  let next = image.content.indexOf("'");
  let segment = image.content.substring(0, next);
  let elements = segment.split(':');
  if (elements[0] == 'SBR') {
    let offset = elements[0].length + 1 + elements[1].length + 1 +
      elements[2].length + 1 + elements[3].length + 1;
    let message = {
      content: image.content,
      current: next,
      next: 0
    }
    let result = {};
    result[segment.substring(offset)] = parseUNH(message);
    return result;
  } else {
    return "";
  }
}

function parseBLB(image) {
  if (image.format == 'E') {
    let message = {
      content: image.content,
      current: 0,
      next: 0
    };
    if (image.content.startsWith('UNH')) {
      message.current = message.content.indexOf("'", message.current);
      let segment = message.content.substring(message.current, message.next);
      let result = {};
      result[segment] = parseUNH(message);
      return result;
    } else {
      return parseUNH(message);
    }
  } else {
    return image.content;
  }
}

function parseUNH(message) {
  let result = [];
  while (message.current < message.content.length) {
    message.next = message.content.indexOf("'", message.current);
    if (message.next > message.content.length) {
      break;
    } else if (message.next < 0) {
      message.next = message.content.length;
    }
    let segment = message.content.substring(message.current, message.next);
    let elements = segment.split('+');
    if (elements[0] == 'UNT') {
      console.log(segment);
      message.current = message.next + 1;
      break;
    } else if (elements[0] == 'DCX') {
      let escaped = segment.split('+')[2].replace(/</gm, "&lt;").replace(/>/gm, "&gt;");
      console.log("DCX " + escaped);
      result.push({"DCX": escaped});
    } else if (elements[0] == 'BLB') {
      let blbSize = elements[1];
      let blbFormat = elements[2];
      let offset = 3 + 1 + blbSize.length + 1 + blbFormat.length + 1;
      let blbBegin = message.current + offset;
      let blbEnd = blbBegin + parseInt(blbSize);
      let blbImage = {
        content: message.content.substring(blbBegin, blbEnd),
        format: blbFormat
      };
      console.log("BLB " + blbImage.content);
      result.push({"BLB": parseBLB(blbImage)});
      message.next = blbEnd; 
    } else if (elements[0] == 'GCX') {
      let gcxSize = elements[1];
      let gcxFormat = elements[2];
      let gcxBegin = message.current + 3 + 1 + gcxSize.length + 1;
      let gcxEnd = gcxBegin + parseInt(gcxSize);
      let gcxImage = {
        content: message.content.substring(gcxBegin, gcxEnd),
        format: gcxFormat
      };
      console.log("GCX " + gcxImage.content);
      result.push({"GCX": parseGCX(gcxImage)});
      message.next = gcxEnd + 1 + gcxSize.length + 1 + 3;
    } else if (segment.length > 0) {
      result.push(segment);
    }
    message.current = message.next + 1;
  }
  return result;
}

function parse(text, result) {
  let message = {
    content: text,
    current: 0,
    next: 0
  };
  while (message.current < message.content.length) {
    message.next = message.content.indexOf("'", message.current);
    if (message.next > message.content.length) {
      break;
    }
    let segment = message.content.substring(message.current, message.next);
    if (segment.startsWith('UNH')) {
      message.current = message.next + 1;
      message.next = message.content.length - 1;
      result[segment] = parseUNH(message);
    }
    message.current = message.next + 1;
  }
}

function edifact2json(text) {
  let normalized = normalize(text);
  let result = {};
  parse(normalized, result);
  console.log(result);
  return result;
}

var id = 0;

function display(jsonObject, level) {
  let result = "";
  if (typeof jsonObject === 'string') {
    result = `
<div class="edifact-level-${level}">
  <span>${jsonObject}</span>
</div>`.trim();
    return result;
  }
  if (jsonObject && typeof jsonObject === 'object') {
    if (jsonObject.constructor === Array) {
      for (i in jsonObject) {
        result += display(jsonObject[i], level);
      }
    } else if (jsonObject.constructor === Object) {
      for (name in jsonObject) {
        id++;
        result += `
<div class="edifact-level-${level}">
  <input id="${id + '-' + name.substring(0,3)}" type="checkbox" checked>
  <label for="${id + '-' + name.substring(0,3)}">${name}</label>
  <div>
    ${display(jsonObject[name], level+1)}
  </div>
</div>`.trim();
      }
    }
  }
  return result;
}

function edifact2html(text) {
  let jsonObject = edifact2json(text);
  //let jsonString = JSON.stringify(result);
  return `
<div class="edifact-header">
</div>
<div class="edifact-raw-content">
  <pre>${text}</pre>
</div>
<div class="edifact-pretty-content">
  ${display(jsonObject, 0, "")}
</div>
`;
}

if (isEdifact(body)) {
  let htmlContent = edifact2html(body);
  document.body.innerHTML = htmlContent;
} else {
  console.log("NOT Edifact");
}


