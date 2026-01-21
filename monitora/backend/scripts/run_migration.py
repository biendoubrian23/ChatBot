import sys
import os

# Add parent dir to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_db

def run_migration():
    if len(sys.argv) > 1:
        script_path = sys.argv[1]
        # Resolve absolute path if relative
        if not os.path.isabs(script_path):
            script_path = os.path.join(os.getcwd(), script_path)
    else:
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "create_workspace_databases_table.sql")
        
    with open(script_path, "r", encoding="utf-8") as f:
        sql_script = f.read()

    print(f"Executing migration from {script_path}...")
    
    db = get_db()
    
    # Split by GO if present (simple split)
    commands = sql_script.split("GO")
    
    for cmd in commands:
        if cmd.strip():
            try:
                print(f"Executing: {cmd[:50]}...")
                with db.cursor() as cursor:
                    cursor.execute(cmd)
                print("Success.")
            except Exception as e:
                print(f"Error executing command: {e}")
                
    print("Migration finished.")

if __name__ == "__main__":
    run_migration()
