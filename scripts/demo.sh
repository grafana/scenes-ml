#!/bin/bash

yarn install
yarn build

docker compose -f packages/scenes-ml-app/docker-compose.yml up -d --build

yarn dev
