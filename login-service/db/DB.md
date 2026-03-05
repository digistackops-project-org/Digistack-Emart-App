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
