use userdb
db.createUser({
  user: "appuser",
  pwd: "Pa55Word",
  roles: [
    { role: "readWrite", db: "userdb" }
  ]
})
