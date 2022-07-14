const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.end('Hello World!');
})

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}...`);
})