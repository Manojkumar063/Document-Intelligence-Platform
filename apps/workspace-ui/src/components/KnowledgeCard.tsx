import Icon from "./Icon";

const ragUrl = (import.meta.env.VITE_RAG_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export default function KnowledgeCard() {
  return (
    <aside className="knowledge-card">
      <div className="knowledge-orb"><span>✳</span></div>
      <p className="eyebrow">YOUR TEAM'S KNOWLEDGE</p>
      <h2>Answers are already in your docs.</h2>
      <p>Ask a question and get helpful answers grounded in your team's shared knowledge.</p>
      <a href={`${ragUrl}/chat`} target="_blank" rel="noreferrer" className="knowledge-button">
        Ask Knowledge AI <Icon name="arrow" size={16} />
      </a>
      <div className="knowledge-foot">
        <span className="status-dot" /> Connected to your RAG workspace
      </div>
    </aside>
  );
}
