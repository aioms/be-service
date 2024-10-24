# DOCKER

```
docker-compose up -d
```

## Backup database from docker volume

```
docker cp aios-postgres-db:/var/lib/postgresql/data ./backup
```

## Restore database from docker volume

```
docker cp ./backup aios-postgres-db:/var/lib/postgresql/data
```

# DEVELOPMENT

## Start app

```
deno task dev
```

## Generate migrations

```
deno task gen:migrations
```

## Run migrations

```
deno task run:migrations
```
