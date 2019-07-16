function displayString(str, level) {
  if (str.startsWith("+")) {
    return `
<div class="edifact-level-${level}">
  <span class="edifact-segment">
    <span class="edifact-data-elements">${str.substring(0, str.length-3)}</span><span class="edifact-segment-tag">${str.substr(-3)}</span>
  </span>
</div>`.trim();
  } else {
    return `
<div class="edifact-level-${level}">
  <span class="edifact-segment">
    <span class="edifact-segment-tag">${str.substring(0,3)}</span><span class="edifact-data-elements">${str.substring(3)}</span>
  </span>
</div>`.trim();
  }
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

function displayUNH(name, level) {
  let elements = name.split('+');
  let components = elements[2].split(':');
  let type = components[0];
  let ver = components[1];
  let rev = components[2];
  let org = components[3];
  value = `+${elements[1]}+<span class="edifact-message-type">${type}</span>:<span class="edifact-message-version">${ver}</span>:<span class="edifact-message-revision">${rev}</span>:<span class="edifact-message-organization">${org}</span>`.trim();
  for (let i=3; i<elements.length; i++) {
    value += `+${elements[i]}`.trim();
  }
  return value;
}

var id = 0;

function displaySegment(name, level) {
  id++;
  let tag = name.substring(0, 3);
  let value = name.substring(3);
  return `
  <input id="${id + '-' + tag}" type="checkbox" checked>
  <label for="${id + '-' + tag}">
    <span class="edifact-segment">
      <span class="edifact-segment-tag">${tag}</span><span class="edifact-data-elements">${tag == 'UNH' ? displayUNH(name, level) : value}</span>
    </span>
  </label>
`.trim();
}

function displayObject(name, jsonObject, level) {
  let tag = name.substring(0, 3);
  let value = name.substring(3);
  let result = `
<div class="edifact-level-${level}">
  ${displaySegment(name, level)}
  <div>
`.trim();
  if (tag == 'DCX') {
    result += displayXML(jsonObject, level+1);
  } else if (tag == 'BLB' && value.split('+')[2] == 'B') {
    result += displayBinary(jsonObject, level+1);
  } else {
    result += display(jsonObject, level+1);
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
      for (let i in jsonObject) {
        result += display(jsonObject[i], level);
      }
    } else if (jsonObject.constructor === Object) {
      for (let name in jsonObject) {
        result += displayObject(name, jsonObject[name], level);
      }
    }
  }
  return result;
}

