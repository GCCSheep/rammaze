'use strict';

// Modules dependencies
const express = require('express');
const hash = require('pbkdf2-password')();
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
app.set('view engine', 'ejs');
app.set('views', './views');

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: '8e977256b673c8471b63'
}));

// Session-persisted message middleware
app.use((req, res, next) => {
    const err = req.session.error;
    const msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = '';
    if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
    if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
    next();
});

// Database
const users = {
    gustavo: { name: 'gustavo' }
};

// When a user is created, generate salt
// and hash the password
hash({ password: 'foobar' }, (err, pass, salt, hash) => {
    if (err) throw err;
    // Store salt and hash in db
    users.gustavo.salt = salt;
    users.gustavo.hash = hash;
});

// Authentication using db
function authenticate(name, pass, fn) {
    const user = users[name];
    // Query db for the given username
    if (!user) return fn(null, null);
    // Apply the same algorithm to the POSTed password, applying
    // the hash against the pass/salt, if there is a match we
    // found the user
    hash({ password: pass, salt: user.salt }, (err, pass, salt, hash) => {
        if (err) return fn(err);
        if (hash === user.hash) return fn(null, user);
        fn(null, null);
    });
}

function restrict(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
}

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res, next) => {
    authenticate(req.body.username, req.body.password, function(err, user) {
        if (err) return next(err);
        if (user) {
            // Regenerate session when signing in
            // to prevent fixation
            req.session.regenerate(() => {
                // Store the user's primary key
                // in the session store to be retrieved,
                // or in this casethe entire user object
                req.session.user = user;
                req.session.success = 'Authenticated as ' + user.name
                    + ' click to <a href="/logout">logout</a>. '
                    + ' You may now access <a href="/restricted">/restricted</a>.';
                res.redirect('back');
            });
        } else {
            req.session.error = 'Authentication failed, please check your '
                + ' username and password.'
            res.redirect('/login');
        }
    });
});

app.get('/restricted', restrict, (req, res) => {
    res.send('Restricted area, click to <a href="/logout">logout</a>');
});

app.get('/logout', (req, res) => {
    // desroy the user's session to log them out
    // will be re-created next request
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}...`);
});