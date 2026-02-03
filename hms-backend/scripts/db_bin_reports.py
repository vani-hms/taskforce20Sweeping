import psycopg2, json
from psycopg2.extras import RealDictCursor
DSN=dict(dbname='taskforce', user='taskforce', password='Taskforce-Multi#32', host='taskforce.ch4kymie8ss9.ap-south-1.rds.amazonaws.com', port=5432, sslmode='require')
with psycopg2.connect(**DSN, cursor_factory=RealDictCursor) as conn:
    cur=conn.cursor()
    cur.execute('SELECT id, "cityId" city_id, "binId" bin_id, "submittedById" submitted_by_id, status, "createdAt" created_at FROM "LitterBinReport" ORDER BY "createdAt" DESC LIMIT 5;')
    rows=cur.fetchall()
    print(json.dumps(rows, default=str, indent=2))
