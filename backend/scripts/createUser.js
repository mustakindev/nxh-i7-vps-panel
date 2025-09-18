const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const db = new sqlite3.Database("./db.sqlite");

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

(async () => {
  try {
    const username = await ask("👤 Enter username: ");
    const password = await ask("🔑 Enter password: ");
    const role = await ask("⚙️ Role (admin/user): ");

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, hashedPassword, role || "user"],
      function (err) {
        if (err) {
          console.error("❌ Error creating user:", err.message);
        } else {
          console.log(`✅ User '${username}' created with role '${role}'`);
        }
        db.close();
        rl.close();
      }
    );
  } catch (err) {
    console.error("❌ Failed:", err);
    rl.close();
  }
})();
