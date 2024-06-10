#!/bin/bash

yarn install
yarn build

docker compose -f packages/scenes-ml-app/docker-compose.yaml up -d --build

yarn dev
