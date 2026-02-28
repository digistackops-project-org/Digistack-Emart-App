use cart
db.createUser({
  user: "appuser",
  pwd: "Pa55Word",
  roles: [{ role: "readWrite", db: "cart" }]
})
