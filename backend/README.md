## Launch EC2 "t2.micro" Instance and In Sg, Open port "8080" for JAVA Application 
# Backend-JAVA Application server

####  Install GIT
```
sudo yum install git -y
``` 

## Install JAVA
####  Installation of openJDK 17
```
sudo dnf update -y
sudo yum install java-17-amazon-corretto-devel -y
``` 

## Install Maven
```
sudo wget https://dlcdn.apache.org/maven/maven-3/3.9.12/binaries/apache-maven-3.9.12-bin.tar.gz
sudo tar xzf apache-maven-3.9.12-bin.tar.gz -C /opt
sudo ln -s apache-maven-3.9.12 /opt/maven
```
#### Create Profile for Maven  
```
sudo vi /etc/profile.d/maven.sh
```

```
export M2_HOME=/opt/maven
export PATH=${M2_HOME}/bin:${PATH}
```
#### Reload profile
```
sudo chmod +x /etc/profile.d/maven.sh
source /etc/profile.d/maven.sh
mvn -version
```


## Get the Code
### We keep application in one standard location. This is a usual practice that runs in the organization. Lets setup an app directory.
#### Create Application user to run the Applicatrion
```
sudo groupadd emart
sudo useradd -r -g emart -s /sbin/nologin emart
```
#### Create central Application Directory for Application
```
sudo mkdir -p /app/emart
sudo mkdir -p /var/log/emart

sudo chown -R emart:emart /app/emart
sudo chown -R emart:emart /var/log/emart
sudo chmod 750 /var/log/emart
```

```
git clone https://github.com/digistackops-project-org/Digistack-Emart-App.git
cd /Digistack-Emart-App
```
Switch branch

```
git checkout V1-Login-Module
```
# Backend Setup
```
cd backend
sudo chown -R $USER:$USER $(pwd)
```
### Note
HERE we Normal user dont have permissions for logs "/var/log/emart" & code base "Ematy app source code" 

Question-1 ==> if normal user doesn’t have access, how can we see access.log during an issue?
```
Correct Ways to Access Logs (Production Safe Methods)

🔹 Option 1: Use sudo (Recommended)

If your normal user is in the wheel group{means root like access}, so he can access the logs 

"sudo tail -f /var/log/emart/loginbackend.log"

🔹 Option 2: Add DevOps User to emart Group (Controlled Access)

"sudo usermod -aG emart devuser"

Then:
sudo chmod 750 /var/log/emart
sudo chmod 640 /var/log/emart/*.log

If your normal user is in the emart group, so he can access the logs 
```

# Deploy to Non-Prod Env
### Build the Code 
#### Run the Unit Test 
Coverage report: target/site/jacoco/index.html
Minimum coverage: 80% line coverage enforced by JaCoCo

```
mvn clean test
```
Build the Code without execute the Test cases 
```
mvn clean package -DskipTests -B
```
### generate JWT_Secret
```
openssl rand -base64 64
```
### create environment variable
```
cd /app/Digistack-Emart-App/backend
```
```
export MONGO_URI="mongodb://<DB-private-IP>:27017/userdb"
export SPRING_PROFILES_ACTIVE=staging
export JWT_SECRET="VeryStrongSecret"
```
Run the Java -jar command
```
java -jar login-service-1.0.0.jar
```
# Deploy to Prod Env
### Build the Code 
#### Run the Unit Test 
Coverage report: target/site/jacoco/index.html
Minimum coverage: 80% line coverage enforced by JaCoCo

```
mvn clean test
```
#### Run the Integration  Test 
Coverage report: target/site/jacoco/index.html
Minimum coverage: 80% line coverage enforced by JaCoCo
```
mvn verify -P integration-test
```
Build the Code without execute the Test cases 
```
mvn clean package -DskipTests -B
```
#### Run the API  Test 
Coverage report: target/site/jacoco/index.html
Minimum coverage: 80% line coverage enforced by JaCoCo
```
mvn test -P api-test -DAPI_BASE_URL=http://<Backend-Private-IP>:8080
```
#### Run All unit, Integration and API Test Cases
Coverage report: target/site/jacoco/index.html
Minimum coverage: 80% line coverage enforced by JaCoCo
```
mvn clean verify -P integration-test
```

### generate JWT_Secret
```
openssl rand -base64 64
```
Start Backend Application, for HA we use Linux service for Backend
```
unset MONGO_URI SPRING_PROFILES_ACTIVE JWT_SECRET
sudo vim /etc/systemd/system/loginbackend.service
```
```
[Unit]
Description=Emart Login Service
After=network.target

[Service]
User=emart
Environment="SPRING_PROFILES_ACTIVE=prod"
Environment="MONGO_URI=mongodb://<DB-Private-IP>:27017/userdb"
Environment="JWT_SECRET=VeryStrongSecretKey"
ExecStart=/usr/bin/java -jar /app/emart/login-service-1.0.0.jar
SuccessExitStatus=143
Restart=always

[Install]
WantedBy=multi-user.target

```
Enable the backens servive
```
sudo systemctl daemon-reload
sudo systemctl enable loginbackend
sudo systemctl start loginbackend
sudo systemctl status loginbackend
```
Why we pass Environmental Variables in "Backend.service" file why noy througj export Command or .env file
Because our Application is JAVA, it will alredy packaged through maven, so exports and .env will take the Linux Environment variable But HERE we need to pass the Variable to the  MAven PAckage so we use Environment variables in Service file so it will pass to the java -jar while running the Package
To check the Service Logs
```
journalctl -u loginbackend.service
```

#### Check your Application Health 

```
http://<Backend-Public-IP>:8080/health
http://<Backend-Public-IP>:8080/health/live
http://<Backend-Public-IP>:8080/health/ready
```
