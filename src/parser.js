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
    let sbrResult = {};
    sbrResult[segment.substring(offset)] = parseUNH(message);
    let result = {};
    result[segment.substring(0, offset)] = sbrResult;
    return [result];
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
      result.push(segment);
      message.current = message.next + 1;
      break;
    } else if (elements[0] == 'DCX') {
      let dcxImage = elements[2];
      console.log("DCX " + dcxImage);
      let dcxResult = {};
      dcxResult[elements[0] + "+" + elements[1] + "+"] = dcxImage;
      result.push(dcxResult);
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
      let gcxResult = {};
      gcxResult[elements[0] + "+" + elements[1] + "+"] = parseGCX(gcxImage);
      let len = gcxResult[elements[0] + "+" + elements[1] + "+"].length;
      gcxResult[elements[0] + "+" + elements[1] + "+"][len] = "+" + elements[1] + "+" + elements[0];
      result.push(gcxResult);
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

