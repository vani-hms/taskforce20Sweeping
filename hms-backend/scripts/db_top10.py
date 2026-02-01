import psycopg2, json
from psycopg2.extras import RealDictCursor
DSN=dict(dbname='taskforce', user='taskforce', password='Taskforce-Multi#32', host='taskforce.ch4kymie8ss9.ap-south-1.rds.amazonaws.com', port=5432, sslmode='require')
with psycopg2.connect(**DSN, cursor_factory=RealDictCursor) as conn:
    cur=conn.cursor()
    cur.execute('SELECT id, "cityId" as city_id, "zoneId" as zone_id, "wardId" as ward_id, "requestedById" as requested_by_id, "createdAt" as created_at FROM "TaskforceFeederPoint" ORDER BY "createdAt" DESC LIMIT 10;')
    print('FEEDERS TOP 10:')
    for r in cur.fetchall():
        print(json.dumps(r, default=str))
