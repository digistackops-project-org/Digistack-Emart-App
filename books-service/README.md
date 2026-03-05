# Backend-Node.js Application server
## Launch EC2 "t2.micro" Instance and In Sg, Open port "8082" for NodeJS Application 
# RUN DB Migration using flyway tool
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
sudo git clone https://github.com/digistackops-EMART-project/Digistack-Emart-App.git
cd Digistack-Emart-App
```
##### Switch to Local-setup Branch
```
sudo git checkout V2-Books-Module
```


# Step:4 ==> Download the Dependencies

Get the Dependencies
```
cd /app/Digistack-Emart-App/books-service
npm install
```
# Step:5 ==> RUN the Package
Run the systemd file for running cart service
```
sudo vim /etc/systemd/system/books.service
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
sudo systemctl enable books
sudo systemctl start books
sudo systemctl status books
```
