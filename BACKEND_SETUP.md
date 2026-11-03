# Contact email delivery setup

The backend is included in `server.js` and uses Node.js built-in modules, so no npm packages need to be installed. Contact form messages are addressed to `fuyadsbd@gmail.com`.

## Enable Gmail delivery

1. In the project folder, open `.env` in a text editor.
2. Create a Google App Password for `fuyadsbd@gmail.com` (Google 2-Step Verification must be enabled).
3. Put that App Password after `SMTP_PASS=` in `.env`. Do not put your normal Gmail password there.
4. Save `.env`, then start the server with `node server.js` from the project folder.
5. Open `http://localhost:3000/contact.html` and submit a test message.

The server is preconfigured for Gmail SMTP on port 465. It replies on the form with a success or delivery error message. The `/api/health` address reports whether an SMTP password is present.

For a public website, deploy the Node server to a Node.js hosting provider and set the same environment variables in its private environment settings. A static-only host cannot run the backend.
