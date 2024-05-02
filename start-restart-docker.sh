#!/bin/sh
echo "Restart docker"

if [[ -z "${NODE_ENV}" ]]; then
  echo "NODE_ENV is not provided yet"
  echo "try this:  NODE_ENV=development bash start-restart-docker.sh"
  exit 125
fi

echo "------------------------------------------------"
ENV_FILE=.env.$NODE_ENV
DOCKER_COMPOSE_FILE=docker/docker-compose.$NODE_ENV.yml
echo "ENV_FILE:            $ENV_FILE"
echo "DOCKER_COMPOSE_FILE: $DOCKER_COMPOSE_FILE"
source $ENV_FILE
echo "------------------------------------------------"

echo ""
echo "down wirebill containers for $DOCKER_COMPOSE_FILE"
docker compose -p wirebill -f $DOCKER_COMPOSE_FILE down
echo ""
echo "pause 1 sec"
sleep 1
echo ""
echo "up wirebill containers for $DOCKER_COMPOSE_FILE"
docker compose -p wirebill -f $DOCKER_COMPOSE_FILE up -d --build
exit 0
