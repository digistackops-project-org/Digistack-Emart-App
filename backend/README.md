## Launch EC2 "t2.micro" Instance and In Sg, Open port "8080" for Python Application 
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
sudo mkdir /app
sudo mkdir -p /var/log/emart
sudo chown emart:emart /var/log/emart
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
# Backend Setup
```
cd backend
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
ExecStart=/usr/bin/java -jar /opt/emart/emart-login-service.jar
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
