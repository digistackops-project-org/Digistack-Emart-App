# Check the DB Connections
#### init the cart DB 
```
mongosh --quiet -u dbadmin -p "${ADMIN_PASS}" --authenticationDatabase admin < initdb.js
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
redis-cli -h <REDIS_SERVER_IP> -a <Redis-Password> ping
```
# Backend cart service Setup 
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
cd cart-service
sudo chown -R $USER:$USER /app/Digistack-Emart-App
```
# Step:4 ==> Download the Dependencies
#### Download the Dependencies
Once the Dependencies Downlaod "go.sum" file creatwe
```
go clean -modcache
go mod tidy
go mod download
```
# Step:5 ==> Build the Package
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
sudo chmod 640 /app/Digistack-Emart-App/backend/.env
sudo chown root:emart /app/Digistack-Emart-App/backend/.env
```

#### Increase the SWAP, because go build will consume memory
```
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfilev
```
### Run the Build Command
```
go build -p=1 -ldflags="-w -s -X main.version=1.0.0" \
-o cart-service ./cmd/server/main.go
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
WorkingDirectory=/app/Digistack-Emart-App/cart-service
ExecStart=/app/Digistack-Emart-App/cart-service
EnvironmentFile=/app/Digistack-Emart-App/cart-service/.env
Restart=always
RestartSec=5

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

# Step:7 ==> Smoke Test {Check your Application Health }
```
http://<cart-private=-IP>:8081/health/ready
http://<cart-private=-IP>:8081/health/ready
```


