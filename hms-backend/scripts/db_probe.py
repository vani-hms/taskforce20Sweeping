import psycopg2, json
from psycopg2.extras import RealDictCursor
DSN=dict(dbname='taskforce', user='taskforce', password='Taskforce-Multi#32', host='taskforce.ch4kymie8ss9.ap-south-1.rds.amazonaws.com', port=5432, sslmode='require')
with psycopg2.connect(**DSN, cursor_factory=RealDictCursor) as conn:
    cur=conn.cursor()
    cur.execute('SELECT id, "cityId" as city_id, "zoneId" as zone_id, "wardId" as ward_id, "requestedById" as requested_by_id, "createdAt" as created_at FROM "TaskforceFeederPoint" ORDER BY "createdAt" DESC LIMIT 5;')
    print('FEEDERS TOP 5:')
    for r in cur.fetchall():
        print(json.dumps(r, default=str))
    cur.execute('SELECT u.email, umr."cityId" as city_id, umr."zoneIds" as zone_ids, umr."wardIds" as ward_ids, m.name as module_name FROM "UserModuleRole" umr JOIN "User" u ON u.id = umr."userId" JOIN "Module" m ON m.id = umr."moduleId" WHERE m.name = %s AND umr.role = %s ORDER BY u.email;', ('TASKFORCE','QC'))
    print('\nQC ROLES:')
    for r in cur.fetchall():
        print(json.dumps(r, default=str))
