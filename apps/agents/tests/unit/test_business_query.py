import pytest

from app.business.query import UnsafeQuery, validate_sql


def test_aceita_agregacao_somente_nas_tabelas_permitidas():
    sql = validate_sql(
        "SELECT s.name, SUM(o.total) AS total FROM orders o JOIN sellers s ON s.id=o.seller_id GROUP BY s.name"
    )
    assert "SUM(o.total)" in sql


@pytest.mark.parametrize(
    "sql",
    [
        "DELETE FROM orders",
        "SELECT * FROM orders; DROP TABLE orders",
        "WITH changed AS (DELETE FROM orders RETURNING *) SELECT * FROM changed",
        "SELECT pg_read_file('/etc/passwd') FROM orders",
        "SELECT pg_sleep(100) FROM orders",
        "SELECT * FROM pg_catalog.pg_authid",
        "SELECT * INTO stolen FROM orders",
        "SELECT * FROM orders FOR UPDATE",
        "SELECT public.sum(total) FROM orders",
        "SELECT 'orders'::regclass FROM orders",
    ],
)
def test_recusa_escritas_catalogos_e_funcoes_nao_permitidas(sql):
    with pytest.raises(UnsafeQuery):
        validate_sql(sql)
