## Launch EC2 "t2.micro" Instance and In Sg, Open port "80" for nginx '3000' for react Application
# Frontend-react Web server

### Install Node.js
```
sudo yum install git -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 16
```
### Install Nginx

```
sudo yum install nginx -y
```
Start the Service
```
sudo systemctl start nginx
sudo systemctl enable nginx
```
Create Frontend Directory
```
sudo mkdir -p /var/www/frontend/
sudo chmod -R 755 /var/www/frontend/
```
## Get the Code
#### Create Application user to run the Applicatrion
```
sudo addgroup -S emart && sudo adduser -S emart -G emart
```
#### Create central Application Directory for Application
```
sudo mkdir /app
```
```
cd /app
sudo git clone https://github.com/digistackops-project-org/Digistack-Emart-App.git
cd Digistack-Emart-App
```
Switch branch

```
sudo git checkout V1-Login-Module
sudo chown -R emart:emart /app/Digistack-Emart-App
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

### Setup "nginx.conf" for reverse Proxy to backend, we already have "nginx.conf" file 

```
cd frontend
sudo mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
sudo mv /app/Digistack-Emart-App/frontend/nginx.conf /etc/nginx/
```
Edit your the Backend IP Address in nginx.conf
```
sudo vim /etc/nginx/nginx.conf
```
restart your Nginx
```
sudo nginx -t
sudo systemctl restart nginx
```
### Frontend Setup
Install Dependencies
### Add Environment .emv
```
sudo vim .env
```
```
REACT_APP_API='/api/v1'
```
```
npm install
```
Build the Frontend 
```
npm run build
```
Copy build/ to /var/www/html or Nginx root
```
sudo rm -rf /var/www/frontend/*
sudo mv build/* /var/www/frontend/
sudo systemctl restart nginx
```
