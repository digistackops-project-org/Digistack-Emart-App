# Backend-Node.js Application server
## Launch EC2 "t2.micro" Instance and In Sg, Open port "8082" for NodeJS Application 
# Step:1 ==> Install the Required packages
#### Install Node and NPM
```
sudo yum update -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 16
```
#### Check Node Version
```
node -v
npm -v
```
#### Install Git
```
sudo yum install git -y
```
# Step:2 ==> Create one Application User
#### Create Application user to run the Applicatrion
```
sudo groupadd -r emart
sudo useradd -r -g emart -s /sbin/nologin roboshop
```
# Step:3 ==> Get the Code
### We keep application in one standard location. This is a usual practice that runs in the organization. Lets setup an app directory.
```
sudo mkdir -p /app
```

#### To start this application first you can get the code using below url
##### Clone the Repo
```
cd /app
sudo git clone https://github.com/digistackops-nodejs-org/NodeJS_3-Tier_Roboshop.git
cd NodeJS_3-Tier_Roboshop
```
##### Switch to Local-setup Branch
```
sudo git checkout 01-Local-setup-Prod
```
## Setup your Application Database by executing "master-data.js" script from Application-server

Step:1 ==> install "mongo-Client" for communicate with Mongo Database

```
sudo vim /etc/yum.repos.d/mongodb-org-8.0.repo
```
```
[mongodb-org-8.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/8.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-8.0.asc
```
To install "Mongo-Shell" to communicate with Mongo database
```
sudo yum update -y
sudo yum install -y mongodb-mongosh
```
Step:2 ==> Execute your "master-data.js" script for your Application DB setup

```
mongo --host "mongodb://<DB-Private-IP>" < /app/NodeJS_3-Tier_Roboshop/catalouge/db/master-data.js
```

 # Step:4 ==> Download the Dependencies

Get the Dependencies
```
cd /app/NodeJS_3-Tier_Roboshop/catalouge/
npm install
```
# Step:5 ==> RUN the Package
Run the systemd file for running cart service
```
sudo vim /etc/systemd/system/backend.service
```
```
[Unit]
Description = Catalogue Service

[Service]
User=roboshop
Environment=MONGO=true
Environment=MONGO_URL="mongodb://<MONGODB-Private-IP>:27017/catalogue"
ExecStart=/bin/node /app/server.js
SyslogIdentifier=catalogue

[Install]
WantedBy=multi-user.target
```

Reload systemd service
```
sudo systemctl daemon-reload
sudo systemctl enable backend
sudo systemctl start backend
sudo systemctl status backend
```


 # Roboshop-catalogue
catalogue Module Code for Roboshop Project
