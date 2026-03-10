// app.js
const { insertRow } = require('./sqlapi');

async function run() {
  try {
    const result = await insertRow({ name: 'h', number: '0123', gen: 1 });
    console.log('Inserted id:', result.insertId);
  } catch (err) {
    console.error('Insert failed:', err);
  }
}
