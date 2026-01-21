from app.core.database import get_db

try:
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute('SELECT TOP 1 * FROM workspaces')
        columns = [d[0] for d in cursor.description]
        print(f"Columns: {columns}")
        print(f"is_active present: {'is_active' in columns}")
except Exception as e:
    print(f"Error: {e}")
