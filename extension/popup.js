const addHandler = (id, event, handler) =>
  document.getElementById(id).addEventListener(event, handler);

  addHandler('start', 'click', () => {
  console.log(chrome);
  console.log(maxDistance);
});

addHandler('size', 'change', ({ target: { value } }) => {});

addHandler('viscosity', 'change', ({ target: { value } }) => {});
