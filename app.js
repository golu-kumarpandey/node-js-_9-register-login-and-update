const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dbPath = path.join(__dirname, "userData.db");
const app = express();
app.use(express.json());
let db = null;

// initialize database
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    console.log("Database connected successfully !!");

    app.listen(3000, () => {
      console.log("server listening at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error ${e.massage}`);
    process.exit(1);
  }
};
initializeDbAndServer();

// API 1: register user

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const lengthOfPassword = password.length;

  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQueries = `
    SELECT * FROM user WHERE username = '${username}'
    `;
  const dbUser = await db.get(selectUserQueries);

  switch (true) {
    case dbUser !== undefined:
      response.status(400);
      response.send("User already exists");
      break;

    case lengthOfPassword < 5:
      response.status(400);
      response.send("Password is too short");
      break;

    default:
      const AddDbUser = `
         insert into user(username,name,password,gender,location)
         values 
         (
             '${username}',
             '${name}',
             '${hashedPassword}',
             '${gender}',
             '${location}'
         )
      `;
      await db.run(AddDbUser);
      response.send("User created successfully");
      break;
  }
});

// API 2 : login user

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const lengthOfPassword = password.length;

  const selectUserQueries = `
         SELECT * FROM user WHERE username = '${username}'
        `;

  const dbUser = await db.get(selectUserQueries);
  console.log(dbUser);

  switch (true) {
    case dbUser === undefined:
      response.status(400);
      response.send("Invalid user");
      break;

    case (await bcrypt.compare(password, dbUser.password)) === false:
      response.status(400);
      response.send("Invalid password");
      break;

    default:
      response.status(200);
      response.send("Login success!");

      break;
  }
});

// API 3 : update password

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQueries = `
         SELECT * FROM user WHERE username = '${username}'
        `;

  const dbUser = await db.get(selectUserQueries);
  if (dbUser !== undefined) {
    const matchPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (matchPassword === false) {
      response.status(400);
      response.send("Invalid current password");
    } else {
      const lengthOfPassword = newPassword.length;
      if (lengthOfPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQueries = `
                UPDATE user 
                SET 
                password = '${hashedPassword}' 
                WHERE 
                username = '${username}'
              `;
        await db.run(updatePasswordQueries);
        response.status(200);
        response.send("Password updated");
      }
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

module.exports = app;
