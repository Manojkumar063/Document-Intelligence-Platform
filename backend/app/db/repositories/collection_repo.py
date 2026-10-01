from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.models.collection import Collection


class CollectionRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.col = db["collections"]

    async def get_by_id(self, collection_id: str) -> Collection | None:
        doc = await self.col.find_one({"_id": collection_id})
        return Collection.from_doc(doc) if doc else None

    async def get_by_name(self, name: str) -> Collection | None:
        doc = await self.col.find_one({"name_key": name.casefold()})
        return Collection.from_doc(doc) if doc else None

    async def list_all(self, shared_only: bool = False) -> list[tuple[Collection, int]]:
        cursor = self.col.find({}).sort("name", 1)
        results: list[tuple[Collection, int]] = []
        async for raw in cursor:
            collection = Collection.from_doc(raw)
            query: dict[str, object] = {"collection_id": collection.id}
            if shared_only:
                query["$or"] = [{"is_shared": True}, {"is_shared": {"$exists": False}}]
            count = await self.db["documents"].count_documents(query)
            if not shared_only or count > 0:
                results.append((collection, count))
        return results

    async def create(self, name: str, description: str, created_by: str) -> Collection:
        collection = Collection(name=name, description=description, created_by=created_by)
        await self.col.insert_one(collection.to_doc())
        return collection

    async def rename(self, collection: Collection, name: str, description: str) -> Collection:
        await self.col.update_one(
            {"_id": collection.id},
            {"$set": {"name": name, "name_key": name.casefold(), "description": description}},
        )
        collection.name = name
        collection.description = description
        return collection

    async def delete(self, collection: Collection) -> None:
        await self.db["documents"].update_many(
            {"collection_id": collection.id}, {"$set": {"collection_id": None}}
        )
        await self.col.delete_one({"_id": collection.id})