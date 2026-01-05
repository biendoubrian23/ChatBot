"""
Routes API pour le Widget (accès public)
Ce sont les endpoints appelés par le widget injecté sur les sites clients
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional, List
import json
from app.core.supabase import get_supabase
from app.services.rag_pipeline import RAGPipeline

router = APIRouter()

class WidgetChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    stream: bool = True

class WidgetConfig(BaseModel):
    workspace_id: str
    name: str
    primary_color: str = "#000000"
    welcome_message: str = "Bonjour ! Comment puis-je vous aider ?"


@router.get("/{workspace_id}/config")
async def get_widget_config(workspace_id: str):
    """Récupère la configuration publique du widget"""
    supabase = get_supabase()
    
    result = supabase.table("workspaces")\
        .select("id, name, widget_config")\
        .eq("id", workspace_id)\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    workspace = result.data
    widget_config = workspace.get("widget_config", {})
    
    return {
        "workspace_id": workspace["id"],
        "name": workspace["name"],
        "primary_color": widget_config.get("primary_color", "#000000"),
        "welcome_message": widget_config.get("welcome_message", "Bonjour ! Comment puis-je vous aider ?"),
        "placeholder": widget_config.get("placeholder", "Tapez votre message..."),
        "position": widget_config.get("position", "bottom-right")
    }


@router.post("/{workspace_id}/chat")
async def widget_chat(
    workspace_id: str,
    data: WidgetChatRequest
):
    """
    Endpoint de chat pour le widget.
    Pas d'authentification requise - c'est public.
    On crée une session anonyme.
    """
    supabase = get_supabase()
    
    # Vérifier que le workspace existe
    workspace_result = supabase.table("workspaces")\
        .select("id, rag_config")\
        .eq("id", workspace_id)\
        .single()\
        .execute()
    
    if not workspace_result.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    workspace = workspace_result.data
    
    # Récupérer ou créer la conversation (session)
    if data.session_id:
        conv_result = supabase.table("conversations")\
            .select("*")\
            .eq("id", data.session_id)\
            .eq("workspace_id", workspace_id)\
            .single()\
            .execute()
        
        if conv_result.data:
            conversation = conv_result.data
        else:
            # Session invalide, en créer une nouvelle
            conv_result = supabase.table("conversations")\
                .insert({
                    "workspace_id": workspace_id,
                    "title": "Widget Session",
                    "metadata": {"source": "widget"}
                })\
                .execute()
            conversation = conv_result.data[0]
    else:
        # Nouvelle session
        conv_result = supabase.table("conversations")\
            .insert({
                "workspace_id": workspace_id,
                "title": "Widget Session",
                "metadata": {"source": "widget"}
            })\
            .execute()
        conversation = conv_result.data[0]
    
    # Sauvegarder le message utilisateur
    supabase.table("messages").insert({
        "conversation_id": conversation["id"],
        "role": "user",
        "content": data.message
    }).execute()
    
    # Récupérer l'historique (limité)
    history_result = supabase.table("messages")\
        .select("role, content")\
        .eq("conversation_id", conversation["id"])\
        .order("created_at")\
        .limit(6)\
        .execute()
    
    history = history_result.data[:-1]
    
    # Incrémenter le compteur de messages (analytics)
    try:
        supabase.rpc('increment_daily_messages', {
            'p_workspace_id': workspace_id
        }).execute()
    except:
        pass  # Ignorer les erreurs d'analytics
    
    # Pipeline RAG
    rag = RAGPipeline(workspace_id=workspace_id, config=workspace.get("rag_config", {}))
    
    if data.stream:
        async def generate():
            full_response = ""
            
            async for chunk in rag.stream_response(data.message, history):
                if chunk.get("type") == "token":
                    full_response += chunk["content"]
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk.get("type") == "error":
                    yield f"data: {json.dumps(chunk)}\n\n"
            
            # Sauvegarder la réponse
            supabase.table("messages").insert({
                "conversation_id": conversation["id"],
                "role": "assistant",
                "content": full_response
            }).execute()
            
            # Signal de fin avec session_id
            yield f"data: {json.dumps({'type': 'done', 'session_id': conversation['id']})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    else:
        response, sources = await rag.get_response(data.message, history)
        
        supabase.table("messages").insert({
            "conversation_id": conversation["id"],
            "role": "assistant",
            "content": response
        }).execute()
        
        return {
            "response": response,
            "session_id": conversation["id"]
        }


@router.get("/{workspace_id}/script.js")
async def get_widget_script(workspace_id: str):
    """
    Retourne le script JavaScript du widget à injecter.
    Ce script crée le widget chat sur la page client.
    """
    script = f'''
(function() {{
  const MONITORA_WORKSPACE_ID = "{workspace_id}";
  const MONITORA_API_URL = "{{API_URL}}";
  
  // Styles
  const styles = `
    #monitora-widget-container {{
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }}
    #monitora-toggle {{
      width: 60px;
      height: 60px;
      border-radius: 0;
      background: #000;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }}
    #monitora-toggle svg {{
      width: 24px;
      height: 24px;
      fill: #fff;
    }}
    #monitora-chat {{
      display: none;
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 380px;
      height: 500px;
      background: #fff;
      border: 1px solid #000;
      flex-direction: column;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    }}
    #monitora-chat.open {{
      display: flex;
    }}
    #monitora-header {{
      padding: 16px;
      background: #000;
      color: #fff;
      font-weight: 600;
      font-size: 14px;
    }}
    #monitora-messages {{
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }}
    .monitora-msg {{
      margin-bottom: 12px;
      padding: 10px 14px;
      font-size: 14px;
      line-height: 1.4;
      max-width: 85%;
    }}
    .monitora-msg.user {{
      background: #f5f5f5;
      margin-left: auto;
    }}
    .monitora-msg.assistant {{
      background: #000;
      color: #fff;
    }}
    #monitora-input-area {{
      padding: 12px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
    }}
    #monitora-input {{
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #000;
      font-size: 14px;
      outline: none;
    }}
    #monitora-send {{
      padding: 10px 16px;
      background: #000;
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 14px;
    }}
  `;
  
  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
  
  // Create widget HTML
  const container = document.createElement('div');
  container.id = 'monitora-widget-container';
  container.innerHTML = `
    <div id="monitora-chat">
      <div id="monitora-header">Assistant</div>
      <div id="monitora-messages"></div>
      <div id="monitora-input-area">
        <input type="text" id="monitora-input" placeholder="Tapez votre message..." />
        <button id="monitora-send">Envoyer</button>
      </div>
    </div>
    <button id="monitora-toggle">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    </button>
  `;
  document.body.appendChild(container);
  
  // Widget logic
  let sessionId = null;
  const toggle = document.getElementById('monitora-toggle');
  const chat = document.getElementById('monitora-chat');
  const messages = document.getElementById('monitora-messages');
  const input = document.getElementById('monitora-input');
  const sendBtn = document.getElementById('monitora-send');
  
  toggle.onclick = () => chat.classList.toggle('open');
  
  function addMessage(content, role) {{
    const div = document.createElement('div');
    div.className = 'monitora-msg ' + role;
    div.textContent = content;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }}
  
  async function sendMessage() {{
    const text = input.value.trim();
    if (!text) return;
    
    addMessage(text, 'user');
    input.value = '';
    
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'monitora-msg assistant';
    messages.appendChild(assistantDiv);
    
    try {{
      const response = await fetch(`${{MONITORA_API_URL}}/api/widget/${{MONITORA_WORKSPACE_ID}}/chat`, {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ message: text, session_id: sessionId, stream: true }})
      }});
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {{
        const {{ done, value }} = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');
        
        for (const line of lines) {{
          if (line.startsWith('data: ')) {{
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token') {{
              assistantDiv.textContent += data.content;
            }} else if (data.type === 'done') {{
              sessionId = data.session_id;
            }}
          }}
        }}
      }}
    }} catch (e) {{
      assistantDiv.textContent = 'Erreur de connexion';
    }}
    
    messages.scrollTop = messages.scrollHeight;
  }}
  
  sendBtn.onclick = sendMessage;
  input.onkeypress = (e) => {{ if (e.key === 'Enter') sendMessage(); }};
  
  // Add welcome message
  fetch(`${{MONITORA_API_URL}}/api/widget/${{MONITORA_WORKSPACE_ID}}/config`)
    .then(r => r.json())
    .then(config => {{
      document.getElementById('monitora-header').textContent = config.name || 'Assistant';
      if (config.welcome_message) {{
        addMessage(config.welcome_message, 'assistant');
      }}
    }});
}})();
'''
    
    return Response(
        content=script,
        media_type="application/javascript"
    )
