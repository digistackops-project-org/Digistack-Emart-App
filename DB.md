
# DB Tier
## Launch EC2 "t2.micro" Instance and In Sg, Open port "27017" for MongoDB
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

# Redis Setup

### Install Redis server
```
sudo yum install -y  redis-server
```
### Enable redis Systemd service
```
sudo systemctl enable redis
sudo systemctl start redis
sudo systemctl status redis
```
### Setup Redis server
```
sudo vim /etc/redis/redis.conf
```
HERE find the below things and edit these
1. "requirepass" and edit your Strong password There
2. bind 127.0.0.1 ::1 to bind 0.0.0.0
3. Keep the Protected Mode Enabled "protected-mode yes"
```
requirepass StrongRedisPassword123
bind 0.0.0.0
protected-mode yes
```
### Restart redis Systemd service
```
sudo systemctl restart redis
sudo systemctl status redis
```
#### Recommended Production Redis Settings {optional but IMP in PROD}
```
sudo vim /etc/redis/redis.conf
```
Set memory Limit
```
maxmemory 512mb
maxmemory-policy allkeys-lru
```
Enable AOF persistence (recommended for durability):
```
appendonly yes
```
##### Restart redis Systemd service
```
sudo systemctl restart redis
sudo systemctl status redis
```
# Test the connection

### Test the connection from cart server
Login to your Cart server
```
redis-cli -h <REDIS_SERVER_IP> -a <Redis-Password> ping
```
