const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const app = express();

app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");
const bcrypt = require("bcrypt");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//API for register new user
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `
  SELECT
    *
  FROM
    user
  WHERE
    username = '${username}';
  `;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    //check password length
    const lengthOfPassword = password.length;
    if (lengthOfPassword < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      //Create new user
      const createUserQuery = `
     INSERT INTO 
        user (username, name, password, gender, location)
    VALUES 
        ('${username}',
        '${name}',
        '${hashedPassword}',
        '${gender}',
        '${location}'
        );
     `;

      await db.run(createUserQuery);
      response.send("User created successfully");
    }
  } else {
    //username already exists
    response.status(400);
    response.send("User already exists");
  }
});

//API for login user
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `
  SELECT
    *
  FROM
    user
  WHERE
    username = '${username}';
  `;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    //User doesn't exist
    response.status(400);
    response.send("Invalid user");
  } else {
    //Compare password with db password

    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API for change password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const selectUserQuery = `
  SELECT
    *
  FROM
    user
  WHERE
    username = '${username}';
  `;

  const dbUser = await db.get(selectUserQuery);
  //First we have to know whether the user exists in database or not
  if (dbUser === undefined) {
    //User doesn't exist
    response.status(400);
    response.send("User not registered");
  } else {
    //Compare password with db password

    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);

    if (isValidPassword === true) {
      //check length of the new password
      const lengthOfNewPassword = newPassword.length;
      if (lengthOfNewPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        //change password with new one
        const encryptedPassword = await bcrypt.hash(newPassword, 10);

        const changePasswordQuery = `
        UPDATE
            user
        SET
            password = '${encryptedPassword}'
        WHERE
            username = '${username}';
        `;

        await db.run(changePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
