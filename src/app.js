const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { ConnectSessionKnexStore } = require('connect-session-knex');
const db = require('./config/database');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must be set (at least 32 characters) in production.');
}

app.set('trust proxy', 1); // Hostinger and most hosts sit behind a proxy
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
      'img-src': ["'self'", 'data:'],
      'frame-src': ['https://www.google.com'], // embedded Google Map on the contact page
      'upgrade-insecure-requests': isProd ? [] : null,
    },
  },
}));

app.get('/favicon.ico', (req, res) => res.redirect(301, '/favicon.svg'));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: isProd ? '7d' : 0 }));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));

// Sabari's public API needs no session.
app.use('/api/sabari', require('./routes/sabari'));

app.use(session({
  name: 'ssc.sid',
  secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me-dev-only-secret',
  resave: false,
  saveUninitialized: false,
  store: new ConnectSessionKnexStore({ knex: db, tableName: 'sessions', createTable: true, cleanupInterval: 60 * 60 * 1000 }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 8 * 60 * 60 * 1000 },
}));

app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/public'));

// 404 + error pages
app.use((req, res) => res.status(404).render('public/error', { title: 'Page not found', status: 404, message: 'The page you are looking for does not exist or has moved.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  if (req.originalUrl.startsWith('/api/')) return res.status(status).json({ success: false, error: status >= 500 ? 'Something went wrong.' : err.message });
  const message = status >= 500 ? 'Something went wrong. Please try again.' : err.message;
  const view = req.originalUrl.startsWith('/admin') && req.session && req.session.user ? 'admin/error' : 'public/error';
  res.status(status).render(view, { title: 'Error', status, message, site: res.locals.site || {}, menu: res.locals.menu || [], path: req.path });
});

module.exports = app;
