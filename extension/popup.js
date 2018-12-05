let mayoEnabled = false;
let mayoSize;
let mayoViscosity;
let mayoType;

const types = [];

document.querySelectorAll('#type option').forEach(({ value, index }) => {
  types[index] = value;
});

const validateButtons = () => {
  const start = document.querySelector('.start-container').style;
  const stop = document.querySelector('.stop-container').style;

  if (mayoEnabled) {
    start.display = 'none';
    stop.display = 'flex';
  } else {
    start.display = 'flex';
    stop.display = 'none';
  }
};

const readTabOptions = () => {
  chrome.tabs.executeScript(
    {
      code: `(
  ({
    _mayoEnabled,
    _mayoOptionsSize,
    _mayoOptionsViscosity,
    _mayoOptionsType
  }) => ({
    mayoEnabled: _mayoEnabled,
    mayoSize: _mayoOptionsSize,
    mayoViscosity: _mayoOptionsViscosity,
    mayoType: _mayoOptionsType
  })
)(window)`,
    },
    ([options]) => {
      ({ mayoEnabled, mayoSize, mayoViscosity, mayoType } = options);

      document.getElementById('size').value = mayoSize;
      document.getElementById('viscosity').value = 300 - mayoViscosity;
      document.getElementById('type').value = mayoType;
      validateButtons();
    },
  );
};

const writeTabOptions = () => {
  chrome.tabs.executeScript({
    code: `(
  (target) => {
    target._mayoOptionsSize = ${mayoSize};
    target._mayoOptionsViscosity = ${mayoViscosity};
    target._mayoOptionsType = "${mayoType}";
  }
)(window)`,
  });
};

const addHandler = (id, event, handler) =>
  document.getElementById(id).addEventListener(event, handler);

addHandler('start', 'click', () => {
  chrome.tabs.executeScript({ code: 'window._mayoStart()' }, readTabOptions);
});

addHandler('stop', 'click', () => {
  chrome.tabs.executeScript({ code: 'window._mayoStop()' }, readTabOptions);
});

addHandler('size', 'change', ({ target: { value } }) => {
  mayoSize = value;
  writeTabOptions();
});

addHandler('viscosity', 'change', ({ target: { value } }) => {
  mayoViscosity = 300 - value;
  writeTabOptions();
});

addHandler('type', 'change', ({ target: { value } }) => {
  mayoType = value;
  writeTabOptions();
});

chrome.tabs.executeScript({ code: '!!window._mayoStop' }, ([initialized]) => {
  if (initialized) {
    readTabOptions();
  } else {
    chrome.tabs.executeScript({ file: 'content.js' }, readTabOptions);
  }
});
