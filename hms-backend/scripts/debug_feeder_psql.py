import json
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
    print("=== TASKFORCE FEEDER DB SNAPSHOT ===")
    with psycopg2.connect(**DSN, cursor_factory=RealDictCursor) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, "cityId", "zoneId", "wardId", "requestedById", "createdAt", status
                FROM "TaskforceFeederPoint"
                ORDER BY "createdAt" DESC
                LIMIT 10;
                """
            )
            feeders = cur.fetchall()
            print("Latest feeder points (10):")
            for idx, f in enumerate(feeders):
                print(f"[{idx}] {json.dumps(f, default=str)}")

            print("\nEmployee scopes for above feeders:")
            for f in feeders:
                cur.execute(
                    """
                    SELECT "zoneIds", "wardIds"
                    FROM "UserCity"
                    WHERE "userId"=%s AND "cityId"=%s AND role='EMPLOYEE'
                    LIMIT 1;
                    """,
                    (f["requestedById"], f["cityId"]),
                )
                scope = cur.fetchone() or {"zoneIds": [], "wardIds": []}
                zone_ids = scope.get("zoneIds") or []
                ward_ids = scope.get("wardIds") or []
                print(
                    json.dumps(
                        {
                            "feederId": f["id"],
                            "cityId": f["cityId"],
                            "zoneId": f["zoneId"],
                            "wardId": f["wardId"],
                            "employeeUserId": f["requestedById"],
                            "employeeZoneIds": zone_ids,
                            "employeeWardIds": ward_ids,
                            "zoneIsNull": f["zoneId"] is None,
                            "wardIsNull": f["wardId"] is None,
                            "zoneMatch": f["zoneId"] in zone_ids if f["zoneId"] else False,
                            "wardMatch": f["wardId"] in ward_ids if f["wardId"] else False,
                        },
                        default=str,
                    )
                )

            # Module id
            cur.execute('SELECT id FROM "Module" WHERE name=%s', ("TASKFORCE",))
            module_row = cur.fetchone()
            module_id = module_row["id"] if module_row else None
            print("\nModule TASKFORCE id:", module_id)

            city_ids = sorted({f["cityId"] for f in feeders})
            for city_id in city_ids:
                print(f"\n--- City {city_id} ---")
                cur.execute(
                    'SELECT COUNT(*) FROM "TaskforceFeederPoint" WHERE "cityId"=%s;',
                    (city_id,),
                )
                total_city = cur.fetchone()["count"]
                cur.execute(
                    'SELECT COUNT(*) FROM "TaskforceFeederPoint" WHERE "cityId"=%s AND status=%s;',
                    (city_id, "PENDING_QC"),
                )
                total_pending = cur.fetchone()["count"]
                print(f"Totals: all={total_city}, pending={total_pending}")

                cur.execute(
                    """
                    SELECT umr."userId", u.email, umr."zoneIds", umr."wardIds"
                    FROM "UserModuleRole" umr
                    JOIN "User" u ON u.id = umr."userId"
                    WHERE umr."cityId"=%s AND umr."moduleId"=%s AND umr.role='QC';
                    """,
                    (city_id, module_id),
                )
                qc_rows = cur.fetchall()
                if not qc_rows:
                    print("No QC assignments for this city.")
                for qc in qc_rows:
                    zone_ids = qc.get("zoneIds") or []
                    ward_ids = qc.get("wardIds") or []
                    if zone_ids and ward_ids:
                        cur.execute(
                            """
                            SELECT COUNT(*) FROM "TaskforceFeederPoint"
                            WHERE "cityId"=%s AND status=%s AND "zoneId" = ANY(%s::uuid[]) AND "wardId" = ANY(%s::uuid[]);
                            """,
                            (city_id, "PENDING_QC", zone_ids, ward_ids),
                        )
                        filtered = cur.fetchone()["count"]
                    else:
                        filtered = 0
                    print(
                        json.dumps(
                            {
                                "qcId": qc["userId"],
                                "email": qc["email"],
                                "zoneIds": zone_ids,
                                "wardIds": ward_ids,
                                "pendingInScope": filtered,
                            }
                        )
                    )


if __name__ == "__main__":
    main()
