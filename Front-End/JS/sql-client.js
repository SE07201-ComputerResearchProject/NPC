// public/js/sql-client.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('insertForm');
  form.addEventListener('submit', onInsertFormSubmit);
});

async function onInsertFormSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const number = document.getElementById('number').value.trim();
  const gen = Number(document.getElementById('gen').value);

  if (!name || !number || !Number.isFinite(gen)) {
    alert('Please fill all fields correctly');
    return;
  }

  try {
    const resp = await fetch('/api/rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, number, gen })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      alert('Insert failed: ' + (err.error || resp.status));
      return;
    }

    const data = await resp.json();
    alert('Inserted id: ' + data.insertId);
    e.target.reset();
  } catch (err) {
    console.error('Network error', err);
    alert('Network error');
  }
}
