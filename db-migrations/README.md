## Launch EC2 "t2.micro" Instance and In Sg, Open port "8080" for JAVA Application 
# Backend-JAVA Application server
This is Cart DB Migration we execute "java -jar DB_migration.jar" so that it will run and Create the DB schema and stop, Before start the cart service we need to Run these Db migration so that it will create the Required DB 
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
```

```
cd /app
sudo git clone https://github.com/digistackops-project-org/Digistack-Emart-App.git
cd Digistack-Emart-App
```
Switch branch

```
sudo git checkout V2-cart-Module
sudo chown -R $USER:$USER /app/Digistack-Emart-App
```
# Backend Setup
```
cd db-migrations
```


### Give DB configuration 
Edit your DB-Private IP Address HERE
```
sudo vim src/main/resources/application.yml
```
### Build the Code without execute the Test cases 
```
mvn clean package 
```
Run the Java -jar command
```
java -jar target/cart-db-migrations-1.0.0.jar
```
