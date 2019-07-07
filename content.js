var body = document.body.innerText;

function isEdifact(text) {
  // Do not support optional UNA segment
  let pattern = /^(UN[BGH]\+|''Response:)/i;
  return pattern.test(text);
}

function normalize(text) {
  let normalized = text.replace(/''Response:/gm, '')
                       .replace(/''End.*/gm, '')
                       .replace(/''/gm, '')
                       .replace(/\r?\n+/gm,'')
                       .replace(/'&/gm,'\'')
                       .replace(/\\([^\\x])/gm,"$1");
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
      let dcxImage = segment.split('+')[2];
      console.log("DCX " + dcxImage);
      result.push({"DCX": dcxImage});
    } else if (elements[0] == 'BLB') {
      let blbSize = elements[1];
      let blbFormat = elements[2];
      let offset = 3 + 1 + blbSize.length + 1 + blbFormat.length + 1;
      let blbBegin = message.current + offset;
      let blbEnd = blbFormat == 'E' ? blbBegin + parseInt(blbSize) : message.next;
      let blbImage = {
        content: message.content.substring(blbBegin, blbEnd),
        format: blbFormat
      };
      console.log("BLB " + blbImage.content);
      let blbResult = {};
      blbResult[segment.substring(0,offset)] = parseBLB(blbImage);
      result.push(blbResult);
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

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

function displayString(str, level) {
  return `
<div class="edifact-level-${level}">
  <span class="edifact-segment">
    <span class="edifact-segment-tag">${str.substring(0,3)}</span><span class="edifact-data-elements">${str.substring(3)}</span>
  </span>
</div>`.trim();
}

function displayBinary(str, level) {
  return `
<div class="edifact-level-${level}">
  <span class="edifact-binary">
    ${escapeHTML(str)}
  </span>
</div>`.trim();
}

function displayXMLNode(node, level) {
  let result = `
<div class="edifact-level-${level}">
  <div class="xml-element">
    &lt;<span class="xml-tag">${node.nodeName}</span>
`.trim();
  let attributes = node.attributes;
  for (let i=0; i<attributes.length; i++) {
    result += `
      &nbsp;<span class="xml-attribute-name">${attributes[i].nodeName}</span>=<span class="xml-attribute-value">"${attributes[i].nodeValue}"</span>
`.trim();
  }
  let children = node.childNodes;
  if (!children || children.length == 0) {
    result += `
    /&gt;
  </div>
</div>
`.trim();
  } else {
    result += `&gt;</span>`;
    for (let i=0; i<children.length ;i++) {
      if (children[i].nodeType != 1) {
        continue;
      }
      result += displayXMLNode(node.childNodes[i], level+1);
    }
    result += `
    &lt;/<span class="xml-tag">${node.nodeName}</span>&gt;
  </div>
</div>`.trim();
  }
  return result;
}

function displayXML(xmlString, level) {
  let parser = new DOMParser();
  let xmlDoc = parser.parseFromString(xmlString,"text/xml");
  let doc = xmlDoc.documentElement;
  return displayXMLNode(doc, level);
}

var id = 0;

function displayObject(jsonObject, level) {
  id++;
  let tag = name.substring(0,3);
  let value = name.substring(3);
  if (tag == 'UNH') {
    let elements = name.split('+');
    let components = elements[2].split(':');
    let type = components[0];
    let ver = components[1];
    let rev = components[2];
    let org = components[3];
    value = `+${elements[1]}+<span class="edifact-message-type">${type}</span>:<span class="edifact-message-version">${ver}</span>:<span class="edifact-message-revision">${rev}</span>:<span class="edifact-message-organization">${org}</span>
`.trim();
    for (let i=3; i<elements.length; i++) {
      value += `+${elements[i]}`.trim();
    }
  }
  let result = `
<div class="edifact-level-${level}">
  <input id="${id + '-' + tag}" type="checkbox" checked>
  <label for="${id + '-' + tag}">
    <span class="edifact-segment">
      <span class="edifact-segment-tag">${tag}</span><span class="edifact-data-elements">${value}</span>
    </span>
  </label>
  <div>
`.trim();
  if (tag == 'DCX') {
    result += displayXML(jsonObject[name], level+1);
  } else if (tag == 'BLB' && value.split('+')[2] == 'B') {
    result += displayBinary(jsonObject[name], level+1);
  } else {
    result += display(jsonObject[name], level+1);
  }
  result += `
  </div>
</div>`.trim();
  return result;
}

function display(jsonObject, level) {
  let result = "";
  if (typeof jsonObject === 'string') {
    return displayString(jsonObject, level);
  }
  if (jsonObject && typeof jsonObject === 'object') {
    if (jsonObject.constructor === Array) {
      for (i in jsonObject) {
        result += display(jsonObject[i], level);
      }
    } else if (jsonObject.constructor === Object) {
      for (name in jsonObject) {
        result += displayObject(jsonObject, level);
      }
    }
  }
  return result;
}

function edifact2html(text) {
  let jsonObject = edifact2json(text);
  return `
<div class="edifact-header">
  <input class="edifact-pretty-content" type="button" value="Display Original Content" onclick="
var nodes = document.getElementsByClassName('edifact-pretty-content');
for (let i=0; i<nodes.length; i++) {
  nodes[i].style.display = 'none';
}
nodes = document.getElementsByClassName('edifact-raw-content');
for (let i=0; i<nodes.length; i++) {
  nodes[i].style.display = 'block';
}
">
  <input class="edifact-raw-content" type="button" value="Display HTML Content" onclick="
var nodes = document.getElementsByClassName('edifact-raw-content');
for (let i=0; i<nodes.length; i++) {
  nodes[i].style.display = 'none';
}
nodes = document.getElementsByClassName('edifact-pretty-content');
for (let i=0; i<nodes.length; i++) {
  nodes[i].style.display = 'block';
}
">
</div>
<div class="edifact-raw-content">
  <pre>${escapeHTML(text)}</pre>
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


