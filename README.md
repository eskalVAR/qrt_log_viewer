# Durhack 2023 Entry
This is a simple program to analyze remotely the QRT Logs as generated from the executable provided at Durhack2023

## webserver.js 
Connects to a Redis database and parses/indexes the data to the database and is designed to be run on the machine with logs. Logs are automatically parsed when detected or when changes are detected.

## search.js 
Acts as the back-end to the user-front also serving the user ejs. It also connects to the Redis database however is responsible for searching and aggregating the data in desired ways then serving it to the front

## index.js
Contains all the front-end logic for rquesting data, processing, and displaying it.

## Requirements
* Redis
* Node

## Install
``` npm install ```
then
```node webserver.js``` on the log generating machine.

```npm install``` then ```server.js``` + Redis instance on the back-end infrastructure.

On Arch Linux Redis can be installed from the package repo:

```pacman -S redis```

Then start the service:

```systemctl start redis```

No special Redis modules are required.

By default if running locally access the front-end through ```http://localhost:3000```
