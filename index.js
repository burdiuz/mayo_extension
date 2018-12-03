const { sqrt, pow, atan2, PI, max, min, cos, sin } = Math;
const TO_DEG = 180 / PI;
const PI_05 = PI * 0.5;

const getSinToSmaller = (from, to, pos) =>
  to + (cos(PI * pos) + 1) * (from - to) * 0.5;

const getSinToBigger = (from, to, pos) =>
  from + (cos(PI * pos + PI) + 1) * (to - from) * 0.5;

const getSinFn = (from, to) => {
  if (from < to) {
    return getSinToBigger;
  }

  return getSinToSmaller;
};

const getDistance = (x1, y1, x2, y2) => sqrt(pow(x2 - x1, 2) + pow(y2 - y1, 2));
const getAngle = (x1, y1, x2, y2) => atan2(x2 - x1, y1 - y2);
const getAngleDeg = (x1, y1, x2, y2) => {
  const deg = getAngle(x1, y1, x2, y2) * TO_DEG;

  return deg < 0 ? deg + 360 : deg;
};

const getX = (distance, angle, x1) => distance * sin(angle) + x1;
const getY = (distance, angle, y1) => -distance * cos(angle) + y1;

const maxWidth = () =>
  max(
    window.screen.width || 0,
    // document.body.scrollWidth || 0,
    // document.documentElement.scrollWidth || 0,
    document.documentElement.clientWidth || 0,
    //document.documentElement.offsetWidth || 0,
  );

const maxHeight = () =>
  max(
    window.screen.height || 0,
    // document.body.scrollHeight || 0,
    // document.documentElement.scrollHeight || 0,
    document.documentElement.clientHeight || 0,
    //document.documentElement.offsetHeight || 0,
  );

const createCanvas = (
  attrs = { width: maxWidth(), height: maxHeight() },
  styles = { position: 'fixed' },
  append = false,
) => {
  const element = document.createElement('canvas');

  Object.assign(element, attrs);
  Object.assign(element.style, styles);

  if (append) {
    document.body.appendChild(element);
  }

  const context = element.getContext('2d');

  return { element, context };
};

const { element: cFill, context: cxFill } = createCanvas();
const { element: cStroke, context: cxStroke } = createCanvas();
const { element: cResult, context: cxResult } = createCanvas(
  undefined,
  { position: 'absolute', zIndex: Number.MAX_SAFE_INTEGER, top: 0, left: 0 },
  true,
);

const MAX_THICKNESS = 40;
const MAX_DISTANCE = 150;
const MIN_DISTANCE = 5;

let drawing = false;
let drawRequestPending = false;

let records;

const addEventRecord = ({ offsetX, offsetY }) => {
  const { length } = records;

  if (length) {
    const { x: startX, y: startY } = records[length - 1];
    const distance = getDistance(startX, startY, offsetX, offsetY);

    records.push({
      x: offsetX,
      y: offsetY,
      distance,
      angle: getAngle(startX, startY, offsetX, offsetY),
      thickness:
        (MAX_THICKNESS * (1 - min(distance, MAX_DISTANCE) / MAX_DISTANCE)) >> 0,
    });
  } else {
    records.push({
      x: offsetX,
      y: offsetY,
    });
  }
};

const reduceRecords = () => {
  const { length } = records;
  records = records.slice(length - 1, length);
};

const resetRecords = () => {
  records = [];
};

const drawLineByXY = (thickness, startX, startY, endX, endY) => {
  cxFill.lineWidth = thickness;

  cxFill.beginPath();
  cxFill.moveTo(startX, startY);
  cxFill.lineTo(endX, endY);
  cxFill.stroke();
};

const getSinThickness = (startThick, endThick, pos) => {};

const drawLineWithSinThick = (
  startThickness,
  endThickness,
  sinFn,
  startX,
  startY,
  distance,
  angle,
) => {
  let currentX = startX;
  let currentY = startY;

  for (let current = 1; current <= distance; current++) {
    const currentThickness = sinFn(
      startThickness,
      endThickness,
      current / distance,
    );

    cxFill.beginPath();
    cxFill.moveTo(currentX, currentY);

    currentX = getX(current, angle, startX);
    currentY = getY(current, angle, startY);

    cxFill.lineTo(currentX, currentY);

    cxFill.lineWidth = currentThickness;
    cxFill.closePath();
    cxFill.stroke();
  }
};

const drawRecord = (startPosition, currentPosition, nextPosition) => {
  const { x: endX, y: endY, distance, angle, thickness } = currentPosition;

  if (thickness < 5) {
    return;
  }

  const { x: startX, y: startY, thickness: prevThickness } = startPosition;
  let nextThickness;

  if (nextPosition) {
    nextThickness = nextPosition.thickness;
  }

  const halfDistance = (distance * 0.5) >> 0;
  const halfX = getX(halfDistance, angle, startX);
  const halfY = getY(halfDistance, angle, startY);

  if (prevThickness === undefined || prevThickness === thickness) {
    drawLineByXY(thickness, startX, startY, halfX, halfY);
  } else {
    drawLineWithSinThick(
      prevThickness,
      thickness,
      getSinFn(prevThickness, thickness),
      startX,
      startY,
      halfDistance,
      angle,
    );
  }

  drawLineByXY(thickness, halfX, halfY, endX, endY);
};

const blendFinalImage = () => {
  cxStroke.globalCompositeOperation = 'source-over';
  cxResult.globalCompositeOperation = 'source-over';

  cxResult.clearRect(0, 0, cResult.width, cResult.height);

  cxStroke.clearRect(0, 0, cStroke.width, cStroke.height);
  cxStroke.fillRect(0, 0, cStroke.width, cStroke.height);
  cxStroke.globalCompositeOperation = 'destination-out';
  cxStroke.drawImage(cFill, 0, 0);
  cxStroke.filter = 'blur(5px)';

  cxResult.drawImage(cFill, 0, 0);
  cxResult.globalCompositeOperation = 'source-atop';
  cxResult.drawImage(cStroke, 0, 0);
};

const drawRecords = () => {
  drawRequestPending = false;
  const { length } = records;

  for (let index = 1; index < length; index++) {
    drawRecord(records[index - 1], records[index], records[index + 1]);
  }

  reduceRecords();
  blendFinalImage();
};

const waitToRedrawRecords = () => requestAnimationFrame(drawRecords);

const mouseMoveHandler = (event) => {
  if (!drawing) {
    return;
  }

  addEventRecord(event);

  if (!drawRequestPending) {
    drawRequestPending = true;
    waitToRedrawRecords();
  }
};

cxStroke.fillStyle = '#e4d2a7'; // '#f6ca50';
cxFill.fillStyle = '#fafaef'; // '#f4efd7';
cxFill.strokeStyle = '#fafaef';
cxFill.lineJoin = 'round';
cxFill.lineCap = 'round';

const set = (obj, name, value, reset = null) => {
  const prev = obj[name];
  obj[name] = value;

  const resetMore = () => {
    if (reset) {
      reset();
    }

    obj[name] = prev;
  };

  const setMore = (name, value) => set(obj, name, value, resetMore);
  setMore.reset = resetMore;

  return setMore;
};

let locked;

const lockBody = () => {
  const { body } = document;
  locked = set(body.style, 'overflow', 'hidden')('user-select', 'none');
  // PLACE CANVAS TO SCROLL POSITION
  cResult.focus();
};

const unlockBody = () => {
  locked.reset();
};

const mouseUpHandler = (event) => {
  drawing = false;

  unlockBody();
  window.removeEventListener('mouseup', mouseUpHandler);
};

const mouseDownHandler = (event) => {
  const { offsetX, offsetY } = event;

  lockBody();
  resetRecords();
  addEventRecord(event);
  drawing = true;

  window.addEventListener('mouseup', mouseUpHandler);
};

cResult.addEventListener('mousedown', mouseDownHandler);
cResult.addEventListener('mousemove', mouseMoveHandler);
