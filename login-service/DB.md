# Login/Cart DB Tier
### Launch EC2 "t2.micro" Instance and In Sg, Open port "27017" for MongoDB
# Install Mongo DB

### Create mondDB repo in YUM repository
```
sudo vim /etc/yum.repos.d/mongodb-org-8.0.repo
```
### Add MongoDB repo Details 
```
[mongodb-org-8.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/8.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-8.0.asc
```
### Install mongoDB
```
sudo yum update -y
sudo yum install -y mongodb-org
```
### Start mongoDB
```
sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl start mongod
sudo systemctl status mongod
```
## Setup MongoDB

#### Allow Remote Access
```
sudo vim /etc/mongod.conf
```
Replace 0.0.0.0 in bindIp
```
# network interfaces 
    net:   
       port: 27017   
       bindIp: 0.0.0.0 # to bind to all interfaces
```
##### Restart mongoDB
```
sudo systemctl restart mongod
```
### Setup Password for the Admin user in Database
Login to DB
```
mongosh
```
Connect to the admin database to create a user
```
use admin
```
Create a user "appuser" with read/write access to the 'user-account' database
```
db.createUser({
  user: "dbadmin",
  pwd:  "Pa55Word",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase",   db: "admin" }
  ]
});
```
Exit from DB
```
exit
```
####  Ensure Remote authorization is enabled for admin user in mongod.conf
```
sudo vim /etc/mongod.conf
```
Enable the authentication under security
```
 authorization: enabled
```
### Restart mongoDB
```
sudo systemctl start mongod
```
### Use mongo-compass in your Local Machine and try to access your MongoDB
```
mongodb://<your-AWS-Public-IP>:27017
```
