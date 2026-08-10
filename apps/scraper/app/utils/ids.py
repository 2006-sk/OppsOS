import uuid


def new_id() -> str:
    """Unique primary key string. Prisma's cuid() default only fires when the
    Prisma Client itself performs the insert (it's client-side, not a SQL
    DEFAULT) — rows this service inserts directly via sqlite3 must generate
    their own id."""
    return "c" + uuid.uuid4().hex[:24]
