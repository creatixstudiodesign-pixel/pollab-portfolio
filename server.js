
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const tls = require('node:tls');

const ROOT = __dirname;

function loadEnv() {
    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) return;

    for (const rawLine of fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const separator = line.indexOf('=');
        if (separator < 1) continue;

        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (!(key in process.env)) process.env[key] = value;
    }
}

loadEnv();

const PORT = Number(process.env.PORT) || 3000;

const CONTACT_TO = process.env.CONTACT_TO || 'fuyadsbd@gmail.com';
const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'fuyadsbd@gmail.com';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_SUBMISSIONS = 5;
const recentSubmissions = new Map();


// ==================== JSON RESPONSE ====================

function json(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    });

    res.end(JSON.stringify(data));
}


// ==================== READ REQUEST BODY ====================

function readBody(req, limit = 10 * 1024) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.setEncoding('utf8');

        req.on('data', (chunk) => {
            body += chunk;

            if (Buffer.byteLength(body, 'utf8') > limit) {
                reject(Object.assign(new Error('Request too large'), {
                    statusCode: 413
                }));

                req.destroy();
            }
        });

        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}


// ==================== INPUT CLEANING ====================

function clean(value, maxLength) {
    return typeof value === 'string'
        ? value.trim().slice(0, maxLength)
        : '';
}


// ==================== MIME TYPES ====================

function mimeType(file) {
    return ({
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',

        // SEO FILES
        '.xml': 'application/xml; charset=utf-8',
        '.txt': 'text/plain; charset=utf-8',

        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
    })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}


// ==================== PUBLIC FILE ROUTING ====================

function publicFile(urlPath) {

    // HOMEPAGE
    if (urlPath === '/') {
        return path.join(ROOT, 'index.html');
    }

    // SEO FILES
    const seoFiles = {
        '/sitemap.xml': 'sitemap.xml',
        '/robots.txt': 'robots.txt'
    };

    if (seoFiles[urlPath]) {
        return path.join(ROOT, seoFiles[urlPath]);
    }

    // HTML PAGES
    const page = /^\/(index|about|contact|portfolio|services)\.html$/i.exec(urlPath);

    if (page) {
        return path.join(ROOT, `${page[1].toLowerCase()}.html`);
    }

    // STATIC ASSETS
    const asset = /^\/(css|js|images|CV)\/(.+)$/i.exec(urlPath);

    if (!asset) return null;

    const folder = path.resolve(ROOT, asset[1]);
    const file = path.resolve(folder, asset[2]);

    if (!file.startsWith(folder + path.sep)) {
        return null;
    }

    return file;
}


// ==================== SMTP RESPONSE ====================

function smtpResponse(socket, state) {
    return new Promise((resolve, reject) => {

        const timeout = setTimeout(() => {
            reject(new Error('SMTP response timed out'));
        }, 15000);

        function finish() {
            const lines = state.buffer.split('\r\n');
            const end = lines.findIndex((line) => /^\d{3} /.test(line));

            if (end < 0) return;

            state.buffer = lines.slice(end + 1).join('\r\n');

            clearTimeout(timeout);

            socket.off('data', onData);
            socket.off('error', onError);

            resolve(lines.slice(0, end + 1).join('\n'));
        }

        function onData(chunk) {
            state.buffer += chunk.toString('utf8');
            finish();
        }

        function onError(error) {
            clearTimeout(timeout);
            socket.off('data', onData);
            reject(error);
        }

        socket.on('data', onData);
        socket.on('error', onError);

        finish();
    });
}


// ==================== SEND SMTP EMAIL ====================

async function sendSmtpMail({ name, email, subject, message }) {

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;

    const user = process.env.SMTP_USER || 'fuyadsbd@gmail.com';
    const password = process.env.SMTP_PASS || '';

    if (!password) {
        throw new Error('SMTP_PASS is missing from .env');
    }

    if (port !== 465) {
        throw new Error(
            'This server is configured for implicit TLS on port 465. Set SMTP_PORT=465.'
        );
    }

    const socket = tls.connect({
        host,
        port,
        servername: host
    });

    const state = { buffer: '' };

    const expect = async (codes) => {
        const response = await smtpResponse(socket, state);

        if (!codes.some((code) => response.startsWith(String(code)))) {
            throw new Error(`SMTP returned ${response.slice(0, 300)}`);
        }

        return response;
    };

    const command = async (line, codes) => {
        socket.write(`${line}\r\n`);
        return expect(codes);
    };

    try {

        await new Promise((resolve, reject) => {
            socket.setTimeout(20000, () => {
                socket.destroy(new Error('SMTP connection timed out'));
            });

            socket.once('secureConnect', resolve);
            socket.once('error', reject);
        });

        await expect([220]);

        await command('EHLO pollab-portfolio.local', [250]);
        await command('AUTH LOGIN', [334]);

        await command(
            Buffer.from(user, 'utf8').toString('base64'),
            [334]
        );

        await command(
            Buffer.from(password, 'utf8').toString('base64'),
            [235]
        );

        await command(`MAIL FROM:<${SMTP_FROM}>`, [250]);
        await command(`RCPT TO:<${CONTACT_TO}>`, [250, 251]);
        await command('DATA', [354]);

        const encodedSubject =
            `=?UTF-8?B?${Buffer.from(
                `[Portfolio] ${subject}`,
                'utf8'
            ).toString('base64')}?=`;

        const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;

        const encodedBody = Buffer.from(body, 'utf8')
            .toString('base64')
            .replace(/.{1,76}/g, '$&\r\n')
            .trimEnd();

        const mail = [
            `From: ${SMTP_FROM}`,
            `To: ${CONTACT_TO}`,
            `Reply-To: ${email}`,
            `Subject: ${encodedSubject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            encodedBody.replace(/^\./gm, '..'),
            '.'
        ].join('\r\n');

        socket.write(`${mail}\r\n`);

        await expect([250]);

        socket.write('QUIT\r\n');

        await expect([221]).catch(() => {});

    } finally {
        socket.end();
    }
}


// ==================== CONTACT FORM ====================

async function handleContact(req, res) {

    const now = Date.now();
    const ip = req.socket.remoteAddress || 'unknown';

    const history = (recentSubmissions.get(ip) || [])
        .filter((time) => now - time < WINDOW_MS);

    if (history.length >= MAX_SUBMISSIONS) {
        return json(res, 429, {
            error: 'Too many messages. Please try again later.'
        });
    }

    let input;

    try {
        input = JSON.parse(await readBody(req));
    } catch (error) {
        return json(res, error.statusCode || 400, {
            error: 'Invalid form submission.'
        });
    }

    if (clean(input.website, 200)) {
        return json(res, 200, { ok: true });
    }

    const name = clean(input.name, 120);
    const email = clean(input.email, 254);

    const subject = clean(input.subject, 160)
        .replace(/[\r\n]+/g, ' ') || 'Portfolio contact request';

    const message = clean(input.message, 5000);

    if (
        !name ||
        !email ||
        !message ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        return json(res, 400, {
            error: 'Please enter a valid name, email, and message.'
        });
    }

    history.push(now);
    recentSubmissions.set(ip, history);

    try {

        await sendSmtpMail({
            name,
            email,
            subject,
            message
        });

        return json(res, 200, {
            ok: true,
            message: 'Thanks! Your message has been sent to the contact email.'
        });

    } catch (error) {

        console.error('Contact email delivery failed:', error.message);

        return json(res, 502, {
            error: 'Email delivery is not ready. Check the SMTP settings in .env, then try again.'
        });
    }
}


// ==================== MAIN SERVER ====================

const server = http.createServer(async (req, res) => {

    const url = new URL(req.url, 'http://localhost');

    // CONTACT API
    if (
        url.pathname === '/api/contact' &&
        req.method === 'POST'
    ) {
        return handleContact(req, res);
    }

    // HEALTH API
    if (
        url.pathname === '/api/health' &&
        req.method === 'GET'
    ) {
        return json(res, 200, {
            ok: true,
            emailConfigured: Boolean(process.env.SMTP_PASS),
            contactEmail: CONTACT_TO
        });
    }

    // ALLOW GET AND HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return json(res, 405, {
            error: 'Method not allowed.'
        });
    }

    // RESOLVE FILE PATH
    let file;

    try {
        file = publicFile(decodeURIComponent(url.pathname));
    } catch {
        return json(res, 400, {
            error: 'Invalid path.'
        });
    }

    if (!file) {
        return json(res, 404, {
            error: 'Not found.'
        });
    }

    // CHECK FILE
    fs.stat(file, (error, stats) => {

        if (error || !stats.isFile()) {
            return json(res, 404, {
                error: 'Not found.'
            });
        }

        res.writeHead(200, {
            'Content-Type': mimeType(file),
            'X-Content-Type-Options': 'nosniff'
        });

        if (req.method === 'HEAD') {
            return res.end();
        }

        fs.createReadStream(file).pipe(res);
    });
});


// ==================== START SERVER ====================

server.listen(PORT, '0.0.0.0', () => {

    console.log(
        `Pollab portfolio is available at http://localhost:${PORT}`
    );

    console.log(
        `Contact messages will be sent to ${CONTACT_TO}`
    );

    if (!process.env.SMTP_PASS) {
        console.warn(
            'SMTP_PASS is empty. Add your Gmail App Password to .env to enable email delivery.'
        );
    }
});
