const express = require('express');
const path = require('path');
const app = express();

// Serve everything inside Front-End folder
app.use(express.static(path.join(__dirname, '../NPC/Front-End')));

app.listen(8080, () => {
  console.log('Server running at http://localhost:8080/');
});
