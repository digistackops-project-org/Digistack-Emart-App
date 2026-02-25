## Launch EC2 "t2.micro" Instance and In Sg, Open port "27017" for MongoDB
# DB Tier
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
### Use mongo-compass in your Local Machine and try to access your MongoDB
```
mongodb://<your-AWS-Public-IP>:27017
```

# DB-Tier Setup
### Create Test Db for Integration Testing
Login to DB
```
mongosh
```
Connect to the admin database to create a user
```
use admin
```

Create  application's database "user-account"
```
use userdb_test
```
### Create PROD DB
we dont create PROD Db we use versioning and Migration Tool "Mongock" that will create Db and Schema in that automatically
If you want to know more about 
Exit from DB
```
exit
```
