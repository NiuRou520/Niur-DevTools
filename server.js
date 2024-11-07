const express = require('express');
const app = express();

app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'max-age=31536000, immutable',
        'Content-Type': 'text/html; charset=utf-8'
    });
    next();
}); 