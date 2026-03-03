# Frontend-react Web server
## Launch EC2 "t2.micro" Instance and In Sg, Open port "80" for nginx '3000' for react Application
# Step:1 ==> Install the Required packages
#### Install Node.js
```
sudo yum install git -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 16
```
#### Install Nginx

```
sudo yum install nginx -y
```
##### Start the Service
```
sudo systemctl start nginx
sudo systemctl enable nginx
```
# Step:2 ==> Create one Application User
#### Create Application user to run the Applicatrion
```
sudo groupadd -r emart
sudo useradd -r -g emart -s /sbin/nologin emart
```
#### Create central Application Directory for Application
```
sudo mkdir /app
```
#### Create Frontend Directory
```
sudo mkdir -p /var/www/frontend/
sudo chmod -R 755 /var/www/frontend/
sudo chown -R  emart:emart /var/www/frontend/
```
# Step:3 ==> Get the Code
Our Code we store in GIT Repo
```
cd /app
sudo git clone https://github.com/digistackops-EMART-project/Digistack-Emart-App.git
cd Digistack-Emart-App
```
Switch branch

```
sudo git checkout V1-Login-Module
sudo chown -R $USER:$USER /app/Digistack-Emart-App
```
Note => Nginx we we for 2 purpose 
        (1) For Frontend Load Balancing 
        (2) For Backend Reverse Proxy

when we hit our Application using frontend URL it connect to Backend using we mentioned URL in the same Browser
--> As of now we pass "Backend-Public-IP" => so Browser our App from frontend it will connect to our Backend using Public IP {because from Browser public-Ip is accessable}, but it is a security Breach or Not accesptable in Production
--> if we pass the Backend Private-IP {Private-IP not allowed to access from Browser, private -Ip are for internal communication}, But pasing Backend Private-IP is the good practice

For that we use "Reverse Proxy" concept in Frontend 
HERE we mention our Backend-Private-IP in reverse Proxy configuration => so that when request came to frontend then it will redirect to Backend Internally through reverse proxy using Private-IP only

Note ==> we already setup the Reverse Proxy using Nginx alredy setup "nginx.conf" no need to do anything

## Setup "nginx.conf" for reverse Proxy to backend, we already have "nginx.conf" file 

```
cd frontend
sudo mv /app/Digistack-Emart-App/frontend/emart.conf /etc/nginx/conf.d
```
Edit your the Backend IP Address in nginx.conf
```
sudo vim /etc/nginx/conf.d/emart.conf
```
restart your Nginx
```
sudo nginx -t
sudo systemctl restart nginx
```
# Step:4 ==> Download the Dependencies
Install Dependencies
### Add Environment .emv
```
sudo vim .env
```
```
REACT_APP_API='/api/v1'
```
```
npm ci --prefer-offline --silent
```
# Step:5 ==> Build the Package
Run the Test cases
```
npm test -- --watchAll=false
```
Run the Test cases with coverage, Coverage report: coverage/lcov-report/index.html
```
npm run test:coverage
```
Build the Frontend 
```
npm run build
```
# Step:6 ==> Run the Package
Copy build/ to /var/www/html or Nginx root
```
sudo rm -rf /var/www/frontend/*
sudo mv build/* /var/www/frontend/
sudo systemctl restart nginx
```
# Step:7 ==> Smoke Test {Check your Application Health }
```
curl -sf http://<Frontend-private=-IP>:80
```
