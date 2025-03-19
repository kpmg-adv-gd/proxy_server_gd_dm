const basicAuth = require("basic-auth");
const CPI_CRED = JSON.parse(process.env.CPI_CRED);

const authMiddlewareCPI = (req, res, next) => {
    const user = basicAuth(req);
    const expectedUsername = CPI_CRED.USERNAME;
    const expectedPassword = CPI_CRED.PASSWORD;

    if (!user || user.name !== expectedUsername || user.pass !== expectedPassword) {
        return res.status(401).send(`
            <error>
                <status>401</status>
                <message>AccessDenied</message>
            </error>
        `);
    }

    next(); // Passa al prossimo middleware se l'utente è autenticato
};

module.exports = { authMiddlewareCPI };
