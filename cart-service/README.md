# Backend cart service Setup 
Launch EC2 "t3.small" Instance and In Sg, Open port "8081" for go Application, (go need much CPU)
# Step:1 ==> Install the Required packages
```
sudo yum update -y
sudo yum install -y golang
```
### Check go version
```
go version
```
# Step:2 ==> Create one Application User
#### Create Application user to run the Applicatrion
```
sudo groupadd -r emart
sudo useradd -r -g emart -s /sbin/nologin emart
```
# Step:3 ==> Get the Code
### We keep application in one standard location. This is a usual practice that runs in the organization. Lets setup an app directory.

```
sudo mkdir -p /app
sudo mkdir -p /opt/emart/cart/
sudo mkdir -p /var/log/emart

sudo chown -R emart:emart /opt/emart/cart/
sudo chown -R emart:emart /var/log/emart
sudo chmod 750 /var/log/emart
```
#### our code is in Git Repo 
```
cd /app
sudo git clone https://github.com/digistackops-EMART-project/Digistack-Emart-App.git
cd Digistack-Emart-App
```
Switch the Branch
```
sudo git checkout V2-cart-Module
```
Create a bin directory Building package will crate in that Directory {like in Java targert folder}
```
cd cart-service
sudo mkdir -p bin
sudo chown -R $USER:$USER /app/Digistack-Emart-App
```
## connect the DB
## Setup your Application Database by executing "initdb.js" script from Application-server

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
### init the cart DB 
```
mongosh --quiet --host <cart_Db_Private_IP>-u dbadmin -p "${ADMIN_PASS}" --authenticationDatabase admin < initdb.js
```
#### Test the connection between cart and Redis server
 Install Redis server
```
sudo dnf install -y  redis6
```
Enable redis Systemd service
```
sudo systemctl enable redis6
sudo systemctl start redis6
sudo systemctl status redis6
```
#### Test the connection
```
redis6-cli -h <REDIS_SERVER_IP> -a <Redis-Password> ping
```
# Step:4 ==> Download the Dependencies
#### Increase the SWAP, because go build will consume memory {optional not required in Higher Machine PROD}
```
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfilev
```
#### Download the Dependencies
Once the Dependencies Downlaod "go.sum" file creatwe
```
go clean -modcache
go mod tidy
go mod download
```
# Step:5 ==> Build the Package
#### generate JWT_Secret
```
openssl rand -base64 64
```
### Set the Environment Variables
```
sudo vim /app/Digistack-Emart-App/cart-service/.env
```
```
APP_ENV=prod
GIN_MODE=release
SERVER_PORT=8081

MONGO_URI=mongodb://<cart_Db_Private_IP>:27017
MONGO_DATABASE=cart

REDIS_ADDR=<Redis_Private_IP>:6379
REDIS_PASSWORD=<redis=-Password>

JWT_SECRET=SuperStrongSecretKey
```
#### Set ownership to your .env file 
```
sudo chmod 640 /app/Digistack-Emart-App/cart-service/.env
sudo chown root:emart /app/Digistack-Emart-App/cart-service/.env
```

### Build the package without Test case execution
```
go build -p=1 -ldflags="-w -s -X main.version=1.0.0" \
-o bin/cart ./cmd/server/main.go
```
## Build the Package as per industry Standards

### Unit Test cases
```
go test ./tests/unit/... \
 -v \
-count=1 \
-coverprofile=coverage.unit.out \
-covermode=atomic \
-timeout=2m
```
Generate coverage report
```
 go tool cover -html=coverage.unit.out -o coverage.unit.html
 go tool cover -func=coverage.unit.out | tail -1
```
### Integration Test
```
go test ./tests/integration/... \
-v \
-count=1 \
-coverprofile=coverage.integration.out \
-timeout=10m \
-tags=integration
```
### Build the package
```
sudo rm -rf bin/*
go build -p=1 -ldflags="-w -s -X main.version=1.0.0" \
-o bin/cart ./cmd/server/main.go
```

#### Give permissions for "emart" user to RUN the Package
```
sudo cp /app/Digistack-Emart-App/cart-service/bin/cart  /opt/emart/cart/cart
sudo chown emart:emart /opt/emart/cart/cart
```
# Step:6 ==> Run the Package
## Run the systemd file for running cart service
```
sudo vim /etc/systemd/system/Emartcart.service
```
```
[Unit]
Description=Emart Cart Service
After=network.target mongod.service redis.service

[Service]
User=emart
Group=emart
WorkingDirectory=/opt/emart/cart
EnvironmentFile=/app/Digistack-Emart-App/cart-service/.env

ExecStart=/opt/emart/cart/cart

Restart=always
RestartSec=5

StandardOutput=append:/var/log/emart/cart-service.log
StandardError=append:/var/log/emart/cart-service.log

[Install]
WantedBy=multi-user.target
```
Reload systemd service
```
sudo systemctl daemon-reload
sudo systemctl enable Emartcart
sudo systemctl start Emartcart
sudo systemctl status Emartcart
```

### API test 

```
go test ./tests/api/... -v -timeout=5m
```

# Step:7 ==> Smoke Test {Check your Application Health }
```
curl -sf http://<cart-private=-IP>:8081/health
curl -sf http://<cart-private=-IP>:8081/health/live
curl -sf http://<cart-private=-IP>:8081/health/ready
```


