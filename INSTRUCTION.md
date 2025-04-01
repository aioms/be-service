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
deno task db:generate
```
┌────────────────────────┐                  
│ $ drizzle-kit generate │                  
└─┬──────────────────────┘                  
  │                                           
  └ 1. read previous migration folders
    2. find diff between current and previous scheama
    3. prompt developer for renames if necessary
  ┌ 4. generate SQL migration and persist to file
  │    ┌─┴───────────────────────────────────────┐  
  │      📂 drizzle       
  │      ├ 📂 _meta
  │      └ 📜 0000_premium_mister_fear.sql
  v


## Run migrations

```
deno task db:migrate
```
┌───────────────────────┐                  
│ $ drizzle-kit migrate │                  
└─┬─────────────────────┘                  
  │                                                         ┌──────────────────────────┐                                         
  └ 1. reads migration.sql files in migrations folder       │                          │
    2. fetch migration history from database -------------> │                          │
  ┌ 3. pick previously unapplied migrations <-------------- │         DATABASE         │
  └ 4. apply new migration to the database ---------------> │                          │
                                                            │                          │
                                                            └──────────────────────────┘
[✓] done!        


## Push migration

```
deno task db:push
```
┌─────────────────────┐                  
│ ~ drizzle-kit push  │                  
└─┬───────────────────┘                  
  │                                           ┌──────────────────────────┐
  └ Pull current datatabase schema ---------> │                          │
                                              │                          │
  ┌ Generate alternations based on diff <---- │         DATABASE         │
  │                                           │                          │
  └ Apply migrations to the database -------> │                          │
                                       │      └──────────────────────────┘
                                       │
  ┌────────────────────────────────────┴────────────────┐
   create table users(id serial primary key, name text);
