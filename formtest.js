// sql-client.js
// wire up the form on page load
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('insertForm');
  if (form) form.addEventListener('submit', onInsertFormSubmit);
});

async function onInsertFormSubmit(event) {
  event.preventDefault(); // stop normal form submit

  const name = document.getElementById('name').value.trim();
  const number = document.getElementById('number').value.trim();
  const gen = Number(document.getElementById('gen').value);

  // Basic client-side validation
  if (!name || !number || !Number.isFinite(gen)) {
    alert('Please fill all fields correctly');
    return;
  }

  const payload = { name, number, gen };
// app.js
const { insertRow } = require('./sqlapi');

async function run() {
  try {
    const result = await insertRow({ name: name, number: number, gen: gen });
    console.log('Inserted id:', result.insertId);
  } catch (err) {
    console.error('Insert failed:', err);
  }
}
run()
}
