# Books/course/software DB Tier
### Launch EC2 "t2.micro" Instance and In Sg, Open port "27017" for MongoDB
## Install postgressql  DB
```
sudo dnf update -y
sudo dnf install -y postgresql16-server
which postgresql-setup
```
Initialize the database
```
sudo /usr/bin/postgresql-setup --initdb
```
<img width="579" height="52" alt="image" src="https://github.com/user-attachments/assets/a703cae2-1f67-4e7f-8700-6219399d0021" />


```
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Setup postgressql DB

#### Allow Remote Host connect to DB
1. Edit the "postgresql.conf" file in path "/var/lib/pgsql/data/postgresql.conf"
```
sudo vim /var/lib/pgsql/data/postgresql.conf
```
ADD these Under connection settings
```
listen_addresses = '*'
```

2. Edit the "pg_hba.conf" file in path "/var/lib/pgsql/data/pg_hba.conf"

```
sudo vim /var/lib/pgsql/data/pg_hba.conf
```
Edit IPV4 Local Connection Method from ident to md5 these lines 
```
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
```
Also add these lines for the Password for the User "appuser" so we need to mention these line, take these password for the user "appuser" for DB "user-account" form any IP
```
# Allow remote user connections from a single IP
host    all             all             0.0.0.0/0          md5
```

Also add these lines We encrypt the Password for the User "appuser" so we need to mention these line, take these encrypetd password for the user "appuser" for DB "user-account" form any IP
```
host    all             all             0.0.0.0/0          scram-sha-256 
```

Restart postgressql DB
```
sudo systemctl restart postgresql
```
#### Create DB and User in database

Switch to postgres User
```
sudo -i -u postgres
```
Login to DB promt
```
psql
```
Change the Passordward for postgres User

```
ALTER USER postgres WITH PASSWORD 'NewStrongPasswordHere';
```

```
SELECT VERSION();
```

### Create one Databse Admin User for our DB
Create DnB admin user (role) with login password
```
CREATE ROLE dbadmin WITH LOGIN PASSWORD 'Admin@123';
```
Grant all privileges on all databases
```
GRANT ALL PRIVILEGES ON DATABASE postgres TO dbadmin;
```
Grant ability to create new databases and roles (similar to WITH GRANT OPTION)
```
ALTER ROLE dbadmin CREATEDB CREATEROLE SUPERUSER;
```


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

# Redis Setup

### Install Redis server
```
sudo dnf install -y  redis6
```
### Enable redis Systemd service
```
sudo systemctl enable redis6
sudo systemctl start redis6
sudo systemctl status redis6
```
### Setup Redis server
```
sudo vim /etc/redis6/redis6.conf
```
HERE find the below things and edit these
1. "requirepass" and edit your Strong password There
2. bind 127.0.0.1 ::1 to bind 0.0.0.0
3. Keep the Protected Mode Enabled "protected-mode yes"
```
bind 0.0.0.0
requirepass StrongRedisPassword123
protected-mode yes
```
### Restart redis Systemd service
```
sudo systemctl restart redis6
sudo systemctl status redis6
```
#### Recommended Production Redis Settings {optional but IMP in PROD}
```
sudo vim /etc/redis6/redis6.conf
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
sudo systemctl restart redis6
sudo systemctl status redis6
```
