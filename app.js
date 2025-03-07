const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const fs = require("fs");
const { parse } = require("json2csv");

const app = express();
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "Pass@123&4",
    resave: false,
    saveUninitialized: true,
  })
);

// Dummy users database
let users = [
  {
    userUniqueId: "36",
    userName: "Meharsh Chandure",
    userEmail: "user_meharsh@gmail.com",
    userAge: "20",
    role: "user",
  },
  {
    userUniqueId: "13",
    userName: "Radhika Shukla",
    userEmail: "admin_radhika@gmail.com",
    userAge: "21",
    role: "admin",
  },
  {
    userUniqueId: "04",
    userName: "Nitya Joshi",
    userEmail: "user_nitya@gmail.com",
    userAge: "20",
    role: "user",
  },
];

// Middleware for authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect("/login");
};

// Middleware for admin-only access
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") return next();
  res.send("Permission Denied!");
};

// Home Route (Admin Dashboard)
app.get("/", isAuthenticated, (req, res) => {
  if (req.session.user.role === "user") {
    return res.redirect("/profile"); // Redirect users to profile
  }

  // If admin, render the admin dashboard
  const sortedUsers = users.sort(
    (a, b) => Number(a.userUniqueId) - Number(b.userUniqueId)
  );
  res.render("home", { data: sortedUsers, userRole: req.session.user.role });
});

// Route to Download Users as CSV
app.get("/download", isAuthenticated, isAdmin, (req, res) => {
  try {
    const csv = parse(users, {
      fields: ["userUniqueId", "userName", "userEmail", "userAge", "role"],
    });

    res.header("Content-Type", "text/csv");
    res.attachment("users.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).send("Error generating CSV");
  }
});

// Profile Page (Users)
app.get("/profile", isAuthenticated, (req, res) => {
  res.render("profile", { user: req.session.user });
});

// Login Page
app.get("/login", (req, res) => res.render("login"));

// Handle Login
app.post("/login", (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.render("login", { error: "Please enter email and password." });
  }

  email = email.trim().toLowerCase(); // Normalize email

  if (email.startsWith("user_") && email.endsWith("@gmail.com")) {
    if (password === "user123") {
      req.session.user = { email, role: "user" };
      return res.redirect("/profile");
    } else {
      return res.render("login", { error: "Incorrect password for user." });
    }
  } else if (email.startsWith("admin_") && email.endsWith("@gmail.com")) {
    if (password === "admin123") {
      req.session.user = { email, role: "admin" };
      return res.redirect("/");
    } else {
      return res.render("login", { error: "Incorrect password for admin." });
    }
  } else {
    return res.render("login", {
      error:
        "Invalid email format. Use user_<username>@gmail.com or admin_<username>@gmail.com",
    });
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Add User (Admin Only)
app.post("/add", isAuthenticated, isAdmin, (req, res) => {
  const { userUniqueId, userName, userEmail, userAge, role } = req.body;
  if (!userUniqueId || !userName || !userEmail || !userAge || !role) {
    return res.send("All fields are required!");
  }

  users.push({ userUniqueId, userName, userEmail, userAge, role });
  res.redirect("/");
});

// Delete User (Admin Only)
app.post("/delete", isAuthenticated, isAdmin, (req, res) => {
  users = users.filter((user) => user.userUniqueId !== req.body.userUniqueId);
  res.redirect("/");
});

// Render Update Page (Admin Only)
app.get("/update/:id", isAuthenticated, isAdmin, (req, res) => {
  const user = users.find((u) => u.userUniqueId === req.params.id);
  if (!user) return res.send("User not found!");

  res.render("update", { user });
});

// Update User (Admin Only)
app.post("/update", isAuthenticated, isAdmin, (req, res) => {
  const { userUniqueId, userName, userEmail, userAge, role } = req.body;
  users = users.map((user) =>
    user.userUniqueId === userUniqueId
      ? { userUniqueId, userName, userEmail, userAge, role }
      : user
  );

  res.redirect("/");
});

// Start Server
app.listen(3000, () => console.log("App is running on port 3000"));
