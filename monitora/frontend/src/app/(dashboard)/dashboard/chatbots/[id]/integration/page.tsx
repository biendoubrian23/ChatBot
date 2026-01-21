'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Workspace, WidgetConfig } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useChatbot } from '@/contexts/chatbot-context'
import {
  Code2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  MessageSquare,
  Settings2,
  X,
  Send,
  Smartphone
} from 'lucide-react'

type Chatbot = Workspace

// Icônes des frameworks
const FrameworkIcons = {
  html: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z" />
    </svg>
  ),
  react: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z" />
    </svg>
  ),
  nextjs: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.573 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 0 1 .237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 0 1 .233-.296c.096-.05.13-.054.5-.054z" />
    </svg>
  ),
  vue: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24,1.61H14.06L12,5.16,9.94,1.61H0L12,22.39ZM12,14.08,5.16,2.23H9.59L12,6.41l2.41-4.18h4.43Z" />
    </svg>
  ),
  blazor: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.834 8.101a13.912 13.912 0 0 1-13.643 11.72 10.105 10.105 0 0 1-1.994-.12 6.111 6.111 0 0 1-5.082-5.761 5.934 5.934 0 0 1 11.867-.084c.025.983-.401 1.846-1.277 1.871-.936 0-1.374-.668-1.374-1.567v-2.5a1.531 1.531 0 0 0-1.52-1.533H8.715a3.648 3.648 0 1 0 2.695 6.08l.073-.084.073.084a2.413 2.413 0 0 0 1.877.876c1.583 0 2.747-1.299 2.747-3.048a6.193 6.193 0 0 0-6.177-6.217 6.094 6.094 0 0 0-6.094 6.094 6.093 6.093 0 0 0 6.094 6.094h.001a5.994 5.994 0 0 0 1.682-.248 13.925 13.925 0 0 0 13.148-11.717zm-21.378 3.47a2.19 2.19 0 1 1 2.19 2.194 2.19 2.19 0 0 1-2.19-2.19z" />
    </svg>
  ),
  mvc4: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.834 8.101a13.912 13.912 0 0 1-13.643 11.72 10.105 10.105 0 0 1-1.994-.12 6.111 6.111 0 0 1-5.082-5.761 5.934 5.934 0 0 1 11.867-.084c.025.983-.401 1.846-1.277 1.871-.936 0-1.374-.668-1.374-1.567v-2.5a1.531 1.531 0 0 0-1.52-1.533H8.715a3.648 3.648 0 1 0 2.695 6.08l.073-.084.073.084a2.413 2.413 0 0 0 1.877.876c1.583 0 2.747-1.299 2.747-3.048a6.193 6.193 0 0 0-6.177-6.217 6.094 6.094 0 0 0-6.094 6.094h.001a5.994 5.994 0 0 0 1.682-.248 13.925 13.925 0 0 0 13.148-11.717zm-21.378 3.47a2.19 2.19 0 1 1 2.19 2.194 2.19 2.19 0 0 1-2.19-2.19z" />
    </svg>
  )
}

type FrameworkType = 'html' | 'react' | 'nextjs' | 'vue' | 'blazor' | 'mvc4'

export default function IntegrationPage() {
  const params = useParams()
  const { chatbot, updateWidgetConfig } = useChatbot()
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedFramework, setSelectedFramework] = useState<FrameworkType>('html')
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [widgetConfig, setWidgetConfig] = useState({
    position: 'bottom-right',
    color_accent: '#000000',
    welcome_message: 'Bonjour ! Comment puis-je vous aider ?',
    chatbot_name: 'Propulsé par MONITORA',
    // UI Only fields
    primaryColor: '#000000',
    welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
    placeholder: 'Tapez votre message...',
    widgetWidth: 380,
    widgetHeight: 500,
    brandingText: 'Propulsé par MONITORA'
  })

  useEffect(() => {
    // Charger la config existante depuis le contexte
    if (chatbot?.widget_config) {
      setWidgetConfig(prev => {
        const config = chatbot.widget_config
        return {
          ...prev,
          ...config,
          // Mapping explicite DB (snake_case) -> UI (camelCase)
          primaryColor: config?.color_accent || prev.primaryColor,
          welcomeMessage: config?.welcome_message || prev.welcomeMessage,
          widgetWidth: config?.width || prev.widgetWidth,
          widgetHeight: config?.height || prev.widgetHeight,
          placeholder: config?.placeholder || prev.placeholder,
          brandingText: config?.branding_text || prev.brandingText,
          // Assurer que les valeurs par défaut sont écrasées si présentes en DB
          chatbot_name: config?.chatbot_name || prev.chatbot_name
        }
      })
    }
  }, [chatbot])

  // Mettre à jour localement ET dans le contexte (preview instantanée)
  const updateConfig = (updates: Partial<typeof widgetConfig>) => {
    // Préparer les mises à jour pour la DB (snake_case)
    const dbUpdates: any = { ...updates }

    // Mapping inverse UI -> DB pour la consistance
    if (updates.primaryColor) dbUpdates.color_accent = updates.primaryColor
    if (updates.welcomeMessage) dbUpdates.welcome_message = updates.welcomeMessage
    if (updates.widgetWidth) dbUpdates.width = updates.widgetWidth
    if (updates.widgetHeight) dbUpdates.height = updates.widgetHeight
    if (updates.placeholder) dbUpdates.placeholder = updates.placeholder
    if (updates.brandingText) dbUpdates.branding_text = updates.brandingText

    const newConfig = { ...widgetConfig, ...updates, ...dbUpdates }
    setWidgetConfig(newConfig)
    setHasChanges(true)
    setSaved(false)

    // Mettre à jour la preview immédiatement via le contexte
    // @ts-ignore
    updateWidgetConfig(dbUpdates)
  }

  const saveConfig = async () => {
    if (!chatbot?.id) return
    setSaving(true)

    try {
      await api.widgetConfig.update(chatbot.id, widgetConfig)
      setSaved(true)
      setHasChanges(false)
      // Réinitialiser le message "Sauvegardé" après 2 secondes
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Erreur sauvegarde config widget:', error)
    }

    setSaving(false)
  }

  const getWidgetCode = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

    const config = {
      workspaceId: chatbot?.id || 'WORKSPACE_ID',
      position: widgetConfig.position,
      primaryColor: widgetConfig.primaryColor,
      welcomeMessage: widgetConfig.welcomeMessage,
      placeholder: widgetConfig.placeholder,
      width: widgetConfig.widgetWidth,
      height: widgetConfig.widgetHeight,
      brandingText: widgetConfig.brandingText
    }

    switch (selectedFramework) {
      case 'nextjs':
        return `// Dans votre layout.tsx ou page.tsx
import Script from 'next/script'

// Ajoutez ces lignes avant </body>
<Script id="monitora-config" strategy="afterInteractive">
  {\`
    window.MONITORA_CONFIG = {
      workspaceId: "${config.workspaceId}",
      position: "${config.position}",
      primaryColor: "${config.primaryColor}",
      welcomeMessage: "${config.welcomeMessage}",
      placeholder: "${config.placeholder}",
      width: ${config.width},
      height: ${config.height},
      brandingText: "${config.brandingText}",
      apiUrl: "${apiUrl}"
    }
  \`}
</Script>
<Script 
  src="${apiUrl}/widget/embed.js" 
  strategy="afterInteractive" 
/>`

      case 'react':
        return `// Dans votre App.js ou index.js
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Configuration MONITORA
    (window as any).MONITORA_CONFIG = {
      workspaceId: "${config.workspaceId}",
      position: "${config.position}",
      primaryColor: "${config.primaryColor}",
      welcomeMessage: "${config.welcomeMessage}",
      placeholder: "${config.placeholder}",
      width: ${config.width},
      height: ${config.height},
      brandingText: "${config.brandingText}",
      apiUrl: "${apiUrl}"
    };

    // Charger le script
    const script = document.createElement('script');
    script.src = "${apiUrl}/widget/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    // Votre application
  );
}`

      case 'vue':
        return `<!-- Dans votre App.vue ou main.js -->
<script>
export default {
  mounted() {
    // Configuration MONITORA
    window.MONITORA_CONFIG = {
      workspaceId: "${config.workspaceId}",
      position: "${config.position}",
      primaryColor: "${config.primaryColor}",
      welcomeMessage: "${config.welcomeMessage}",
      placeholder: "${config.placeholder}",
      width: ${config.width},
      height: ${config.height},
      brandingText: "${config.brandingText}",
      apiUrl: "${apiUrl}"
    };

    // Charger le script
    const script = document.createElement('script');
    script.src = "${apiUrl}/widget/embed.js";
    script.async = true;
    document.body.appendChild(script);
  }
}
</script>`

      case 'blazor':
        return `@* MONITORA Widget - Blazor / .NET *@
@* Dans votre _Host.cshtml ou App.razor, ajoutez avant </body> : *@

<script>
    window.MONITORA_CONFIG = {
        workspaceId: "${config.workspaceId}",
        position: "${config.position}",
        primaryColor: "${config.primaryColor}",
        welcomeMessage: "${config.welcomeMessage}",
        placeholder: "${config.placeholder}",
        width: ${config.width},
        height: ${config.height},
        brandingText: "${config.brandingText}",
        apiUrl: "${apiUrl}"
    };
</script>
<script src="${apiUrl}/widget/embed.js" async></script>

@* Ou via injection JavaScript dans Program.cs : *@
@* builder.Services.AddScoped<IJSRuntime>(); *@`

      case 'mvc4':
        return `@* MONITORA Widget - ASP.NET MVC 4 *@
@* Ajoutez ce code dans votre fichier _Layout.cshtml ou votre vue, juste avant la fermeture </body> : *@

<script>
    window.MONITORA_CONFIG = {
        workspaceId: "${config.workspaceId}",
        position: "${config.position}",
        primaryColor: "${config.primaryColor}",
        welcomeMessage: "${config.welcomeMessage}",
        placeholder: "${config.placeholder}",
        width: ${config.width},
        height: ${config.height},
        brandingText: "${config.brandingText}",
        apiUrl: "${apiUrl}"
    };
</script>
<script src="${apiUrl}/widget/embed.js" async></script>`

      case 'html':
      default:
        return `<!-- MONITORA Widget -->
<script>
  window.MONITORA_CONFIG = {
    workspaceId: "${config.workspaceId}",
    position: "${config.position}",
    primaryColor: "${config.primaryColor}",
    welcomeMessage: "${config.welcomeMessage}",
    placeholder: "${config.placeholder}",
    width: ${config.width},
    height: ${config.height},
    brandingText: "${config.brandingText}",
    apiUrl: "${apiUrl}"
  };
</script>
<script 
  src="${apiUrl}/widget/embed.js"
  async
></script>`
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(getWidgetCode())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Intégration</h1>
          <p className="text-gray-500 mt-1">
            Intégrez le chatbot sur votre site web
          </p>
        </div>
        {saving && (
          <span className="text-sm text-gray-500">Enregistrement...</span>
        )}
      </div>

      {/* Layout principal : 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche : Personnalisation + Code d'intégration */}
        <div className="space-y-6">
          {/* 1. Personnalisation */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Settings2 size={20} className="text-gray-700" />
                <div>
                  <h3 className="font-medium text-gray-900">Personnalisation</h3>
                  <p className="text-sm text-gray-500">Configurez l'apparence du widget</p>
                </div>
              </div>
              <Button
                onClick={saveConfig}
                disabled={saving || !hasChanges}
                className={`${saved
                  ? 'bg-green-600 hover:bg-green-700'
                  : hasChanges
                    ? 'bg-black hover:bg-gray-800'
                    : 'bg-gray-300'
                  }`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sauvegarde...
                  </>
                ) : saved ? (
                  <>
                    <Check size={16} className="mr-2" />
                    Sauvegardé
                  </>
                ) : (
                  'Sauvegarder'
                )}
              </Button>
            </div>

            <div className="space-y-6">
              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateConfig({ position: 'bottom-right' })}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${widgetConfig.position === 'bottom-right'
                      ? 'border-black bg-gray-50 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    Bas droite
                  </button>
                  <button
                    onClick={() => updateConfig({ position: 'bottom-left' })}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${widgetConfig.position === 'bottom-left'
                      ? 'border-black bg-gray-50 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    Bas gauche
                  </button>
                </div>
              </div>

              {/* Couleur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur principale
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={widgetConfig.primaryColor}
                    onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={widgetConfig.primaryColor}
                    onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Taille du widget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Largeur ({widgetConfig.widgetWidth}px)
                </label>
                <input
                  type="range"
                  min="300"
                  max="500"
                  value={widgetConfig.widgetWidth}
                  onChange={(e) => updateConfig({ widgetWidth: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hauteur ({widgetConfig.widgetHeight}px)
                </label>
                <input
                  type="range"
                  min="400"
                  max="700"
                  value={widgetConfig.widgetHeight}
                  onChange={(e) => updateConfig({ widgetHeight: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>

              {/* Message d'accueil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message d'accueil
                </label>
                <textarea
                  value={widgetConfig.welcomeMessage}
                  onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                />
              </div>

              {/* Placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placeholder
                </label>
                <input
                  type="text"
                  value={widgetConfig.placeholder}
                  onChange={(e) => updateConfig({ placeholder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              {/* Texte de branding */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texte du pied de page
                </label>
                <input
                  type="text"
                  value={widgetConfig.brandingText}
                  onChange={(e) => updateConfig({ brandingText: e.target.value })}
                  placeholder="Propulsé par MONITORA"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Laissez vide pour masquer le pied de page
                </p>
              </div>
            </div>
          </div>

          {/* 2. Code d'intégration */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Code2 size={20} className="text-gray-700" />
                <div>
                  <h3 className="font-medium text-gray-900">Code d'intégration</h3>
                  <p className="text-sm text-gray-500">Copiez ce code dans votre site</p>
                </div>
              </div>
            </div>

            {/* Tabs de frameworks */}
            <div className="flex flex-wrap gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
              {[
                { id: 'html', label: 'HTML', icon: FrameworkIcons.html },
                { id: 'react', label: 'React', icon: FrameworkIcons.react },
                { id: 'nextjs', label: 'Next.js', icon: FrameworkIcons.nextjs },
                { id: 'vue', label: 'Vue.js', icon: FrameworkIcons.vue },
                { id: 'blazor', label: 'Blazor', icon: FrameworkIcons.blazor },
                { id: 'mvc4', label: 'ASP.NET MVC 4', icon: FrameworkIcons.mvc4 },
              ].map((framework) => (
                <button
                  key={framework.id}
                  onClick={() => setSelectedFramework(framework.id as FrameworkType)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedFramework === framework.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <framework.icon />
                  {framework.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                <code>{getWidgetCode()}</code>
              </pre>
              <Button
                onClick={copyCode}
                size="sm"
                className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700"
              >
                {copied ? (
                  <>
                    <Check size={14} className="mr-1" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1" />
                    Copier
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Colonne droite : Aperçu Mobile (iPhone) */}
        <div className="lg:sticky lg:top-6 h-fit">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Smartphone size={20} className="text-gray-700" />
              <div>
                <h3 className="font-medium text-gray-900">Aperçu Mobile</h3>
                <p className="text-sm text-gray-500">Testez la responsivité sur mobile</p>
              </div>
            </div>

            {/* iPhone Frame */}
            <div className="flex justify-center">
              <div className="relative">
                {/* iPhone outer frame */}
                <div
                  className="relative bg-gray-900 rounded-[3rem] p-3 shadow-xl"
                  style={{ width: '280px', height: '580px' }}
                >
                  {/* Dynamic Island */}
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30" />

                  {/* Screen */}
                  <div
                    className="relative bg-white rounded-[2.5rem] overflow-hidden h-full"
                    style={{
                      background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
                    }}
                  >
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-8 pt-4 pb-2">
                      <span className="text-xs font-medium text-gray-800">9:41</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3a9 9 0 0 1 9 9v7a2 2 0 0 1-2 2h-3v-2h3v-7a7 7 0 0 0-14 0v7h3v2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 9-9z" />
                        </svg>
                        <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 2 0v1h6V3a1 1 0 0 1 2 0v1z" />
                        </svg>
                      </div>
                    </div>

                    {/* Fake website content */}
                    <div className="px-4 pt-2 space-y-3">
                      <div className="h-3 bg-gray-300 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                      <div className="h-20 bg-gray-200 rounded-lg mt-4" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-4/5" />
                      <div className="h-16 bg-gray-200 rounded-lg mt-4" />
                    </div>

                    {/* Widget button */}
                    {!mobilePreviewOpen && (
                      <button
                        onClick={() => setMobilePreviewOpen(true)}
                        className="absolute bottom-6 right-4 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer z-10"
                        style={{ backgroundColor: widgetConfig.primaryColor }}
                      >
                        <MessageSquare size={20} className="text-white" />
                      </button>
                    )}

                    {/* Widget ouvert */}
                    {mobilePreviewOpen && (
                      <div
                        className="absolute bottom-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in slide-in-from-bottom-4 duration-300"
                        style={{
                          // Calcul proportionnel: ratio par rapport à la taille max (500px largeur, 700px hauteur)
                          // L'écran iPhone fait ~254px de largeur interne, on scale proportionnellement
                          width: `${Math.min(254, Math.max(180, (widgetConfig.widgetWidth / 500) * 254))}px`,
                          height: `${Math.min(450, Math.max(280, (widgetConfig.widgetHeight / 700) * 450))}px`,
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {/* Header du widget mobile */}
                        <div
                          className="px-3 py-2.5 flex items-center justify-between shrink-0"
                          style={{ backgroundColor: widgetConfig.primaryColor }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                              <MessageSquare size={12} className="text-white" />
                            </div>
                            <div>
                              <p className="text-white font-medium text-xs">{chatbot?.name || 'Assistant'}</p>
                              <p className="text-white/70 text-[10px]">En ligne</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setMobilePreviewOpen(false)}
                            className="text-white/70 hover:text-white p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Messages mobile */}
                        <div className="flex-1 p-3 bg-gray-50 overflow-y-auto">
                          <div className="flex gap-2">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: widgetConfig.primaryColor }}
                            >
                              <MessageSquare size={10} className="text-white" />
                            </div>
                            <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 shadow-sm max-w-[90%]">
                              <p className="text-xs text-gray-800">{widgetConfig.welcomeMessage}</p>
                            </div>
                          </div>
                        </div>

                        {/* Input mobile */}
                        <div className="p-2 bg-white border-t border-gray-100 shrink-0">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={widgetConfig.placeholder}
                              className="flex-1 px-3 py-1.5 bg-gray-100 rounded-full text-xs outline-none"
                              disabled
                            />
                            <button
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: widgetConfig.primaryColor }}
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-28 h-1 bg-gray-600 rounded-full" />
              </div>
            </div>

            {/* Instructions */}
            <p className="text-center text-xs text-gray-500 mt-4">
              Cliquez sur le bouton pour voir l'ouverture du widget
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
