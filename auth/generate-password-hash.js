const crypto = require("crypto");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

(async function main() {
    const password = await ask("Password: ");
    rl.close();

    if (!password) {
        console.error("Password is required.");
        process.exit(1);
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    const sessionSecret = crypto.randomBytes(32).toString("hex");

    console.log(JSON.stringify({
        username: "adminsemesta",
        passwordHash: "scrypt:" + salt + ":" + hash,
        sessionSecret
    }, null, 2));
})();
