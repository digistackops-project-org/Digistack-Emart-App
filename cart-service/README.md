### Install go Dependencies
```
sudo yum update -y
sudo yum install -y golang
```
### Check go version
```
go version
```

# Build the cart Applicatiom

```
sudo mkdir /app
cd /app
sudo git clone https://github.com/digistackops-project-org/Digistack-Emart-App.git
cd Digistack-Emart-App
```
Switch the Branch
```
sudo git checkout V2-cart-Module
cd cart-service
sudo chown -R $USER:$USER /app/Digistack-Emart-App
```
Download the Dependencies
```
go clean -modcache
go mod tidy
```
Build the Package
```
go build -ldflags="-w -s -X main.version=1.0.0" \
-o cart-service ./cmd/server/main.go
```
# Run the cart Application
### Set the Environment Variables
```
sudo vim /opt/emart/cart/.env
```
```
APP_ENV=prod
GIN_MODE=release
SERVER_PORT=8081

MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE=cart

REDIS_ADDR=localhost:6379
REDIS_PASSWORD=

JWT_SECRET=SuperStrongSecretKey
```
#### Set ownership to your .env file 
```
sudo chown emart:emart /opt/emart/cart/.env
```
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
ExecStart=/opt/emart/cart/cart-service
EnvironmentFile=/opt/emart/cart/.env
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

#### Verify the HealthCheck
```
http://<cart-private=-IP>:8081/health/ready
http://<cart-private=-IP>:8081/health/ready
```


