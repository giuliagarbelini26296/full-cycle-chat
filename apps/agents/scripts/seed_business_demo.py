"""Carga idempotente e exclusivamente fictícia. Não lê arquivos corporativos."""

import asyncio
import os

import asyncpg

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (id integer PRIMARY KEY, name text NOT NULL, active boolean NOT NULL);
CREATE TABLE IF NOT EXISTS sellers (id integer PRIMARY KEY, name text NOT NULL);
CREATE TABLE IF NOT EXISTS orders (
  id integer PRIMARY KEY, customer_id integer NOT NULL REFERENCES customers,
  seller_id integer NOT NULL REFERENCES sellers, ordered_at date NOT NULL,
  status text NOT NULL CHECK (status IN ('paid', 'pending', 'cancelled')),
  total numeric(14,2) NOT NULL CHECK (total >= 0)
);
INSERT INTO customers VALUES
 (1, 'Cliente Aurora (fictício)', true), (2, 'Cliente Horizonte (fictício)', true),
 (3, 'Cliente Lagoa (fictício)', false), (4, 'Cliente Jardim (fictício)', true)
ON CONFLICT DO NOTHING;
INSERT INTO sellers VALUES (1, 'Ana (fictícia)'), (2, 'Bruno (fictício)') ON CONFLICT DO NOTHING;
INSERT INTO orders VALUES
 (1, 1, 1, '2026-10-05', 'paid', 1000.50),
 (2, 2, 2, '2026-10-20', 'paid', 2499.50),
 (3, 1, 1, '2026-11-03', 'paid', 3250.25),
 (4, 4, 2, '2026-11-09', 'paid', 4500.75),
 (5, 2, 1, '2026-11-12', 'pending', 1200.00),
 (6, 3, 2, '2026-11-12', 'cancelled', 800.00)
ON CONFLICT DO NOTHING;
"""


async def main():
    connection = await asyncpg.connect(os.environ["BUSINESS_SEED_DATABASE_URL"])
    try:
        async with connection.transaction():
            await connection.execute(SCHEMA)
        print(
            "Base fictícia carregada: clientes, vendedores e pedidos de demonstração."
        )
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(main())
