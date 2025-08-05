docker-compose --profile="*" down
docker volume ls|grep paydash|awk -F ' ' '{print $2}'|xargs docker volume rm
docker-compose --profile=infra up -d 
