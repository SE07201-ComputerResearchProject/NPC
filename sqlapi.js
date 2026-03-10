// sqlapi.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'testjs',
  connectionLimit: 10
});

async function insertRow({ name, number, gen }) {
  const sql = 'INSERT INTO `testing` (`name`, `number`, `gen`) VALUES (?, ?, ?)';
  const params = [name, number, gen];
  const [result] = await pool.execute(sql, params);
  return result;
}

async function updateRow({ name, number, gen, id }) {
  const sql = 'UPDATE `testing` SET `name` = ?, `number` = ?, `gen` = ? WHERE `testing`.`id` = ?;';
  const params = [name, number, gen, id];
  const [result] = await pool.execute(sql, params);
  return result;
}

module.exports = { insertRow, updateRow, pool };
