from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.models.conversation import Conversation, Message


class ConversationRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.convs = db["conversations"]
        self.msgs = db["messages"]

    async def get_by_id(self, conv_id: str, user_id: str) -> Conversation | None:
        doc = await self.convs.find_one({"_id": conv_id, "user_id": user_id})
        if not doc:
            return None
        messages = await self._get_messages(conv_id)
        return Conversation.from_doc(doc, messages)

    async def get_by_user(self, user_id: str) -> list[Conversation]:
        cursor = self.convs.find({"user_id": user_id}).sort("updated_at", -1)
        return [Conversation.from_doc(d) async for d in cursor]

    async def create(self, user_id: str, title: str = "New Conversation") -> Conversation:
        conv = Conversation(user_id=user_id, title=title)
        await self.convs.insert_one(conv.to_doc())
        return conv

    async def update_title(self, conv_id: str, title: str) -> None:
        await self.convs.update_one(
            {"_id": conv_id},
            {"$set": {"title": title, "updated_at": datetime.now(timezone.utc)}},
        )

    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        sources: list[dict] | None = None,
        collection_id: str | None = None,
        agent_mode: str = "chat",
    ) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            sources=sources or [],
            collection_id=collection_id,
            agent_mode=agent_mode,
        )
        await self.msgs.insert_one(msg.to_doc())
        await self.convs.update_one(
            {"_id": conversation_id},
            {"$set": {"updated_at": datetime.now(timezone.utc)}},
        )
        return msg

    async def set_feedback(self, conversation_id: str, message_id: str, feedback: str) -> Message | None:
        await self.msgs.update_one(
            {"_id": message_id, "conversation_id": conversation_id, "role": "assistant"},
            {"$set": {"feedback": feedback}},
        )
        doc = await self.msgs.find_one(
            {"_id": message_id, "conversation_id": conversation_id, "role": "assistant"}
        )
        return Message.from_doc(doc) if doc else None

    async def delete_message(self, conversation_id: str, message_id: str) -> None:
        await self.msgs.delete_one({"_id": message_id, "conversation_id": conversation_id})

    async def delete(self, conv_id: str) -> None:
        await self.msgs.delete_many({"conversation_id": conv_id})
        await self.convs.delete_one({"_id": conv_id})

    async def _get_messages(self, conv_id: str) -> list[Message]:
        cursor = self.msgs.find({"conversation_id": conv_id}).sort("created_at", 1)
        return [Message.from_doc(m) async for m in cursor]
