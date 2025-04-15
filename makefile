PROJECT=bside-commons

.PHONY: up-local
start-local:
	docker compose -p ${PROJECT}_local -f compose.local.yaml up -d

.PHONY: stop-local
stop-local:
	docker compose -p ${PROJECT}_local -f compose.local.yaml down

.PHONY: clean-local
clean-local:
	docker compose -p ${PROJECT}_local -f compose.local.yaml down -v
