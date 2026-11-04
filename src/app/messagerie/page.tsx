"use client";

import React, { useState, useRef, useEffect } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { api, getStoredUser } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface Message {
  id: string;
  sender: string;
  role: string;
  time: string;
  text: string;
  isMe?: boolean;
  status?: "sent" | "delivered" | "read";
  hasAudio?: boolean;
  audioDuration?: string;
  isPlayingAudio?: boolean;
  verseCard?: {
    ref: string;
    text: string;
  };
  attachment?: {
    type: "image" | "doc";
    name: string;
    size?: string;
    url?: string;
  };
}

interface Channel {
  id: string;
  name: string;
  type: "channel" | "direct";
  role?: string;
  avatar?: string;
  initials: string;
  unreadCount?: number;
  description?: string;
  isOnline?: boolean;
  lastSeen?: string;
  pinned?: boolean;
  membersCount?: number;
  lastMessage: {
    text: string;
    time: string;
    sender: string;
    isMe?: boolean;
    hasAudio?: boolean;
  };
}

export default function MessageriePage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "groups" | "direct">("all");
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // SSE (Server-Sent Events) live feed states
  const [isConnectedSSE, setIsConnectedSSE] = useState<boolean>(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || channels[0] || null;
  const currentMessages = messagesMap[selectedChannelId] || [];

  // Scroll to bottom when messages update or channel switches
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChannelId, currentMessages.length]);

  // Handle Voice Note simulation timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecordingAudio) {
      interval = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingAudio]);

  // Subscribe to live Server-Sent Events (SSE) feed for the active conversation
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isMounted = true;

    if (typeof window !== "undefined" && window.EventSource) {
      try {
        const streamUrl = api.messaging.getConversationStreamUrl(selectedChannelId);
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          if (isMounted) setIsConnectedSSE(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data || !isMounted) return;

            // Handle incoming message event from SSE
            if (data.type === "message" || data.content || data.text) {
              const incomingMsg: Message = {
                id: data.id || `msg-sse-${Date.now()}`,
                sender: data.sender_name || data.sender || "Fidèle Connecté",
                role: data.sender_role || data.role || "Membre",
                time: data.created_at
                  ? new Date(data.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                  : new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                text: data.content || data.text || "",
                isMe: false,
                status: "read",
                hasAudio: data.message_type === "audio" || data.has_audio,
                audioDuration: data.audio_duration,
                verseCard: data.verse_card,
              };

              setMessagesMap((prev) => {
                const list = prev[selectedChannelId] || [];
                if (list.some((m) => m.id === incomingMsg.id)) return prev;
                return {
                  ...prev,
                  [selectedChannelId]: [...list, incomingMsg],
                };
              });

              setChannels((prev) =>
                prev.map((c) =>
                  c.id === selectedChannelId
                    ? {
                      ...c,
                      lastMessage: {
                        sender: incomingMsg.sender,
                        text: incomingMsg.text,
                        time: incomingMsg.time,
                        isMe: false,
                      },
                    }
                    : c
                )
              );
            } else if (data.status === "typing") {
              setTypingUser(data.user_name || "Un frère");
              setTimeout(() => {
                if (isMounted) setTypingUser(null);
              }, 3000);
            }
          } catch {
            // Heartbeat non-JSON frame
          }
        };

        eventSource.onerror = () => {
          // Keep resilience
        };
      } catch {
        // SSE error or network fallback
      }
    }

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
    };
  }, [selectedChannelId]);

  // Fetch live conversations from FastAPI backend on mount
  useEffect(() => {
    let isMounted = true;
    async function loadLiveConversations() {
      setIsLoadingChannels(true);
      try {
        const res = await api.messaging.listConversations();
        const convs = res.data?.conversations || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(convs) && convs.length > 0 && isMounted) {
          const mappedChannels: Channel[] = convs.map((c: any) => {
            const isChannel = c.is_channel || c.conversation_type === "channel";
            const isDirect = c.conversation_type === "direct";
            const name = c.name || (isDirect ? "Discussion Pastorale" : "Canal Fraternel");
            const initials =
              name
                .split(" ")
                .filter(Boolean)
                .map((w: string) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "EF";

            return {
              id: c.id,
              name,
              type: isDirect ? "direct" : "channel",
              initials,
              category: isChannel ? "Paroisse" : isDirect ? "Fraternité" : "Ministère",
              lastMessage: {
                sender: name,
                text: "Rejoignez les échanges de ce fil...",
                time: c.last_message_at
                  ? new Date(c.last_message_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                  : "Récemment",
                isMe: false,
              },
              unreadCount: c.unread_count || undefined,
              isMuted: false,
              pinned: isChannel,
              isOnline: true,
              membersCount: c.participants_count || 24,
              description: c.description || (isDirect ? "Échange pastoral privé" : "Canal de communication ecclésiale"),
              role: isDirect ? "Pasteur / Responsable" : undefined,
              avatar: c.avatar_url || undefined,
            };
          });

          setChannels(mappedChannels);

          const firstChannel = mappedChannels[0];
          if (firstChannel && (!selectedChannelId || !mappedChannels.some((c) => c.id === selectedChannelId))) {
            setSelectedChannelId(firstChannel.id);
          }
        } else {
          setChannels([]);
          setSelectedChannelId("");
        }
      } catch (err) {
        console.warn("Erreur chargement conversations backend:", err);
        setChannels([]);
        setSelectedChannelId("");
      } finally {
        if (isMounted) setIsLoadingChannels(false);
      }
    }
    loadLiveConversations();
  }, []);

  // Fetch messages from backend for the selected conversation
  useEffect(() => {
    let isMounted = true;
    async function loadMessages() {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedChannelId);
      if (!isUuid) return;
      try {
        const res = await api.messaging.listMessages(selectedChannelId, 50);
        const list = res.data?.messages || res.data?.items || [];
        if (Array.isArray(list) && list.length > 0 && isMounted) {
          const currentUser = getStoredUser();
          const currentUserId = currentUser?.id;
          const mapped: Message[] = list.map((m: any) => ({
            id: m.id,
            sender: m.sender_name || (m.sender_id === currentUserId ? "Moi" : "Frère / Sœur"),
            role: m.sender_role || "Membre",
            time: m.created_at
              ? new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
              : "Récemment",
            text: m.content || "",
            isMe: m.sender_id === currentUserId,
            status: "read",
            hasAudio: m.message_type === "audio",
            audioDuration: m.audio_duration_seconds ? `${Math.floor(m.audio_duration_seconds / 60)}:${(m.audio_duration_seconds % 60).toString().padStart(2, "0")}` : undefined,
            verseCard: m.verse_reference
              ? { ref: m.verse_reference, text: m.verse_text || "Parole de Dieu" }
              : undefined,
          }));

          setMessagesMap((prev) => ({
            ...prev,
            [selectedChannelId]: mapped,
          }));
        }
      } catch (err) {
        console.warn("Erreur chargement messages backend:", err);
      }
    }
    loadMessages();
    return () => {
      isMounted = false;
    };
  }, [selectedChannelId]);

  // Select channel and clear unread badge
  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, unreadCount: undefined } : c))
    );
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(channelId);
    if (isUuid) {
      api.messaging.markAsRead(channelId).catch(() => { });
    }
  };

  // Filter channels according to search and active tab
  const filteredChannels = channels.filter((channel) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = channel.name.toLowerCase().includes(q);
      const matchMsg = channel.lastMessage.text.toLowerCase().includes(q);
      const matchRole = (channel.role || "").toLowerCase().includes(q);
      if (!matchName && !matchMsg && !matchRole) return false;
    }

    // Tab filter
    if (activeTab === "unread") return (channel.unreadCount || 0) > 0;
    if (activeTab === "groups") return channel.type === "channel";
    if (activeTab === "direct") return channel.type === "direct";
    return true;
  });

  // Send a text message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const user = getStoredUser();
    const myName = user?.full_name || user?.name || "Fr. Jean-Claude Fossouo";
    const myRole = user?.role_name || user?.role || "Chantre & Responsable Louange";
    const currentTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const newM: Message = {
      id: `msg-${Date.now()}`,
      sender: myName,
      role: myRole,
      time: currentTime,
      text: inputText.trim(),
      isMe: true,
      status: "read",
    };

    // Update messages
    setMessagesMap((prev) => ({
      ...prev,
      [selectedChannelId]: [...(prev[selectedChannelId] || []), newM],
    }));

    // Update channel's last message in list
    setChannels((prev) =>
      prev.map((c) =>
        c.id === selectedChannelId
          ? {
            ...c,
            lastMessage: {
              sender: myName,
              text: inputText.trim(),
              time: currentTime,
              isMe: true,
            },
          }
          : c
      )
    );

    // Send to backend via API (which broadcasts to SSE event bus)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedChannelId);
    if (isUuid) {
      api.messaging.sendMessage(selectedChannelId, { content: inputText.trim() }).catch(() => { });
    } else {
      // Interactive simulated SSE responses for demo channels
      if (selectedChannelId === "d-samuel") {
        setTimeout(() => {
          setTypingUser("Rev. N. Samuel");
          setTimeout(() => {
            setTypingUser(null);
            const answerM: Message = {
              id: `msg-sse-${Date.now()}`,
              sender: "Rev. N. Samuel",
              role: "Pasteur Titulaire",
              time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
              text: "Amen mon bien-aimé frère ! Que la paix du Christ et l'onction du Saint-Esprit continuent de reposer sur tout ce que vous entreprenez pour l'avancement de l'œuvre.",
              isMe: false,
              status: "read",
            };
            setMessagesMap((prev) => ({
              ...prev,
              ["d-samuel"]: [...(prev["d-samuel"] || []), answerM],
            }));
            setChannels((prev) =>
              prev.map((c) =>
                c.id === "d-samuel"
                  ? {
                    ...c,
                    lastMessage: {
                      sender: "Rev. N. Samuel",
                      text: answerM.text,
                      time: answerM.time,
                      isMe: false,
                    },
                  }
                  : c
              )
            );
          }, 1800);
        }, 1000);
      }
    }

    setInputText("");
    setShowAttachMenu(false);
  };

  // Send a pre-formatted Scripture Verse card
  const handleSendVerse = (ref: string, text: string) => {
    const user = getStoredUser();
    const myName = user?.full_name || user?.name || "Fr. Jean-Claude Fossouo";
    const myRole = user?.role_name || user?.role || "Responsable Louange";
    const currentTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const newM: Message = {
      id: `msg-verse-${Date.now()}`,
      sender: myName,
      role: myRole,
      time: currentTime,
      text: `Verset d'édification partagé dans la communion :`,
      verseCard: { ref, text },
      isMe: true,
      status: "read",
    };

    setMessagesMap((prev) => ({
      ...prev,
      [selectedChannelId]: [...(prev[selectedChannelId] || []), newM],
    }));

    setChannels((prev) =>
      prev.map((c) =>
        c.id === selectedChannelId
          ? {
            ...c,
            lastMessage: {
              sender: myName,
              text: `📖 ${ref}`,
              time: currentTime,
              isMe: true,
            },
          }
          : c
      )
    );

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedChannelId);
    if (isUuid) {
      api.messaging.sendMessage(selectedChannelId, {
        content: `📖 ${ref} : « ${text} »`,
        message_type: "text",
      }).catch(() => { });
    }

    setShowAttachMenu(false);
  };

  // Send a simulated Voice Note
  const handleSendVoiceNote = () => {
    setIsRecordingAudio(false);
    const user = getStoredUser();
    const myName = user?.full_name || user?.name || "Fr. Jean-Claude Fossouo";
    const myRole = user?.role_name || user?.role || "Responsable Louange";
    const currentTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const duration = `0:${recordSeconds < 10 ? "0" + recordSeconds : recordSeconds}`;

    const newM: Message = {
      id: `msg-audio-${Date.now()}`,
      sender: myName,
      role: myRole,
      time: currentTime,
      text: "Message vocal fraternel",
      hasAudio: true,
      audioDuration: duration === "0:00" ? "0:18" : duration,
      isMe: true,
      status: "read",
    };

    setMessagesMap((prev) => ({
      ...prev,
      [selectedChannelId]: [...(prev[selectedChannelId] || []), newM],
    }));

    setChannels((prev) =>
      prev.map((c) =>
        c.id === selectedChannelId
          ? {
            ...c,
            lastMessage: {
              sender: myName,
              text: `🎤 Note vocale (${newM.audioDuration})`,
              time: currentTime,
              isMe: true,
              hasAudio: true,
            },
          }
          : c
      )
    );
  };

  return (
    <PortalShell hideSidebar={true} activePath="messagerie" title="Messagerie Fraternelle & Canaux MPEC">
      {/* Edge-to-Edge WhatsApp Web Container */}
      <div className="h-[calc(100vh-64px)] w-full flex overflow-hidden bg-surface-container-lowest">

        {/* ========================================================= */}
        {/* LEFT COLUMN: WhatsApp Chat List & Search (360px - 420px)  */}
        {/* ========================================================= */}
        <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 border-r border-surface-container flex flex-col bg-surface-container-lowest h-full">

          {/* Header (WhatsApp style) */}
          <div className="h-16 px-4 bg-surface-container-low/70 border-b border-surface-container flex items-center justify-between shrink-0">
            {/* User Profile avatar */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary font-black text-sm flex items-center justify-center ring-2 ring-primary/20 shadow-xs">
                  JF
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-surface-container-lowest" title="En ligne" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-on-surface leading-tight">
                  Koinōnia Direct
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connecté • Tsinga
                </span>
              </div>
            </div>

            {/* Quick Action Icons */}
            <div className="flex items-center gap-1 text-on-surface-variant">
              <button
                type="button"
                onClick={() => setActiveTab("groups")}
                className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
                title="Canaux & Départements"
              >
                <span className="material-symbols-outlined text-[20px]">groups</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  inputRef.current?.focus();
                }}
                className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
                title="Nouvelle discussion"
              >
                <span className="material-symbols-outlined text-[20px]">chat</span>
              </button>
              <button
                type="button"
                className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
                title="Options"
              >
                <span className="material-symbols-outlined text-[20px]">more_vert</span>
              </button>
            </div>
          </div>

          {/* Search bar (WhatsApp style) */}
          <div className="p-2.5 border-b border-surface-container/60 bg-surface-container-lowest shrink-0">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-on-surface-variant flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher ou démarrer une discussion..."
                className="w-full h-9 pl-9 pr-8 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant/70 outline-none border border-transparent focus:border-primary/40 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-on-surface-variant hover:text-on-surface p-1"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Chips (WhatsApp style: Toutes, Non lues, Groupes, Pastoraux) */}
          <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-surface-container/50 bg-surface-container-lowest shrink-0">
            {[
              { id: "all", label: "Toutes" },
              { id: "unread", label: "Non lues" },
              { id: "groups", label: "Groupes & Canaux" },
              { id: "direct", label: "Messages Pastoraux" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`h-7 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${active
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Channels / Chats List */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-container/40">
            {isLoadingChannels ? (
              <div className="p-2 space-y-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse bg-surface-container-low/40">
                    <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-3 w-10 rounded" />
                      </div>
                      <Skeleton className="h-3.5 w-4/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredChannels.length > 0 ? (
              filteredChannels.map((channel) => {
                const isSelected = channel.id === selectedChannelId;
                return (
                  <div
                    key={channel.id}
                    onClick={() => handleSelectChannel(channel.id)}
                    className={`px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors relative group ${isSelected
                        ? "bg-surface-container border-l-4 border-primary"
                        : "hover:bg-surface-container-low/80"
                      }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {channel.avatar ? (
                        <img
                          src={channel.avatar}
                          alt={channel.name}
                          className="w-12 h-12 rounded-full object-cover ring-1 ring-surface-container"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full font-bold text-sm flex items-center justify-center ${channel.type === "channel"
                              ? "bg-primary-container text-on-primary"
                              : "bg-secondary-container text-on-secondary-container"
                            }`}
                        >
                          {channel.initials}
                        </div>
                      )}
                      {channel.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-surface-container-lowest" />
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-on-surface truncate leading-tight">
                          {channel.name}
                        </span>
                        <span
                          className={`text-[10px] shrink-0 font-medium ${channel.unreadCount ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-on-surface-variant"
                            }`}
                        >
                          {channel.lastMessage.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0 text-xs text-on-surface-variant truncate">
                          {channel.lastMessage.isMe && (
                            <span className="material-symbols-outlined text-[15px] text-emerald-600 dark:text-emerald-400 shrink-0">
                              done_all
                            </span>
                          )}
                          {channel.lastMessage.hasAudio && (
                            <span className="material-symbols-outlined text-[15px] text-primary shrink-0">
                              mic
                            </span>
                          )}
                          <span className="truncate text-[11.5px]">
                            {channel.lastMessage.text}
                          </span>
                        </div>

                        {/* Unread count badge or Pinned icon */}
                        <div className="flex items-center gap-1 shrink-0">
                          {channel.pinned && !channel.unreadCount && (
                            <span className="material-symbols-outlined text-[15px] text-on-surface-variant/60 rotate-45">
                              push_pin
                            </span>
                          )}
                          {channel.unreadCount && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                              {channel.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40">
                  search_off
                </span>
                <p>Aucune discussion trouvée pour ce filtre.</p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER / MAIN CHAT PANE: WhatsApp Conversation & Feed     */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
          {!selectedChannel ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest">
              <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant mb-4">
                <span className="material-symbols-outlined text-[32px]">chat</span>
              </div>
              <h3 className="font-bold text-base text-on-surface">Messagerie Instantanée Sécurisée</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mt-1">
                Sélectionnez une conversation dans la liste de gauche pour échanger en direct ou consulter les annonces de votre paroisse.
              </p>
            </div>
          ) : (
            <>
              {/* Active Chat Header (Clean WhatsApp Light Header) */}
              <div className="h-16 px-4 bg-[#f0f2f5] border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs z-10">
                <div
                  onClick={() => setShowInfoDrawer(!showInfoDrawer)}
                  className="flex items-center gap-3 cursor-pointer group min-w-0"
                  title="Cliquer pour afficher les détails du groupe/contact"
                >
                  <div className="relative shrink-0">
                    {selectedChannel.avatar ? (
                      <img
                        src={selectedChannel.avatar}
                        alt={selectedChannel.name}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-300"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center text-white ${selectedChannel.type === "channel"
                            ? "bg-[#008069]"
                            : "bg-[#835400]"
                          }`}
                      >
                        {selectedChannel.initials}
                      </div>
                    )}
                    {selectedChannel.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm font-bold text-[#111b21] truncate group-hover:text-[#008069] transition-colors">
                        {selectedChannel.name}
                      </h2>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-[#008069] text-[9.5px] font-bold tracking-wider shrink-0"
                        title="Flux temps réel SSE (Server-Sent Events) connecté"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>SSE DIRECT</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-[#54656f] truncate">
                      {typingUser ? (
                        <span className="text-[#008069] font-bold italic animate-pulse">
                          {typingUser} est en train d'écrire...
                        </span>
                      ) : selectedChannel.isOnline ? (
                        "en ligne • flux temps réel actif"
                      ) : selectedChannel.type === "channel" ? (
                        `${selectedChannel.membersCount || 24} membres • Échanges fraternels`
                      ) : (
                        selectedChannel.role || selectedChannel.lastSeen || "Mission du Plein Évangile"
                      )}
                    </span>
                  </div>
                </div>

                {/* Header Action Icons */}
                <div className="flex items-center gap-1 text-[#54656f]">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full hover:bg-slate-200/70 hover:text-[#111b21] flex items-center justify-center transition-colors cursor-pointer"
                    title="Appel vocal spirituel"
                  >
                    <span className="material-symbols-outlined text-[20px]">call</span>
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full hover:bg-slate-200/70 hover:text-[#111b21] flex items-center justify-center transition-colors cursor-pointer"
                    title="Appel vidéo Koinōnia"
                  >
                    <span className="material-symbols-outlined text-[20px]">videocam</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="w-9 h-9 rounded-full hover:bg-slate-200/70 hover:text-[#111b21] flex items-center justify-center transition-colors cursor-pointer"
                    title="Rechercher dans la discussion"
                  >
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInfoDrawer(!showInfoDrawer)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${showInfoDrawer ? "bg-[#008069] text-white" : "hover:bg-slate-200/70 hover:text-[#111b21]"
                      }`}
                    title="Informations sur le groupe / contact"
                  >
                    <span className="material-symbols-outlined text-[20px]">info</span>
                  </button>
                </div>
              </div>

              {/* Messages Feed (Authentic WhatsApp Web Wallpaper & High-Contrast Bubbles) */}
              <div
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3"
                style={{
                  backgroundColor: "#efeae2",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23665e52' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M20 10v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3zm20 30v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3zm-30 20c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm40-40c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zM70 60v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3z'/%3E%3C/g%3E%3C/svg%3E")`,
                }}
              >

                {/* Center Date Badge */}
                <div className="flex justify-center my-2 select-none">
                  <span className="px-3.5 py-1 rounded-lg bg-white/95 text-[#54656f] text-[11.5px] font-semibold shadow-xs border border-slate-200/70 uppercase tracking-wide">
                    Aujourd'hui
                  </span>
                </div>

                {/* List of Messages */}
                {currentMessages.map((m) => {
                  const isMe = m.isMe;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? "ml-auto items-end" : "mr-auto items-start"} max-w-[85%] sm:max-w-md lg:max-w-lg`}
                    >
                      <div
                        className={`p-3 sm:p-3.5 rounded-2xl shadow-xs relative ${isMe
                            ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none border border-[#c3f2bc]"
                            : "bg-white text-[#111b21] rounded-tl-none border border-slate-200/80 shadow-xs"
                          }`}
                      >
                        {/* Sender Name in Group chats for incoming messages */}
                        {!isMe && selectedChannel.type === "channel" && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[12.5px] font-bold text-[#008069]">
                              {m.sender}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0f2f5] text-[#54656f] font-semibold border border-slate-200">
                              {m.role}
                            </span>
                          </div>
                        )}

                        {/* Message Text (Ultra Legible & Crisp) */}
                        <p className="text-[13.5px] sm:text-[14px] leading-[20px] text-[#111b21] font-normal whitespace-pre-wrap select-text">
                          {m.text}
                        </p>

                        {/* Biblical Scripture Verse Card (Warm honey amber styling) */}
                        {m.verseCard && (
                          <div className="mt-2.5 p-3 rounded-xl bg-[#fffbeb] border-l-4 border-[#d97706] shadow-2xs">
                            <div className="flex items-center gap-1.5 text-[#b45309] font-bold text-[12px] mb-1">
                              <span className="material-symbols-outlined text-[15px]">auto_stories</span>
                              <span>{m.verseCard.ref}</span>
                            </div>
                            <p className="italic text-[13px] text-[#451a03] leading-relaxed font-serif">
                              « {m.verseCard.text} »
                            </p>
                          </div>
                        )}

                        {/* Audio Note player simulation */}
                        {m.hasAudio && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-[#f0f2f5] flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setPlayingAudioId(playingAudioId === m.id ? null : m.id)}
                              className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008069] text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer transition-all"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {playingAudioId === m.id ? "pause" : "play_arrow"}
                              </span>
                            </button>
                            <div className="flex-1 flex flex-col gap-1">
                              {/* Audio Waveform visual */}
                              <div className="flex items-center gap-1 h-5">
                                {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 65, 30, 85, 40].map((h, idx) => (
                                  <span
                                    key={idx}
                                    style={{ height: `${h}%` }}
                                    className={`w-1 rounded-full transition-all ${playingAudioId === m.id
                                        ? "bg-[#00a884] animate-pulse"
                                        : "bg-slate-400"
                                      }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[11px] text-[#54656f] font-semibold">
                                {m.audioDuration || "0:42"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Timestamp & Read Receipts */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-[#667781] font-medium">
                          <span>{m.time}</span>
                          {isMe && (
                            <span className="material-symbols-outlined text-[16px] text-[#53bdeb] font-bold">
                              done_all
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Quick Popup Menu */}
              {showAttachMenu && (
                <div className="absolute bottom-16 left-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 flex flex-col gap-1 z-20 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() =>
                      handleSendVerse(
                        "Ésaïe 40:31",
                        "Ceux qui se confient en l'Éternel renouvellent leur force. Ils prennent le vol comme les aigles."
                      )
                    }
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#111b21] hover:bg-[#f0f2f5] transition-colors text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">auto_stories</span>
                    </div>
                    <span>Partager un Verset Biblique (Ésaïe 40:31)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSendVerse(
                        "Philippiens 4:13",
                        "Je puis tout par celui qui me fortifie."
                      )
                    }
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#111b21] hover:bg-[#f0f2f5] transition-colors text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-[#008069] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
                    </div>
                    <span>Exhortation (Phil. 4:13)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#111b21] hover:bg-[#f0f2f5] transition-colors text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">description</span>
                    </div>
                    <span>Fichier ou Conducteur liturgique</span>
                  </button>
                </div>
              )}

              {/* Voice Recording Banner (When user clicks mic) */}
              {isRecordingAudio && (
                <div className="h-16 px-4 bg-[#f0f2f5] border-t border-slate-200 flex items-center justify-between z-10 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-bold text-red-600">
                      Enregistrement vocal pastoral en cours... 0:{recordSeconds < 10 ? "0" + recordSeconds : recordSeconds}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRecordingAudio(false)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold text-[#54656f] hover:bg-slate-200"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSendVoiceNote}
                      className="h-9 px-4 rounded-full bg-[#00a884] hover:bg-[#008069] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>Envoyer la note vocale</span>
                    </button>
                  </div>
                </div>
              )}

              {/* WhatsApp Bottom Input Bar */}
              {!isRecordingAudio && (
                <form
                  onSubmit={handleSendMessage}
                  className="h-16 px-4 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-2 shrink-0 z-10"
                >
                  {/* Emoji Button */}
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full text-[#54656f] hover:bg-slate-200/80 hover:text-[#111b21] flex items-center justify-center transition-colors cursor-pointer"
                    title="Emojis"
                  >
                    <span className="material-symbols-outlined text-[22px]">mood</span>
                  </button>

                  {/* Attach File Button */}
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${showAttachMenu ? "bg-[#008069] text-white" : "text-[#54656f] hover:bg-slate-200/80 hover:text-[#111b21]"
                      }`}
                    title="Joindre un fichier ou un verset biblique"
                  >
                    <span className="material-symbols-outlined text-[22px]">attach_file</span>
                  </button>

                  {/* Text Input */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Tapez un message fraternel dans ${selectedChannel.name}...`}
                    className="flex-1 h-10 px-4 bg-white rounded-xl text-[13.5px] text-[#111b21] placeholder:text-[#8696a0] outline-none border border-slate-300 focus:border-[#00a884] transition-all shadow-2xs"
                  />

                  {/* Send OR Mic Button */}
                  {inputText.trim() ? (
                    <button
                      type="submit"
                      className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008069] text-white flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                      title="Envoyer le message"
                    >
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsRecordingAudio(true)}
                      className="w-10 h-10 rounded-full bg-slate-200/70 hover:bg-[#00a884] hover:text-white text-[#54656f] flex items-center justify-center transition-all cursor-pointer shrink-0"
                      title="Enregistrer une note vocale"
                    >
                      <span className="material-symbols-outlined text-[20px]">mic</span>
                    </button>
                  )}
                </form>
              )}
            </>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT DRAWER: WhatsApp Contact / Group Details Pane       */}
        {/* ========================================================= */}
        {showInfoDrawer && selectedChannel && (
          <div className="w-72 lg:w-80 shrink-0 border-l border-surface-container bg-surface-container-lowest h-full overflow-y-auto flex flex-col p-4 gap-5 animate-fadeIn">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Infos de la discussion
              </span>
              <button
                type="button"
                onClick={() => setShowInfoDrawer(false)}
                className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Profile / Group Card */}
            <div className="text-center space-y-2">
              <div className="relative mx-auto w-20 h-20">
                {selectedChannel.avatar ? (
                  <img
                    src={selectedChannel.avatar}
                    alt={selectedChannel.name}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-primary/20 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary font-black text-2xl flex items-center justify-center shadow-md">
                    {selectedChannel.initials}
                  </div>
                )}
                {selectedChannel.isOnline && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-surface-container-lowest" />
                )}
              </div>
              <h3 className="text-sm font-bold text-on-surface font-display leading-tight">
                {selectedChannel.name}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {selectedChannel.description || "Canal officiel de communion et de coordination fraternelle."}
              </p>
            </div>

            {/* Charte Spirituelle MPEC */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Charte Fraternelle Koinōnia
              </span>
              <p className="text-[11px] italic text-on-surface-variant leading-relaxed font-serif">
                « Qu'il ne sorte de votre bouche aucune parole mauvaise, mais plutôt celle qui est bonne et propre à l'édification. » Éphésiens 4:29
              </p>
            </div>

            {/* Group Members (if channel) */}
            {selectedChannel.type === "channel" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                  <span>Membres du bureau &amp; fidèles</span>
                  <span className="text-[11px] text-on-surface-variant font-normal">
                    {selectedChannel.membersCount || 24}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low/60 border border-surface-container/60">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-fixed text-primary font-bold text-[10px] flex items-center justify-center">
                        RN
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold leading-tight">Rev. N. Samuel</span>
                        <span className="text-[10px] text-primary">Pasteur Titulaire</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[15px] text-primary">star</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low/60 border border-surface-container/60">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-secondary-fixed text-secondary font-bold text-[10px] flex items-center justify-center">
                        EM
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold leading-tight">Diacre Ebogo M.</span>
                        <span className="text-[10px] text-on-surface-variant">Trésorerie</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low/60 border border-surface-container/60">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-fixed text-primary font-bold text-[10px] flex items-center justify-center">
                        JF
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold leading-tight">Fr. Jean-Claude F.</span>
                        <span className="text-[10px] text-on-surface-variant">Louange CGL</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shared Liturgical Media */}
            <div className="space-y-2 pt-2 border-t border-surface-container">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                Médias &amp; Documents Partagés
              </span>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-low/60 border border-surface-container/60 text-xs cursor-pointer hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-primary text-[20px]">audio_file</span>
                <div className="truncate flex-1">
                  <span className="font-semibold block truncate">Cantiques-Pentecote-2026.mp3</span>
                  <span className="text-[10px] text-on-surface-variant">4.8 Mo • Répétition</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-low/60 border border-surface-container/60 text-xs cursor-pointer hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-secondary text-[20px]">picture_as_pdf</span>
                <div className="truncate flex-1">
                  <span className="font-semibold block truncate">Ordre_du_Culte_Dimanche.pdf</span>
                  <span className="text-[10px] text-on-surface-variant">320 Ko • Protocole</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
