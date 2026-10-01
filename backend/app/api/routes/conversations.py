from fastapi import APIRouter

from app.api.deps import CurrentUserID, DBSession
from app.db.repositories.conversation_repo import ConversationRepository
from app.db.repositories.collection_repo import CollectionRepository
from app.db.repositories.usage_repo import UsageRepository
from app.rag.workflows import run_rag
from app.schemas.conversation import (
    ChatRequest,
    ChatResponse,
    ConversationCreate,
    ConversationRename,
    ConversationResponse,
    MessageFeedback,
    MessageResponse,
    SourceReference,
)
from app.utils.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/conversations", tags=["conversations"])


async def _generate_answer(
    question: str,
    collection_id: str | None,
    user_id: str,
    db: DBSession,
) -> tuple[str, list[SourceReference]]:
    result = await run_rag(
        question=question,
        db=db,
        user_id=user_id,
        collection_id=collection_id,
    )
    await UsageRepository(db).record(user_id, "chat_query")
    sources = [
        SourceReference(
            chunk_id=chunk.chunk_id,
            document_id=chunk.document_id,
            filename=chunk.metadata.get("filename", ""),
            page=chunk.page_number,
            similarity=chunk.similarity,
            snippet=" ".join(chunk.content.split())[:320],
        )
        for chunk in result.sources
    ]
    return result.answer, sources


@router.post("", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    body: ConversationCreate, user_id: CurrentUserID, db: DBSession
) -> ConversationResponse:
    repo = ConversationRepository(db)
    conv = await repo.create(user_id=user_id, title=body.title)
    return ConversationResponse.model_validate(conv)


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(user_id: CurrentUserID, db: DBSession) -> list[ConversationResponse]:
    convs = await ConversationRepository(db).get_by_user(user_id)
    return [ConversationResponse.model_validate(c) for c in convs]


@router.get("/{conv_id}", response_model=ConversationResponse)
async def get_conversation(
    conv_id: str, user_id: CurrentUserID, db: DBSession
) -> ConversationResponse:
    conv = await ConversationRepository(db).get_by_id(conv_id, user_id)
    if not conv:
        raise NotFoundError("Conversation", conv_id)
    return ConversationResponse.model_validate(conv)


@router.patch("/{conv_id}", response_model=ConversationResponse)
async def rename_conversation(
    conv_id: str, body: ConversationRename, user_id: CurrentUserID, db: DBSession
) -> ConversationResponse:
    repo = ConversationRepository(db)
    conv = await repo.get_by_id(conv_id, user_id)
    if not conv:
        raise NotFoundError("Conversation", conv_id)
    await repo.update_title(conv_id, body.title)
    conv = await repo.get_by_id(conv_id, user_id)
    if not conv:
        raise NotFoundError("Conversation", conv_id)
    return ConversationResponse.model_validate(conv)


@router.post("/{conv_id}/messages", response_model=ChatResponse)
async def chat(
    conv_id: str, body: ChatRequest, user_id: CurrentUserID, db: DBSession
) -> ChatResponse:
    repo = ConversationRepository(db)
    conv = await repo.get_by_id(conv_id, user_id)
    if not conv:
        raise NotFoundError("Conversation", conv_id)

    if body.collection_id and not await CollectionRepository(db).get_by_id(body.collection_id):
        raise NotFoundError("Collection", body.collection_id)
    await repo.add_message(
        conv_id,
        role="user",
        content=body.message,
        collection_id=body.collection_id,
    )
    answer, sources = await _generate_answer(body.message, body.collection_id, user_id, db)

    assistant_msg = await repo.add_message(
        conv_id,
        role="assistant",
        content=answer,
        sources=[s.model_dump() for s in sources],
        collection_id=body.collection_id,
    )

    return ChatResponse(
        conversation_id=conv_id,
        message=MessageResponse.model_validate(assistant_msg),
        sources=sources,
    )


@router.post("/{conv_id}/messages/{message_id}/regenerate", response_model=ChatResponse)
async def regenerate_message(
    conv_id: str,
    message_id: str,
    user_id: CurrentUserID,
    db: DBSession,
) -> ChatResponse:
    repo = ConversationRepository(db)
    conversation = await repo.get_by_id(conv_id, user_id)
    if not conversation:
        raise NotFoundError("Conversation", conv_id)
    if len(conversation.messages) < 2:
        raise ConflictError("There is no answer to regenerate")
    previous_answer = conversation.messages[-1]
    question = conversation.messages[-2]
    if previous_answer.id != message_id or previous_answer.role != "assistant" or question.role != "user":
        raise ConflictError("Only the latest assistant answer can be regenerated")

    answer, sources = await _generate_answer(question.content, question.collection_id, user_id, db)
    await repo.delete_message(conv_id, previous_answer.id)
    assistant_msg = await repo.add_message(
        conv_id,
        role="assistant",
        content=answer,
        sources=[source.model_dump() for source in sources],
        collection_id=question.collection_id,
    )
    return ChatResponse(
        conversation_id=conv_id,
        message=MessageResponse.model_validate(assistant_msg),
        sources=sources,
    )


@router.patch("/{conv_id}/messages/{message_id}/feedback", response_model=MessageResponse)
async def rate_message(
    conv_id: str,
    message_id: str,
    body: MessageFeedback,
    user_id: CurrentUserID,
    db: DBSession,
) -> MessageResponse:
    conversation = await ConversationRepository(db).get_by_id(conv_id, user_id)
    if not conversation:
        raise NotFoundError("Conversation", conv_id)
    message = await ConversationRepository(db).set_feedback(conv_id, message_id, body.rating)
    if not message:
        raise NotFoundError("Assistant message", message_id)
    return MessageResponse.model_validate(message)


@router.delete("/{conv_id}", status_code=204)
async def delete_conversation(conv_id: str, user_id: CurrentUserID, db: DBSession) -> None:
    repo = ConversationRepository(db)
    conv = await repo.get_by_id(conv_id, user_id)
    if not conv:
        raise NotFoundError("Conversation", conv_id)
    await repo.delete(conv_id)
