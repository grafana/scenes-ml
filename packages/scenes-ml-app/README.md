# Grafana Scenes ML extension demo app

## What is this?

This is a small Grafana app plugin built to demonstrate some of the functionality provided by scenes-ml, and to aid development.

## How to run this app?

### Using provided docker compose

1. From Scenes ML root directory run `./scripts/demo.sh`
1. Navigate to [http://localhost:3001/a/grafana-scenes-ml-app](http://localhost:3001/a/grafana-scenes-ml-app)

### Using local Grafana instance

1. Modify Grafana config to load demo app plugin, i.e.

   ```ini
   # Grafana custom.ini
   [plugin.grafana-scenes-ml-app]
   path=<your-path>/scenes-ml/packages/scenes-ml-app
   ```

1. Use [provided datasource provisioning](./provisioning//datasources/default.yaml) file to setup required data source.
1. Run `yarn dev:app` from the root of this repository.
1. Navigate to [http://localhost:3000/a/grafana-scenes-ml-app/](http://localhost:3000/a/grafana-scenes-ml-app/)

For more details, checkout `package.json`, `docker-compose.yaml`, and the provisioning directory.
