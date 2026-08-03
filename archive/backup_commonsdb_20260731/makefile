PROJECT=bside-commonsdb

.PHONY: start-local
start-local:
	docker compose -p ${PROJECT}_local -f compose.local.yaml up -d

.PHONY: stop-local
stop-local:
	docker compose -p ${PROJECT}_local -f compose.local.yaml down

.PHONY: clean-local
clean-local:
	docker compose -p ${PROJECT}_local -f compose.local.yaml down -v

.PHONY: start-dummbatz
deploy-dummbatz:
	docker compose -p ${PROJECT}_dummbatz -f compose.traefik.yaml up -d --build

.PHONY: stop-dummbatz
stop-dummbatz:
	docker compose -p ${PROJECT}_dummbatz -f compose.traefik.yaml down

.PHONY: clean-dummbatz
clean-dummbatz:
	docker compose -p ${PROJECT}_dummbatz -f compose.traefik.yaml down -v
