.PHONY: keycloak-up keycloak-down keycloak-logs keycloak-export db-up

keycloak-up:
	docker compose up -d keycloak keycloak-db

keycloak-down:
	docker compose down

keycloak-logs:
	docker compose logs -f keycloak

keycloak-export:
	docker compose exec keycloak /opt/keycloak/bin/kc.sh export \
		--dir /opt/keycloak/data/import --realm commonsdb

db-up:
	docker compose up -d db