require("dotenv").config();
require("./server/init-db");
var path = require("path");
var express = require("express");
var app = require("./server/api");
var PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "client")));

app.get("/admin", function(req, res) {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("*", function(req, res) {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

app.listen(PORT, function() {
  console.log("AI宝贝 v2.0 port: " + PORT);
});
