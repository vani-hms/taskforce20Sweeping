import psycopg2
from psycopg2.extras import RealDictCursor
DSN=dict(dbname='taskforce', user='taskforce', password='Taskforce-Multi#32', host='taskforce.ch4kymie8ss9.ap-south-1.rds.amazonaws.com', port=5432, sslmode='require')
report_id='b221c128-c5ae-4f10-8e55-594f87e04373'
with psycopg2.connect(**DSN, cursor_factory=RealDictCursor) as conn:
    cur=conn.cursor()
    cur.execute('SELECT id FROM "TaskforceFeederReport" WHERE id=%s;', (report_id,))
    print('TaskforceFeederReport rows:', cur.fetchall())
