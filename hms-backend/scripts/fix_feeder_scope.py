import psycopg2
from psycopg2.extras import RealDictCursor

DSN = {
    "dbname": "taskforce",
    "user": "taskforce",
    "password": "Taskforce-Multi#32",
    "host": "taskforce.ch4kymie8ss9.ap-south-1.rds.amazonaws.com",
    "port": 5432,
    "sslmode": "require",
}


def main():
    print("=== BACKFILL NULL TASKFORCE FEEDER SCOPE ===")
    with psycopg2.connect(**DSN, cursor_factory=RealDictCursor) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, "cityId", "requestedById"
                FROM "TaskforceFeederPoint"
                WHERE "zoneId" IS NULL OR "wardId" IS NULL;
                """
            )
            rows = cur.fetchall()
            print(f"Found {len(rows)} feeder points with missing zone/ward.")
            for row in rows:
                cur.execute(
                    """
                    SELECT "zoneIds", "wardIds"
                    FROM "UserCity"
                    WHERE "userId"=%s AND "cityId"=%s AND role='EMPLOYEE'
                    LIMIT 1;
                    """,
                    (row["requestedById"], row["cityId"]),
                )
                scope = cur.fetchone()
                zone_ids = (scope or {}).get("zoneIds") or []
                ward_ids = (scope or {}).get("wardIds") or []
                if not zone_ids or not ward_ids:
                    print(f"SKIP {row['id']} - no employee scope found")
                    continue
                cur.execute(
                    """
                    UPDATE "TaskforceFeederPoint"
                    SET "zoneId"=%s, "wardId"=%s, "updatedAt"=NOW()
                    WHERE id=%s;
                    """,
                    (zone_ids[0], ward_ids[0], row["id"]),
                )
                print(f"UPDATED {row['id']} -> zone {zone_ids[0]}, ward {ward_ids[0]}")
        conn.commit()


if __name__ == "__main__":
    main()
