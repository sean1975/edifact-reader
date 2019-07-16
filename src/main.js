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

function edifact2html(text) {
  let jsonObject = edifact2json(text);
  return `
<div class="edifact-header">
  <input id="btnDisplayMode" class="edifact-pretty-content" type="button" value="Display Original Content">
</div>
<div class="edifact-raw-content">
  <pre>${escapeHTML(text)}</pre>
</div>
<div class="edifact-pretty-content">
  ${display(jsonObject, 0, "")}
</div>
`;
}

function initButtons() {
  document.getElementById('btnDisplayMode').onclick = function(btnDisplayMode) {
    let displayMode = this.className;
    let nodes = document.getElementsByClassName(displayMode);
    for (let i=0; i<nodes.length; i++) {
      nodes[i].style.display = 'none';
    }
    if (displayMode == 'edifact-pretty-content') {
      this.className = 'edifact-raw-content';
      this.value = 'Display HTML Content';
    } else {
      this.className = 'edifact-pretty-content';
      this.value = 'Display Original Content';
    }
    nodes = document.getElementsByClassName(this.className);
    for (let i=0; i<nodes.length; i++) {
      nodes[i].style.display = 'block';
    }
  }
}

// main program

var body = document.body.innerText;

if (isEdifact(body)) {
  let htmlContent = edifact2html(body);
  document.body.innerHTML = htmlContent;
  initButtons();
} else {
  console.log("NOT Edifact");
}


